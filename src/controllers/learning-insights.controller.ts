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

// Get study recommendations (AI part - placeholder for now)
export const getStudyRecommendations = async (
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
        message: "No recommendations available",
      });
    }

    // TODO: Implement AI recommendations in Phase 2
    return res.json({
      success: true,
      message: "AI recommendations will be available in Phase 2",
      data: {
        aiRecommendations: insights.aiRecommendations,
        predictions: insights.predictions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
