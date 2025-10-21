import { Router } from "express";
import { isAdmin } from "../middleware/isAuth";
import {
  sendSystemNotification,
  sendSpecificNotification,
  getNotificationHistory,
  getNotificationStats,
} from "../controllers/notification.controller";

const router = Router();

router.post("/notifications/send-system", isAdmin, sendSystemNotification);
router.post("/notifications/send-specific", isAdmin, sendSpecificNotification);
router.get("/notifications/history", isAdmin, getNotificationHistory);
router.get("/notifications/stats", isAdmin, getNotificationStats);

export default router;
