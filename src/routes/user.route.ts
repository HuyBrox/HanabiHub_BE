import { Router } from "express";
import {
  getCurrentUser,
  getUser,
  updateUser,
} from "../controllers/user.controller";
import { isAuth } from "../middleware/isAuth";
import { validate, updateUserSchema } from "../validators";
import upload from "../middleware/multer";
const router = Router();

// Lấy thông tin user
router.get("/profile", isAuth, getCurrentUser);
router.get("/:id", isAuth, getUser);

// Cập nhật thông tin user
router.patch(
  "/profile/:id",
  isAuth,
  validate(updateUserSchema),
  upload.single("avatar"),
  updateUser
);

export default router;
