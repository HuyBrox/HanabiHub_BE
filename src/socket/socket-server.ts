import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import User from "../models/user.model";
import RandomCall from "../models/random-call.model";
import LearningInsights from "../models/learning-insights.model";

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
// Key: userId, Value: { callerId, receiverId, callType, startTime, randomCallId }
const activeCall: Record<
  string,
  {
    callerId: string;
    receiverId: string;
    callType: string;
    startTime: Date;
    randomCallId?: string | undefined; // ID của RandomCall document (nếu là random call)
  } | null
> = {};

// =============== RANDOM CALL QUEUE MANAGEMENT ===============
// Quản lý hàng đợi random call
// Key: socketId, Value: { userId, socketId, filters, waiting, busy }
interface RandomCallUser {
  userId: string;
  socketId: string;
  filters: {
    level: "N5" | "N4" | "N3" | "N2" | "N1" | "NO_FILTER";
    lang: string;
  };
  waiting: boolean; // Đang tìm kiếm
  busy: boolean; // Đang trong cuộc gọi
  joinedAt: Date;
}

const randomCallQueue: Record<string, RandomCallUser> = {};

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
  callType: string,
  randomCallId?: string
): void => {
  const callData: {
    callerId: string;
    receiverId: string;
    callType: string;
    startTime: Date;
    randomCallId?: string;
  } = {
    callerId,
    receiverId,
    callType,
    startTime: new Date()
  };

  if (randomCallId) {
    callData.randomCallId = randomCallId;
  }

  activeCall[callerId] = callData;
  activeCall[receiverId] = callData;
  logger.info(`📞 Bắt đầu cuộc gọi ${callType}: ${callerId} → ${receiverId}${randomCallId ? ' (Random)' : ''}`);
};

// Kết thúc cuộc gọi
const endCall = async (userId1: string, userId2: string): Promise<void> => {
  if (activeCall[userId1]) {
    logger.info(`📞 Kết thúc cuộc gọi: ${userId1} ↔ ${userId2}`);

    // ✅ KHÔNG CẦN emit showRatingDialog nữa
    // Rating được làm real-time trong call, không cần popup sau khi kết thúc

    const callInfo = activeCall[userId1];
    if (callInfo?.randomCallId) {
      logger.info(`📝 Random call ${callInfo.randomCallId} ended`);
    }
  }
  activeCall[userId1] = null;
  activeCall[userId2] = null;
};

// Lấy thông tin cuộc gọi hiện tại của user
const getUserCallInfo = (userId: string) => {
  return activeCall[userId];
};

// =============== RANDOM CALL QUEUE FUNCTIONS ===============

// Thêm user vào random call queue
const addToRandomQueue = (
  userId: string,
  socketId: string,
  filters: { level: string; lang: string }
): void => {
  randomCallQueue[socketId] = {
    userId,
    socketId,
    filters: {
      level: filters.level as "N5" | "N4" | "N3" | "N2" | "N1" | "NO_FILTER",
      lang: filters.lang,
    },
    waiting: false,
    busy: false,
    joinedAt: new Date(),
  };
  logger.info(
    `🎲 User ${userId} joined random queue with filters:`,
    filters
  );
};

// Remove user khỏi random call queue
const removeFromRandomQueue = (socketId: string): void => {
  const user = randomCallQueue[socketId];
  if (user) {
    logger.info(`🎲 User ${user.userId} removed from random queue`);
    delete randomCallQueue[socketId];
  }
};

// Set trạng thái waiting cho user
const setUserWaiting = (socketId: string, waiting: boolean): void => {
  if (randomCallQueue[socketId]) {
    randomCallQueue[socketId].waiting = waiting;
    logger.info(
      `🎲 User ${randomCallQueue[socketId].userId} waiting status: ${waiting}`
    );
  }
};

// Set trạng thái busy cho user
const setUserBusy = (socketId: string, busy: boolean): void => {
  if (randomCallQueue[socketId]) {
    randomCallQueue[socketId].busy = busy;
    logger.info(
      `🎲 User ${randomCallQueue[socketId].userId} busy status: ${busy}`
    );
  }
};

// Tìm match cho user trong queue
const findMatch = (
  currentUser: RandomCallUser
): RandomCallUser | null => {
  const { userId, filters, socketId } = currentUser;

  // Tìm trong queue
  for (const key in randomCallQueue) {
    const candidate = randomCallQueue[key];

    // Skip chính user đó
    if (candidate.socketId === socketId) continue;

    // Skip nếu candidate không đang waiting hoặc đang busy
    if (!candidate.waiting || candidate.busy) continue;

    // Skip nếu candidate đang trong cuộc gọi khác
    if (isUserInCall(candidate.userId)) continue;

    // Match logic:
    // 1. Nếu cả 2 đều NO_FILTER → match
    // 2. Nếu 1 trong 2 là NO_FILTER → match
    // 3. Nếu cả 2 cùng level → match
    const currentLevel = filters.level;
    const candidateLevel = candidate.filters.level;

    if (
      currentLevel === "NO_FILTER" ||
      candidateLevel === "NO_FILTER" ||
      currentLevel === candidateLevel
    ) {
      logger.success(
        `🎲 Match found: ${userId} (${currentLevel}) ↔ ${candidate.userId} (${candidateLevel})`
      );
      return candidate;
    }
  }

  return null;
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
    // ✅ CLEANUP RANDOM CALL QUEUE
    if (randomCallQueue[socket.id]) {
      removeFromRandomQueue(socket.id);
      logger.info(`🎲 Removed ${userId} from random queue on disconnect`);
    }

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

            // Cleanup random queue của user kia nếu có
            if (randomCallQueue[socketId]) {
              setUserBusy(socketId, false);
              setUserWaiting(socketId, false);
            }
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

  // === RANDOM CALL EVENTS ===
  // Join random call queue
  socket.on("joinRandomQueue", (data) => {
    try {
      const { filters } = data;
      if (!filters || !filters.level || !filters.lang) {
        socket.emit("randomCallError", {
          message: "Missing filters data",
          code: "INVALID_FILTERS",
        });
        return;
      }

      addToRandomQueue(userId, socket.id, filters);
      socket.emit("joinedRandomQueue", {
        success: true,
        filters,
        queueSize: Object.keys(randomCallQueue).length,
      });

      logger.info(`🎲 User ${userId} joined random queue`);
    } catch (error) {
      logger.error("Error joining random queue:", error);
      socket.emit("randomCallError", {
        message: "Failed to join queue",
        code: "JOIN_QUEUE_ERROR",
      });
    }
  });

  // Start searching for random match
  socket.on("startRandomSearch", async (data) => {
    try {
      const currentUser = randomCallQueue[socket.id];
      if (!currentUser) {
        socket.emit("randomCallError", {
          message: "Not in random queue",
          code: "NOT_IN_QUEUE",
        });
        return;
      }

      // Kiểm tra user có đang trong cuộc gọi không
      if (isUserInCall(userId)) {
        socket.emit("randomCallError", {
          message: "You are already in a call",
          code: "ALREADY_IN_CALL",
        });
        return;
      }

      // Set waiting = true
      setUserWaiting(socket.id, true);

      // Tìm match
      const match = findMatch(currentUser);

      if (match) {
        // Tìm thấy match!
        // Set cả 2 user busy
        setUserBusy(socket.id, true);
        setUserBusy(match.socketId, true);
        setUserWaiting(socket.id, false);
        setUserWaiting(match.socketId, false);

        // Tạo RandomCall document
        let randomCallId: string | undefined;
        try {
          const newRandomCall = await RandomCall.create({
            user1Id: new mongoose.Types.ObjectId(userId),
            user2Id: new mongoose.Types.ObjectId(match.userId),
            user1Level: currentUser.filters.level,
            user2Level: match.filters.level,
            matchedLevel: currentUser.filters.level === match.filters.level
              ? currentUser.filters.level
              : "NO_FILTER",
            callType: "video",
            status: "ongoing",
          });
          randomCallId = newRandomCall._id.toString();
          logger.success(`📝 Created RandomCall document: ${randomCallId}`);
        } catch (error) {
          logger.error("Error creating RandomCall document:", error);
        }

        // Đánh dấu bắt đầu cuộc gọi trong activeCall với randomCallId
        startCall(userId, match.userId, "video", randomCallId);

        // Emit match_found cho cả 2
        socket.emit("matchFound", {
          partnerId: match.userId,
          partnerLevel: match.filters.level,
          callType: "video",
          callId: randomCallId,
        });

        io.to(match.socketId).emit("matchFound", {
          partnerId: userId,
          partnerLevel: currentUser.filters.level,
          callType: "video",
          callId: randomCallId,
        });

        logger.success(
          `🎲 Match completed: ${userId} ↔ ${match.userId} - Starting call`
        );
      } else {
        // Chưa tìm thấy, giữ waiting = true
        socket.emit("searchingForMatch", {
          message: "Searching for a partner...",
          queueSize: Object.keys(randomCallQueue).filter(
            (k) => randomCallQueue[k].waiting
          ).length,
        });
        logger.info(`🎲 User ${userId} searching for match...`);
      }
    } catch (error) {
      logger.error("Error starting random search:", error);
      socket.emit("randomCallError", {
        message: "Failed to search for match",
        code: "SEARCH_ERROR",
      });
    }
  });

  // Stop searching
  socket.on("stopRandomSearch", (data) => {
    try {
      setUserWaiting(socket.id, false);
      socket.emit("searchStopped", { success: true });
      logger.info(`🎲 User ${userId} stopped searching`);
    } catch (error) {
      logger.error("Error stopping search:", error);
    }
  });

  // Leave random queue
  socket.on("leaveRandomQueue", (data) => {
    try {
      removeFromRandomQueue(socket.id);
      socket.emit("leftRandomQueue", { success: true });
      logger.info(`🎲 User ${userId} left random queue`);
    } catch (error) {
      logger.error("Error leaving random queue:", error);
    }
  });

  // Send peer ID to partner in random call
  socket.on("sendRandomCallPeerId", (data) => {
    try {
      const { partnerId, peerId } = data;
      if (!partnerId || !peerId) {
        socket.emit("randomCallError", {
          message: "Missing partnerId or peerId",
          code: "INVALID_PEER_DATA",
        });
        return;
      }

      // Gửi peerId cho partner
      const partnerSockets = getReceiverSocketIds(partnerId);
      partnerSockets.forEach((socketId: string) => {
        io.to(socketId).emit("receiveRandomCallPeerId", {
          peerId,
          partnerId: userId,
        });
      });

      logger.info(`🎲 Sent peerId ${peerId} from ${userId} to ${partnerId}`);
    } catch (error) {
      logger.error("Error sending random call peer ID:", error);
      socket.emit("randomCallError", {
        message: "Failed to send peer ID",
        code: "PEER_ID_ERROR",
      });
    }
  });

  // End random call
  socket.on("endRandomCall", async (data) => {
    try {
      const { partnerId } = data;
      if (!partnerId) return;

      // Lấy thông tin cuộc gọi
      const callInfo = getUserCallInfo(userId);
      if (!callInfo || !callInfo.randomCallId) {
        logger.warning(`🎲 No random call info found for ${userId}`);
        return;
      }

      const callId = callInfo.randomCallId;
      const callStartTime = callInfo.startTime;
      const callDuration = Math.floor((Date.now() - callStartTime.getTime()) / 1000);

      // Kết thúc cuộc gọi
      endCall(userId, partnerId);

      // Update RandomCall document
      try {
        await RandomCall.findByIdAndUpdate(callId, {
          status: "completed",
          duration: callDuration,
          endedAt: new Date(),
        });
        logger.success(`📝 Updated RandomCall ${callId} - Duration: ${callDuration}s`);
      } catch (error) {
        logger.error("Error updating RandomCall document:", error);
      }

      // ✅ Track call activity in UserActivity
      // Logic: callDuration >= 60s = correct, < 60s = incorrect
      // Difficulty: <60s=again, 60-180s=hard, 180-300s=good, >300s=easy
      try {
        const isCorrect = callDuration >= 60;
        let difficulty: "again" | "hard" | "good" | "easy";

        if (callDuration < 60) {
          difficulty = "again";
        } else if (callDuration < 180) {
          difficulty = "hard";
        } else if (callDuration < 300) {
          difficulty = "good";
        } else {
          difficulty = "easy";
        }

        const UserActivity = (await import("../models/user-activity.model")).default;

        await UserActivity.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId) },
          {
            $push: {
              callActivities: {
                duration: callDuration,
                isCorrect,
                difficulty,
                timestamp: new Date(),
              },
            },
            $inc: {
              "callStats.totalCalls": 1,
              "callStats.totalDuration": callDuration,
              [`callStats.${isCorrect ? 'correctCalls' : 'incorrectCalls'}`]: 1,
            },
          },
          { upsert: true }
        );

        logger.success(`📊 Tracked call activity for ${userId}: ${callDuration}s (${difficulty}, ${isCorrect ? 'correct' : 'incorrect'})`);
      } catch (error) {
        logger.error("Error tracking call activity:", error);
      }

      logger.info(`🎲 Random call ended: ${userId} ↔ ${partnerId} - Duration: ${callDuration}s`);
    } catch (error) {
      logger.error("Error ending random call:", error);
    }
  });

  // Next partner - End current call and find new match
  socket.on("nextPartner", async (data) => {
    try {
      const { currentPartnerId } = data;
      if (!currentPartnerId) {
        socket.emit("randomCallError", {
          message: "Missing currentPartnerId",
          code: "INVALID_NEXT_PARTNER",
        });
        return;
      }

      const currentUser = randomCallQueue[socket.id];
      if (!currentUser) {
        socket.emit("randomCallError", {
          message: "Not in random queue",
          code: "NOT_IN_QUEUE",
        });
        return;
      }

      logger.info(`🎲 User ${userId} wants next partner (current: ${currentPartnerId})`);

      // 1. End current call
      const callInfo = getUserCallInfo(userId);
      if (callInfo && callInfo.randomCallId) {
        const callDuration = Math.floor((Date.now() - callInfo.startTime.getTime()) / 1000);

        // Update RandomCall document
        try {
          await RandomCall.findByIdAndUpdate(callInfo.randomCallId, {
            status: "skipped",
            duration: callDuration,
            endedAt: new Date(),
          });
        } catch (error) {
          logger.error("Error updating RandomCall on skip:", error);
        }
      }

      // End call
      endCall(userId, currentPartnerId);

      // Notify partner that call ended
      const partnerSockets = getReceiverSocketIds(currentPartnerId);
      partnerSockets.forEach((socketId: string) => {
        io.to(socketId).emit("partnerSkipped", {
          message: "Partner skipped to next",
        });
      });

      // 2. Set user back to waiting
      setUserBusy(socket.id, false);
      setUserWaiting(socket.id, true);

      // 3. Try to find new match
      const match = findMatch(currentUser);

      if (match) {
        // Found new match!
        setUserBusy(socket.id, true);
        setUserBusy(match.socketId, true);
        setUserWaiting(socket.id, false);
        setUserWaiting(match.socketId, false);

        // Create RandomCall document
        let randomCallId: string | undefined;
        try {
          const newRandomCall = await RandomCall.create({
            user1Id: new mongoose.Types.ObjectId(userId),
            user2Id: new mongoose.Types.ObjectId(match.userId),
            user1Level: currentUser.filters.level,
            user2Level: match.filters.level,
            matchedLevel: currentUser.filters.level === match.filters.level
              ? currentUser.filters.level
              : "NO_FILTER",
            callType: "video",
            status: "ongoing",
          });
          randomCallId = newRandomCall._id.toString();
          logger.success(`📝 Created new RandomCall document: ${randomCallId}`);
        } catch (error) {
          logger.error("Error creating RandomCall document:", error);
        }

        // Start call
        startCall(userId, match.userId, "video", randomCallId);

        // Emit match found
        socket.emit("matchFound", {
          partnerId: match.userId,
          partnerLevel: match.filters.level,
          callType: "video",
          callId: randomCallId,
        });

        io.to(match.socketId).emit("matchFound", {
          partnerId: userId,
          partnerLevel: currentUser.filters.level,
          callType: "video",
          callId: randomCallId,
        });

        logger.success(`🎲 Next partner match: ${userId} ↔ ${match.userId}`);
      } else {
        // No match found, keep searching
        socket.emit("searchingForMatch", {
          message: "Searching for next partner...",
          queueSize: Object.keys(randomCallQueue).filter(
            (k) => randomCallQueue[k].waiting
          ).length,
        });
        logger.info(`🎲 User ${userId} searching for next partner...`);
      }
    } catch (error) {
      logger.error("Error handling next partner:", error);
      socket.emit("randomCallError", {
        message: "Failed to find next partner",
        code: "NEXT_PARTNER_ERROR",
      });
    }
  });

  // Rate partner - Real-time rating during call
  socket.on("ratePartner", async (data) => {
    try {
      console.log("🎯 [RATING] Event received:", { userId, data });
      const { partnerId, rating } = data;

      if (!partnerId || !rating || rating < 1 || rating > 5) {
        console.log("❌ [RATING] Invalid data:", { partnerId, rating });
        socket.emit("randomCallError", {
          message: "Invalid rating data",
          code: "INVALID_RATING",
        });
        return;
      }

      logger.info(`⭐ User ${userId} rated partner ${partnerId} with ${rating} stars`);

      // Get call info to calculate current duration
      const callInfo = getUserCallInfo(userId);
      let callDuration = 0;

      if (callInfo && callInfo.startTime) {
        callDuration = Math.floor((Date.now() - callInfo.startTime.getTime()) / 1000);
      }

      // ✅ Adjust skill scores for listening + speaking based on rating
      // Rating 5 → +5, Rating 4 → +3, Rating 3 → +1, Rating 2 → -2, Rating 1 → -4
      // Logic: Cộng điểm cho PARTNER (người được rate), không phải người rate
      const pointsToAdd = rating === 5 ? 5 : rating === 4 ? 3 : rating === 3 ? 1 : rating === 2 ? -2 : -4;

      try {
        // Update both listening and speaking skills for PARTNER
        console.log(`💾 [RATING] Updating skills for partner ${partnerId} with ${pointsToAdd} points...`);
        const updateResult = await LearningInsights.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(partnerId) }, // ✅ Update partnerId, not userId
          {
            $inc: {
              "learningAnalysis.skillMastery.listening.level": pointsToAdd,
              "learningAnalysis.skillMastery.speaking.level": pointsToAdd,
            },
            $set: {
              "learningAnalysis.skillMastery.listening.lastPracticed": new Date(),
              "learningAnalysis.skillMastery.speaking.lastPracticed": new Date(),
            },
          },
          { upsert: true, new: true }
        );

        console.log(`✅ [RATING] Update result:`, {
          partnerId,
          pointsAdded: pointsToAdd,
          newListeningLevel: updateResult?.learningAnalysis?.skillMastery?.listening?.level,
          newSpeakingLevel: updateResult?.learningAnalysis?.skillMastery?.speaking?.level,
        });

        logger.success(`📊 Adjusted skill scores for PARTNER ${partnerId}: listening/speaking ${pointsToAdd > 0 ? '+' : ''}${pointsToAdd} points (rated by ${userId})`);
      } catch (error) {
        logger.error("Error adjusting skill scores:", error);
      }

      // Get user info for notification
      const raterUser = await User.findById(userId).select("fullname username");
      const raterName = raterUser?.fullname || raterUser?.username || "Someone";

      // Emit notification to partner
      const partnerSockets = getReceiverSocketIds(partnerId);
      partnerSockets.forEach((socketId: string) => {
        io.to(socketId).emit("partnerRatedYou", {
          partnerId: userId,
          partnerName: raterName,
          rating,
        });
      });

      // ✅ Emit success to rater (FE sẽ ẩn rating UI)
      socket.emit("ratingSubmitted", {
        success: true,
        rating,
        skillPointsAdded: pointsToAdd,
        currentCallDuration: callDuration,
      });

      logger.success(`⭐ Rating processed: ${userId} → ${partnerId} (${rating}⭐) | Duration: ${callDuration}s | Points: ${pointsToAdd > 0 ? '+' : ''}${pointsToAdd}`);
    } catch (error) {
      logger.error("Error handling rate partner:", error);
      socket.emit("randomCallError", {
        message: "Failed to send rating",
        code: "RATING_ERROR",
      });
    }
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

      // ✅ CLEANUP RANDOM CALL QUEUE
      if (randomCallQueue[socket.id]) {
        setUserBusy(socket.id, false);
        setUserWaiting(socket.id, false);
      }

      // Tìm socket của receiver và cleanup
      const receiverSockets = getReceiverSocketIds(receiverId);
      receiverSockets.forEach((socketId: string) => {
        io.to(socketId).emit("callEnded", { callerId: userId });
        if (randomCallQueue[socketId]) {
          setUserBusy(socketId, false);
          setUserWaiting(socketId, false);
        }
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
