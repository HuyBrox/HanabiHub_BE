import express from "express";
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  getLessonById,
  upLoadAudioForTask,
  rateCourse,
} from "../controllers/course.controller";
import { isAuth, isAdmin } from "../middleware/isAuth";
import multer from "../middleware/multer";

const router = express.Router();

//========================Khóa học=========================
// Lấy tất cả khoá học (Public)
router.get("/", isAuth, getAllCourses);

// Lấy chi tiết khoá học (Public)
router.get("/:id", isAuth, getCourseById);

// Tạo mới khoá học (Admin only) - Route cụ thể /create để tránh conflict với /:id
// Đặt trước các route có params để đảm bảo khớp đúng
router.post("/create", isAdmin, multer.single("thumbnail"), createCourse);
// Route cũ vẫn giữ để backward compatibility
router.post("/", isAdmin, multer.single("thumbnail"), createCourse);

// Đánh giá khóa học (Auth required)
router.post("/:id/rate", isAuth, rateCourse);

// Cập nhật khoá học (Admin only)
router.put("/:id", isAdmin, multer.single("thumbnail"), updateCourse);

// Xoá khoá học (Admin only)
router.delete("/:id", isAdmin, deleteCourse);

//========================Bài học=========================
// Upload audio cho task (Admin only) - Đặt trước các route có params
router.post(
  "/lesson/upload-audio",
  isAdmin,
  multer.single("audio"),
  upLoadAudioForTask
);

// Lấy chi tiết bài học (Public)
router.get("/lesson/:id", isAuth, getLessonById);

// Thêm bài học mới vào khoá học (Admin only, có thể upload video)
router.post("/lesson", isAdmin, multer.single("video"), createLesson);
// Cập nhật bài học (Admin only, có thể upload video)
router.put("/lesson/:id", isAdmin, multer.single("video"), updateLesson);

// Xoá bài học (Admin only)
router.delete("/lesson/:id", isAdmin, deleteLesson);

//=========================================================
export default router;
