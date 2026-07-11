import { Router } from 'express';
import { arrivals, departures, search, validate, validateEnhanced } from '../controllers/flight.controller';

const router = Router();

router.get('/arrivals', arrivals);
router.get('/departures', departures);
router.get('/search', search);
router.get('/validate', validate);
router.get('/validate-enhanced', validateEnhanced);

export default router;
