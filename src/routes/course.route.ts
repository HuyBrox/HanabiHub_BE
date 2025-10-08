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
} from "../controllers/course.controller";
import { isAuth, isAdmin } from "../middleware/isAuth";
import multer from "../middleware/multer";

const router = express.Router();

// Lấy tất cả khoá học (Public)
router.get("/", getAllCourses);

// Lấy chi tiết khoá học (Public)
router.get("/:id", getCourseById);

// Tạo mới khoá học (Admin only)
router.post("/", isAuth, isAdmin, createCourse);

// Cập nhật khoá học (Admin only)
router.put("/:id", isAuth, isAdmin, updateCourse);

// Xoá khoá học (Admin only)
router.delete("/:id", isAuth, isAdmin, deleteCourse);

// Thêm bài học mới vào khoá học (Admin only, có thể upload video)
router.post("/lesson", isAuth, isAdmin, multer.single("video"), createLesson);

// Cập nhật bài học (Admin only, có thể upload video)
router.put(
  "/lesson/:id",
  isAuth,
  isAdmin,
  multer.single("video"),
  updateLesson
);

// Xoá bài học (Admin only)
router.delete("/lesson/:id", isAuth, isAdmin, deleteLesson);

export default router;
