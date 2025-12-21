import { Router } from "express";
import {
  getCommentsByPost,
  createComment,
  updateComment,
  deleteComment,
  toggleLikeComment,
} from "../controllers/comment.controller";
import { isAuth } from "../middleware/isAuth";
import {
  rateLimitCreateComment,
  rateLimitLike,
} from "../middleware/rateLimiter";

const router = Router();

router.get("/post/:postId", getCommentsByPost);
router.post("/", isAuth, rateLimitCreateComment, createComment);
router.put("/:id", isAuth, updateComment);
router.delete("/:id", isAuth, deleteComment);
router.post("/:id/like", isAuth, rateLimitLike, toggleLikeComment);

export default router;

