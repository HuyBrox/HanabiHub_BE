import { Router } from "express";
import userRoutes from "./user.route";
import authRoutes from "./auth.route";
import postRoutes from "./post.route";
import flashcardRoutes from "./flashcard.route";
import messageRoutes from "./message.route";
import adminRoutes from "./admin.route";
import userActivityRoutes from "./user-activity.route";
import courseRoutes from "./course.route";
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

// User Activity tracking routes
router.use("/activity", userActivityRoutes);

// Course routes
router.use("/courses", courseRoutes);

export default router;
