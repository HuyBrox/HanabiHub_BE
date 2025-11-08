import express from "express";
import {
  triggerAIRecommendations,
  getAIRecommendations,
  getQueueStats,
} from "../controllers/ai-recommendation.controller";
import { isAuth } from "../middleware/isAuth";

const router = express.Router();

/**
 * @route   GET /api/ai-recommendations
 * @desc    Get current AI recommendations for user
 * @access  Private
 */
router.get("/", isAuth, getAIRecommendations);

/**
 * @route   POST /api/ai-recommendations/generate
 * @desc    Manually trigger AI recommendations generation
 * @access  Private
 */
router.post("/generate", isAuth, triggerAIRecommendations);

/**
 * @route   GET /api/ai-recommendations/stats
 * @desc    Get AI queue statistics
 * @access  Private (could be admin-only)
 */
router.get("/stats", isAuth, getQueueStats);

export default router;

