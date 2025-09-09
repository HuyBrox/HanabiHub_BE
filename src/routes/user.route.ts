import { Router } from 'express';
import { getUser, updateUser } from '../controllers/user.controller';
import { isAuth } from '../middleware/isAuth';
import { validate, updateUserSchema } from '@/validators';

const router = Router();

// Lấy thông tin user
router.get('/:id', isAuth, getUser);

// Cập nhật thông tin user
router.patch('/:id', isAuth, validate(updateUserSchema), updateUser);

export default router;
