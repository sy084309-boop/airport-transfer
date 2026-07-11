import { Router } from 'express';
import authRoutes from './auth.routes';
import bookingRoutes from './booking.routes';
import pricingRoutes from './pricing.routes';
import adminRoutes from './admin.routes';
import driverRoutes from './driver.routes';
import agentRoutes from './agent.routes';
import flightRoutes from './flight.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/pricing', pricingRoutes);
router.use('/admin', adminRoutes);
router.use('/drivers', driverRoutes);
router.use('/agents', agentRoutes);
router.use('/flights', flightRoutes);

export default router;
