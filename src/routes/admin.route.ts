import express from "express";
import {
  getAdminDashboard,
  createAdminUser,
  getPopularCourses,
  getRecentUserActivities,
} from "../controllers/admin.controller";
import { isAdmin } from "../middleware/isAuth";

const router = express.Router();

// Admin dashboard
router.get("/dashboard", isAdmin, getAdminDashboard);

// Tạo admin mới
router.post("/create-admin", isAdmin, createAdminUser);

//Khóa học phổ biến
router.get("/popular-courses", isAdmin, getPopularCourses);

// Hoạt động gần đây của users (có phân trang)
router.get("/recent-activities", isAdmin, getRecentUserActivities);

export default router;
