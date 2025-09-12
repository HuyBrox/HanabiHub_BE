import { Router, Request, Response } from 'express';
import userRoutes from './user.route';
import authRoutes from './auth.route';
import postRoutes from './post.route';

const router: Router = Router();

// Auth routes
router.use('', authRoutes);
// User routes
router.use('/users', userRoutes);
// Post routes
router.use('/posts', postRoutes);

export default router;
