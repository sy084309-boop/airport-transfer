import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';
import { searchFlightFuture, parseFlightInput, getAirlineName, getAirportName } from '../services/flight.service';
import { runMonitor } from '../services/flight_monitor';

const router = Router();

router.get('/dashboard', authenticate, authorize('admin'), (_req, res, next) => {
  try {
    const totalBookings = (db.prepare(`SELECT COUNT(*) as cnt FROM bookings`).get() as any).cnt;
    const revenue = (db.prepare(`SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status = 'completed'`).get() as any).total;
    const activeDrivers = (db.prepare(`SELECT COUNT(*) as cnt FROM drivers WHERE status IN ('online','on_trip')`).get() as any).cnt;
    const pending = (db.prepare(`SELECT COUNT(*) as cnt FROM bookings WHERE status = 'pending'`).get() as any).cnt;
    res.json({ totalBookings, totalRevenue: revenue, activeDrivers, pendingBookings: pending });
  } catch (err) { next(err); }
});

router.get('/users', authenticate, authorize('admin'), (_req, res, next) => {
  try {
    const rows = db.prepare(`SELECT id, email, full_name, phone, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 100`).all();
    res.json(rows);
  } catch (err) { next(err); }
});

router.put('/users/:id', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const { status, role } = req.body;
    db.prepare(`UPDATE users SET status = COALESCE(?, status), role = COALESCE(?, role), updated_at = datetime('now') WHERE id = ?`)
      .run(status || null, role || null, req.params.id);
    const user = db.prepare(`SELECT id, email, full_name, role, status FROM users WHERE id = ?`).get(req.params.id);
    res.json(user);
  } catch (err) { next(err); }
});

router.post('/bookings/:id/assign', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const { driverId } = req.body;
    db.prepare(`UPDATE bookings SET driver_id = ?, status = 'assigned', updated_at = datetime('now') WHERE id = ?`)
      .run(driverId, req.params.id);
    db.prepare(`INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by, note)
      VALUES (?, ?, 'confirmed', 'assigned', ?, '管理員指派司機')`).run(require('uuid').v4(), req.params.id, req.user!.userId);
    const booking = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(req.params.id);
    res.json(booking);
  } catch (err) { next(err); }
});

// GET /api/admin/flights/overview
router.get('/flights/overview', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    // 取得所有 active 預約（有航班編號的）
    const bookings = db.prepare(`
      SELECT b.*, u.full_name as customer_name, u.phone as customer_phone,
             d.full_name as driver_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      WHERE b.flight_number IS NOT NULL AND b.status NOT IN ('cancelled', 'completed')
      ORDER BY b.scheduled_pickup_at ASC
    `).all() as any[];

    // 為每個預約查詢航班狀態
    const enriched = await Promise.all(bookings.map(async (b: any) => {
      const parsed = parseFlightInput(b.flight_number);
      if (!parsed) return { ...b, flightStatus: 'unknown', flightDetail: null };

      const flight = await searchFlightFuture(parsed.airline, parsed.flightNumber, b.flight_date);
      return {
        ...b,
        flightStatus: flight?.status || 'unknown',
        flightDetail: flight ? {
          flightNumber: `${flight.airlineId}${flight.flightNumber}`,
          airline: getAirlineName(flight.airlineId),
          departureAirport: getAirportName(flight.departureAirportId),
          arrivalAirport: getAirportName(flight.arrivalAirportId),
          scheduleTime: flight.scheduleTime,
          terminal: flight.terminal,
          gate: flight.gate,
          remark: flight.remark,
          status: flight.status,
        } : null,
      };
    }));

    // 統計
    const stats = {
      total: enriched.length,
      onTime: enriched.filter(b => b.flightStatus === 'on-time').length,
      delayed: enriched.filter(b => b.flightStatus === 'delayed').length,
      cancelled: enriched.filter(b => b.flightStatus === 'cancelled').length,
      landed: enriched.filter(b => b.flightStatus === 'landed' || b.flightStatus === 'departed').length,
    };

    res.json({ stats, bookings: enriched });
  } catch (err) { next(err); }
});

// POST /api/admin/flights/monitor
router.post('/flights/monitor', authenticate, authorize('admin'), async (_req, res) => {
  try {
    const result = await runMonitor();
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
