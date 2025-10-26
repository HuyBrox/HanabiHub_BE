import { Router } from "express";
import { isAdmin, isAuth } from "../middleware/isAuth";
import {
  sendSystemNotification,
  sendSpecificNotification,
  getNotificationHistory,
  getNotificationStats,
  exportNotificationsCsv,
  getMyNotifications,
  markNotificationAsRead,
} from "../controllers/notification.controller";

const router = Router();

// Admin routes
router.post("/notifications/send-system", isAdmin, sendSystemNotification);
router.post("/notifications/send-specific", isAdmin, sendSpecificNotification);
router.get("/notifications/history", isAdmin, getNotificationHistory);
router.get("/notifications/stats", isAdmin, getNotificationStats);
router.get("/notifications/export", isAdmin, exportNotificationsCsv);

// User routes
router.get("/notifications/my", isAuth, getMyNotifications);
router.put("/notifications/:id/read", isAuth, markNotificationAsRead);

export default router;
