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
const router: Router = Router();

router.use("", authRoutes);
router.use("/user", userRoutes);
router.use("/posts", postRoutes);
router.use("/comments", commentRoutes);
router.use("/flashcards", flashcardRoutes);
router.use("/message", messageRoutes);

router.use("/admin", adminRoutes);

router.use("/user-activity", userActivityRoutes);

router.use("/courses", courseRoutes);

router.use("/courses", userCourseProgressRoutes);

router.use("/learning-insights", learningInsightsRoutes);

export default router;
