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
    console.log("Token from cookie:", token ? "Token found" : "No token");

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
    req.user = {
      id: decoded.id,
      email: decoded.email,
      isAdmin: decoded.isAdmin || false,
      name: decoded.email, // temporary fallback
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Access token không hợp lệ hoặc đã hết hạn",
      data: null,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
