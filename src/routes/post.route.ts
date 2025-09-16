import { Router } from 'express';
import {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLikePost
} from '../controllers/post.controller';
// import { isAuth } from '../middleware/isAuth'; // Uncomment khi có middleware

const router = Router();

// Public routes
router.get('/', getAllPosts);           // GET /api/posts
router.get('/:id', getPost);            // GET /api/posts/:id

// Protected routes (cần authentication)
// Uncomment các dòng middleware khi đã có isAuth
router.post('/', /* isAuth, */ createPost);         // POST /api/posts
router.put('/:id', /* isAuth, */ updatePost);       // PUT /api/posts/:id
router.delete('/:id', /* isAuth, */ deletePost);    // DELETE /api/posts/:id
router.post('/:id/like', /* isAuth, */ toggleLikePost); // POST /api/posts/:id/like

export default router;
