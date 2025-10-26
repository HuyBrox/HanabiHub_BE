import { Router } from "express";
import {
  getCurrentUser,
  getUser,
  getUsers,
  updateUser,
  changePassword,
  deleteUser,
  changeEmail,
  searchUsers,
  getUserStats,
} from "../controllers/user.controller";
import { isAuth, isAdmin } from "../middleware/isAuth";
import { validate, updateUserSchema } from "../validators";
import upload from "../middleware/multer";
const router = Router();

// Lấy thông tin user

// Lấy thông tin user hiện tại
router.get("/profile", isAuth, getCurrentUser);
// Lấy thông tin user theo id
router.get("/profile/:id", isAuth, getUser);
// Lấy danh sách user (phân trang)
router.get("/getAll", isAuth, getUsers);
// Cập nhật thông tin user hiện tại
router.patch(
  "/change-profile",
  isAuth,
  validate(updateUserSchema),
  upload.single("avatar"),
  updateUser
);
// Đổi mật khẩu
router.patch("/change-password", isAuth, changePassword);
// Xóa user hiện tại
router.delete("/", isAuth, deleteUser);
// Thay đổi email
router.patch("/change-email", isAuth, changeEmail);

// Admin routes for user management
// Tìm kiếm users cho admin (gửi thông báo)
router.get("/search", isAdmin, searchUsers);
// Thống kê users cho admin
router.get("/stats", isAdmin, getUserStats);

export default router;
