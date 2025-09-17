import { Router } from "express";
import {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  getConversations,
  deleteMessage,
  searchMessages,
  getMessageStats,
} from "../controllers/message.controller";
import { isAuth } from "../middleware/isAuth";

const router: Router = Router();

// Tất cả routes đều yêu cầu authentication
router.use(isAuth);

/**
 * @route   POST /api/v1/messages/send
 * @desc    Gửi tin nhắn mới
 * @access  Private
 * @body    { receiverId: string, message: string }
 */
router.post("/send", sendMessage);

/**
 * @route   GET /api/v1/messages/conversations
 * @desc    Lấy danh sách tất cả cuộc trò chuyện của user
 * @access  Private
 * @query   page?, limit?
 */
router.get("/conversations", getConversations);

/**
 * @route   GET /api/v1/messages/conversation/:receiverId
 * @desc    Lấy tin nhắn trong cuộc trò chuyện với một user cụ thể
 * @access  Private
 * @params  receiverId: ID của người nhận
 * @query   page?, limit?
 */
router.get("/conversation/:receiverId", getMessages);

/**
 * @route   PUT /api/v1/messages/mark-read
 * @desc    Đánh dấu tin nhắn đã đọc
 * @access  Private
 * @body    { messageIds: string[], senderId: string }
 */
router.put("/mark-read", markMessagesAsRead);

/**
 * @route   DELETE /api/v1/messages/:messageId
 * @desc    Xóa tin nhắn
 * @access  Private
 * @params  messageId: ID của tin nhắn cần xóa
 * @body    { deleteForEveryone?: boolean }
 */
router.delete("/:messageId", deleteMessage);

/**
 * @route   GET /api/v1/messages/search/:receiverId
 * @desc    Tìm kiếm tin nhắn trong cuộc trò chuyện
 * @access  Private
 * @params  receiverId: ID của người nhận
 * @query   query: từ khóa tìm kiếm, page?, limit?
 */
router.get("/search/:receiverId", searchMessages);

/**
 * @route   GET /api/v1/messages/stats
 * @desc    Lấy thống kê tin nhắn của user
 * @access  Private
 */
router.get("/stats", getMessageStats);

// === ADVANCED ROUTES ===

/**
 * @route   POST /api/v1/messages/conversation/:receiverId/typing/start
 * @desc    Bắt đầu typing indicator (sẽ được xử lý qua socket)
 * @access  Private
 * @params  receiverId: ID của người nhận
 */
router.post("/conversation/:receiverId/typing/start", (req, res) => {
  // Route này chỉ để documentation, thực tế typing được xử lý qua socket
  res.status(200).json({
    success: true,
    message: "Typing indicator should be handled via socket events",
    socketEvent: "startTyping",
    data: { receiverId: req.params.receiverId },
  });
});

/**
 * @route   POST /api/v1/messages/conversation/:receiverId/typing/stop
 * @desc    Dừng typing indicator (sẽ được xử lý qua socket)
 * @access  Private
 * @params  receiverId: ID của người nhận
 */
router.post("/conversation/:receiverId/typing/stop", (req, res) => {
  // Route này chỉ để documentation, thực tế typing được xử lý qua socket
  res.status(200).json({
    success: true,
    message: "Typing indicator should be handled via socket events",
    socketEvent: "stopTyping",
    data: { receiverId: req.params.receiverId },
  });
});

/**
 * @route   GET /api/v1/messages/conversation/:receiverId/info
 * @desc    Lấy thông tin chi tiết về cuộc trò chuyện
 * @access  Private
 * @params  receiverId: ID của người nhận
 */
router.get("/conversation/:receiverId/info", async (req, res) => {
  try {
    // Tạm thời trả về thông tin cơ bản, có thể mở rộng sau
    res.status(200).json({
      success: true,
      message: "Thông tin cuộc trò chuyện",
      data: {
        receiverId: req.params.receiverId,
        features: {
          realTimeMessaging: true,
          typingIndicators: true,
          readReceipts: true,
          messageDelete: true,
          messageSearch: true,
          voiceCall: true,
          videoCall: true,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy thông tin cuộc trò chuyện",
    });
  }
});

export default router;
