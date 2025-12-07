import { Response } from "express";
import { AuthRequest } from "../types/express.types";
import LearningInsights from "../models/learning-insights.model";
import learningAnalyticsService from "../services/learning-analytics.service";

/**
 * Controller để lấy learning insights của user
 */

// Lấy insights của user hiện tại
export const getMyLearningInsights = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.status(404).json({
        message:
          "No learning insights available yet. Complete some lessons first!",
      });
    }

    return res.json({
      success: true,
      data: {
        performance: insights.learningPerformance,
        analysis: insights.learningAnalysis,
        patterns: insights.studyPatterns,
        recommendations: insights.recommendations,
        predictions: insights.predictions,
        aiAdvice: insights.aiAdvice,
        lastUpdated: insights.analysisDate,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy performance overview
export const getPerformanceOverview = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.status(404).json({
        message: "No performance data available",
      });
    }

    return res.json({
      success: true,
      data: {
        level: insights.learningPerformance?.overallLevel || "beginner",
        weeklyProgress: insights.learningPerformance?.weeklyProgress || 0,
        consistency: insights.learningPerformance?.consistency || 0,
        retention: insights.learningPerformance?.retention || 0,
        streak: insights.studyPatterns?.currentStreak || 0,
        longestStreak: insights.studyPatterns?.longestStreak || 0,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy course progress
export const getCourseProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.status(404).json({
        message: "No course progress data available",
      });
    }

    return res.json({
      success: true,
      data: insights.learningAnalysis?.courseProgress || {
        coursesInProgress: 0,
        averageCompletionTime: 0,
        strugglingCourses: [],
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy flashcard mastery
export const getFlashcardMastery = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.status(404).json({
        message: "No flashcard data available",
      });
    }

    return res.json({
      success: true,
      data: insights.learningAnalysis?.flashcardMastery || {
        masteredCards: 0,
        learningCards: 0,
        difficultCards: 0,
        averageResponseTime: 0,
        dailyRetention: 0,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy skill mastery (Nghe, Nói, Đọc, Viết)
export const getSkillMastery = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.status(404).json({
        message: "No skill data available",
      });
    }

    return res.json({
      success: true,
      data: insights.learningAnalysis?.skillMastery || {
        listening: {
          level: 0,
          tasksCompleted: 0,
          averageScore: 0,
          lastPracticed: null,
        },
        speaking: {
          level: 0,
          tasksCompleted: 0,
          averageScore: 0,
          lastPracticed: null,
        },
        reading: {
          level: 0,
          tasksCompleted: 0,
          averageScore: 0,
          lastPracticed: null,
        },
        writing: {
          level: 0,
          tasksCompleted: 0,
          averageScore: 0,
          lastPracticed: null,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy study patterns
export const getStudyPatterns = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.status(404).json({
        message: "No study pattern data available",
      });
    }

    return res.json({
      success: true,
      data: insights.studyPatterns,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Force update insights (admin hoặc manual trigger)
export const forceUpdateInsights = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await learningAnalyticsService.updateLearningInsights(
      userId
    );

    return res.json({
      success: true,
      message: "Learning insights updated successfully",
      data: {
        performance: insights.learningPerformance,
        analysisDate: insights.analysisDate,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get daily learning statistics (7 or 30 days)
export const getDailyStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const days = parseInt(req.query.days as string) || 7;
    const UserActivity = (await import("../models/user-activity.model"))
      .default;

    const activity = await UserActivity.findOne({ userId });

    if (!activity || !activity.dailyLearning) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Filter last N days
    const nDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const dailyStats = activity.dailyLearning
      .filter((day: any) => new Date(day.date) >= nDaysAgo)
      .sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      .map((day: any) => ({
        date: day.date,
        studyTime: Math.round(((day.totalStudyTime || day.timeSpent) || 0) / 60), // convert to minutes, handle both old and new field names
        lessonsCompleted: day.lessonsCompleted || 0,
        cardsReviewed: (day.cardsReviewed || day.cardsStudied) || 0, // handle both old and new field names
        cardsLearned: day.cardsLearned || 0,
        correctRate: day.correctRate || 0,
        streak: day.streakDays || 0,
      }));

    return res.json({
      success: true,
      data: dailyStats,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get time analytics (distribution by content type)
export const getTimeAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const UserActivity = (await import("../models/user-activity.model"))
      .default;
    const activity = await UserActivity.findOne({ userId });

    if (!activity) {
      return res.json({
        success: true,
        data: {
          byContentType: [],
          bySkill: [],
          totalTime: 0,
        },
      });
    }

    // Calculate time by content type
    const videoLessons = activity.lessonActivities.filter((l: any) => l.lessonType === "video");
    const taskLessons = activity.lessonActivities.filter((l: any) => l.lessonType === "task");

    const videoTime = videoLessons.reduce((sum: number, l: any) => sum + (l.timeSpent || 0), 0);
    const taskTime = taskLessons.reduce((sum: number, l: any) => sum + (l.timeSpent || 0), 0);
    const flashcardTime = activity.flashcardSessions.reduce(
      (sum: number, s: any) => sum + (s.sessionDuration || 0),
      0
    );

    const totalTime = videoTime + taskTime + flashcardTime;

    // 🔍 DEBUG: Log time calculation details
    console.log("\n📊 TIME ANALYTICS CALCULATION:");
    console.log("  User:", userId);
    console.log("  Video lessons count:", videoLessons.length);
    console.log("  Task lessons count:", taskLessons.length);
    console.log("  Flashcard sessions count:", activity.flashcardSessions.length);
    console.log("  Video time (seconds):", videoTime);
    console.log("  Task time (seconds):", taskTime);
    console.log("  Flashcard time (seconds):", flashcardTime);
    console.log("  Total time (seconds):", totalTime);
    console.log("  Video time (minutes):", Math.round(videoTime / 60));
    console.log("  Task time (minutes):", Math.round(taskTime / 60));
    console.log("  Flashcard time (minutes):", Math.round(flashcardTime / 60));
    console.log("  Total time (minutes):", Math.round(totalTime / 60));

    // Calculate time by skill (from task type)
    const skillTime: Record<string, number> = {
      listening: 0,
      speaking: 0,
      reading: 0,
      writing: 0,
    };

    const skillMap: Record<string, string> = {
      listening: "listening",
      speaking: "speaking",
      reading: "reading",
      fill_blank: "writing",
      multiple_choice: "reading",
      matching: "reading",
    };

    activity.lessonActivities
      .filter((l: any) => l.lessonType === "task" && l.taskType)
      .forEach((l: any) => {
        const skill = skillMap[l.taskType];
        if (skill && skillTime[skill] !== undefined) {
          skillTime[skill] += l.timeSpent || 0;
        }
      });

    return res.json({
      success: true,
      data: {
        byContentType: [
          {
            name: "Video",
            value: Math.round(videoTime / 60),
            percentage:
              totalTime > 0 ? Math.round((videoTime / totalTime) * 100) : 0,
          },
          {
            name: "Bài tập",
            value: Math.round(taskTime / 60),
            percentage:
              totalTime > 0 ? Math.round((taskTime / totalTime) * 100) : 0,
          },
          {
            name: "Flashcard",
            value: Math.round(flashcardTime / 60),
            percentage:
              totalTime > 0
                ? Math.round((flashcardTime / totalTime) * 100)
                : 0,
          },
        ],
        bySkill: Object.entries(skillTime).map(([skill, time]) => ({
          skill,
          time: Math.round(time / 60),
          percentage:
            totalTime > 0 ? Math.round((time / totalTime) * 100) : 0,
        })),
        totalTime: Math.round(totalTime / 60), // minutes
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get weak areas that need improvement
export const getWeakAreas = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.json({
        success: true,
        data: {
          weakSkills: [],
          difficultCards: [],
          strugglingCourses: [],
        },
      });
    }

    // Find weak skills (level < 50)
    const weakSkills = Object.entries(insights.learningAnalysis?.skillMastery || {})
      .filter(([_, data]: [string, any]) => data.level < 50)
      .map(([skill, data]: [string, any]) => ({
        skill,
        level: data.level,
        tasksCompleted: data.tasksCompleted,
        averageScore: data.averageScore,
        suggestion: `Luyện tập thêm ${data.tasksCompleted < 5 ? "5" : "10"} bài để cải thiện`,
      }));

    // Difficult flashcards
    const difficultCards = {
      count: insights.learningAnalysis?.flashcardMastery?.difficultCards || 0,
      suggestion:
        (insights.learningAnalysis?.flashcardMastery?.difficultCards || 0) > 0
          ? "Dành 15 phút ôn lại các thẻ khó"
          : null,
    };

    // Struggling courses
    const strugglingCourses =
      insights.learningAnalysis?.courseProgress?.strugglingCourses || [];

    return res.json({
      success: true,
      data: {
        weakSkills,
        difficultCards,
        strugglingCourses,
        hasWeakAreas:
          weakSkills.length > 0 ||
          difficultCards.count > 0 ||
          strugglingCourses.length > 0,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get progress timeline (30 days)
export const getProgressTimeline = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const UserActivity = (await import("../models/user-activity.model"))
      .default;
    const activity = await UserActivity.findOne({ userId });

    if (!activity) {
      return res.json({
        success: true,
        data: {
          timeline: [],
          summary: {
            totalDays: 0,
            activeDays: 0,
            averageScore: 0,
          },
        },
      });
    }

    // Get last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate by date
    const dailyData = activity.dailyLearning
      .filter((day: any) => new Date(day.date) >= thirtyDaysAgo)
      .sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

    // Calculate rolling average score from lessons
    const recentLessons = activity.lessonActivities
      .filter(
        (l: any) =>
          l.completedAt &&
          new Date(l.completedAt) >= thirtyDaysAgo &&
          l.lessonType === "task" &&
          l.taskData
      )
      .map((l: any) => ({
        date: l.completedAt,
        score:
          l.taskData.maxScore > 0
            ? (l.taskData.score / l.taskData.maxScore) * 100
            : 0,
      }));

    const timeline = dailyData.map((day: any) => {
      const dayDate = new Date(day.date);
      const dayLessons = recentLessons.filter((l: any) => {
        const lessonDate = new Date(l.date);
        return lessonDate.toDateString() === dayDate.toDateString();
      });

      const avgScore =
        dayLessons.length > 0
          ? dayLessons.reduce((sum: number, l: any) => sum + l.score, 0) /
            dayLessons.length
          : 0;

      return {
        date: day.date,
        studyTime: Math.round(((day.totalStudyTime || day.timeSpent) || 0) / 60), // handle both old and new field names
        score: Math.round(avgScore),
        activities: day.lessonsCompleted + ((day.cardsReviewed || day.cardsStudied) || 0), // handle both old and new field names
      };
    });

    const activeDays = dailyData.filter(
      (d: any) => ((d.totalStudyTime || d.timeSpent) || 0) > 0 // handle both old and new field names
    ).length;
    const totalScore = timeline.reduce(
      (sum: number, d: any) => sum + d.score,
      0
    );

    return res.json({
      success: true,
      data: {
        timeline,
        summary: {
          totalDays: 30,
          activeDays,
          averageScore:
            timeline.length > 0 ? Math.round(totalScore / timeline.length) : 0,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get detailed performance with trends
export const getDetailedPerformance = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.status(404).json({
        message: "No performance data available",
      });
    }

    const UserActivity = (await import("../models/user-activity.model"))
      .default;
    const activity = await UserActivity.findOne({ userId });

    // Calculate additional metrics
    const totalLessons = activity?.lessonActivities?.length || 0;
    const completedLessons =
      activity?.lessonActivities?.filter((l: any) => l.isCompleted).length || 0;
    const totalCards = activity?.cardLearning?.length || 0;
    const totalSessions = activity?.flashcardSessions?.length || 0;

    return res.json({
      success: true,
      data: {
        performance: insights.learningPerformance,
        patterns: insights.studyPatterns,
        metadata: insights.modelMetadata,
        additionalMetrics: {
          totalLessons,
          completedLessons,
          completionRate:
            totalLessons > 0
              ? Math.round((completedLessons / totalLessons) * 100)
              : 0,
          totalCards,
          totalSessions,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// RECOMMENDATIONS & PREDICTIONS
// ========================================

// Lấy recommendations (rule-based)
export const getRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.status(404).json({
        message: "No recommendations available",
      });
    }

    return res.json({
      success: true,
      data: insights.recommendations || {
        nextLessons: [],
        reviewCards: [],
        studyPlan: {
          dailyMinutes: 30,
          contentMix: {
            newLessons: 40,
            reviewCards: 40,
            practiceTask: 20,
          },
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy predictions
export const getPredictions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.status(404).json({
        message: "No predictions available",
      });
    }

    return res.json({
      success: true,
      data: insights.predictions || {
        courseCompletionDates: [],
        skillImprovement: {
          currentLevel: 0,
          projectedLevel: 0,
          timeToNextLevel: 0,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy AI advice (text only)
export const getAIAdvice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const insights = await LearningInsights.findOne({ userId });

    if (!insights || !insights.aiAdvice) {
      return res.status(404).json({
        message: "No AI advice available yet. Keep learning!",
      });
    }

    return res.json({
      success: true,
      data: insights.aiAdvice,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
