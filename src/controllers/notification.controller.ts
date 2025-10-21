import { Response } from "express";
import Notification from "../models/notification.model";
import User from "../models/user.model";
import { ApiResponse, AuthRequest } from "../types";
import { io, getReceiverSocketIds } from "../socket/socket-server";

// [POST] /api/notifications/send-system
export const sendSystemNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content } = req.body as { title?: string; content?: string };
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tiêu đề hoặc nội dung",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Create record
    const notification = await Notification.create({
      type: "system",
      title,
      content,
      sender: req.user?.id,
      receivers: [],
      isSystem: true,
    });

    // Broadcast to online users via socket
    io.emit("notification", {
      type: "system",
      title,
      message: content,
      senderId: req.user?.id,
      timestamp: new Date(),
      notificationId: notification._id,
    });

    return res.status(201).json({
      success: true,
      message: "Đã gửi thông báo hệ thống",
      data: notification,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("sendSystemNotification error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [POST] /api/notifications/send-specific
export const sendSpecificNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, userIds } = req.body as {
      title?: string;
      content?: string;
      userIds?: string[];
    };

    if (!title || !content || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu: title, content, userIds",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Verify users exist (but don't block for deleted)
    const validUsers = await User.find({ _id: { $in: userIds }, deleted: { $ne: true } }).select("_id");
    const validUserIds = validUsers.map((u) => u._id);

    const notification = await Notification.create({
      type: "personal",
      title,
      content,
      sender: req.user?.id,
      receivers: validUserIds,
      isSystem: false,
    });

    // Realtime deliver to each user
    validUserIds.forEach((uid) => {
      const sockets = getReceiverSocketIds(uid.toString());
      sockets.forEach((sid) => {
        io.to(sid).emit("notification", {
          type: "personal",
          title,
          message: content,
          senderId: req.user?.id,
          relatedId: uid,
          timestamp: new Date(),
          notificationId: notification._id,
        });
      });
    });

    return res.status(201).json({
      success: true,
      message: `Đã gửi thông báo cho ${validUserIds.length} người dùng`,
      data: notification,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("sendSpecificNotification error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/notifications/history?type=system|personal&search=...&page=1&limit=20
export const getNotificationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);
    const skip = (page - 1) * limit;
    const type = (req.query.type as string) || undefined;
    const search = (req.query.search as string) || "";

    const query: any = { deleted: { $ne: true } };
    if (type && ["system", "personal"].includes(type)) query.type = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "fullname username email")
        .lean(),
      Notification.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Lấy lịch sử thông báo thành công",
      data: { items, total, page, limit },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("getNotificationHistory error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/notifications/stats
export const getNotificationStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [total, system, personal] = await Promise.all([
      Notification.countDocuments({ deleted: { $ne: true } }),
      Notification.countDocuments({ type: "system", deleted: { $ne: true } }),
      Notification.countDocuments({ type: "personal", deleted: { $ne: true } }),
    ]);

    const totalReceiversAgg = await Notification.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $project: { count: { $size: { $ifNull: ["$receivers", []] } } } },
      { $group: { _id: null, totalReceivers: { $sum: "$count" } } },
    ]);

    const totalReceivers = totalReceiversAgg[0]?.totalReceivers || 0;

    return res.status(200).json({
      success: true,
      message: "Thống kê thông báo",
      data: { total, system, personal, totalReceivers },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("getNotificationStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
