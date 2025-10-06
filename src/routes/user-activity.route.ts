import express from "express";
import { isAuth } from "../middleware/isAuth";
import {
  trackVideoActivity,
  trackTaskActivity,
  trackFlashcardSession,
  trackCardLearning,
  trackCourseAccessActivity,
  getActivitySummary,
  clearUserActivity,
} from "../controllers/user-activity.controller";

const router = express.Router();

/**
 * 🎯 Routes for FE to silently track user learning activities
 * All routes are protected with isAuth middleware
 */

// 📹 Track video lesson activity
router.post("/track-video", isAuth, trackVideoActivity);

// 📝 Track task/quiz lesson activity
router.post("/track-task", isAuth, trackTaskActivity);

// 🎴 Track flashcard session
router.post("/track-flashcard-session", isAuth, trackFlashcardSession);

// 🃏 Track individual card learning
router.post("/track-card", isAuth, trackCardLearning);

// 📚 Track course access (enroll/continue/complete)
router.post("/track-course-access", isAuth, trackCourseAccessActivity);

// 📊 Get activity summary (optional, for debugging)
router.get("/summary", isAuth, getActivitySummary);

// 🗑️ Clear user activity (for testing)
router.delete("/clear", isAuth, clearUserActivity);

export default router;
