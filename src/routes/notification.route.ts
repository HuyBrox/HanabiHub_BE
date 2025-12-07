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
  updateNotification,
  deleteNotification,
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
router.put("/notifications/:id", isAdmin, updateNotification);
router.delete("/notifications/:id", isAdmin, deleteNotification);

// Scheduled notification routes (placeholders - returning 200 instead of 404)
// TODO: Implement scheduled notification functionality in the future
router.get("/notifications/scheduled", isAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Scheduled notifications feature coming soon",
    data: { items: [], total: 0, page: 1, limit: 50 },
    timestamp: new Date().toISOString(),
  });
});

router.get("/notifications/scheduled/stats", isAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Scheduled notifications stats",
    data: { total: 0, pending: 0, sent: 0, cancelled: 0, failed: 0 },
    timestamp: new Date().toISOString(),
  });
});

router.post("/notifications/schedule", isAdmin, (req, res) => {
  res.status(501).json({
    success: false,
    message: "Scheduled notifications feature not yet implemented",
    data: null,
    timestamp: new Date().toISOString(),
  });
});

router.put("/notifications/scheduled/:id", isAdmin, (req, res) => {
  res.status(501).json({
    success: false,
    message: "Scheduled notifications feature not yet implemented",
    data: null,
    timestamp: new Date().toISOString(),
  });
});

router.delete("/notifications/scheduled/:id", isAdmin, (req, res) => {
  res.status(501).json({
    success: false,
    message: "Scheduled notifications feature not yet implemented",
    data: null,
    timestamp: new Date().toISOString(),
  });
});

export default router;
