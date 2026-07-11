import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';
import { createBooking } from '../services/booking.service';

const router = Router();

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { email, password, fullName, phone, agentCode, stationName, commissionRate } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const userId = uuid();
    const agentId = uuid();

    db.transaction(() => {
      db.prepare(`INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES (?,?,?,?,?,'agent')`)
        .run(userId, email, hash, fullName, phone);
      db.prepare(`INSERT INTO agents (id, user_id, agent_code, station_name, commission_rate) VALUES (?,?,?,?,?)`)
        .run(agentId, userId, agentCode, stationName, commissionRate || 0.05);
    })();
    res.status(201).json({ userId, agentCode });
  } catch (err: any) { next(err); }
});

router.get('/', authenticate, authorize('admin'), (_req, res, next) => {
  try {
    const rows = db.prepare(
      `SELECT a.*, u.full_name, u.email, u.phone FROM agents a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC`
    ).all();
    res.json(rows);
  } catch (err: any) { next(err); }
});

router.post('/:id/bookings', authenticate, authorize('agent'), (req, res, next) => {
  try {
    const agent = db.prepare(`SELECT id FROM agents WHERE user_id = ?`).get(req.user!.userId) as any;
    if (!agent) return res.status(403).json({ error: '非業務身份' });
    const booking = createBooking(req.body, req.body.memberId || null, agent.id);
    res.status(201).json(booking);
  } catch (err: any) { next(err); }
});

router.get('/:id/commission', authenticate, authorize('agent'), (req, res, next) => {
  try {
    const agent = db.prepare(`SELECT id FROM agents WHERE user_id = ?`).get(req.user!.userId) as any;
    const rows = db.prepare(
      `SELECT cr.*, b.reference_code, b.total_price FROM commission_records cr JOIN bookings b ON cr.booking_id = b.id WHERE cr.agent_id = ? ORDER BY cr.created_at DESC`
    ).all(agent.id);
    res.json(rows);
  } catch (err: any) { next(err); }
});

export default router;
