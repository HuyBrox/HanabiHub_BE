import express from "express";
import { isAuth } from "../middleware/isAuth";
import {
  getUserCourseProgress,
  updateCurrentLesson,
  markLessonComplete,
  getAllUserProgress,
  resetCourseProgress,
} from "../controllers/user-course-progress.controller";

const router = express.Router();

/**
 * 📚 Routes quản lý tiến độ học tập của user
 * Tất cả routes đều yêu cầu authentication
 */

// Lấy tất cả progress của user
router.get("/my-progress", isAuth, getAllUserProgress);

// Lấy progress của 1 khóa học cụ thể
router.get("/progress/:courseId", isAuth, getUserCourseProgress);

// Cập nhật bài học hiện tại (checkpoint)
router.post("/progress/:courseId/update-lesson", isAuth, updateCurrentLesson);

// Đánh dấu bài học đã hoàn thành
router.post("/progress/:courseId/complete-lesson", isAuth, markLessonComplete);

// Reset tiến độ khóa học
router.post("/progress/:courseId/reset", isAuth, resetCourseProgress);

export default router;

