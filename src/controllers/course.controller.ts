import { uploadVideo } from "../helpers/upload-media";
import { AuthRequest } from "../types/express.types";
import Course from "../models/course.model";
import Lesson from "../models/lesson.model";
import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/user.model";

// Lấy tất cả khoá học
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const courses = await Course.find().populate({
      path: "lessons",
      model: "Lesson",
    });
    res.json({ success: true, data: courses });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message });
  }
};

// Lấy chi tiết khoá học
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.id).populate({
      path: "lessons",
      model: "Lesson",
    });
    if (!course) {
      res
        .status(404)
        .json({ success: false, message: "Không tìm thấy khoá học" });
      return;
    }
    res.json({ success: true, data: course });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message });
    return;
  }
};

// Thêm bài học mới vào khoá học
export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, title, type, content, videoUrl, videoType, jsonTask } =
      req.body;
    let finalVideoUrl = videoUrl;
    let finalVideoType = videoType;
    let taskType = null;

    // Nếu là bài học video và upload file
    if (type === "video" && req.file) {
      finalVideoUrl = await uploadVideo({ buffer: req.file.buffer });
      finalVideoType = "upload";
    }
    // Nếu là bài học video và dán link thì mặc định là youtube
    else if (type === "video" && videoUrl) {
      finalVideoType = "youtube";
    }

    // Nếu là bài học task, parse taskType từ jsonTask
    if (type === "task" && jsonTask) {
      const parsedTask =
        typeof jsonTask === "string" ? JSON.parse(jsonTask) : jsonTask;
      taskType = parsedTask.type; // Lấy type từ JSON (multiple_choice, fill_blank, ...)
    }

    const lesson = new Lesson({
      title,
      type,
      content,
      videoUrl: finalVideoUrl,
      videoType: finalVideoType,
      jsonTask:
        type === "task"
          ? typeof jsonTask === "string"
            ? JSON.parse(jsonTask)
            : jsonTask
          : undefined,
      taskType: taskType,
    });
    await lesson.save();

    // Thêm lesson vào khoá học
    await Course.findByIdAndUpdate(courseId, {
      $push: { lessons: lesson._id },
    });

    res.json({ success: true, data: lesson });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message });
  }
};

// Cập nhật bài học
export const updateLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId, title, type, content, videoUrl, videoType, jsonTask } =
      req.body;
    let finalVideoUrl = videoUrl;
    let finalVideoType = videoType;
    let taskType = null;

    // Nếu là bài học video và upload file
    if (type === "video" && req.file) {
      finalVideoUrl = await uploadVideo({ buffer: req.file.buffer });
      finalVideoType = "upload";
    }
    // Nếu là bài học video và dán link thì mặc định là youtube
    else if (type === "video" && videoUrl) {
      finalVideoType = "youtube";
    }

    // Nếu là bài học task, parse taskType từ jsonTask
    if (type === "task" && jsonTask) {
      const parsedTask =
        typeof jsonTask === "string" ? JSON.parse(jsonTask) : jsonTask;
      taskType = parsedTask.type;
    }

    const lesson = await Lesson.findByIdAndUpdate(
      lessonId,
      {
        title,
        type,
        content,
        videoUrl: finalVideoUrl,
        videoType: finalVideoType,
        jsonTask:
          type === "task"
            ? typeof jsonTask === "string"
              ? JSON.parse(jsonTask)
              : jsonTask
            : undefined,
        taskType: taskType,
      },
      { new: true }
    );
    res.json({ success: true, data: lesson });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message });
  }
};

// Xoá bài học
export const deleteLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId, courseId } = req.body;
    await Lesson.findByIdAndDelete(lessonId);
    await Course.findByIdAndUpdate(courseId, { $pull: { lessons: lessonId } });
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message });
  }
};

// Tạo khoá học mới (Admin only)
export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, thumbnail, level } = req.body;
    const course = new Course({
      title,
      description,
      thumbnail,
      level,
      lessons: [],
    });
    await course.save();
    res.json({ success: true, data: course });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message });
  }
};

// Cập nhật khoá học (Admin only)
export const updateCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, title, description, thumbnail, level } = req.body;
    const course = await Course.findByIdAndUpdate(
      courseId,
      {
        title,
        description,
        thumbnail,
        level,
      },
      { new: true }
    ).populate({
      path: "lessons",
      model: "Lesson",
    });
    if (!course) {
      res
        .status(404)
        .json({ success: false, message: "Không tìm thấy khoá học" });
      return;
    }
    res.json({ success: true, data: course });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message });
    return;
  }
};

// Xoá khoá học (Admin only)
export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course) {
      res
        .status(404)
        .json({ success: false, message: "Không tìm thấy khoá học" });
      return;
    }
    // Xoá tất cả bài học trong khoá học
    await Lesson.deleteMany({ _id: { $in: course.lessons } });
    // Xoá khoá học
    await Course.findByIdAndDelete(courseId);
    res.json({ success: true, message: "Đã xoá khoá học và tất cả bài học" });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message });
    return;
  }
};
