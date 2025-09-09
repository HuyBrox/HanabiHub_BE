import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types';
import { register, login } from '../controllers/auth.controller';
import userRoutes from './user.route';

const router: Router = Router();

// Health check route
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Hanabi API is running',
    data: null,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Auth routes
router.post('/auth/register', register);
router.post('/auth/login', login);

// User routes
router.use('/users', userRoutes);

export default router;
