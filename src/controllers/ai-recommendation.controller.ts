import { Request, Response } from "express";
import {
  forceQueueAIRecommendation,
  getAIQueueStats,
} from "../middleware/ai-recommendation-queue";
import LearningInsights from "../models/learning-insights.model";

/**
 * Manually trigger AI advice cho user
 * POST /api/ai-recommendations/generate
 *
 * Note: Endpoint này trigger AI ADVICE generation (lời khuyên động viên),
 * KHÔNG phải recommendations (vì recommendations đã là rule-based).
 */
export const triggerAIRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId; // From auth middleware

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Queue AI advice generation với high priority
    const queued = await forceQueueAIRecommendation(userId);

    if (queued) {
      return res.status(200).json({
        success: true,
        message: "AI advice queued successfully",
        note: "Advice will be ready in 1-2 minutes",
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Failed to queue AI advice",
      });
    }
  } catch (error: any) {
    console.error("Error triggering AI advice:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * Get current AI advice (NOT recommendations - those are rule-based)
 * GET /api/ai-recommendations
 *
 * Note: Endpoint name giữ nguyên để backward compatible,
 * nhưng giờ chỉ trả về aiAdvice (text động viên).
 * Recommendations thì get từ /learning-insights/recommendations
 */
export const getAIRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get LearningInsights
    const insights = await LearningInsights.findOne({ userId });

    if (!insights) {
      return res.status(404).json({
        error: "Learning insights not found",
        message: "User has not completed any learning activities yet",
      });
    }

    // Return AI advice (CHỈ LỜI KHUYÊN)
    return res.status(200).json({
      success: true,
      data: {
        aiAdvice: insights.aiAdvice || null,
        lastUpdated:
          insights.modelMetadata?.lastSyncedAt ||
          insights.modelMetadata?.lastUpdated,
      },
    });
  } catch (error: any) {
    console.error("Error getting AI advice:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * Get AI queue stats (admin only)
 * GET /api/ai-recommendations/stats
 */
export const getQueueStats = async (req: Request, res: Response) => {
  try {
    const stats = await getAIQueueStats();

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("Error getting queue stats:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};
