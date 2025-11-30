// src/routes/usersAdmin.route.ts
import { Router } from "express";
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  softDelete,
  restore,
  changeRole,
  changeStatus,
  getAdminStats,
} from "../controllers/usersAdmin.controller";

// Dùng đúng middleware có sẵn
import { isAuth, isAdmin } from "../middleware/isAuth";

const router = Router();

// Bắt buộc login trước
router.use(isAuth);

// Từ đây trở xuống: bắt buộc là admin
router.use(isAdmin);

/** Thống kê tổng quan người dùng */
router.get("/stats", getAdminStats);

/** Danh sách + chi tiết */
router.get("/list", listUsers);
router.get("/:id", getUserById);

/** Tạo mới */
router.post("/create", createUser);

/** Cập nhật / Xoá / Khác */
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);
router.patch("/:id/soft-delete", softDelete);
router.patch("/:id/restore", restore);
router.patch("/:id/role", changeRole);
router.patch("/:id/status", changeStatus);

export default router;
