import { Router } from 'express';
import * as pricingCtrl from '../controllers/pricing.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/calculate', pricingCtrl.calculate);
router.get('/rules', pricingCtrl.getRules);
router.post('/rules', authenticate, authorize('admin'), pricingCtrl.createRule);

export default router;
