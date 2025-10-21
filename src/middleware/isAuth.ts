import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest, ApiResponse } from "../types";
import { verifyAccessToken } from "../utils/jwt";

export const isAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Đọc token từ cookie thay vì Authorization header
    const token = req.cookies.token;
    console.log("=== isAuth middleware ===");
    console.log("Token from cookie:", token ? "Token found" : "No token");
    console.log("All cookies:", req.cookies);

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Không có token, truy cập bị từ chối.",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    // Verify access token
    const decoded = verifyAccessToken(token);
    console.log("Decoded token:", decoded);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      isAdmin: decoded.isAdmin || false,
      name: decoded.email, // temporary fallback
    };
    console.log("req.user set to:", req.user);

    next();
  } catch (error) {
    console.log("Token verification error:", error);
    res.status(401).json({
      success: false,
      message: "Access token không hợp lệ hoặc đã hết hạn",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Nếu chưa có req.user, tự verify token
    if (!req.user) {
      const token = req.cookies.token;

      if (!token) {
        res.status(401).json({
          success: false,
          message: "Không có token, truy cập bị từ chối.",
          data: null,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      try {
        const decoded = verifyAccessToken(token);
        req.user = {
          id: decoded.id,
          email: decoded.email,
          isAdmin: decoded.isAdmin || false,
          name: decoded.email,
        };
      } catch (error) {
        res.status(401).json({
          success: false,
          message: "Access token không hợp lệ hoặc đã hết hạn",
          data: null,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }
    }

    // Kiểm tra quyền admin
    if (!req.user.isAdmin) {
      res.status(403).json({
        success: false,
        message: "Không có quyền truy cập - Chỉ admin mới được phép",
        data: null,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra quyền truy cập",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
