import { Response } from "express";
import { AuthRequest } from "../types/express.types";
import UserActivity from "../models/user-activity.model";
import LearningInsights from "../models/learning-insights.model";
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

    // 🔍 DEBUG: Log incoming video tracking request
    console.log("\n📹 VIDEO TRACKING REQUEST:");
    console.log("  User:", userId);
    console.log("  Lesson:", lessonId, "-", lessonTitle);
    console.log("  Course:", courseId);
    console.log("  Watched:", watchedDuration, "s /", totalDuration, "s");
    console.log("  Complete:", isWatchedCompletely);
    console.log("  Timestamp:", new Date().toLocaleString());
    console.log("  FULL BODY:", JSON.stringify(req.body, null, 2));

    // Validation
    if (!lessonId || !totalDuration) {
      console.error("❌ VALIDATION FAILED:", { lessonId, totalDuration });
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
      // Update existing - ✅ Accumulate timeSpent instead of overwriting
      const existing = activity.lessonActivities[existingLessonIndex];
      Object.assign(existing, {
        ...lessonData,
        attempts: (existing.attempts || 0) + 1,
        timeSpent: (existing.timeSpent || 0) + (watchedDuration || 0), // ✅ Cộng dồn thời gian
        videoData: {
          ...lessonData.videoData,
          watchedDuration: Math.max(
            existing.videoData?.watchedDuration || 0,
            watchedDuration || 0
          ), // Take max watchedDuration
        },
      });
    } else {
      // Add new
      activity.lessonActivities.push(lessonData as any);
    }

    // Update daily stats - only count as completed if fully watched
    updateDailyStats(activity, watchedDuration || 0, 0, isWatchedCompletely);

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
      taskType, // Loại task: multiple_choice, fill_blank, listening, matching, speaking, reading
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
      taskType: taskType, // Lưu taskType
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
        isPassed,
        attempts: 1,
      },
    };

    if (existingLessonIndex !== -1) {
      // Update existing - ✅ Accumulate timeSpent instead of overwriting
      const existing = activity.lessonActivities[existingLessonIndex];
      Object.assign(existing, {
        ...lessonData,
        attempts: (existing.attempts || 0) + 1,
        timeSpent: (existing.timeSpent || 0) + (timeSpent || 0), // ✅ Cộng dồn thời gian
        taskData: {
          ...(lessonData.taskData as any),
          attempts: (existing.attempts || 0) + 1,
        },
      });
    } else {
      activity.lessonActivities.push(lessonData as any);
    }

    // Update daily stats - only count as completed if passed
    updateDailyStats(activity, timeSpent, 0, isPassed);

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

    // Update daily stats - flashcards don't count as lessons
    updateDailyStats(activity, sessionDuration || 0, cardsStudied, false);

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
 * 📞 Track random call activity (listening + speaking practice)
 * POST /api/user-activity/track-call
 *
 * Tracks call as 2 "fake cards": listening + speaking
 * Optional rating to adjust skill scores in LearningInsights
 */
export const trackCallActivity = async (
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
      callId,
      callDuration, // seconds
      rating, // optional: 1-5 stars (để adjust skill score)
    } = req.body;

    if (!callId || callDuration === undefined) {
      return res.status(400).json({
        success: false,
        message: "callId and callDuration are required",
      });
    }

    let activity = await UserActivity.findOne({ userId });
    if (!activity) {
      activity = new UserActivity({ userId });
    }

    // 🎯 Logic tính điểm tự động dựa vào duration
    const isCorrect = callDuration >= 60; // >= 60s = learned something
    let difficulty: "again" | "hard" | "good" | "easy";

    if (callDuration < 60) {
      difficulty = "again"; // Too short
    } else if (callDuration < 180) {
      difficulty = "hard"; // 1-3 minutes
    } else if (callDuration < 300) {
      difficulty = "good"; // 3-5 minutes
    } else {
      difficulty = "easy"; // 5+ minutes
    }

    // Fake cardIds for listening & speaking
    const listeningCardId = `random-call-listening-${callId}`;
    const speakingCardId = `random-call-speaking-${callId}`;
    const flashcardId = "random-call-practice"; // Constant ID

    // Determine mastery level based on duration & difficulty
    let masteryLevel: "learning" | "reviewing" | "mastered" = "learning";
    if (difficulty === "easy") {
      masteryLevel = "mastered";
    } else if (difficulty === "good") {
      masteryLevel = "reviewing";
    }

    // Track 2 cards: listening + speaking
    const responseTime = callDuration * 1000; // Convert to milliseconds

    // 1. Listening card
    activity.cardLearning.push({
      cardId: new mongoose.Types.ObjectId(), // Generate fake ObjectId
      flashcardId: new mongoose.Types.ObjectId(), // Generate fake ObjectId
      isCorrect,
      masteryLevel,
      responseTime,
      difficulty,
      reviewCount: 1,
      studiedAt: new Date(),
      // Store metadata in a way that won't break schema
    } as any);

    // 2. Speaking card
    activity.cardLearning.push({
      cardId: new mongoose.Types.ObjectId(), // Generate fake ObjectId
      flashcardId: new mongoose.Types.ObjectId(), // Generate fake ObjectId
      isCorrect,
      masteryLevel,
      responseTime,
      difficulty,
      reviewCount: 1,
      studiedAt: new Date(),
    } as any);

    // Update daily stats - calls don't count as lessons
    updateDailyStats(activity, callDuration, 0, false);

    await activity.save();

    // ✅ Queue learning insights update
    try {
      await queueLearningUpdate(userId.toString());
    } catch (queueError) {
      console.error("Failed to queue learning update:", queueError);
    }

    // 🌟 If rating is provided, adjust skill scores in LearningInsights
    let adjustedScores = null;
    if (rating !== undefined && rating >= 1 && rating <= 5) {
      try {
        adjustedScores = await adjustSkillScoreFromRating(userId, rating);
      } catch (adjustError) {
        console.error("Failed to adjust skill scores:", adjustError);
        // Don't fail the request if adjustment fails
      }
    }

    return res.json({
      success: true,
      message: "Call activity tracked",
      data: {
        duration: callDuration,
        difficulty,
        isCorrect,
        ratingApplied: !!rating,
        adjustedScores,
      },
    });
  } catch (error: any) {
    console.error("Error tracking call activity:", error);
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
  cardsStudied: number = 0,
  lessonCompleted: boolean = false // ✅ Add parameter to track if lesson was actually completed
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
    // ✅ Only increment if lesson was actually completed
    if (lessonCompleted) {
      day.lessonsCompleted = (day.lessonsCompleted || 0) + 1;
    }
    day.cardsStudied = (day.cardsStudied || 0) + cardsStudied;
  } else {
    // Add new day
    activity.dailyLearning.push({
      date: today,
      timeSpent,
      lessonsCompleted: lessonCompleted ? 1 : 0, // ✅ Only count if completed
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

/**
 * 🌟 Adjust skill scores in LearningInsights based on call rating
 *
 * Rating logic (đơn giản, nhẹ nhàng):
 * - Rating 5 → +5 points
 * - Rating 4 → +3 points
 * - Rating 3 → +1 point
 * - Rating 2 → -2 points
 * - Rating 1 → -3 points
 *
 * Formula: (rating - 3) với multiplier cho smooth adjustment
 */
async function adjustSkillScoreFromRating(
  userId: string,
  rating: number
): Promise<{ listening: number; speaking: number } | null> {
  try {
    // Calculate adjustment based on rating
    let adjustment = 0;
    if (rating === 5) adjustment = 5;
    else if (rating === 4) adjustment = 3;
    else if (rating === 3) adjustment = 1;
    else if (rating === 2) adjustment = -2;
    else if (rating === 1) adjustment = -3;

    // Find or create LearningInsights
    let insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      // Create default insights if not exists
      insights = new LearningInsights({
        userId,
        analysisDate: new Date(),
        learningPerformance: {
          overallLevel: "beginner",
          weeklyProgress: 0,
          consistency: 0,
          retention: 0,
        },
        learningAnalysis: {
          courseProgress: {
            coursesInProgress: 0,
            averageCompletionTime: 0,
            strugglingCourses: [],
          },
          lessonMastery: {
            videoLessons: {
              averageWatchTime: 0,
              completionRate: 0,
              rewatch: 0,
            },
            taskLessons: {
              averageScore: 0,
              averageAttempts: 0,
              commonMistakes: [],
            },
          },
          flashcardMastery: {
            masteredCards: 0,
            learningCards: 0,
            difficultCards: 0,
            averageResponseTime: 0,
            dailyRetention: 0,
          },
          skillMastery: {
            listening: { level: 0, tasksCompleted: 0, averageScore: 0, lastPracticed: new Date() },
            speaking: { level: 0, tasksCompleted: 0, averageScore: 0, lastPracticed: new Date() },
            reading: { level: 0, tasksCompleted: 0, averageScore: 0, lastPracticed: new Date() },
            writing: { level: 0, tasksCompleted: 0, averageScore: 0, lastPracticed: new Date() },
          },
        },
        studyPatterns: {
          bestStudyTime: "morning",
          averageSessionLength: 0,
          studyFrequency: 0,
          currentStreak: 0,
          longestStreak: 0,
          preferredContent: "video",
        },
        aiRecommendations: {
          nextLessons: [],
          reviewCards: [],
          studyPlan: {
            dailyMinutes: 30,
            contentMix: {
              newLessons: 50,
              reviewCards: 30,
              practiceTask: 20,
            },
          },
        },
        predictions: {
          courseCompletionDates: [],
          skillImprovement: {
            currentLevel: 0,
            projectedLevel: 0,
            timeToNextLevel: 0,
          },
        },
        modelMetadata: {
          version: "1.0",
          confidence: 50,
          lastUpdated: new Date(),
          lastSyncedAt: new Date(),
          dataPoints: 0,
        },
      });
    }

    // Ensure skillMastery exists
    if (!insights.learningAnalysis) {
      insights.learningAnalysis = {} as any;
    }
    if (!insights.learningAnalysis!.skillMastery) {
      insights.learningAnalysis!.skillMastery = {
        listening: { level: 0, tasksCompleted: 0, averageScore: 0, lastPracticed: new Date() },
        speaking: { level: 0, tasksCompleted: 0, averageScore: 0, lastPracticed: new Date() },
        reading: { level: 0, tasksCompleted: 0, averageScore: 0, lastPracticed: new Date() },
        writing: { level: 0, tasksCompleted: 0, averageScore: 0, lastPracticed: new Date() },
      } as any;
    }

    // Adjust listening & speaking scores
    const listeningBefore = insights.learningAnalysis!.skillMastery!.listening?.level || 0;
    const speakingBefore = insights.learningAnalysis!.skillMastery!.speaking?.level || 0;

    // Apply adjustment (clamp between 0-100)
    const newListeningLevel = Math.max(0, Math.min(100, listeningBefore + adjustment));
    const newSpeakingLevel = Math.max(0, Math.min(100, speakingBefore + adjustment));

    insights.learningAnalysis!.skillMastery!.listening!.level = newListeningLevel;
    insights.learningAnalysis!.skillMastery!.speaking!.level = newSpeakingLevel;
    insights.learningAnalysis!.skillMastery!.listening!.lastPracticed = new Date();
    insights.learningAnalysis!.skillMastery!.speaking!.lastPracticed = new Date();

    await insights.save();

    return {
      listening: newListeningLevel,
      speaking: newSpeakingLevel,
    };
  } catch (error) {
    console.error("Error adjusting skill scores:", error);
    return null;
  }
}
