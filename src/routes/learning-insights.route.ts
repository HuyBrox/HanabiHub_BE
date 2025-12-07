import express from "express";
import {
  getMyLearningInsights,
  getPerformanceOverview,
  getCourseProgress,
  getFlashcardMastery,
  getSkillMastery,
  getStudyPatterns,
  forceUpdateInsights,
  getDailyStats,
  getTimeAnalytics,
  getWeakAreas,
  getProgressTimeline,
  getDetailedPerformance,
  getRecommendations,
  getPredictions,
  getAIAdvice,
} from "../controllers/learning-insights.controller";
import { isAuth } from "../middleware/isAuth";

const router = express.Router();

// ========================================
// CORE INSIGHTS
// ========================================

// Lấy tất cả insights của user (overview)
router.get("/my-insights", isAuth, getMyLearningInsights);

// Lấy performance overview
router.get("/performance", isAuth, getPerformanceOverview);

// Lấy detailed performance với trends và metrics bổ sung
router.get("/detailed-performance", isAuth, getDetailedPerformance);

// ========================================
// SPECIALIZED INSIGHTS
// ========================================

// Lấy course progress
router.get("/course-progress", isAuth, getCourseProgress);

// Lấy flashcard mastery
router.get("/flashcard-mastery", isAuth, getFlashcardMastery);

// Lấy skill mastery (Nghe, Nói, Đọc, Viết)
router.get("/skill-mastery", isAuth, getSkillMastery);

// Lấy study patterns
router.get("/study-patterns", isAuth, getStudyPatterns);

// ========================================
// ANALYTICS & STATISTICS
// ========================================

// Lấy daily learning statistics (query: ?days=7 or ?days=30)
router.get("/daily-stats", isAuth, getDailyStats);

// Lấy time analytics (phân bố thời gian theo nội dung)
router.get("/time-analytics", isAuth, getTimeAnalytics);

// Lấy weak areas cần cải thiện
router.get("/weak-areas", isAuth, getWeakAreas);

// Lấy progress timeline (30 ngày)
router.get("/progress-timeline", isAuth, getProgressTimeline);

// ========================================
// RECOMMENDATIONS & PREDICTIONS
// ========================================

// Lấy recommendations (rule-based, không dùng AI)
router.get("/recommendations", isAuth, getRecommendations);

// Lấy predictions (rule-based)
router.get("/predictions", isAuth, getPredictions);

// Lấy AI advice (text only, động viên từ AI)
router.get("/ai-advice", isAuth, getAIAdvice);

// ========================================
// ACTIONS
// ========================================

// Force update insights (manual trigger)
router.post("/update", isAuth, forceUpdateInsights);

export default router;
