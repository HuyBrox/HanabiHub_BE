import { Response } from "express";
import mongoose from "mongoose";
import Message from "../models/message.model";
import Conversation from "../models/conversation.model";
import { AuthRequest, ApiResponse } from "../types";
import { io, getReceiverSocketIds } from "../socket/socket-server";

// [POST] /api/v1/messages/send - Gửi tin nhắn giữa 2 user và phát socket
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user?.id;
    const { receiverId, message } = req.body as {
      receiverId?: string;
      message?: string;
    };

    if (!senderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "receiverId không hợp lệ",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!message || message.trim().length === 0 || message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Nội dung tin nhắn không hợp lệ",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const trimmed = message.trim();

    // Tạo message trong DB
    const newMsg = await Message.create({
      senderId: new mongoose.Types.ObjectId(senderId),
      receiverId: new mongoose.Types.ObjectId(receiverId),
      message: trimmed,
      isRead: false,
    });

    // Tìm hoặc tạo conversation giữa 2 user
    let conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        members: [senderId, receiverId],
        messages: [newMsg._id],
        unreadMessages: [
          { userId: new mongoose.Types.ObjectId(senderId), count: 0 },
          { userId: new mongoose.Types.ObjectId(receiverId), count: 1 },
        ],
      });
    } else {
      conversation.messages.push(newMsg._id);
      // tăng unread cho người nhận
      const receiverUnread = conversation.unreadMessages.find(
        (u) => u.userId.toString() === receiverId
      );
      if (receiverUnread) {
        receiverUnread.count += 1;
      } else {
        conversation.unreadMessages.push({
          userId: new mongoose.Types.ObjectId(receiverId),
          count: 1,
        } as any);
      }
      await conversation.save();
    }

    // Emit qua socket tới người nhận
    const payload = {
      messageId: newMsg._id.toString(),
      senderId,
      receiverId,
      message: trimmed,
      messageType: "text",
      timestamp: newMsg.createdAt || new Date(),
    };

    const receiverSockets = getReceiverSocketIds(receiverId);
    receiverSockets.forEach((socketId: string) => {
      io.to(socketId).emit("newMessage", payload);
    });

    return res.status(201).json({
      success: true,
      message: "Gửi tin nhắn thành công",
      data: { message: newMsg, conversationId: conversation._id },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error sendMessage:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/v1/messages/:partnerId?limit=&page= - Lấy lịch sử chat giữa 2 user
export const getConversationMessages = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user?.id;
    const { partnerId } = req.params as { partnerId: string };
    const { limit = 30, page = 1 } = req.query as any;

    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({
        success: false,
        message: "partnerId không hợp lệ",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const take = Math.min(Number(limit) || 30, 30);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const messages = await Message.find({
      $or: [
        { senderId: me, receiverId: partnerId },
        { senderId: partnerId, receiverId: me },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take);

    return res.status(200).json({
      success: true,
      message: "Lấy tin nhắn thành công",
      data: { items: messages, pagination: { page: Number(page) || 1, limit: take } },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error getConversationMessages:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [POST] /api/v1/messages/:partnerId/read - Đánh dấu đã đọc và phát socket messageSeen
export const markMessagesAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user?.id;
    const { partnerId } = req.params as { partnerId: string };

    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({
        success: false,
        message: "partnerId không hợp lệ",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Lấy danh sách message chưa đọc để emit sau đó
    const unread = await Message.find({
      senderId: partnerId,
      receiverId: me,
      isRead: false,
    }).select("_id");

    if (unread.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Không có tin nhắn chưa đọc",
        data: { updated: 0 },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Cập nhật trạng thái đã đọc
    const result = await Message.updateMany(
      { senderId: partnerId, receiverId: me, isRead: false },
      { $set: { isRead: true } }
    );

    // Cập nhật unreadMessages trong conversation về 0 cho user hiện tại
    const conversation = await Conversation.findOne({
      members: { $all: [me, partnerId] },
    });
    if (conversation) {
      await Conversation.updateOne(
        { _id: conversation._id, "unreadMessages.userId": new mongoose.Types.ObjectId(me) },
        { $set: { "unreadMessages.$.count": 0 } },
        { timestamps: false }
      );
    }

    // Emit socket "messageSeen" tới người gửi cho từng message
    const senderSockets = getReceiverSocketIds(partnerId);
    const seenAt = new Date();
    unread.forEach((m) => {
      senderSockets.forEach((sid: string) => {
        io.to(sid).emit("messageSeen", {
          messageId: m._id.toString(),
          userId: me,
          seenAt,
        });
      });
    });

    return res.status(200).json({
      success: true,
      message: "Đã đánh dấu đã đọc",
      data: { updated: (result as any).modifiedCount ?? unread.length },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error markMessagesAsRead:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/v1/messages - Danh sách cuộc hội thoại của tôi + lastMessage + unreadCount (phân trang, sắp xếp mới nhất)
export const listMyConversations = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user?.id;
    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Không có quyền truy cập",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const { limit = 20, page = 1 } = req.query as any;
    const take = Math.min(Number(limit) || 20, 100);
    const currentPage = Math.max(Number(page) || 1, 1);
    const skip = (currentPage - 1) * take;

    const [total, conversations] = await Promise.all([
      Conversation.countDocuments({ members: me }), //tổng số cuộc hội thoại
      Conversation.find({ members: me })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(take)
        .populate("members", "fullname username avatar"),
    ]);

    // Lấy last message cho từng conversation
    const items = await Promise.all(
      conversations.map(async (c) => {
        const lastMessageId = c.messages[c.messages.length - 1];
        let lastMessage: any = null;
        if (lastMessageId) {
          lastMessage = await Message.findById(lastMessageId).select(
            "message senderId createdAt"
          );
        }
        const meUnread = c.unreadMessages.find((u) => u.userId.toString() === me);
        return {
          _id: c._id,
          members: c.members,
          unreadCount: meUnread?.count || 0,
          lastMessage,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách hội thoại thành công",
      data: {
        items,
        pagination: {
          page: currentPage,
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error listMyConversations:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

