import { Router } from 'express';
import * as bookingCtrl from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', bookingCtrl.create);
router.get('/track/:referenceCode', bookingCtrl.track);
router.get('/recent-addresses', authenticate, bookingCtrl.recentAddresses);
router.get('/', authenticate, bookingCtrl.list);
router.get('/:id', authenticate, bookingCtrl.getById);
router.post('/:id/cancel', authenticate, bookingCtrl.cancel);
router.put('/:id/status', authenticate, bookingCtrl.updateStatus);

export default router;
