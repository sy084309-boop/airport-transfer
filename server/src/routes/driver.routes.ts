import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';

const router = Router();

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { email, password, fullName, phone, licenseNumber, licenseExpiry, vehiclePlate, vehicleBrand, vehicleModel, vehicleYear, vehicleColor, vehicleType } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const userId = uuid();
    const driverId = uuid();
    const vehicleId = uuid();

    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES (?,?,?,?,?,'driver')`)
        .run(userId, email, hash, fullName, phone);
      db.prepare(`INSERT INTO drivers (id, user_id, license_number, license_expiry) VALUES (?,?,?,?)`)
        .run(driverId, userId, licenseNumber, licenseExpiry);
      db.prepare(`INSERT INTO vehicles (id, driver_id, plate_number, brand, model, year, color, vehicle_type) VALUES (?,?,?,?,?,?,?,?)`)
        .run(vehicleId, driverId, vehiclePlate, vehicleBrand, vehicleModel, vehicleYear, vehicleColor, vehicleType || 'sedan');
    });
    tx();
    res.status(201).json({ userId, driverId });
  } catch (err: any) { next(err); }
});

router.get('/', authenticate, authorize('admin', 'agent'), (_req, res, next) => {
  try {
    const rows = db.prepare(
      `SELECT d.*, u.full_name, u.email, u.phone, v.plate_number, v.vehicle_type
       FROM drivers d JOIN users u ON d.user_id = u.id
       LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = 1 ORDER BY d.created_at DESC`
    ).all();
    res.json(rows);
  } catch (err: any) { next(err); }
});

router.get('/:id/jobs', authenticate, (req, res, next) => {
  try {
    const rows = db.prepare(
      `SELECT * FROM bookings WHERE driver_id = (SELECT id FROM drivers WHERE user_id = ?) AND status IN ('assigned','driver_accepted','driver_en_route','arrived_at_pickup','in_progress') ORDER BY scheduled_pickup_at`
    ).all(req.user!.userId);
    res.json(rows);
  } catch (err: any) { next(err); }
});

router.get('/:id/trips', authenticate, (req, res, next) => {
  try {
    const driver = db.prepare(`SELECT id FROM drivers WHERE user_id = ?`).get(req.user!.userId) as any;
    const rows = db.prepare(
      `SELECT * FROM bookings WHERE driver_id = ? AND status IN ('completed','cancelled') ORDER BY updated_at DESC LIMIT 50`
    ).all(driver?.id);
    res.json(rows);
  } catch (err: any) { next(err); }
});

// ---- 司機個人 API（/api/drivers/me/*）----

// 取得司機個人資料 + 車輛
router.get('/me', authenticate, (req, res, next) => {
  try {
    const driver = db.prepare(`
      SELECT d.*, u.full_name, u.email, u.phone, u.avatar_url,
             v.plate_number, v.brand as vehicle_brand, v.model as vehicle_model,
             v.vehicle_type, v.passenger_cap
      FROM drivers d JOIN users u ON d.user_id = u.id
      LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = 1
      WHERE d.user_id = ?`).get(req.user!.userId) as any;
    if (!driver) return res.status(404).json({ error: '找不到司機資料' });
    res.json(driver);
  } catch (err: any) { next(err); }
});

// 更新線上狀態
router.put('/me/status', authenticate, (req, res, next) => {
  try {
    const { status } = req.body;
    db.prepare(`UPDATE drivers SET status = ?, updated_at = datetime('now') WHERE user_id = ?`)
      .run(status, req.user!.userId);
    res.json({ status });
  } catch (err: any) { next(err); }
});

// 可用訂單（附近可接的單）
router.get('/available-jobs', authenticate, (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT b.*, u.full_name as customer_name, u.phone as customer_phone
      FROM bookings b LEFT JOIN users u ON b.member_id = u.id
      WHERE b.status IN ('pending','confirmed')
        AND b.driver_id IS NULL
      ORDER BY b.scheduled_pickup_at ASC
      LIMIT 20
    `).all();
    res.json(rows);
  } catch (err: any) { next(err); }
});

// 接單
router.post('/me/accept/:bookingId', authenticate, (req, res, next) => {
  try {
    const driver = db.prepare(`SELECT id FROM drivers WHERE user_id = ?`).get(req.user!.userId) as any;
    if (!driver) return res.status(404).json({ error: '找不到司機資料' });

    const booking = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(req.params.bookingId) as any;
    if (!booking) return res.status(404).json({ error: '找不到訂單' });
    if (booking.driver_id) return res.status(400).json({ error: '此訂單已被其他司機接走' });

    db.prepare(`UPDATE bookings SET driver_id = ?, status = 'driver_accepted', updated_at = datetime('now') WHERE id = ?`)
      .run(driver.id, req.params.bookingId);
    db.prepare(`INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by, note)
      VALUES (?, ?, ?, 'driver_accepted', ?, '司機接單')`)
      .run(uuid(), req.params.bookingId, booking.status, req.user!.userId);

    const updated = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(req.params.bookingId);
    res.json(updated);
  } catch (err: any) { next(err); }
});

// 更新旅程狀態（前往→抵達→開始→完成）
router.put('/me/jobs/:bookingId/status', authenticate, (req, res, next) => {
  try {
    const driver = db.prepare(`SELECT id FROM drivers WHERE user_id = ?`).get(req.user!.userId) as any;
    if (!driver) return res.status(404).json({ error: '找不到司機資料' });

    const { status } = req.body;
    const booking = db.prepare(`SELECT * FROM bookings WHERE id = ? AND driver_id = ?`)
      .get(req.params.bookingId, driver.id) as any;
    if (!booking) return res.status(404).json({ error: '找不到此訂單或非你的任務' });

    db.prepare(`UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(status, req.params.bookingId);
    db.prepare(`INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by, note)
      VALUES (?, ?, ?, ?, ?, '司機更新狀態')`)
      .run(uuid(), req.params.bookingId, booking.status, status, req.user!.userId);

    // 完成旅程 → 點數 + 佣金
    if (status === 'completed') {
      db.prepare(`INSERT INTO points_records (id, user_id, booking_id, points, reason, description)
        VALUES (?, ?, ?, 10, 'trip_completed', '完成旅程')`)
        .run(uuid(), req.user!.userId, req.params.bookingId);
      db.prepare(`UPDATE drivers SET total_points = total_points + 10, total_trips = total_trips + 1 WHERE id = ?`).run(driver.id);

      if (booking.agent_id) {
        const agent = db.prepare(`SELECT commission_rate FROM agents WHERE id = ?`).get(booking.agent_id) as any;
        if (agent) {
          const amount = Math.round(booking.total_price * agent.commission_rate);
          db.prepare(`INSERT INTO commission_records (id, agent_id, booking_id, amount, rate_applied)
            VALUES (?, ?, ?, ?, ?)`).run(uuid(), booking.agent_id, req.params.bookingId, amount, agent.commission_rate);
        }
      }
    }

    const updated = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(req.params.bookingId);
    res.json(updated);
  } catch (err: any) { next(err); }
});

// 司機點數 + 收入
router.get('/me/points', authenticate, (req, res, next) => {
  try {
    const driver = db.prepare(`SELECT id, total_points, total_trips FROM drivers WHERE user_id = ?`)
      .get(req.user!.userId) as any;
    const pointsHistory = db.prepare(`
      SELECT pr.*, b.reference_code FROM points_records pr
      LEFT JOIN bookings b ON pr.booking_id = b.id
      WHERE pr.user_id = ? ORDER BY pr.created_at DESC LIMIT 30
    `).all(req.user!.userId);
    const earnings = db.prepare(`
      SELECT COALESCE(SUM(total_price), 0) as total FROM bookings
      WHERE driver_id = ? AND status = 'completed'
    `).get(driver?.id) as any;
    res.json({
      totalPoints: driver?.total_points || 0,
      totalTrips: driver?.total_trips || 0,
      totalEarnings: earnings?.total || 0,
      pointsHistory,
    });
  } catch (err: any) { next(err); }
});

export default router;
