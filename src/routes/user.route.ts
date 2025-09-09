import { Router } from 'express';
import { getUser, updateUser } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/isAuth';

const router = Router();

// Lấy thông tin user
router.get('/:id', authMiddleware, getUser);

// Cập nhật thông tin user
router.put('/:id', authMiddleware, updateUser);

export default router;
