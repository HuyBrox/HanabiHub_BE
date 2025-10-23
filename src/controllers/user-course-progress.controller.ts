import { Response } from "express";
import { AuthRequest } from "../types/express.types";
import UserCourseProgress from "../models/user-course-progress.model";
import UserActivity from "../models/user-activity.model";
import Course from "../models/course.model";
import Lesson from "../models/lesson.model";
import mongoose from "mongoose";

/**
 * 📚 Controller quản lý tiến độ học tập của user trong từng khóa học
 */

/**
 * GET /api/courses/progress/:courseId
 * Lấy tiến độ học tập của user trong 1 khóa học
 */
export const getUserCourseProgress = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Tìm progress, nếu không có thì tạo mới
    let progress = await UserCourseProgress.findOne({ userId, courseId });

    if (!progress) {
      // Tạo progress mới
      progress = new UserCourseProgress({
        userId,
        courseId,
        status: "not_started",
      });
      await progress.save();
    }

    return res.json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    console.error("Error getting user course progress:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/courses/progress/:courseId/update-lesson
 * Cập nhật bài học hiện tại (resume checkpoint)
 */
export const updateCurrentLesson = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;
    const { lessonId, videoTimestamp, taskAnswers } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: "lessonId is required",
      });
    }

    // Tìm hoặc tạo progress
    let progress = await UserCourseProgress.findOne({ userId, courseId });

    if (!progress) {
      progress = new UserCourseProgress({
        userId,
        courseId,
      });
    }

    // Update current lesson
    progress.updateCurrentLesson(lessonId, videoTimestamp, taskAnswers);

    await progress.save();

    return res.json({
      success: true,
      message: "Current lesson updated",
      data: progress,
    });
  } catch (error: any) {
    console.error("Error updating current lesson:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/courses/progress/:courseId/complete-lesson
 * Đánh dấu bài học đã hoàn thành
 */
export const markLessonComplete = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;
    const { lessonId, score, maxScore } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: "lessonId is required",
      });
    }

    // Tìm hoặc tạo progress
    let progress = await UserCourseProgress.findOne({ userId, courseId });

    if (!progress) {
      progress = new UserCourseProgress({
        userId,
        courseId,
        status: "in_progress",
        startedAt: new Date(),
      });
    }

    // Mark lesson as completed
    progress.markLessonComplete(lessonId, score, maxScore);

    // Tính progress percentage
    const course = await Course.findById(courseId).populate("lessons");
    let courseCompleted = false;
    if (course && course.lessons) {
      const totalLessons = course.lessons.length;
      const completedCount = progress.completedLessons.length;
      progress.progressPercentage =
        totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

      // Nếu hoàn thành tất cả bài
      if (completedCount >= totalLessons) {
        progress.status = "completed";
        progress.completedAt = new Date();
        courseCompleted = true;
      }
    }

    await progress.save();

    // ✅ SYNC: Ensure UserActivity also marks this lesson as completed
    // This handles cases where markLessonComplete is called without trackTaskActivity/trackVideoActivity
    let activity = await UserActivity.findOne({ userId });
    if (activity) {
      const lessonActivityIndex = activity.lessonActivities.findIndex(
        (l: any) => l.lessonId.toString() === lessonId.toString()
      );

      if (lessonActivityIndex !== -1) {
        // Lesson exists in activity, ensure it's marked complete
        const lessonActivity = activity.lessonActivities[lessonActivityIndex];
        if (!lessonActivity.isCompleted) {
          lessonActivity.isCompleted = true;
          lessonActivity.completedAt = new Date();

          // Update daily stats to include this completion
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dayIndex = activity.dailyLearning.findIndex((day: any) => {
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate.getTime() === today.getTime();
          });

          if (dayIndex !== -1) {
            activity.dailyLearning[dayIndex].lessonsCompleted =
              (activity.dailyLearning[dayIndex].lessonsCompleted || 0) + 1;
          } else {
            activity.dailyLearning.push({
              date: today,
              totalStudyTime: 0,
              lessonsCompleted: 1,
              cardsReviewed: 0,
              cardsLearned: 0,
              correctRate: 0,
            });
          }

          await activity.save();
        }
      }

      // ✅ SYNC: If course was completed, update courseActivities
      if (courseCompleted) {
        const courseActivityIndex = activity.courseActivities.findIndex(
          (c: any) => c.courseId.toString() === courseId.toString()
        );

        if (courseActivityIndex !== -1) {
          activity.courseActivities[courseActivityIndex].isCompleted = true;
          activity.courseActivities[courseActivityIndex].completedAt = new Date();
          await activity.save();
        }
      }

      // If lesson doesn't exist in UserActivity, that's OK - it means it was tracked via old flow
      // We don't create it here to avoid data inconsistency
    }

    // Update Lesson.userCompleted array (for UI display)
    await Lesson.findByIdAndUpdate(
      lessonId,
      { $addToSet: { userCompleted: userId } }, // $addToSet prevents duplicates
      { new: true }
    );

    return res.json({
      success: true,
      message: "Lesson marked as completed",
      data: progress,
    });
  } catch (error: any) {
    console.error("Error marking lesson complete:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/courses/progress/my-progress
 * Lấy tất cả progress của user
 */
export const getAllUserProgress = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const allProgress = await UserCourseProgress.find({ userId }).populate(
      "courseId",
      "title description thumbnail level"
    );

    return res.json({
      success: true,
      data: allProgress,
    });
  } catch (error: any) {
    console.error("Error getting all user progress:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/courses/progress/:courseId/reset
 * Reset tiến độ khóa học (để học lại từ đầu)
 */
export const resetCourseProgress = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await UserCourseProgress.findOneAndDelete({ userId, courseId });

    // Remove userId from all lessons' userCompleted array in this course
    const course = await Course.findById(courseId).populate("lessons");
    if (course && course.lessons) {
      const lessonIds = course.lessons.map((lesson: any) => lesson._id);
      await Lesson.updateMany(
        { _id: { $in: lessonIds } },
        { $pull: { userCompleted: userId } }
      );
    }

    return res.json({
      success: true,
      message: "Course progress reset successfully",
    });
  } catch (error: any) {
    console.error("Error resetting course progress:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

