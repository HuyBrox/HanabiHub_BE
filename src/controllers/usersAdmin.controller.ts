import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.model";

/* ================= Helpers ================= */

/** Map role từ string → document field */
function mapRoleToDoc(role: string | undefined) {
  const r = String(role || "").toLowerCase();
  return {
    isAdmin: r === "admin",
    // Nếu sau này có thêm cột role riêng thì set thêm ở đây
  };
}

/**
 * Map status từ string → document field
 * Luôn set cả:
 *  - status: "active" | "inactive" | "blocked"
 *  - isActive: boolean
 *  - isOnline: reset về false khi đổi trạng thái
 */
function mapStatusToDoc(status: string | undefined) {
  const s = String(status || "").toLowerCase();

  if (s === "inactive") {
    return { status: "inactive", isActive: false, isOnline: false };
  }
  if (s === "blocked") {
    return { status: "blocked", isActive: false, isOnline: false };
  }
  // mặc định active
  return { status: "active", isActive: true, isOnline: false };
}

/** DTO trả về cho FE (thêm field `online`) */
function toDto(u: any) {
  // ưu tiên dùng cột status nếu có, fallback về isActive
  let statusStr: string;
  if (typeof u.status === "string") {
    statusStr = u.status.toLowerCase();
  } else {
    statusStr = u.isActive ? "active" : "inactive";
  }

  return {
    id: String(u._id),
    name: u.fullname,
    email: u.email,
    role: u.isAdmin ? "admin" : "user",
    status: statusStr, // "active" | "inactive" | "blocked" (nếu có)
    online: !!u.isOnline,
    lastLoginAt: u.lastActiveAt ?? u.updatedAt ?? u.createdAt,
    avatar: u.avatar,
  };
}

/* ================= Controllers ================= */

/** GET /users.admin/list */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt((req.query.limit as string) || "12", 10), 1),
      50
    );

    const searchRaw = (req.query.search as string) || "";
    const roleRaw = ((req.query.role as string) || "").toLowerCase(); // "admin" | "user"
    const statusRaw = ((req.query.status as string) || "").toLowerCase(); // "active" | "inactive" | "blocked"

    // base filter
    const filter: Record<string, any> = { deleted: { $ne: true } };

    // SEARCH (fullname/email/username)
    if (searchRaw.trim()) {
      const q = searchRaw.trim();
      filter.$or = [
        { fullname: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
      ];
    }

    // ROLE
    if (roleRaw) {
      if (roleRaw === "admin") filter.isAdmin = true;
      else filter.isAdmin = false; // các role khác => không phải admin
    }

    // STATUS: dùng cột status nếu schema có, fallback về isActive
    if (statusRaw) {
      if (statusRaw === "active") {
        filter.$or = [
          ...(filter.$or || []),
          { status: "active" },
          { status: { $exists: false }, isActive: true },
        ];
      }
      if (statusRaw === "inactive") {
        filter.$or = [
          ...(filter.$or || []),
          { status: "inactive" },
          { status: { $exists: false }, isActive: false },
        ];
      }
      if (statusRaw === "blocked") {
        filter.$or = [
          ...(filter.$or || []),
          { status: "blocked" },
          { status: { $exists: false }, isActive: false },
        ];
      }
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: items.map(toDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("listUsers error:", err);
    return res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
};

/** GET /users.admin/:id */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid id" });
    }

    const u = await User.findById(id);
    if (!u) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    return res.json({ success: true, data: toDto(u) });
  } catch (err: any) {
    console.error("getUserById error:", err);
    return res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
};

/** POST /users.admin/create */
export const createUser = async (req: Request, res: Response) => {
  try {
    const {
      fullname,
      email,
      password,
      role = "user",
      status = "active",
    } = req.body || {};

    if (!fullname || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "fullname, email & password là bắt buộc",
      });
    }

    const existed = await User.findOne({ email });
    if (existed) {
      return res
        .status(409)
        .json({ success: false, message: "Email đã tồn tại" });
    }

    const roleDoc = mapRoleToDoc(role);
    const statusDoc = mapStatusToDoc(status);

    const username = String(email).split("@")[0];
    const hashedPassword = await bcrypt.hash(String(password), 10);

    const doc = await User.create({
      fullname,
      email,
      username,
      password: hashedPassword,
      avatar:
        "https://png.pngtree.com/png-vector/20190623/ourlarge/pngtree-accountavataruser--flat-color-icon--vector-icon-banner-templ-png-image_1491720.jpg",
      deleted: false,
      ...roleDoc,
      ...statusDoc,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo user thành công",
      data: toDto(doc),
    });
  } catch (err: any) {
    console.error("createUser error:", err);
    return res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
};

/** PATCH /users.admin/:id */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullname, role, status } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid id" });
    }

    const update: Record<string, any> = {};
    if (fullname) update.fullname = fullname;
    if (role) Object.assign(update, mapRoleToDoc(role));
    if (status) Object.assign(update, mapStatusToDoc(status));

    const u = await User.findByIdAndUpdate(id, update, { new: true });
    if (!u) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    return res.json({
      success: true,
      message: "Cập nhật thành công",
      data: toDto(u),
    });
  } catch (err: any) {
    console.error("updateUser error:", err);
    return res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
};

/** DELETE /users.admin/:id (xoá vĩnh viễn) */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid id" });
    }

    await User.findByIdAndDelete(id);
    return res.json({ success: true, message: "Đã xoá vĩnh viễn" });
  } catch (err: any) {
    console.error("deleteUser error:", err);
    return res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
};

/** PATCH /users.admin/:id/soft-delete */
export const softDelete = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid id" });
    }

    const u = await User.findByIdAndUpdate(
      id,
      { deleted: true },
      { new: true }
    );
    if (!u) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    return res.json({ success: true, message: "Đã chuyển vào thùng rác" });
  } catch (err: any) {
    console.error("softDelete error:", err);
    return res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
};

/** PATCH /users.admin/:id/restore */
export const restore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid id" });
    }

    const u = await User.findByIdAndUpdate(
      id,
      { deleted: false },
      { new: true }
    );
    if (!u) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    return res.json({ success: true, message: "Khôi phục thành công" });
  } catch (err: any) {
    console.error("restore error:", err);
    return res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
};

/** PATCH /users.admin/:id/role */
export const changeRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid id" });
    }

    const u = await User.findByIdAndUpdate(id, mapRoleToDoc(role), {
      new: true,
    });
    if (!u) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    return res.json({
      success: true,
      message: "Đã đổi vai trò",
      data: toDto(u),
    });
  } catch (err: any) {
    console.error("changeRole error:", err);
    return res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
};

/** PATCH /users.admin/:id/status */
export const changeStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid id" });
    }

    const u = await User.findByIdAndUpdate(id, mapStatusToDoc(status), {
      new: true,
    });
    if (!u) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    return res.json({
      success: true,
      message: "Đã đổi trạng thái",
      data: toDto(u),
    });
  } catch (err: any) {
    console.error("changeStatus error:", err);
    return res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
};

/** GET /users.admin/stats — Thống kê tổng quan (dữ liệu thật) */
export const getAdminStats = async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const baseFilter = { deleted: { $ne: true } };

    // ====== Số liệu hiện tại cho 4 card ======
    const [totalUsers, adminCount, onlineCount, inactiveCount] =
      await Promise.all([
        User.countDocuments(baseFilter), // Tổng user
        User.countDocuments({ ...baseFilter, isAdmin: true }), // Admin
        User.countDocuments({ ...baseFilter, isOnline: true }), // Online thật
        // Tài khoản bị vô hiệu hóa: inactive hoặc blocked hoặc isActive=false
        User.countDocuments({
          ...baseFilter,
          $or: [
            { status: "inactive" },
            { status: "blocked" },
            { status: { $exists: false }, isActive: false },
          ],
        }),
      ]);

    // ====== Thống kê theo tháng cho Users / Admins ======
    const usersThisMonth = await User.countDocuments({
      ...baseFilter,
      createdAt: { $gte: currentMonthStart },
    });

    const usersPrevMonth = await User.countDocuments({
      ...baseFilter,
      createdAt: { $gte: prevMonthStart, $lt: currentMonthStart },
    });

    const adminsThisMonth = await User.countDocuments({
      ...baseFilter,
      isAdmin: true,
      createdAt: { $gte: currentMonthStart },
    });

    const adminsPrevMonth = await User.countDocuments({
      ...baseFilter,
      isAdmin: true,
      createdAt: { $gte: prevMonthStart, $lt: currentMonthStart },
    });

    const calcChange = (current: number, prev: number): number | null => {
      if (prev <= 0) return null; // không có dữ liệu tháng trước
      const diff = current - prev;
      return Math.round((diff / prev) * 100);
    };

    const usersChangePercent = calcChange(usersThisMonth, usersPrevMonth);
    const adminsChangePercent = calcChange(adminsThisMonth, adminsPrevMonth);

    const metrics = {
      users: {
        currentMonth: usersThisMonth,
        previousMonth: usersPrevMonth,
        changePercent: usersChangePercent,
      },
      admins: {
        currentMonth: adminsThisMonth,
        previousMonth: adminsPrevMonth,
        changePercent: adminsChangePercent,
      },
      online: {
        changePercent: null,
      },
      visits: {
        changePercent: null,
      },
    };

    return res.json({
      success: true,
      data: {
        totalUsers,
        adminCount,
        onlineCount,
        // "visits" = tổng tài khoản bị vô hiệu hóa
        visits: inactiveCount,
        metrics,
      },
    });
  } catch (err: any) {
    console.error("getAdminStats error:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Server error",
    });
  }
};
