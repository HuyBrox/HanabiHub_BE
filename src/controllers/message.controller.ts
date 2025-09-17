import { Response } from "express";
import mongoose from "mongoose";
import User from "../models/user.model";
import Message from "../models/message.model";
import Conversation from "../models/conversation.model";
import { getReceiverSocketIds, io } from "../socket/socket-server";
import { AuthRequest } from "../types/express.types";
import {
  SendMessageRequest,
  MarkMessagesAsReadRequest,
  GetMessagesRequest,
} from "../types/message.types";

// Utility để convert string thành ObjectId
const toObjectId = (id: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(id);
};

// Utility để validate ObjectId
const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Logger cho message controller
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(
      `🔵 [MESSAGE] [${new Date().toISOString()}] ${message}`,
      ...args
    );
  },
  success: (message: string, ...args: any[]) => {
    console.log(
      `🟢 [MESSAGE] [${new Date().toISOString()}] ${message}`,
      ...args
    );
  },
  error: (message: string, ...args: any[]) => {
    console.log(
      `🔴 [MESSAGE] [${new Date().toISOString()}] ${message}`,
      ...args
    );
  },
};

/**
 * Gửi tin nhắn mới và lưu vào database
 * Tích hợp với socket để gửi realtime
 */
export const sendMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { receiverId, message } = req.body as SendMessageRequest;
    const senderId = req.user?.id;

    // Validate dữ liệu đầu vào
    if (!senderId) {
      res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người gửi",
      });
      return;
    }

    if (!receiverId || !message) {
      res.status(400).json({
        success: false,
        message: "Thiếu thông tin người nhận hoặc nội dung tin nhắn",
      });
      return;
    }

    if (!isValidObjectId(senderId) || !isValidObjectId(receiverId)) {
      res.status(400).json({
        success: false,
        message: "ID người dùng không hợp lệ",
      });
      return;
    }

    if (message.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Tin nhắn không được để trống",
      });
      return;
    }

    if (message.length > 1000) {
      res.status(400).json({
        success: false,
        message: "Tin nhắn quá dài (tối đa 1000 ký tự)",
      });
      return;
    }

    // Kiểm tra người nhận có tồn tại không
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      res.status(404).json({
        success: false,
        message: "Người nhận không tồn tại",
      });
      return;
    }

    const senderObjectId = toObjectId(senderId);
    const receiverObjectId = toObjectId(receiverId);

    // Tìm hoặc tạo conversation
    let conversation = await Conversation.findOne({
      members: { $all: [senderObjectId, receiverObjectId] },
    });

    if (!conversation) {
      // Tạo conversation mới
      conversation = new Conversation({
        members: [senderObjectId, receiverObjectId],
        messages: [],
        unreadMessages: [
          { userId: senderObjectId, count: 0 },
          { userId: receiverObjectId, count: 0 },
        ],
      });
    }

    // Tạo tin nhắn mới
    const newMessage = new Message({
      senderId: senderObjectId,
      receiverId: receiverObjectId,
      message: message.trim(),
      isRead: false,
    });

    // Lưu tin nhắn
    const savedMessage = await newMessage.save();

    // Cập nhật conversation
    conversation.messages.push(savedMessage._id);

    // Tăng số tin nhắn chưa đọc cho người nhận
    const receiverUnread = conversation.unreadMessages.find(
      (unread) => unread.userId.toString() === receiverId
    );
    if (receiverUnread) {
      receiverUnread.count += 1;
    }

    await conversation.save();

    // Populate thông tin người gửi để gửi qua socket
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate("senderId", "fullname username avatar")
      .populate("receiverId", "fullname username avatar");

    // Gửi tin nhắn qua socket realtime
    const receiverSockets = getReceiverSocketIds(receiverId);
    const messageData = {
      messageId: savedMessage._id.toString(),
      senderId,
      receiverId,
      message: message.trim(),
      messageType: "text",
      timestamp: savedMessage.createdAt,
      sender: {
        id: populatedMessage?.senderId._id,
        fullname: (populatedMessage?.senderId as any)?.fullname,
        username: (populatedMessage?.senderId as any)?.username,
        avatar: (populatedMessage?.senderId as any)?.avatar,
      },
      isRead: false,
    };

    // Gửi tới tất cả socket của người nhận
    receiverSockets.forEach((socketId: string) => {
      io.to(socketId).emit("newMessage", messageData);
    });

    // Gửi notification tới người nhận
    receiverSockets.forEach((socketId: string) => {
      io.to(socketId).emit("notification", {
        type: "message",
        title: "Tin nhắn mới",
        message: `${
          (populatedMessage?.senderId as any)?.fullname
        } đã gửi tin nhắn cho bạn`,
        senderId,
        relatedId: savedMessage._id.toString(),
        timestamp: new Date(),
        isRead: false,
      });
    });

    logger.success(
      `Tin nhắn đã gửi từ ${senderId} đến ${receiverId}: "${message.substring(
        0,
        50
      )}${message.length > 50 ? "..." : ""}"`
    );

    // Trả về response thành công
    res.status(201).json({
      success: true,
      message: "Tin nhắn đã được gửi thành công",
      data: {
        messageId: savedMessage._id,
        conversationId: conversation._id,
        message: messageData,
        receiverOnline: receiverSockets.length > 0,
      },
    });
  } catch (error) {
    logger.error("Lỗi gửi tin nhắn:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi gửi tin nhắn",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

/**
 * Lấy danh sách tin nhắn giữa 2 user (conversation)
 * Hỗ trợ phân trang
 */
export const getMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { receiverId } = req.params;
    const { page = 1, limit = 20 } = req.query as {
      page?: number;
      limit?: number;
    };

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
      return;
    }

    if (!receiverId || !isValidObjectId(receiverId)) {
      res.status(400).json({
        success: false,
        message: "ID người nhận không hợp lệ",
      });
      return;
    }

    // Kiểm tra người nhận có tồn tại không
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
      return;
    }

    const userObjectId = toObjectId(userId);
    const receiverObjectId = toObjectId(receiverId);

    // Tìm conversation
    const conversation = await Conversation.findOne({
      members: { $all: [userObjectId, receiverObjectId] },
    });

    if (!conversation) {
      res.status(200).json({
        success: true,
        message: "Chưa có cuộc trò chuyện nào",
        data: {
          messages: [],
          pagination: {
            currentPage: Number(page),
            totalPages: 0,
            totalMessages: 0,
            hasNext: false,
            hasPrev: false,
          },
        },
      });
      return;
    }

    // Lấy tin nhắn với phân trang
    const skip = (Number(page) - 1) * Number(limit);
    const totalMessages = await Message.countDocuments({
      $or: [
        { senderId: userObjectId, receiverId: receiverObjectId },
        { senderId: receiverObjectId, receiverId: userObjectId },
      ],
    });

    const messages = await Message.find({
      $or: [
        { senderId: userObjectId, receiverId: receiverObjectId },
        { senderId: receiverObjectId, receiverId: userObjectId },
      ],
    })
      .populate("senderId", "fullname username avatar")
      .populate("receiverId", "fullname username avatar")
      .sort({ createdAt: -1 }) // Tin nhắn mới nhất trước
      .skip(skip)
      .limit(Number(limit));

    const totalPages = Math.ceil(totalMessages / Number(limit));

    logger.info(
      `Lấy ${messages.length} tin nhắn cho conversation ${userId} <-> ${receiverId}`
    );

    res.status(200).json({
      success: true,
      message: "Lấy tin nhắn thành công",
      data: {
        messages: messages.reverse(), // Đảo ngược để tin nhắn cũ ở trên
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalMessages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
        conversation: {
          id: conversation._id,
          members: conversation.members,
        },
      },
    });
  } catch (error) {
    logger.error("Lỗi lấy tin nhắn:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy tin nhắn",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

/**
 * Đánh dấu tin nhắn đã đọc
 * Cập nhật realtime qua socket
 */
export const markMessagesAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { messageIds, senderId } = req.body as {
      messageIds: string[];
      senderId: string;
    };

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
      return;
    }

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "Danh sách ID tin nhắn không hợp lệ",
      });
      return;
    }

    if (!senderId || !isValidObjectId(senderId)) {
      res.status(400).json({
        success: false,
        message: "ID người gửi không hợp lệ",
      });
      return;
    }

    // Validate tất cả messageIds
    const validMessageIds = messageIds.filter((id) => isValidObjectId(id));
    if (validMessageIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "Không có ID tin nhắn hợp lệ",
      });
      return;
    }

    const userObjectId = toObjectId(userId);
    const senderObjectId = toObjectId(senderId);

    // Cập nhật trạng thái đã đọc cho các tin nhắn
    const result = await Message.updateMany(
      {
        _id: { $in: validMessageIds.map((id) => toObjectId(id)) },
        receiverId: userObjectId, // Chỉ user nhận mới có thể mark as read
        senderId: senderObjectId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    // Cập nhật số tin nhắn chưa đọc trong conversation
    const conversation = await Conversation.findOne({
      members: { $all: [userObjectId, senderObjectId] },
    });

    if (conversation) {
      const userUnread = conversation.unreadMessages.find(
        (unread) => unread.userId.toString() === userId
      );
      if (userUnread) {
        userUnread.count = Math.max(0, userUnread.count - result.modifiedCount);
        await conversation.save();
      }
    }

    // Gửi thông báo qua socket cho người gửi
    const senderSockets = getReceiverSocketIds(senderId);
    validMessageIds.forEach((messageId) => {
      senderSockets.forEach((socketId: string) => {
        io.to(socketId).emit("messageSeen", {
          messageId,
          userId,
          seenAt: new Date(),
          seenBy: {
            id: userId,
            fullname: req.user?.name,
          },
        });
      });
    });

    logger.success(
      `${result.modifiedCount} tin nhắn đã được đánh dấu đã đọc bởi ${userId}`
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} tin nhắn đã được đánh dấu đã đọc`,
      data: {
        markedCount: result.modifiedCount,
        totalRequested: validMessageIds.length,
      },
    });
  } catch (error) {
    logger.error("Lỗi đánh dấu tin nhắn đã đọc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đánh dấu tin nhắn đã đọc",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

/**
 * Lấy danh sách các cuộc trò chuyện của user
 * Bao gồm thông tin tin nhắn mới nhất và số tin nhắn chưa đọc
 */
export const getConversations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query as {
      page?: number;
      limit?: number;
    };

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
      return;
    }

    const userObjectId = toObjectId(userId);
    const skip = (Number(page) - 1) * Number(limit);

    // Lấy tất cả conversations của user
    const conversations = await Conversation.find({
      members: userObjectId,
    })
      .populate("members", "fullname username avatar lastActiveAt isOnline")
      .populate({
        path: "messages",
        options: { sort: { createdAt: -1 }, limit: 1 }, // Chỉ lấy tin nhắn mới nhất
        populate: {
          path: "senderId receiverId",
          select: "fullname username avatar",
        },
      })
      .sort({ updatedAt: -1 }) // Conversation có hoạt động mới nhất trước
      .skip(skip)
      .limit(Number(limit));

    // Format dữ liệu trả về
    const formattedConversations = conversations.map((conv) => {
      const otherMember = (conv.members as any[]).find(
        (member) => member._id.toString() !== userId
      );

      const unreadCount =
        conv.unreadMessages.find(
          (unread) => unread.userId.toString() === userId
        )?.count || 0;

      const lastMessage = (conv.messages as any[])[0] || null;

      return {
        conversationId: conv._id,
        participant: {
          id: otherMember?._id,
          fullname: otherMember?.fullname,
          username: otherMember?.username,
          avatar: otherMember?.avatar,
          isOnline: otherMember?.isOnline || false,
          lastActiveAt: otherMember?.lastActiveAt,
        },
        lastMessage: lastMessage
          ? {
              id: lastMessage._id,
              message: lastMessage.message,
              senderId: lastMessage.senderId._id,
              senderName: lastMessage.senderId.fullname,
              timestamp: lastMessage.createdAt,
              isRead: lastMessage.isRead,
            }
          : null,
        unreadCount,
        lastActivity: conv.updatedAt,
      };
    });

    const totalConversations = await Conversation.countDocuments({
      members: userObjectId,
    });

    const totalPages = Math.ceil(totalConversations / Number(limit));

    logger.info(
      `Lấy ${conversations.length} cuộc trò chuyện cho user ${userId}`
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách cuộc trò chuyện thành công",
      data: {
        conversations: formattedConversations,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalConversations,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Lỗi lấy danh sách cuộc trò chuyện:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách cuộc trò chuyện",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

/**
 * Xóa tin nhắn (soft delete hoặc hard delete)
 * Thông báo realtime cho người nhận
 */
export const deleteMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { messageId } = req.params;
    const { deleteForEveryone = false } = req.body as {
      deleteForEveryone?: boolean;
    };

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
      return;
    }

    if (!messageId || !isValidObjectId(messageId)) {
      res.status(400).json({
        success: false,
        message: "ID tin nhắn không hợp lệ",
      });
      return;
    }

    // Tìm tin nhắn
    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({
        success: false,
        message: "Tin nhắn không tồn tại",
      });
      return;
    }

    // Kiểm tra quyền xóa tin nhắn
    if (message.senderId.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: "Bạn chỉ có thể xóa tin nhắn của chính mình",
      });
      return;
    }

    if (deleteForEveryone) {
      // Xóa cho tất cả mọi người
      message.message = "Tin nhắn đã được xóa";
      message.isRead = true; // Đánh dấu đã đọc để không gây confusion
      await message.save();

      // Thông báo cho người nhận
      const receiverSockets = getReceiverSocketIds(
        message.receiverId.toString()
      );
      receiverSockets.forEach((socketId: string) => {
        io.to(socketId).emit("messageDeleted", {
          messageId,
          deletedAt: new Date(),
          deletedBy: userId,
          deletedForEveryone: true,
        });
      });

      logger.info(`Tin nhắn ${messageId} đã được xóa cho tất cả bởi ${userId}`);

      res.status(200).json({
        success: true,
        message: "Tin nhắn đã được xóa cho tất cả",
        data: {
          messageId,
          deletedForEveryone: true,
        },
      });
    } else {
      // Chỉ xóa cho bản thân (soft delete)
      // Trong thực tế có thể cần thêm field deletedFor: [userId] vào schema
      res.status(200).json({
        success: true,
        message: "Tin nhắn đã được xóa cho bạn",
        data: {
          messageId,
          deletedForEveryone: false,
        },
      });
    }
  } catch (error) {
    logger.error("Lỗi xóa tin nhắn:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa tin nhắn",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

/**
 * Tìm kiếm tin nhắn trong conversation
 */
export const searchMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { receiverId } = req.params;
    const {
      query,
      page = 1,
      limit = 20,
    } = req.query as {
      query?: string;
      page?: number;
      limit?: number;
    };

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
      return;
    }

    if (!receiverId || !isValidObjectId(receiverId)) {
      res.status(400).json({
        success: false,
        message: "ID người nhận không hợp lệ",
      });
      return;
    }

    if (!query || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Từ khóa tìm kiếm không được để trống",
      });
      return;
    }

    const userObjectId = toObjectId(userId);
    const receiverObjectId = toObjectId(receiverId);
    const skip = (Number(page) - 1) * Number(limit);

    // Tìm kiếm tin nhắn
    const searchFilter = {
      $or: [
        { senderId: userObjectId, receiverId: receiverObjectId },
        { senderId: receiverObjectId, receiverId: userObjectId },
      ],
      message: { $regex: query.trim(), $options: "i" }, // Case insensitive search
    };

    const totalResults = await Message.countDocuments(searchFilter);

    const messages = await Message.find(searchFilter)
      .populate("senderId", "fullname username avatar")
      .populate("receiverId", "fullname username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalPages = Math.ceil(totalResults / Number(limit));

    logger.info(
      `Tìm kiếm "${query}" cho conversation ${userId} <-> ${receiverId}: ${totalResults} kết quả`
    );

    res.status(200).json({
      success: true,
      message: "Tìm kiếm tin nhắn thành công",
      data: {
        messages,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalResults,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
        searchQuery: query.trim(),
      },
    });
  } catch (error) {
    logger.error("Lỗi tìm kiếm tin nhắn:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tìm kiếm tin nhắn",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

/**
 * Lấy thống kê tin nhắn cho user
 */
export const getMessageStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
      return;
    }

    const userObjectId = toObjectId(userId);

    // Đếm tin nhắn đã gửi
    const sentMessages = await Message.countDocuments({
      senderId: userObjectId,
    });

    // Đếm tin nhắn đã nhận
    const receivedMessages = await Message.countDocuments({
      receiverId: userObjectId,
    });

    // Đếm tin nhắn chưa đọc
    const unreadMessages = await Message.countDocuments({
      receiverId: userObjectId,
      isRead: false,
    });

    // Đếm số cuộc trò chuyện
    const totalConversations = await Conversation.countDocuments({
      members: userObjectId,
    });

    // Tổng số tin nhắn chưa đọc từ tất cả conversations
    const conversations = await Conversation.find({ members: userObjectId });
    const totalUnreadFromConversations = conversations.reduce((total, conv) => {
      const userUnread = conv.unreadMessages.find(
        (unread) => unread.userId.toString() === userId
      );
      return total + (userUnread?.count || 0);
    }, 0);

    logger.info(`Lấy thống kê tin nhắn cho user ${userId}`);

    res.status(200).json({
      success: true,
      message: "Lấy thống kê tin nhắn thành công",
      data: {
        sentMessages,
        receivedMessages,
        totalMessages: sentMessages + receivedMessages,
        unreadMessages,
        totalConversations,
        totalUnreadFromConversations,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    logger.error("Lỗi lấy thống kê tin nhắn:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thống kê tin nhắn",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};
