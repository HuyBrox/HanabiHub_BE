// src/routes/index.ts
import { Router } from "express";
import userRoutes from "./user.route";
import authRoutes from "./auth.route";
import postRoutes from "./post.route";
import commentRoutes from "./comment.route";
import flashcardRoutes from "./flashcard.route";
import messageRoutes from "./message.route";
import adminRoutes from "./admin.route";
import userActivityRoutes from "./user-activity.route";
import courseRoutes from "./course.route";
import userCourseProgressRoutes from "./user-course-progress.route";
import learningInsightsRoutes from "./learning-insights.route";
import newsRoutes from "./news.route";
import notificationRoutes from "./notification.route";

// ✅ import router users.admin (đúng path, KHÔNG lồng thêm /routes)
import usersAdminRoute from "./usersAdmin.route";

const router: Router = Router();

// Auth routes
router.use("", authRoutes);

// User routes
router.use("/user", userRoutes);

// Post routes
router.use("/posts", postRoutes);

// Comment routes
router.use("/comments", commentRoutes);

// Flashcard routes
router.use("/flashcards", flashcardRoutes);

// Message routes
router.use("/message", messageRoutes);

// Admin routes
router.use("/admin", adminRoutes);

// User activity routes
router.use("/user-activity", userActivityRoutes);

// Course routes
router.use("/courses", courseRoutes);
router.use("/courses", userCourseProgressRoutes);

// Learning insights routes
router.use("/learning-insights", learningInsightsRoutes);

// News routes
router.use("", newsRoutes);

// Notification routes
router.use("", notificationRoutes);

// ✅ NEW: nhóm route quản lý user cho Admin
router.use("/users.admin", usersAdminRoute);

export default router;
