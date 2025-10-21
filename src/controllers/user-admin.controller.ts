import { Response } from "express";
import User from "../models/user.model";
import { ApiResponse, AuthRequest } from "../types";

// [GET] /api/users/search?query=&role=admin|premium|basic&page=1&limit=20
// Note: role mapping based on isAdmin and level (example heuristic)
export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);
    const skip = (page - 1) * limit;

    const queryText = (req.query.query as string) || "";
    const role = (req.query.role as string) || undefined; // admin, premium, basic

    const query: any = { deleted: { $ne: true } };

    if (queryText) {
      query.$or = [
        { fullname: { $regex: queryText, $options: "i" } },
        { username: { $regex: queryText, $options: "i" } },
        { email: { $regex: queryText, $options: "i" } },
      ];
    }

    if (role === "admin") {
      query.isAdmin = true;
    } else if (role === "premium") {
      // heuristic: premium users are level N2 or N1
      query.$or = [
        ...(query.$or || []),
        { level: { $in: ["N1", "N2"] } },
      ];
      query.isAdmin = { $ne: true };
    } else if (role === "basic") {
      query.$or = [
        ...(query.$or || []),
        { level: { $in: ["N3", "N4", "N5"] } },
      ];
      query.isAdmin = { $ne: true };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("fullname username email avatar isAdmin level lastActiveAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Tìm kiếm người dùng thành công",
      data: { users, total, page, limit },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("searchUsers error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// [GET] /api/users/stats
export const getUsersStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [total, admins] = await Promise.all([
      User.countDocuments({ deleted: { $ne: true } }),
      User.countDocuments({ isAdmin: true, deleted: { $ne: true } }),
    ]);

    const levelAgg = await User.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: "$level", count: { $sum: 1 } } },
    ]);

    const levels: Record<string, number> = {
      N5: 0,
      N4: 0,
      N3: 0,
      N2: 0,
      N1: 0,
    };
    levelAgg.forEach((r: any) => {
      if (r._id && levels.hasOwnProperty(r._id)) levels[r._id] = r.count;
    });

    return res.status(200).json({
      success: true,
      message: "Thống kê người dùng",
      data: { total, admins, levels },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("getUsersStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
