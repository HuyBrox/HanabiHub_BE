import { Router } from "express";
import userRoutes from "./user.route";
import authRoutes from "./auth.route";
import postRoutes from "./post.route";
import flashcardRoutes from "./flashcard.route";
import messageRoutes from "./message.route";
import adminRoutes from "./admin.route";
import userActivityRoutes from "./user-activity.route";
import courseRoutes from "./course.route";
import notificationRoutes from "./notification.route";
import newsRoutes from "./news.route";
import reportRoutes from "./report.route";
import templateRoutes from "./template.route";
import userAdminRoutes from "./user-admin.route";
import exportRoutes from "./export.route";
const router: Router = Router();

// Auth routes
router.use("", authRoutes);
// User routes
router.use("/user", userRoutes);
// Post routes
router.use("/posts", postRoutes);
// Flashcard routes
router.use("/flashcards", flashcardRoutes);
// Message routes
router.use("/message", messageRoutes);

// Admin routes
router.use("/admin", adminRoutes);
// Admin content management routes
router.use("", notificationRoutes);
router.use("", newsRoutes);
router.use("", reportRoutes);
router.use("", templateRoutes);
router.use("", userAdminRoutes);
router.use("", exportRoutes);

// User Activity tracking routes
router.use("/activity", userActivityRoutes);

// Course routes
router.use("/courses", courseRoutes);

export default router;
