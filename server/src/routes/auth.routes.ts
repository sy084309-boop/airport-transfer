import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);
router.get('/me', authenticate, authCtrl.me);

export default router;
