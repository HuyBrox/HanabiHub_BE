import { Router } from "express";
import {
  getCurrentUser,
  getUser,
  getUsers,
  updateUser,
  changePassword,
  deleteUser,
  changeEmail,
  getUserStats,
  getUserCourses,
  getWeeklyProgress,
  getUserAchievements,
  getUserInsights,
  searchUsers,
  followUser,
  unfollowUser,
  getFriends,
  getMyFriends,
} from "../controllers/user.controller";
import { isAuth, isAdmin } from "../middleware/isAuth";
import { validate, updateUserSchema } from "../validators";
import upload from "../middleware/multer";
const router = Router();

// Lấy thông tin user

// Lấy thông tin user hiện tại
router.get("/profile", isAuth, getCurrentUser);

// Profile stats endpoints - PHẢI đặt TRƯỚC route /profile/:id để tránh conflict
router.get("/profile/stats", isAuth, getUserStats);
router.get("/profile/courses", isAuth, getUserCourses);
router.get("/profile/weekly-progress", isAuth, getWeeklyProgress);
router.get("/profile/achievements", isAuth, getUserAchievements);
router.get("/profile/insights", isAuth, getUserInsights);

// Lấy thông tin user theo id - PHẢI đặt SAU các route cụ thể
router.get("/profile/:id", isAuth, getUser);

// Follow/Unfollow user
router.post("/:id/follow", isAuth, followUser);
router.delete("/:id/follow", isAuth, unfollowUser);

// Lấy danh sách bạn bè
router.get("/friends/me", isAuth, getMyFriends); // Phải đặt TRƯỚC /friends/:id
router.get("/friends/:id", isAuth, getFriends);

// Lấy danh sách user (phân trang)
router.get("/getAll", isAuth, getUsers);
// Tìm kiếm user
router.get("/search", isAuth, searchUsers);
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
