// pos_api/src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { loginController, logoutController, meController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { loginSchema } from './auth.validation';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { loginRateLimit } from '../../middlewares/rate-limit.middleware';

const router = Router();

router.post('/login', loginRateLimit, validate(loginSchema), loginController);
router.get('/me', authMiddleware, meController);
router.post('/logout', logoutController);

export default router;
