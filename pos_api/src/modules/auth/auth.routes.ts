import { Router } from 'express';
import { loginController, meController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { loginSchema } from './auth.validation';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/login', validate(loginSchema), loginController);
router.get('/me', authMiddleware, meController);

export default router;