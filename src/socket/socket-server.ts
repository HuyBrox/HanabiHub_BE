import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import User from "../models/user.model";

/**
 * CALL MANAGEMENT FEATURES ADDED:
 *
 * ✅ Ngăn chặn multiple calls cùng lúc:
 *    - Kiểm tra người gọi đang trong cuộc gọi khác → CALLER_IN_CALL
 *    - Kiểm tra người nhận đang bận → RECEIVER_BUSY
 *
 * ✅ Quản lý trạng thái cuộc gọi:
 *    - activeCall: Record theo dõi cuộc gọi hiện tại của từng user
 *    - startCall(): Đánh dấu bắt đầu cuộc gọi
 *    - endCall(): Kết thúc cuộc gọi
 *    - isUserInCall(): Kiểm tra user có đang trong cuộc gọi
 *
 * ✅ Auto cleanup khi:
 *    - User từ chối cuộc gọi (answerCall với accepted: false)
 *    - User kết thúc cuộc gọi (endCall event)
 *    - User disconnect → Tự động ngắt cuộc gọi và thông báo
 *
 * ✅ Event mới:
 *    - checkCallStatus: Kiểm tra trạng thái cuộc gọi
 *    - callStatusResponse: Trả về thông tin trạng thái
 *
 * Error codes mới: CALLER_IN_CALL, RECEIVER_BUSY, CHECK_STATUS_ERROR
 */

// Simple logger utility
const logger = {
  success: (...args: any[]) => console.log("✅", ...args),
  info: (...args: any[]) => console.log("ℹ️", ...args),
  warning: (...args: any[]) => console.log("⚠️", ...args),
  error: (...args: any[]) => console.error("❌", ...args),
};

const app = express();
const server = http.createServer(app);

// Cấu hình Socket.IO server với CORS và timeout settings
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingInterval: 25000, // Thời gian gửi ping để kiểm tra kết nối (25 giây)
  pingTimeout: 60000, // Thời gian chờ pong trả về trước khi disconnect (60 giây)
  upgradeTimeout: 25000, // Thời gian chờ upgrade từ polling lên websocket (25 giây)
  maxHttpBufferSize: 1e6, // Giới hạn kích thước buffer (1MB)
  transports: ["polling", "websocket"], // Cho phép cả polling và websocket
});

// Chuyển userId thành ObjectId để tương thích với MongoDB
const convertToObjectId = (userId: string): mongoose.Types.ObjectId => {
  try {
    return new mongoose.Types.ObjectId(userId);
  } catch (error) {
    console.error(`❌ Lỗi convert ObjectId cho userId: ${userId}`, error);
    throw new Error("Invalid userId format");
  }
};

// Danh sách quản lý user online theo socket
// Key: userId, Value: Set chứa các socketId (1 user có thể có nhiều tab/socket)
const userSocketMap: Record<string, Set<string>> = {};

// Danh sách quản lý phòng chat
// Key: roomId, Value: Set chứa các userId tham gia phòng
const roomParticipants: Record<string, Set<string>> = {};

// Danh sách theo dõi trạng thái typing
// Key: "senderId_receiverId", Value: timeout ID để clear typing
const typingTimeouts: Record<string, NodeJS.Timeout> = {};

// Quản lý trạng thái cuộc gọi
// Key: userId, Value: { callerId, receiverId, callType, startTime }
const activeCall: Record<
  string,
  {
    callerId: string;
    receiverId: string;
    callType: string;
    startTime: Date;
  } | null
> = {};

// Statistics để monitor
const connectionStats = {
  totalConnections: 0,
  currentConnections: 0,
  messagesSent: 0,
  callsInitiated: 0,
};

// Cập nhật thời gian hoạt động cuối cùng của user trong database
const updateLastActiveTime = async (userId: string): Promise<void> => {
  try {
    const userObj = convertToObjectId(userId);
    await User.findByIdAndUpdate(userObj, {
      lastActiveAt: new Date(),
      isOnline: true, // Đánh dấu user đang online
    });
    logger.success(`Cập nhật thời gian hoạt động cuối cho user: ${userId}`);
  } catch (error) {
    logger.error(`Lỗi cập nhật lastActive cho user ${userId}:`, error);
  }
};

// Đánh dấu user offline khi disconnect hoàn toàn
const markUserOffline = async (userId: string): Promise<void> => {
  try {
    const userObj = convertToObjectId(userId);
    await User.findByIdAndUpdate(userObj, {
      lastActiveAt: new Date(),
      isOnline: false, // Đánh dấu user offline
    });
    logger.info(`Đánh dấu user offline: ${userId}`);
  } catch (error) {
    logger.error(`Lỗi đánh dấu user offline ${userId}:`, error);
  }
};

// Lấy danh sách tất cả socket IDs của một user
export const getReceiverSocketIds = (userId: string): string[] => {
  return userSocketMap[userId] ? Array.from(userSocketMap[userId]) : [];
};

// Lấy danh sách tất cả user đang online
const getOnlineUsers = (): string[] => {
  return Object.keys(userSocketMap);
};

// Kiểm tra user có online không
const isUserOnline = (userId: string): boolean => {
  return userSocketMap[userId] && userSocketMap[userId].size > 0;
};

// =============== CALL MANAGEMENT FUNCTIONS ===============

// Kiểm tra user có đang trong cuộc gọi không
const isUserInCall = (userId: string): boolean => {
  return activeCall[userId] !== null && activeCall[userId] !== undefined;
};

// Đánh dấu user bắt đầu cuộc gọi
const startCall = (
  callerId: string,
  receiverId: string,
  callType: string
): void => {
  const callData = { callerId, receiverId, callType, startTime: new Date() };
  activeCall[callerId] = callData;
  activeCall[receiverId] = callData;
  logger.info(`📞 Bắt đầu cuộc gọi ${callType}: ${callerId} → ${receiverId}`);
};

// Kết thúc cuộc gọi
const endCall = (userId1: string, userId2: string): void => {
  if (activeCall[userId1]) {
    logger.info(`📞 Kết thúc cuộc gọi: ${userId1} ↔ ${userId2}`);
  }
  activeCall[userId1] = null;
  activeCall[userId2] = null;
};

// Lấy thông tin cuộc gọi hiện tại của user
const getUserCallInfo = (userId: string) => {
  return activeCall[userId];
};

// Validate dữ liệu tin nhắn
const validateMessageData = (data: {
  receiverId?: string;
  message?: string;
  senderId?: string;
}): boolean => {
  return !!(
    data.receiverId &&
    data.message &&
    data.senderId &&
    data.message.trim().length > 0 &&
    data.message.length <= 1000
  );
};

// Validate dữ liệu cuộc gọi
const validateCallData = (data: {
  receiverId?: string;
  callerId?: string;
  peerId?: string;
}): boolean => {
  return !!(data.receiverId && data.callerId && data.peerId);
};

// Xử lý khi user kết nối socket
const handleUserConnection = async (
  socket: any,
  userId: string
): Promise<void> => {
  try {
    // Khởi tạo Set cho user nếu chưa có
    if (!userSocketMap[userId]) {
      userSocketMap[userId] = new Set();
    }

    // Thêm socket ID vào danh sách của user
    userSocketMap[userId].add(socket.id);

    // Cập nhật thông tin trong database
    await updateLastActiveTime(userId);

    // Cập nhật thống kê dùng để thống kê các kết nối
    connectionStats.currentConnections++;
    connectionStats.totalConnections++;

    logger.success(
      `User kết nối: ${userId} | Socket: ${socket.id} | Tổng socket: ${userSocketMap[userId].size}`
    );

    // Gửi danh sách user online cho tất cả clients
    io.emit("getOnlineUsers", getOnlineUsers());

    // Gửi thông báo user vừa online (trừ chính user đó)
    socket.broadcast.emit("userStatusChanged", {
      userId,
      status: "online",
      lastActiveAt: new Date(),
    });
  } catch (error) {
    logger.error(`Lỗi xử lý kết nối user ${userId}:`, error);
    socket.emit("error", {
      message: "Lỗi kết nối server",
      code: "CONNECTION_ERROR",
    });
  }
};

// Xử lý khi user ngắt kết nối socket
const handleUserDisconnection = async (
  socket: any,
  userId: string
): Promise<void> => {
  try {
    // ✅ KẾT THÚC CUỘC GỌI KHI DISCONNECT
    if (isUserInCall(userId)) {
      const callInfo = getUserCallInfo(userId);
      if (callInfo) {
        // Tìm user còn lại trong cuộc gọi
        const otherUserId =
          callInfo.callerId === userId
            ? callInfo.receiverId
            : callInfo.callerId;

        if (otherUserId) {
          endCall(userId, otherUserId);

          // Thông báo cuộc gọi bị ngắt do disconnect
          const otherUserSockets = getReceiverSocketIds(otherUserId);
          otherUserSockets.forEach((socketId: string) => {
            io.to(socketId).emit("callEnded", {
              callerId: userId,
              reason: "disconnect",
            });
          });

          logger.warning(`📞 Cuộc gọi bị ngắt do ${userId} disconnect`);
        }
      }
    }

    // Xóa socket ID khỏi danh sách của user
    if (userSocketMap[userId]) {
      userSocketMap[userId].delete(socket.id);

      // Nếu user hết socket thì xóa khỏi danh sách online
      if (userSocketMap[userId].size === 0) {
        delete userSocketMap[userId];
        // Đánh dấu user offline trong database
        await markUserOffline(userId);

        // Thông báo user offline
        socket.broadcast.emit("userStatusChanged", {
          userId,
          status: "offline",
          lastActiveAt: new Date(),
        });
      } else {
        // User vẫn còn socket khác, chỉ cập nhật lastActive
        await updateLastActiveTime(userId);
      }
    }

    // Cập nhật thống kê
    connectionStats.currentConnections = Math.max(
      0,
      connectionStats.currentConnections - 1
    );

    logger.info(
      `User ngắt kết nối: ${userId} | Socket: ${socket.id} | Socket còn lại: ${
        userSocketMap[userId]?.size || 0
      }`
    );

    // Gửi danh sách user online cập nhật
    io.emit("getOnlineUsers", getOnlineUsers());
  } catch (error) {
    logger.error(`Lỗi xử lý ngắt kết nối user ${userId}:`, error);
  }
};

// Xử lý gửi tin nhắn chat realtime
const handleChatMessage = (
  socket: any,
  data: {
    receiverId: string;
    message: string;
    senderId: string;
    messageType?: string;
  }
): void => {
  try {
    // Validate dữ liệu đầu vào
    if (!validateMessageData(data)) {
      socket.emit("error", {
        message: "Dữ liệu tin nhắn không hợp lệ",
        code: "INVALID_MESSAGE_DATA",
      });
      return;
    }

    const { receiverId, message, senderId, messageType = "text" } = data;

    // Lấy danh sách socket của người nhận
    const receiverSockets = getReceiverSocketIds(receiverId);

    // Chuẩn bị dữ liệu tin nhắn
    const messageData = {
      senderId,
      receiverId,
      message: message.trim(),
      messageType,
      timestamp: new Date(),
      messageId: new mongoose.Types.ObjectId().toString(), // Tạo ID tạm cho message
    };

    // Gửi tin nhắn tới tất cả socket của người nhận
    receiverSockets.forEach((socketId: string) => {
      io.to(socketId).emit("newMessage", messageData);
    });

    // Gửi confirmation cho người gửi
    socket.emit("messageDelivered", {
      messageId: messageData.messageId,
      deliveredAt: new Date(),
      receiverOnline: receiverSockets.length > 0,
    });

    // Cập nhật thống kê
    connectionStats.messagesSent++;

    logger.info(
      `📨 Tin nhắn từ ${senderId} đến ${receiverId}: "${message.substring(
        0,
        50
      )}${message.length > 50 ? "..." : ""}"`
    );
  } catch (error) {
    logger.error("Lỗi xử lý tin nhắn chat:", error);
    socket.emit("error", {
      message: "Lỗi gửi tin nhắn",
      code: "MESSAGE_ERROR",
    });
  }
};

// Xử lý cuộc gọi video/audio (gửi peerId cho receiver)
const handleSendPeerId = (
  socket: any,
  data: {
    receiverId: string;
    callerId: string;
    peerId: string;
    callType?: string;
  }
): void => {
  try {
    // Validate dữ liệu cuộc gọi
    if (!validateCallData(data)) {
      socket.emit("callError", {
        message: "Dữ liệu cuộc gọi không hợp lệ",
        code: "INVALID_CALL_DATA",
      });
      return;
    }

    const { receiverId, callerId, peerId, callType = "video" } = data;

    // Kiểm tra người nhận có online không
    const receiverSockets = getReceiverSocketIds(receiverId);
    if (receiverSockets.length === 0) {
      socket.emit("callError", {
        message: "Người nhận không trực tuyến",
        code: "USER_OFFLINE",
      });
      logger.warning(`📞 Cuộc gọi thất bại: ${receiverId} không online`);
      return;
    }

    // ✅ KIỂM TRA NGƯỜI GỌI ĐANG TRONG CUỘC GỌI KHÁC
    if (isUserInCall(callerId)) {
      socket.emit("callError", {
        message: "Bạn đang trong cuộc gọi khác",
        code: "CALLER_IN_CALL",
      });
      logger.warning(
        `📞 Cuộc gọi thất bại: ${callerId} đang trong cuộc gọi khác`
      );
      return;
    }

    // ✅ KIỂM TRA NGƯỜI NHẬN ĐANG TRONG CUỘC GỌI KHÁC
    if (isUserInCall(receiverId)) {
      socket.emit("callError", {
        message: "Người nhận đang bận",
        code: "RECEIVER_BUSY",
      });
      logger.warning(`📞 Cuộc gọi thất bại: ${receiverId} đang bận`);
      return;
    }

    // ✅ ĐÁNH DẤU BẮT ĐẦU CUỘC GỌI
    startCall(callerId, receiverId, callType);

    const callData = {
      callerId,
      peerId,
      callType,
      timestamp: new Date(),
    };

    // Gửi thông tin cuộc gọi tới tất cả socket của người nhận
    receiverSockets.forEach((socketId: string) => {
      io.to(socketId).emit("receivePeerId", callData);
      io.to(socketId).emit("incomingCall", callData);
    });

    // Cập nhật thống kê
    connectionStats.callsInitiated++;

    logger.success(
      `📞 Cuộc gọi ${callType} từ ${callerId} đến ${receiverId} (peerId: ${peerId})`
    );
  } catch (error) {
    logger.error("Lỗi xử lý cuộc gọi:", error);
    socket.emit("callError", {
      message: "Lỗi kết nối cuộc gọi",
      code: "CALL_ERROR",
    });
  }
};

// Xử lý gửi notification realtime
const handleNotification = (
  socket: any,
  data: {
    receiverId: string;
    notification: {
      type: string;
      title: string;
      message: string;
      senderId?: string;
      relatedId?: string;
    };
  }
): void => {
  try {
    const { receiverId, notification } = data;

    // Validate cơ bản
    if (!receiverId || !notification?.title || !notification?.message) {
      socket.emit("error", {
        message: "Dữ liệu notification không hợp lệ",
        code: "INVALID_NOTIFICATION_DATA",
      });
      return;
    }

    const receiverSockets = getReceiverSocketIds(receiverId);

    const notificationData = {
      ...notification,
      timestamp: new Date(),
      isRead: false,
      notificationId: new mongoose.Types.ObjectId().toString(),
    };

    // Gửi notification tới tất cả socket của người nhận
    receiverSockets.forEach((socketId: string) => {
      io.to(socketId).emit("notification", notificationData);
    });

    logger.info(`🔔 Notification gửi đến ${receiverId}: ${notification.title}`);
  } catch (error) {
    logger.error("Lỗi xử lý notification:", error);
    socket.emit("error", {
      message: "Lỗi gửi thông báo",
      code: "NOTIFICATION_ERROR",
    });
  }
};

// Xử lý typing indicator
const handleTypingStart = (
  socket: any,
  data: { receiverId: string; senderId: string }
): void => {
  try {
    const { receiverId, senderId } = data;

    if (!receiverId || !senderId) {
      return;
    }

    const typingKey = `${senderId}_${receiverId}`;

    // Clear timeout cũ nếu có
    if (typingTimeouts[typingKey]) {
      clearTimeout(typingTimeouts[typingKey]);
    }

    // Gửi typing indicator đến người nhận
    const receiverSockets = getReceiverSocketIds(receiverId);
    receiverSockets.forEach((socketId: string) => {
      io.to(socketId).emit("userTyping", {
        senderId,
        isTyping: true,
        timestamp: new Date(),
      });
    });

    // Tự động tắt typing sau 3 giây
    typingTimeouts[typingKey] = setTimeout(() => {
      receiverSockets.forEach((socketId: string) => {
        io.to(socketId).emit("userTyping", {
          senderId,
          isTyping: false,
          timestamp: new Date(),
        });
      });
      delete typingTimeouts[typingKey];
    }, 3000);
  } catch (error) {
    logger.error("Lỗi xử lý typing start:", error);
  }
};

// Xử lý dừng typing
const handleTypingStop = (
  socket: any,
  data: { receiverId: string; senderId: string }
): void => {
  try {
    const { receiverId, senderId } = data;

    if (!receiverId || !senderId) {
      return;
    }

    const typingKey = `${senderId}_${receiverId}`;

    // Clear timeout
    if (typingTimeouts[typingKey]) {
      clearTimeout(typingTimeouts[typingKey]);
      delete typingTimeouts[typingKey];
    }

    // Gửi stop typing đến người nhận
    const receiverSockets = getReceiverSocketIds(receiverId);
    receiverSockets.forEach((socketId: string) => {
      io.to(socketId).emit("userTyping", {
        senderId,
        isTyping: false,
        timestamp: new Date(),
      });
    });
  } catch (error) {
    logger.error("Lỗi xử lý typing stop:", error);
  }
};

// Xử lý đánh dấu tin nhắn đã đọc
const handleMarkMessageSeen = (
  socket: any,
  data: { messageId: string; senderId: string; userId: string }
): void => {
  try {
    const { messageId, senderId, userId } = data;

    if (!messageId || !senderId || !userId) {
      return;
    }

    // Gửi thông báo đã đọc cho người gửi
    const senderSockets = getReceiverSocketIds(senderId);
    const seenData = {
      messageId,
      userId,
      seenAt: new Date(),
    };

    senderSockets.forEach((socketId: string) => {
      io.to(socketId).emit("messageSeen", seenData);
    });

    logger.info(`👁️ Message ${messageId} đã được đọc bởi ${userId}`);
  } catch (error) {
    logger.error("Lỗi xử lý mark message seen:", error);
  }
};

// Xử lý join phòng chat
const handleJoinRoom = (
  socket: any,
  data: { roomId: string; userId: string }
): void => {
  try {
    const { roomId, userId } = data;

    if (!roomId || !userId) {
      socket.emit("error", {
        message: "Thiếu thông tin phòng hoặc user",
        code: "MISSING_ROOM_DATA",
      });
      return;
    }

    // Thêm user vào phòng
    if (!roomParticipants[roomId]) {
      roomParticipants[roomId] = new Set();
    }
    roomParticipants[roomId].add(userId);

    // Socket join room
    socket.join(roomId);

    // Thông báo cho các thành viên khác trong phòng
    socket.to(roomId).emit("userJoinedRoom", {
      userId,
      roomId,
      timestamp: new Date(),
    });

    // Gửi danh sách thành viên hiện tại
    socket.emit("roomParticipants", {
      roomId,
      participants: Array.from(roomParticipants[roomId]),
    });

    logger.success(`🏠 User ${userId} tham gia phòng ${roomId}`);
  } catch (error) {
    logger.error("Lỗi join room:", error);
    socket.emit("error", {
      message: "Lỗi tham gia phòng",
      code: "JOIN_ROOM_ERROR",
    });
  }
};

// Xử lý leave phòng chat
const handleLeaveRoom = (
  socket: any,
  data: { roomId: string; userId: string }
): void => {
  try {
    const { roomId, userId } = data;

    if (!roomId || !userId) {
      return;
    }

    // Xóa user khỏi phòng
    if (roomParticipants[roomId]) {
      roomParticipants[roomId].delete(userId);

      // Nếu phòng trống thì xóa
      if (roomParticipants[roomId].size === 0) {
        delete roomParticipants[roomId];
      }
    }

    // Socket leave room
    socket.leave(roomId);

    // Thông báo cho các thành viên khác
    socket.to(roomId).emit("userLeftRoom", {
      userId,
      roomId,
      timestamp: new Date(),
    });

    logger.info(`🚪 User ${userId} rời phòng ${roomId}`);
  } catch (error) {
    logger.error("Lỗi leave room:", error);
  }
};

// Xử lý gửi tin nhắn trong phòng
const handleRoomMessage = (
  socket: any,
  data: {
    roomId: string;
    message: string;
    senderId: string;
    messageType?: string;
  }
): void => {
  try {
    const { roomId, message, senderId, messageType = "text" } = data;

    if (!roomId || !message || !senderId || message.trim().length === 0) {
      socket.emit("error", {
        message: "Dữ liệu tin nhắn phòng không hợp lệ",
        code: "INVALID_ROOM_MESSAGE",
      });
      return;
    }

    const messageData = {
      roomId,
      senderId,
      message: message.trim(),
      messageType,
      timestamp: new Date(),
      messageId: new mongoose.Types.ObjectId().toString(),
    };

    // Gửi tin nhắn tới tất cả thành viên trong phòng (trừ người gửi)
    socket.to(roomId).emit("newRoomMessage", messageData);

    // Gửi confirmation cho người gửi
    socket.emit("roomMessageDelivered", {
      messageId: messageData.messageId,
      roomId,
      deliveredAt: new Date(),
    });

    logger.info(
      `🏠💬 Tin nhắn phòng ${roomId} từ ${senderId}: "${message.substring(
        0,
        50
      )}${message.length > 50 ? "..." : ""}"`
    );
  } catch (error) {
    logger.error("Lỗi gửi tin nhắn phòng:", error);
    socket.emit("error", {
      message: "Lỗi gửi tin nhắn phòng",
      code: "ROOM_MESSAGE_ERROR",
    });
  }
};

// Lấy thống kê kết nối
const getConnectionStats = () => {
  return {
    ...connectionStats,
    onlineUsers: Object.keys(userSocketMap).length,
    totalSockets: Object.values(userSocketMap).reduce(
      (total, sockets) => total + sockets.size,
      0
    ),
    activeRooms: Object.keys(roomParticipants).length,
  };
};
// Xử lý kết nối Socket.IO chính
io.on("connection", (socket) => {
  console.log("🔌 New socket connection:", socket.id);
  const userId = socket.handshake.query.userId as string;
  console.log("👤 UserId from query:", userId);

  // Kiểm tra userId hợp lệ
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    logger.warning("⚠️ Kết nối bị từ chối: Không có userId hợp lệ");
    socket.emit("error", { message: "Thiếu userId", code: "MISSING_USER_ID" });
    socket.disconnect();
    return;
  }

  // Xử lý kết nối thành công
  handleUserConnection(socket, userId.trim());

  // Đăng ký các event handlers

  // === CHAT EVENTS ===
  socket.on("sendMessage", (data) => {
    handleChatMessage(socket, { ...data, senderId: userId });
    console.log("📨 sendMessage event data:", data);
    // Log dữ liệu gửi tin nhắn để debug
  });

  socket.on("joinRoom", (data) => {
    handleJoinRoom(socket, { ...data, userId });
  });
  //Rời phòng
  socket.on("leaveRoom", (data) => {
    handleLeaveRoom(socket, { ...data, userId });
  });

  socket.on("sendRoomMessage", (data) => {
    handleRoomMessage(socket, { ...data, senderId: userId });
  });

  // === TYPING EVENTS ===
  //đang gõ
  socket.on("startTyping", (data) => {
    handleTypingStart(socket, { ...data, senderId: userId });
  });
  //ngừng gõ
  socket.on("stopTyping", (data) => {
    handleTypingStop(socket, { ...data, senderId: userId });
  });

  // === MESSAGE EVENTS ===
  // Đánh dấu tin nhắn đã đọc
  socket.on("markMessageSeen", (data) => {
    handleMarkMessageSeen(socket, { ...data, userId });
  });

  // === CALL EVENTS ===
  socket.on("sendPeerId", (data) => {
    handleSendPeerId(socket, { ...data, callerId: userId });
  });
  // Trả lời cuộc gọi (chấp nhận/từ chối)
  socket.on("answerCall", (data) => {
    try {
      const { callerId, accepted } = data;
      if (!callerId || typeof accepted !== "boolean") {
        socket.emit("callError", {
          message: "Dữ liệu trả lời cuộc gọi không hợp lệ",
        });
        return;
      }

      const callerSockets = getReceiverSocketIds(callerId);
      callerSockets.forEach((socketId: string) => {
        io.to(socketId).emit("callAnswered", { receiverId: userId, accepted });
      });

      // ✅ NẾU TỪ CHỐI THÌ KẾT THÚC CUỘC GỌI
      if (!accepted) {
        endCall(callerId, userId);
        logger.info(`📞 Cuộc gọi bị từ chối bởi ${userId}`);
      } else {
        logger.info(`📞 Cuộc gọi được chấp nhận bởi ${userId}`);
      }
    } catch (error) {
      logger.error("Lỗi xử lý answer call:", error);
    }
  });

  socket.on("endCall", (data) => {
    try {
      const { receiverId } = data;
      if (!receiverId) return;

      // ✅ KẾT THÚC CUỘC GỌI
      endCall(userId, receiverId);

      const receiverSockets = getReceiverSocketIds(receiverId);
      receiverSockets.forEach((socketId: string) => {
        io.to(socketId).emit("callEnded", { callerId: userId });
      });

      logger.info(`📞 Cuộc gọi kết thúc giữa ${userId} và ${receiverId}`);
    } catch (error) {
      logger.error("Lỗi xử lý end call:", error);
    }
  });

  // ✅ KIỂM TRA TRẠNG THÁI CUỘC GỌI
  socket.on("checkCallStatus", (data) => {
    try {
      const { targetUserId } = data;
      const isTargetInCall = targetUserId ? isUserInCall(targetUserId) : false;
      const isCurrentUserInCall = isUserInCall(userId);

      socket.emit("callStatusResponse", {
        targetUserId,
        targetUserInCall: isTargetInCall,
        currentUserInCall: isCurrentUserInCall,
        targetUserOnline: targetUserId ? isUserOnline(targetUserId) : false,
        callInfo: isCurrentUserInCall ? getUserCallInfo(userId) : null,
      });
    } catch (error) {
      logger.error("Lỗi kiểm tra trạng thái cuộc gọi:", error);
      socket.emit("callError", {
        message: "Lỗi kiểm tra trạng thái cuộc gọi",
        code: "CHECK_STATUS_ERROR",
      });
    }
  });

  // === NOTIFICATION EVENTS ===
  socket.on("sendNotification", (data) => {
    handleNotification(socket, data);
  });

  // === STATUS EVENTS ===
  socket.on("updateStatus", (data) => {
    try {
      const { status } = data;
      if (!status || !["online", "away", "busy"].includes(status)) {
        socket.emit("error", { message: "Trạng thái không hợp lệ" });
        return;
      }

      // Broadcast status change
      socket.broadcast.emit("userStatusChanged", {
        userId,
        status,
        lastActiveAt: new Date(),
      });

      logger.info(`📊 User ${userId} đổi trạng thái thành: ${status}`);
    } catch (error) {
      logger.error("Lỗi cập nhật status:", error);
    }
  });

  // === UTILITY EVENTS ===
  // Lấy danh sách user online
  socket.on("getStats", () => {
    socket.emit("connectionStats", getConnectionStats());
  });
  // Ping-pong để kiểm tra kết nối
  socket.on("ping", () => {
    socket.emit("pong", { timestamp: new Date() });
  });

  // === ERROR & DISCONNECT EVENTS ===
  socket.on("disconnect", (reason) => {
    logger.info(`🔌 Socket disconnect: ${userId} | Lý do: ${reason}`);
    handleUserDisconnection(socket, userId);
  });

  socket.on("error", (error) => {
    logger.error(
      `⚠️ Socket error - User: ${userId}, Socket: ${socket.id}`,
      error
    );
  });

  // Xử lý timeout
  socket.on("connect_error", (error) => {
    logger.error(`🔴 Connection error - User: ${userId}`, error);
  });

  // Log kết nối thành công với thông tin chi tiết
  logger.success(`🎯 Socket handlers đã được đăng ký cho user: ${userId}`);
});

// Log khi socket server được khởi tạo
console.log("🚀 Socket.IO server initialized");
console.log(
  "📡 CORS origin:",
  process.env.FRONTEND_URL || "http://localhost:3000"
);
console.log("=============> Socket.IO kết nối thành công...🚀");

export { io, server, app };
