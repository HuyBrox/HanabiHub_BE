import { Response } from "express";
import { AuthRequest } from "../types/express.types";
import UserActivity from "../models/user-activity.model";
import { queueLearningUpdate } from "../middleware/learning-tracker";
import mongoose from "mongoose";

/**
 * 🎯 Controller để FE gửi activities lên (âm thầm track user behavior)
 * FE sẽ gọi các endpoints này để log hoạt động học tập
 */

/**
 * 📹 Track khi user xem video lesson
 * POST /api/user-activity/track-video
 */
export const trackVideoActivity = async (
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
    const {
      courseId,
      lessonId,
      lessonTitle,
      totalDuration, // seconds : độ dài video
      watchedDuration, // seconds : thời gian đã xem
      isWatchedCompletely, // boolean : đã xem hết video chưa
      watchCount = 1, // số lần xem
      completedAt, // thời gian hoàn thành
    } = req.body;

    // Validation
    if (!lessonId || !totalDuration) {
      return res.status(400).json({
        success: false,
        message: "lessonId and totalDuration are required",
      });
    }

    // Tìm hoặc tạo UserActivity
    let activity = await UserActivity.findOne({ userId });
    if (!activity) {
      activity = new UserActivity({ userId });
    }

    // Tìm lesson đã tồn tại chưa
    const existingLessonIndex = activity.lessonActivities.findIndex(
      (l: any) => l.lessonId.toString() === lessonId.toString()
    );

    const lessonData = {
      courseId: courseId ? new mongoose.Types.ObjectId(courseId) : undefined,
      lessonId: new mongoose.Types.ObjectId(lessonId),
      lessonTitle,
      lessonType: "video" as const,
      isCompleted: isWatchedCompletely || false,
      completedAt: isWatchedCompletely
        ? completedAt
          ? new Date(completedAt)
          : new Date()
        : undefined,
      attempts: watchCount,
      timeSpent: watchedDuration || 0,
      videoData: {
        totalDuration,
        watchedDuration: watchedDuration || 0,
        isWatchedCompletely: isWatchedCompletely || false,
        watchCount,
      },
    };

    if (existingLessonIndex !== -1) {
      // Update existing
      const existing = activity.lessonActivities[existingLessonIndex];
      Object.assign(existing, {
        ...lessonData,
        attempts: (existing.attempts || 0) + 1,
      });
    } else {
      // Add new
      activity.lessonActivities.push(lessonData as any);
    }

    // Update daily stats
    updateDailyStats(activity, watchedDuration || 0);

    // Update course access
    if (courseId) {
      updateCourseAccess(activity, courseId);
    }

    // Save
    await activity.save();

    // ✅ Queue learning insights update (debounced, with error handling)
    try {
      await queueLearningUpdate(userId.toString());
    } catch (queueError) {
      console.error("Failed to queue learning update:", queueError);
      // Don't throw - activity already saved
    }

    return res.json({
      success: true,
      message: "Video activity tracked",
    });
  } catch (error: any) {
    console.error("Error tracking video activity:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 📝 Track khi user làm task/quiz lesson
 * POST /api/user-activity/track-task
 */
export const trackTaskActivity = async (
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
    const {
      courseId,
      lessonId,
      lessonTitle,
      score, // điểm số của bài làm
      maxScore = 100, // mặc định 100
      correctAnswers, // số câu đúng
      totalQuestions, // tổng số câu
      timeSpent = 0, // thời gian làm bài (seconds)
      completedAt, // thời gian hoàn thành (thời điểm hoàn thành bài nếu đạt)
    } = req.body;

    // Validation
    if (!lessonId || score === undefined) {
      return res.status(400).json({
        success: false,
        message: "lessonId and score are required",
      });
    }

    let activity = await UserActivity.findOne({ userId });
    if (!activity) {
      activity = new UserActivity({ userId });
    }

    const existingLessonIndex = activity.lessonActivities.findIndex(
      (l: any) => l.lessonId.toString() === lessonId.toString()
    );

    const isPassed = score >= maxScore * 0.6; // 60% để pass
    const lessonData = {
      courseId: courseId ? new mongoose.Types.ObjectId(courseId) : undefined,
      lessonId: new mongoose.Types.ObjectId(lessonId),
      lessonTitle,
      lessonType: "task" as const,
      isCompleted: isPassed,
      completedAt: isPassed
        ? completedAt
          ? new Date(completedAt)
          : new Date()
        : undefined,
      attempts: 1,
      timeSpent,
      taskData: {
        score,
        maxScore,
        correctAnswers,
        totalQuestions,
        attempts: 1,
      },
    };

    if (existingLessonIndex !== -1) {
      // Update existing
      const existing = activity.lessonActivities[existingLessonIndex];
      Object.assign(existing, {
        ...lessonData,
        attempts: (existing.attempts || 0) + 1,
        taskData: {
          ...(lessonData.taskData as any),
        },
      });
    } else {
      activity.lessonActivities.push(lessonData as any);
    }

    // Update daily stats
    updateDailyStats(activity, timeSpent);

    // Update course access
    if (courseId) {
      updateCourseAccess(activity, courseId);
    }

    await activity.save();

    // ✅ Queue update
    try {
      await queueLearningUpdate(userId.toString());
    } catch (queueError) {
      console.error("Failed to queue learning update:", queueError);
    }

    return res.json({
      success: true,
      message: "Task activity tracked",
      passed: isPassed,
    });
  } catch (error: any) {
    console.error("Error tracking task activity:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 🎴 Track flashcard session để theo dõi hoạt động học tập khi user/.....
 * POST /api/user-activity/track-flashcard-session
 */
export const trackFlashcardSession = async (
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
    const {
      flashcardId,
      cardsStudied, // số thẻ đã học
      correctAnswers, // số câu đúng
      sessionDuration, // seconds
      difficulty, // 'again' | 'hard' | 'good' | 'easy'
      studiedAt, // thời gian học (nếu không có thì lấy thời gian hiện tại)
    } = req.body;

    if (!flashcardId || !cardsStudied) {
      return res.status(400).json({
        success: false,
        message: "flashcardId and cardsStudied are required",
      });
    }

    let activity = await UserActivity.findOne({ userId });
    if (!activity) {
      activity = new UserActivity({ userId });
    }

    // Add session
    activity.flashcardSessions.push({
      contentType: "flashcard",
      contentId: new mongoose.Types.ObjectId(flashcardId),
      cardsStudied,
      correctAnswers: correctAnswers || 0,
      sessionDuration: sessionDuration || 0,
      difficulty,
      studiedAt: studiedAt ? new Date(studiedAt) : new Date(),
    } as any);

    // Update daily stats
    updateDailyStats(activity, sessionDuration || 0, cardsStudied);

    await activity.save();

    // ✅ Queue update
    try {
      await queueLearningUpdate(userId.toString());
    } catch (queueError) {
      console.error("Failed to queue learning update:", queueError);
    }

    return res.json({
      success: true,
      message: "Flashcard session tracked",
    });
  } catch (error: any) {
    console.error("Error tracking flashcard session:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 🃏 Track individual card learning: nghĩa là đã học thuộc thẻ hay chưa
 * POST /api/user-activity/track-card
 */
export const trackCardLearning = async (
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
    const {
      cardId,
      flashcardId,
      isCorrect, // đã đúng hay chưa
      responseTime, // milliseconds
      difficulty, // 'again' | 'hard' | 'good' | 'easy'
      reviewCount = 1,
      studiedAt, // thời gian học (nếu không có thì lấy thời gian hiện tại)
    } = req.body;

    if (!cardId || !flashcardId) {
      return res.status(400).json({
        success: false,
        message: "cardId and flashcardId are required",
      });
    }

    let activity = await UserActivity.findOne({ userId });
    if (!activity) {
      activity = new UserActivity({ userId });
    }

    // Determine mastery level
    let masteryLevel: "learning" | "reviewing" | "mastered" = "learning";
    if (difficulty === "easy" || (isCorrect && reviewCount >= 3)) {
      masteryLevel = "mastered";
    } else if (isCorrect && reviewCount >= 2) {
      masteryLevel = "reviewing";
    } else {
      masteryLevel = "learning";
    }

    // Add or update card learning
    activity.cardLearning.push({
      cardId: new mongoose.Types.ObjectId(cardId), // luôn lưu ObjectId
      flashcardId: new mongoose.Types.ObjectId(flashcardId),
      isCorrect: isCorrect || false,
      masteryLevel,
      responseTime,
      difficulty,
      reviewCount,
      studiedAt: studiedAt ? new Date(studiedAt) : new Date(),
    } as any);

    await activity.save();

    // ✅ Queue update
    try {
      await queueLearningUpdate(userId.toString());
    } catch (queueError) {
      console.error("Failed to queue learning update:", queueError);
    }

    return res.json({
      success: true,
      message: "Card learning tracked",
      masteryLevel,
    });
  } catch (error: any) {
    console.error("Error tracking card learning:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 📚 Track course access (enroll, continue)
 * POST /api/user-activity/track-course-access
 */
export const trackCourseAccessActivity = async (
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
    const { courseId, action, isCompleted } = req.body; // action: 'enroll' | 'continue' | 'complete'

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "courseId is required",
      });
    }

    let activity = await UserActivity.findOne({ userId });
    if (!activity) {
      activity = new UserActivity({ userId });
    }

    updateCourseAccess(activity, courseId, isCompleted);

    await activity.save();

    // ✅ Queue update
    try {
      await queueLearningUpdate(userId.toString());
    } catch (queueError) {
      console.error("Failed to queue learning update:", queueError);
    }

    return res.json({
      success: true,
      message: `Course ${action || "access"} tracked`,
    });
  } catch (error: any) {
    console.error("Error tracking course access:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 📊 Get user activity summary (optional, for debugging)
 * GET /api/user-activity/summary
 */
export const getActivitySummary = async (
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

    const activity = await UserActivity.findOne({ userId });

    if (!activity) {
      return res.json({
        success: true,
        data: {
          totalLessons: 0,
          totalFlashcardSessions: 0,
          totalCardsLearned: 0,
          totalDays: 0,
          totalTimeSpent: 0,
          coursesCount: 0,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        totalLessons: activity.lessonActivities.length,
        totalFlashcardSessions: activity.flashcardSessions.length,
        totalCardsLearned: activity.cardLearning.length,
        totalDays: activity.dailyLearning.length,
        totalTimeSpent: activity.dailyLearning.reduce(
          (sum: number, day: any) => sum + (day.timeSpent || 0),
          0
        ),
        coursesCount: activity.courseActivities.length,
      },
    });
  } catch (error: any) {
    console.error("Error getting activity summary:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 🗑️ Clear user activity (for testing)
 * DELETE /api/user-activity/clear
 */
export const clearUserActivity = async (
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

    await UserActivity.deleteOne({ userId });

    return res.json({
      success: true,
      message: "User activity cleared",
    });
  } catch (error: any) {
    console.error("Error clearing user activity:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

/**
 * Update daily learning stats
 */
function updateDailyStats(
  activity: any,
  timeSpent: number,
  cardsStudied: number = 0
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingDayIndex = activity.dailyLearning.findIndex((day: any) => {
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate.getTime() === today.getTime();
  });

  if (existingDayIndex !== -1) {
    // Update existing day
    const day = activity.dailyLearning[existingDayIndex];
    day.timeSpent = (day.timeSpent || 0) + timeSpent;
    day.lessonsCompleted = (day.lessonsCompleted || 0) + 1;
    day.cardsStudied = (day.cardsStudied || 0) + cardsStudied;
  } else {
    // Add new day
    activity.dailyLearning.push({
      date: today,
      timeSpent,
      lessonsCompleted: 1,
      cardsStudied,
    });
  }
}

/**
 * Update course access
 */
function updateCourseAccess(
  activity: any,
  courseId: string,
  isCompleted: boolean = false
) {
  const courseObjId = new mongoose.Types.ObjectId(courseId);

  const existingCourseIndex = activity.courseActivities.findIndex(
    (c: any) => c.courseId.toString() === courseId.toString()
  );

  if (existingCourseIndex !== -1) {
    // Update existing
    const course = activity.courseActivities[existingCourseIndex];
    course.lastAccessedAt = new Date();
    if (isCompleted) {
      course.isCompleted = true;
      course.completedAt = new Date();
    }
  } else {
    // Add new
    activity.courseActivities.push({
      courseId: courseObjId,
      startedAt: new Date(),
      lastAccessedAt: new Date(),
      isCompleted: isCompleted || false,
      completedAt: isCompleted ? new Date() : undefined,
    });
  }
}
