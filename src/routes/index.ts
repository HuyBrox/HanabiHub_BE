import { Router } from "express";
import userRoutes from "./user.route";
import authRoutes from "./auth.route";
import postRoutes from "./post.route";
import messageRoutes from "./message.route";

const router: Router = Router();

// Auth routes
router.use("", authRoutes);
// User routes
router.use("/user", userRoutes);
// Post routes
router.use("/posts", postRoutes);
// Message routes
router.use("/messages", messageRoutes);

export default router;
