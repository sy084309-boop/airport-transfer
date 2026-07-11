import { db } from '../config/database';
import { calculatePrice } from './pricing.service';
import { v4 as uuid } from 'uuid';

function generateRefCode(): string {
  const today = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const count = db.prepare(`SELECT COUNT(*) as cnt FROM bookings WHERE reference_code LIKE ?`).get(`ATC-${today}%`) as any;
  const seq = String((count.cnt || 0) + 1).padStart(3, '0');
  return `ATC-${today}${seq}`;
}

function isNightTime(dateStr: string): boolean {
  const hour = new Date(dateStr).getHours();
  return hour >= 23 || hour < 6;
}

export function createBooking(data: any, userId?: string, agentId?: string) {
  // 時間驗證：不可預約過去的時間
  const pickupTime = new Date(data.scheduledPickupAt);
  if (isNaN(pickupTime.getTime())) throw new Error('預約時間格式錯誤');
  if (pickupTime < new Date()) return { error: '不可預約過去的時間', status: 400 };

  const pricing = calculatePrice({
    vehicleType: data.vehicleType || 'sedan',
    origin: data.origin || 'taipei',
    dest: data.dest || 'taoyuan_airport',
    isNight: isNightTime(data.scheduledPickupAt),
    extraStops: data.extraStops || 0,
  });

  const refCode = generateRefCode();
  const bookingId = uuid();

  // 從 flightDatetime 拆出 flight_date（YYYY-MM-DD）
  const flightDate = data.flightDatetime
    ? (data.flightDatetime.includes('T') ? data.flightDatetime.split('T')[0] : data.flightDatetime.slice(0, 10))
    : null;

  const insertBooking = db.prepare(`INSERT INTO bookings
    (id, reference_code, member_id, agent_id, booking_type, pickup_address, dropoff_address,
     flight_number, flight_datetime, flight_date, scheduled_pickup_at, passenger_count, luggage_count,
     vehicle_type, is_guaranteed, payment_method, subtotal, night_surcharge_applied,
     extra_stops_fee, total_price, special_requests, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  const tx = db.transaction(() => {
    insertBooking.run(bookingId, refCode, userId || null, agentId || null,
      data.bookingType, data.pickupAddress, data.dropoffAddress,
      data.flightNumber || null, data.flightDatetime || null, flightDate, data.scheduledPickupAt,
      data.passengerCount || 1, data.luggageCount || 1,
      data.vehicleType || 'sedan', data.isGuaranteed ? 1 : 0, data.paymentMethod || 'cash',
      pricing.basePrice, pricing.nightSurcharge, pricing.extraStopsFee,
      pricing.totalPrice, data.specialRequests || null, userId || null);

    db.prepare(`INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by, note)
      VALUES (?, ?, NULL, 'pending', ?, '訂單建立')`).run(uuid(), bookingId, userId || null);
  });

  tx();
  return { ...(db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId) as any), referenceCode: refCode };
}

export function trackByReference(refCode: string) {
  const row = db.prepare(`
    SELECT b.*, u.full_name as member_name, drv.full_name as driver_name, v.plate_number as vehicle_plate
    FROM bookings b LEFT JOIN users u ON b.member_id = u.id
    LEFT JOIN drivers d ON b.driver_id = d.id
    LEFT JOIN users drv ON d.user_id = drv.id
    LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = 1
    WHERE b.reference_code = ?`).get(refCode) as any;
  if (!row) throw new Error('找不到此訂單');
  return row;
}

export function getBookingById(id: string) {
  const row = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id) as any;
  if (!row) throw new Error('找不到此訂單');
  return row;
}

export function cancelBooking(id: string, userId: string, reason?: string) {
  const tx = db.transaction(() => {
    const booking = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id) as any;
    if (!booking) throw new Error('找不到此訂單');
    if (['completed', 'cancelled'].includes(booking.status)) throw new Error('此訂單無法取消');

    db.prepare(`UPDATE bookings SET status = 'cancelled', cancel_reason = ?, cancelled_by = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(reason || null, userId, id);
    db.prepare(`INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by, note)
      VALUES (?, ?, ?, 'cancelled', ?, ?)`)
      .run(uuid(), id, booking.status, userId, reason || '客戶取消');
  });
  tx();
  return db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id) as any;
}

export function updateBookingStatus(bookingId: string, newStatus: string, userId: string, note?: string) {
  const tx = db.transaction(() => {
    const prev = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId) as any;
    if (!prev) throw new Error('找不到此訂單');

    db.prepare(`UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(newStatus, bookingId);
    db.prepare(`INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by, note)
      VALUES (?, ?, ?, ?, ?, ?)`).run(uuid(), bookingId, prev.status, newStatus, userId, note || '');

    if (newStatus === 'completed') {
      if (prev.driver_id) {
        const driver = db.prepare(`SELECT user_id FROM drivers WHERE id = ?`).get(prev.driver_id) as any;
        if (driver) {
          db.prepare(`INSERT INTO points_records (id, user_id, booking_id, points, reason, description)
            VALUES (?, ?, ?, 10, 'trip_completed', '完成旅程')`).run(uuid(), driver.user_id, bookingId);
          db.prepare(`UPDATE drivers SET total_points = total_points + 10, total_trips = total_trips + 1 WHERE id = ?`).run(prev.driver_id);
        }
      }
      if (prev.agent_id) {
        const agent = db.prepare(`SELECT commission_rate FROM agents WHERE id = ?`).get(prev.agent_id) as any;
        if (agent) {
          const amount = Math.round(prev.total_price * agent.commission_rate);
          db.prepare(`INSERT INTO commission_records (id, agent_id, booking_id, amount, rate_applied)
            VALUES (?, ?, ?, ?, ?)`).run(uuid(), prev.agent_id, bookingId, amount, agent.commission_rate);
          db.prepare(`UPDATE agents SET total_commission = total_commission + ? WHERE id = ?`).run(amount, prev.agent_id);
        }
      }
    }
  });
  tx();
  return db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId) as any;
}

export function listBookings(filters: any) {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
  const offset = (page - 1) * limit;

  let where = ` WHERE 1=1`;
  const params: any[] = [];
  if (filters.status) { where += ` AND b.status = ?`; params.push(filters.status); }
  if (filters.driverId) { where += ` AND b.driver_id = ?`; params.push(filters.driverId); }
  if (filters.memberId) { where += ` AND b.member_id = ?`; params.push(filters.memberId); }
  if (filters.agentId) { where += ` AND b.agent_id = ?`; params.push(filters.agentId); }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM bookings b${where}`).get(...params) as any;
  const total = countRow.total || 0;

  const data = db.prepare(
    `SELECT b.*, u.full_name as member_name FROM bookings b LEFT JOIN users u ON b.member_id = u.id${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { data, page, limit, total };
}

/** 取得會員最近使用過的地址 */
export function getRecentAddresses(userId: string) {
  const rows = db.prepare(`
    SELECT DISTINCT pickup_address as label, pickup_lat as lat, pickup_lng as lng
    FROM bookings WHERE member_id = ? AND pickup_address IS NOT NULL
    ORDER BY created_at DESC LIMIT 5
  `).all(userId) as any[];
  return rows.filter((r: any) => r.label);
}
