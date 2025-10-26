import {
  uploadVideo,
  uploadImage,
  deleteMediaById,
  uploadAudio,
} from "../helpers/upload-media";
import { AuthRequest } from "../types/express.types";
import Course from "../models/course.model";
import Lesson from "../models/lesson.model";
import Comment from "../models/comment.model";
import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/user.model";
import { ApiResponse } from "../types";

// Lấy tất cả khoá học
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      Course.find()
        .populate("instructor", "fullname username avatar")
        .populate({
          path: "lessons",
          model: "Lesson",
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }), // Sắp xếp mới nhất trước
      Course.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách khoá học thành công",
      data: {
        courses,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// Lấy chi tiết khoá học
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("instructor", "fullname username avatar email")
      .populate({
        path: "lessons",
        model: "Lesson",
        populate: {
          path: "userCompleted",
          select: "_id", // Only need userId for checking completion
        },
      })
      .populate("students", "fullname username avatar");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khoá học",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin khoá học thành công",
      data: course,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error fetching course:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// Thêm bài học mới vào khoá học
export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, title, type, content, videoUrl, videoType, jsonTask } =
      req.body;

    // Validate required fields
    if (!courseId || !title || !type || !content) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc (courseId, title, type, content)",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra course có tồn tại không
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khoá học",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    let finalVideoUrl = videoUrl;
    let finalVideoType = videoType || "youtube";
    let taskType = null;

    // Nếu là bài học video
    if (type === "video") {
      if (req.file) {
        // Upload video file
        finalVideoUrl = await uploadVideo({ buffer: req.file.buffer });
        finalVideoType = "upload";
      } else if (videoUrl) {
        // Dùng link youtube
        finalVideoType = "youtube";
      } else {
        return res.status(400).json({
          success: false,
          message: "Bài học video cần có videoUrl hoặc upload file",
          data: null,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    }

    // Nếu là bài học task, parse taskType từ jsonTask
    if (type === "task") {
      if (!jsonTask) {
        return res.status(400).json({
          success: false,
          message: "Bài học task cần có jsonTask",
          data: null,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
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
          : null,
      taskType: taskType,
      userCompleted: [],
      Comments: [],
    });

    await lesson.save();

    // Thêm lesson vào khoá học
    await Course.findByIdAndUpdate(courseId, {
      $push: { lessons: lesson._id },
    });

    return res.status(201).json({
      success: true,
      message: "Tạo bài học thành công",
      data: lesson,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error creating lesson:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// Cập nhật bài học
export const updateLesson = async (req: AuthRequest, res: Response) => {
  try {
    const lessonId = req.params.id;
    const { title, type, content, videoUrl, videoType, jsonTask } = req.body;

    // Tìm lesson hiện tại
    const existingLesson = await Lesson.findById(lessonId);
    if (!existingLesson) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài học",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Chỉ update các field được gửi lên
    const updateFields: Record<string, any> = {};

    if (title !== undefined) updateFields.title = title;
    if (type !== undefined) updateFields.type = type;
    if (content !== undefined) updateFields.content = content;

    const currentType = type || existingLesson.type;

    // Xử lý video
    if (currentType === "video") {
      if (req.file) {
        // Xóa video cũ nếu là upload (không phải youtube)
        if (existingLesson.videoType === "upload" && existingLesson.videoUrl) {
          try {
            const matches = existingLesson.videoUrl.match(
              /\/([^\/]+)\.[a-zA-Z0-9]+$/
            );
            if (matches && matches[1]) {
              await deleteMediaById(matches[1], "video");
            }
          } catch (err) {
            console.error("Lỗi xóa video cũ:", err);
          }
        }
        // Upload video mới
        updateFields.videoUrl = await uploadVideo({ buffer: req.file.buffer });
        updateFields.videoType = "upload";
      } else if (videoUrl !== undefined) {
        updateFields.videoUrl = videoUrl;
        updateFields.videoType = videoType || "youtube";
      }
    }

    // Xử lý task
    if (currentType === "task") {
      if (jsonTask !== undefined) {
        const parsedTask =
          typeof jsonTask === "string" ? JSON.parse(jsonTask) : jsonTask;
        updateFields.jsonTask = parsedTask;
        updateFields.taskType = parsedTask.type;
      }
      // Xóa video fields nếu chuyển sang task
      updateFields.videoUrl = null;
      updateFields.videoType = null;
    } else {
      // Xóa task fields nếu chuyển sang video
      updateFields.jsonTask = null;
      updateFields.taskType = null;
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(
      lessonId,
      updateFields,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật bài học thành công",
      data: updatedLesson,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error updating lesson:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// Lấy chi tiết bài học
export const getLessonById = async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({
        success: false,
        message: "ID bài học không hợp lệ",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const lesson = await Lesson.findById(lessonId).populate(
      "userCompleted",
      "fullname username avatar"
    );

    // Query comments riêng biệt vì Comment model sử dụng dynamic reference
    const comments = await Comment.find({
      targetModel: "Lesson",
      targetId: lessonId,
    }).populate("author", "fullname username avatar");

    // Thêm comments vào lesson object
    if (lesson) {
      (lesson as any).Comments = comments;
    }

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài học",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin bài học thành công",
      data: lesson,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// Xoá bài học
export const deleteLesson = async (req: AuthRequest, res: Response) => {
  try {
    const lessonId = req.params.id;
    const { courseId } = req.body;

    // Validate
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu courseId",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Tìm lesson
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài học",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Xóa video trên cloud nếu là upload
    if (
      lesson.type === "video" &&
      lesson.videoType === "upload" &&
      lesson.videoUrl
    ) {
      try {
        const matches = lesson.videoUrl.match(/\/([^\/]+)\.[a-zA-Z0-9]+$/);
        if (matches && matches[1]) {
          await deleteMediaById(matches[1], "video");
        }
      } catch (err) {
        console.error("Lỗi xóa video:", err);
      }
    }

    // Xóa lesson khỏi course
    await Course.findByIdAndUpdate(courseId, { $pull: { lessons: lessonId } });

    // Xóa lesson
    await Lesson.findByIdAndDelete(lessonId);

    return res.status(200).json({
      success: true,
      message: "Xóa bài học thành công",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// Tạo khoá học mới (Admin only)
export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, price } = req.body;
    const userId = req.user?.id; // Admin tạo course sẽ là instructor

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc (title, description)",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    let thumbnailUrl = "https://i.postimg.cc/LXt5Hbnf/image.png"; // Default thumbnail

    // Xử lý thumbnail từ req.file nếu có
    const thumbnailFile = req.file;
    if (thumbnailFile && thumbnailFile.mimetype.startsWith("image/")) {
      thumbnailUrl = await uploadImage({ buffer: thumbnailFile.buffer });
    }

    const course = new Course({
      title,
      description,
      instructor: userId, // Admin tạo course
      price: price || 0,
      thumbnail: thumbnailUrl,
      lessons: [],
      students: [],
      ratings: [],
    });

    await course.save();

    // Populate instructor để trả về đầy đủ thông tin
    await course.populate("instructor", "fullname username email avatar");

    return res.status(201).json({
      success: true,
      message: "Tạo khoá học thành công",
      data: course,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error creating course:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// Cập nhật khoá học (Admin only)
export const updateCourse = async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khoá học",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Chỉ lấy các trường hợp hợp lệ từ body
    const updateFields: Record<string, any> = {};
    const allowedFields = ["title", "description", "price"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    });

    // Xử lý thumbnail từ req.file nếu có
    const thumbnailFile = req.file;
    if (thumbnailFile && thumbnailFile.mimetype.startsWith("image/")) {
      // Xóa thumbnail cũ nếu có và không phải default
      if (
        course.thumbnail &&
        course.thumbnail !== "https://i.postimg.cc/LXt5Hbnf/image.png"
      ) {
        try {
          const matches = course.thumbnail.match(/\/([^\/]+)\.[a-zA-Z]+$/);
          if (matches && matches[1]) {
            await deleteMediaById(matches[1], "image");
          }
        } catch (err) {
          console.error("Lỗi xóa thumbnail cũ:", err);
        }
      }
      // Upload thumbnail mới
      updateFields.thumbnail = await uploadImage({
        buffer: thumbnailFile.buffer,
      });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      updateFields,
      { new: true, runValidators: true }
    )
      .populate("instructor", "fullname username email avatar")
      .populate({
        path: "lessons",
        model: "Lesson",
      });

    return res.status(200).json({
      success: true,
      message: "Cập nhật khoá học thành công",
      data: updatedCourse,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error updating course:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// Xoá khoá học (Admin only)
export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khoá học",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Xoá thumbnail trên cloud nếu có và không phải default
    if (
      course.thumbnail &&
      course.thumbnail !== "https://i.postimg.cc/LXt5Hbnf/image.png"
    ) {
      try {
        const matches = course.thumbnail.match(/\/([^\/]+)\.[a-zA-Z]+$/);
        if (matches && matches[1]) {
          await deleteMediaById(matches[1], "image");
        }
      } catch (err) {
        console.error("Lỗi xóa thumbnail:", err);
      }
    }

    // Xoá tất cả bài học trong khoá học
    await Lesson.deleteMany({ _id: { $in: course.lessons } });

    // Xoá khoá học
    await Course.findByIdAndDelete(courseId);

    return res.status(200).json({
      success: true,
      message: "Đã xoá khoá học và tất cả bài học",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error deleting course:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const upLoadAudioForTask = async (req: AuthRequest, res: Response) => {
  try {
    const audioFile = req.file;

    if (!audioFile) {
      console.log("❌ Không có file audio");
      return res.status(400).json({
        success: false,
        message:
          "Không có file audio. Vui lòng gửi file với field name 'audio'",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Kiểm tra file có phải audio không
    if (!audioFile.mimetype.startsWith("audio/")) {
      console.log("❌ File không phải audio. Mimetype:", audioFile.mimetype);
      return res.status(400).json({
        success: false,
        message: `File phải là định dạng audio (mp3, wav, etc.). Mimetype hiện tại: ${audioFile.mimetype}`,
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    console.log("✅ Bắt đầu upload lên Cloudinary...");
    const audioUrl = await uploadAudio({ buffer: audioFile.buffer });
    console.log("✅ Upload thành công:", audioUrl);

    return res.status(200).json({
      success: true,
      message: "Upload audio thành công",
      data: { audioUrl },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("❌ Error uploading audio:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};