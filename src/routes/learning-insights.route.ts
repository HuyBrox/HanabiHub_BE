import express from "express";
import {
  getMyLearningInsights,
  getPerformanceOverview,
  getCourseProgress,
  getFlashcardMastery,
  getSkillMastery,
  getStudyPatterns,
  forceUpdateInsights,
  getStudyRecommendations,
} from "../controllers/learning-insights.controller";
import { isAuth } from "../middleware/isAuth";

const router = express.Router();

// Lấy tất cả insights của user
router.get("/my-insights", isAuth, getMyLearningInsights);

// Lấy performance overview
router.get("/performance", isAuth, getPerformanceOverview);

// Lấy course progress
router.get("/course-progress", isAuth, getCourseProgress);

// Lấy flashcard mastery
router.get("/flashcard-mastery", isAuth, getFlashcardMastery);

// Lấy skill mastery (Nghe, Nói, Đọc, Viết)
router.get("/skill-mastery", isAuth, getSkillMastery);

// Lấy study patterns
router.get("/study-patterns", isAuth, getStudyPatterns);

// Force update insights (manual trigger)
router.post("/update", isAuth, forceUpdateInsights);

// Get AI recommendations (Phase 2)
router.get("/recommendations", isAuth, getStudyRecommendations);

export default router;
