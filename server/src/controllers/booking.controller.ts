import { Request, Response, NextFunction } from 'express';
import * as bookingService from '../services/booking.service';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result: any = await bookingService.createBooking(
      req.body,
      req.user?.userId,
      req.body.agentId
    );
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    res.status(201).json(result);
  } catch (err: any) {
    next(err);
  }
}

export async function track(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.trackByReference(req.params.referenceCode);
    res.json(booking);
  } catch (err: any) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    res.json(booking);
  } catch (err: any) {
    next(err);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.cancelBooking(req.params.id, req.user!.userId, req.body.reason);
    res.json(booking);
  } catch (err: any) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.updateBookingStatus(
      req.params.id,
      req.body.status,
      req.user!.userId,
      req.body.note
    );
    res.json(booking);
  } catch (err: any) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    // 會員只能看自己的訂單，管理員/代理看全部
    const filters: any = { ...req.query };
    if (req.user!.role === 'member') {
      filters.memberId = req.user!.userId;
    }
    const bookings = await bookingService.listBookings(filters);
    res.json(bookings);
  } catch (err: any) {
    next(err);
  }
}

/** GET /api/bookings/recent-addresses */
export async function recentAddresses(req: Request, res: Response, next: NextFunction) {
  try {
    const addresses = await bookingService.getRecentAddresses(req.user!.userId);
    res.json({ addresses });
  } catch (err: any) {
    next(err);
  }
}
