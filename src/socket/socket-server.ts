import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import User from "../models/user.model";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: `https://crow-r6s9.onrender.com`,
    methods: ["GET", "POST"],
  },
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Chuyển userId thành ObjectId nếu cần
const convertToObjectId = (userId: string) => new mongoose.Types.ObjectId(userId);

// Danh sách socket theo user
const userSocketMap: Record<string, Set<string>> = {};

// Cập nhật lastActive
const updateLastActiveTime = async (userId: string) => {
  try {
    const userObj = convertToObjectId(userId);
    await User.findByIdAndUpdate(userObj, { lastActiveAt: new Date() });
    console.log(`Cập nhật thời gian hoạt động cuối: ${userId}`);
  } catch (error) {
    console.error("❌ Lỗi update lastActive:", error);
  }
};

// Lấy danh sách socket của user
export const getReciverSocketIds = (userId: string): string[] => {
  return userSocketMap[userId] ? Array.from(userSocketMap[userId]) : [];
};

// Xử lý connect
const handleUserConnection = async (socket: any, userId: string) => {
  if (!userSocketMap[userId]) {
    userSocketMap[userId] = new Set();
  }
  userSocketMap[userId].add(socket.id);

  await updateLastActiveTime(userId);
  console.log(`🔗 User kết nối: ${userId} | Socket: ${socket.id}`);

  io.emit("getOnlineUsers", Object.keys(userSocketMap));
};

// Xử lý disconnect
const handleUserDisconnection = async (socket: any, userId: string) => {
  if (userSocketMap[userId]) {
    userSocketMap[userId].delete(socket.id);
    if (userSocketMap[userId].size === 0) {
      delete userSocketMap[userId];
    }
  }

  await updateLastActiveTime(userId);
  console.log(`❌ User ngắt kết nối: ${userId} | Socket: ${socket.id}`);

  io.emit("getOnlineUsers", Object.keys(userSocketMap));
};

// Chat message
const handleChatMessage = (socket: any, { receiverId, message, senderId }: any) => {
  const receiverSockets = getReciverSocketIds(receiverId);
  receiverSockets.forEach(socketId => {
    io.to(socketId).emit("newMessage", { senderId, message, timestamp: new Date() });
  });
};

// Peer call (gửi peerId cho receiver)
const sendPeerId = (socket: any, { receiverId, callerId, peerId }: any) => {
  const receiverSockets = getReciverSocketIds(receiverId);
  if (receiverSockets.length > 0) {
    receiverSockets.forEach(socketId => {
      io.to(socketId).emit("receivePeerId", { callerId, peerId });
    });
    console.log(`📞 Gửi peerId (${peerId}) cho ${receiverId}`);
  } else {
    socket.emit("callError", { message: "Người nhận không trực tuyến." });
  }
};

// Notification
const handleNotification = (socket: any, { receiverId, notification }: any) => {
  const receiverSockets = getReciverSocketIds(receiverId);
  receiverSockets.forEach(socketId => {
    io.to(socketId).emit("notification", notification);
  });
};

// Socket.IO connection
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;

  if (!userId) {
    console.log("⚠️ Kết nối từ chối: Không có userId");
    socket.disconnect();
    return;
  }

  handleUserConnection(socket, userId);

  socket.on("sendMessage", (data) => handleChatMessage(socket, data));
  socket.on("sendNotification", (data) => handleNotification(socket, data));
  socket.on("sendPeerId", (data) => sendPeerId(socket, data));

  socket.on("disconnect", () => handleUserDisconnection(socket, userId));
  socket.on("error", (err) => {
    console.error(`⚠️ Lỗi socket user=${userId}, socket=${socket.id}`, err);
  });
});

export { io, server, app };
