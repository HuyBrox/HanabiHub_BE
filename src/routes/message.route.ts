import { Router } from "express";
import { isAuth } from "../middleware/isAuth";
import {
  sendMessage,
  getConversationMessages,
  markMessagesAsRead,
  listMyConversations,
} from "../controllers/message.controller";

const router: Router = Router();

// Danh sách hội thoại của tôi
router.get("/", isAuth, listMyConversations);

// Lấy lịch sử tin nhắn giữa tôi và partner
router.get("/:partnerId", isAuth, getConversationMessages);

// Gửi tin nhắn
router.post("/send", isAuth, sendMessage);

// Đánh dấu đã đọc tin nhắn từ partner
router.post("/:partnerId/read", isAuth, markMessagesAsRead);

export default router;


