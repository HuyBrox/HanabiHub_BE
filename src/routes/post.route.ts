import { Router } from 'express';
import {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLikePost
} from '../controllers/post.controller';
import { isAuth } from '../middleware/isAuth';
import { rateLimitCreatePost, rateLimitLike } from '../middleware/rateLimiter';
import upload from '../middleware/multer';

const router = Router();

router.get('/', getAllPosts);
router.get('/:id', getPost);

router.post('/', isAuth, rateLimitCreatePost, upload.array('images', 10), createPost);
router.put('/:id', isAuth, updatePost);
router.delete('/:id', isAuth, deletePost);
router.post('/:id/like', isAuth, rateLimitLike, toggleLikePost);

export default router;
