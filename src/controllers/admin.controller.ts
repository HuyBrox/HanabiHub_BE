import { Request, Response } from "express";
import User from "../models/user.model";
import { AuthRequest } from "../types/express.types";
import { ApiResponse } from "src/types/api.types";
import Course from "../models/course.model";
import Post from "../models/post.model";

// Helper to get start of day
function startOfDay(d: Date) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

// GET /admin/dashboard
export const getAdminDashboard = async (req: AuthRequest, res: Response) => {
  try {
    // Kiểm tra authentication và quyền admin
    const user = req.user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!user.isAdmin)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const now = new Date();

    // Tổng số người dùng (loại bỏ các bản ghi marked deleted)
    const totalUsers = await User.countDocuments({ deleted: { $ne: true } });

    // Số người dùng mới trong ngày hôm nay (từ 00:00)
    const todayStart = startOfDay(now);
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: todayStart },
      deleted: { $ne: true },
    });

    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // include today => 7 days
    const weekStart = startOfDay(sevenDaysAgo);
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: weekStart },
      deleted: { $ne: true },
    });

    // Số người đang online — dựa vào flag `isOnline` trong model User
    const onlineUsers = await User.countDocuments({
      isOnline: true,
      deleted: { $ne: true },
    });

    // Growth series: thống kê số user tạo theo ngày trong 30 ngày gần nhất
    const days = 30;
    const startDate = startOfDay(
      new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
    );

    // Aggregation: nhóm theo ngày (YYYY-MM-DD)
    const growthAgg = await User.aggregate([
      { $match: { createdAt: { $gte: startDate }, deleted: { $ne: true } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Chuyển aggregation thành map để dễ build series đầy đủ (vì có ngày 0)
    const growthSeriesMap: Record<string, number> = {};
    growthAgg.forEach((r: any) => (growthSeriesMap[r._id] = r.count));

    const growthSeries: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      growthSeries.push({ date: key, count: growthSeriesMap[key] || 0 });
    }

    // Phân bố cấp độ (level) N5..N1 — nhóm và đếm
    const levelAgg = await User.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: "$level", count: { $sum: 1 } } },
    ]);

    const levelDistribution: Record<string, number> = {
      N5: 0,
      N4: 0,
      N3: 0,
      N2: 0,
      N1: 0,
    };
    levelAgg.forEach((r: any) => {
      if (r._id && levelDistribution.hasOwnProperty(r._id))
        levelDistribution[r._id] = r.count;
    });

    return res.json({
      success: true,
      data: {
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        onlineUsers,
        growthSeries, // last 30 days
        levelDistribution, // by level
        lastUpdated: new Date(), // thời gian server trả kết quả
      },
    } as ApiResponse);
  } catch (error: any) {
    console.error("getAdminDashboard error:", error);
    // Trả lỗi chung
    return res
      .status(500)
      .json({ success: false, message: error.message } as ApiResponse);
  }
};

// [GET] /admin/popular-courses - trả về top 10 course được nhiều students đăng ký nhất
export const getPopularCourses = async (req: AuthRequest, res: Response) => {
  try {
    const requester = req.user;
    if (!requester)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!requester.isAdmin)
      return res.status(403).json({ success: false, message: "Forbidden" });

    // Aggregate courses và đếm số students
    const courses = await Course.aggregate([
      {
        $project: {
          title: 1,
          studentCount: { $size: { $ifNull: ["$students", []] } }, // đếm length của mảng students
        },
      },
      { $sort: { studentCount: -1 } },
      { $limit: 10 },
    ]);

    const result = courses.map((c) => ({
      courseId: c._id,
      courseTitle: c.title,
      count: c.studentCount,
    }));

    return res.json({ success: true, data: result } as ApiResponse);
  } catch (error: any) {
    console.error("getPopularCourses error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message } as ApiResponse);
  }
};

// [POST] /admin/create-admin
// Admin tạo một tài khoản admin khác (bypass OTP)
export const createAdminUser = async (req: AuthRequest, res: Response) => {
  try {
    const requester = req.user;
    if (!requester)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!requester.isAdmin)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { fullname, email, username, password, level } = req.body as {
      fullname?: string;
      email?: string;
      username?: string;
      password?: string;
      level?: string;
    };

    // Validate required fields
    if (!email || !username || !password || !fullname) {
      return res.status(400).json({
        success: false,
        message:
          "Thiếu thông tin bắt buộc: fullname, email, username, password",
      });
    }

    // Kiểm tra email/username đã tồn tại
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email hoặc username đã được sử dụng",
      });
    }

    // Hash password (saltRounds = 10)
    const bcrypt = await import("bcrypt");
    const hashed = await bcrypt.hash(password, 10);

    // Tạo user với isAdmin = true
    const newUser = new User({
      fullname,
      email,
      username,
      password: hashed,
      level: level || "N5",
      isAdmin: true,
      isActive: true,
    });

    await newUser.save();

    // Trả về thông tin user (không trả password)
    const userToReturn = {
      id: newUser._id,
      fullname: newUser.fullname,
      email: newUser.email,
      username: newUser.username,
      level: newUser.level,
      isAdmin: newUser.isAdmin,
    };

    return res.status(201).json({
      success: true,
      message: "Tạo admin thành công",
      data: userToReturn,
    });
  } catch (error: any) {
    console.error("createAdminUser error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] /admin/recent-activities?page=1 - Lấy 10 hoạt động gần đây của users
// Bao gồm: đăng ký mới, đăng bài post, cập nhật profile, etc.
export const getRecentUserActivities = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const requester = req.user;
    if (!requester)
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" } as ApiResponse);
    if (!requester.isAdmin)
      return res
        .status(403)
        .json({ success: false, message: "Forbidden" } as ApiResponse);

    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Tổng hợp các loại hoạt động từ nhiều nguồn
    const activities: any[] = [];

    // 1. Người dùng mới đăng ký (lấy users mới nhất)
    const newUsers = await User.find({ deleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(50) // lấy 50 user gần nhất để merge với activities khác
      .select("fullname username createdAt avatar");

    newUsers.forEach((u) => {
      activities.push({
        type: "user_registered",
        message: `${u.fullname} (@${u.username}) đã đăng ký tài khoản`,
        user: {
          id: u._id,
          fullname: u.fullname,
          username: u.username,
          avatar: u.avatar,
        },
        timestamp: u.createdAt,
      });
    });

    // 2. Bài post mới được tạo
    const recentPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("author", "fullname username avatar")
      .select("caption createdAt author");

    recentPosts.forEach((p: any) => {
      if (p.author) {
        activities.push({
          type: "post_created",
          message: `${p.author.fullname} (@${
            p.author.username
          }) đã đăng bài mới${
            p.caption ? ': "' + p.caption.substring(0, 50) + '..."' : ""
          }`,
          user: {
            id: p.author._id,
            fullname: p.author.fullname,
            username: p.author.username,
            avatar: p.author.avatar,
          },
          postId: p._id,
          timestamp: p.createdAt,
        });
      }
    });

    // 3. Cập nhật profile (dùng updatedAt != createdAt)
    const updatedUsers = await User.find({
      deleted: { $ne: true },
      $expr: { $ne: ["$createdAt", "$updatedAt"] }, // updatedAt khác createdAt
    })
      .sort({ updatedAt: -1 })
      .limit(30)
      .select("fullname username updatedAt avatar");

    updatedUsers.forEach((u) => {
      activities.push({
        type: "profile_updated",
        message: `${u.fullname} (@${u.username}) đã cập nhật thông tin cá nhân`,
        user: {
          id: u._id,
          fullname: u.fullname,
          username: u.username,
          avatar: u.avatar,
        },
        timestamp: u.updatedAt,
      });
    });

    // Sort tất cả activities theo timestamp giảm dần
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Phân trang
    const paginatedActivities = activities.slice(skip, skip + limit);
    const total = activities.length;

    return res.json({
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    } as ApiResponse);
  } catch (error: any) {
    console.error("getRecentUserActivities error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message } as ApiResponse);
  }
};``
