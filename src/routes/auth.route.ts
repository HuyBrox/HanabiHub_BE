import { Router, Request, Response } from 'express';
import { register, login } from '../controllers/auth.controller';
import { validate, registerSchema, loginSchema } from '../validators';

const router = Router();

router.post('/auth/register', validate(registerSchema), register);
router.post('/auth/login', validate(loginSchema), login);

export default router;