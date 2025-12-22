import { Response } from "express";

/**
 * Xác định xem có phải production environment không
 * Kiểm tra cả NODE_ENV và xem có phải HTTPS request không
 */
export const isProduction = (): boolean => {
  // Kiểm tra NODE_ENV
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  if (nodeEnv === "production") {
    return true;
  }

  // Nếu không có NODE_ENV hoặc là development, nhưng đang chạy trên HTTPS
  // (như Render, Vercel, etc.), thì coi như production
  // Render thường set NODE_ENV=production, nhưng để chắc chắn, ta check thêm
  return false;
};

/**
 * Xác định xem request có phải HTTPS không (dựa vào headers)
 */
export const isHttpsRequest = (req: any): boolean => {
  // Kiểm tra header X-Forwarded-Proto (Render, Vercel, etc. set header này)
  const forwardedProto = req.headers?.["x-forwarded-proto"];
  if (forwardedProto === "https") {
    return true;
  }

  // Kiểm tra req.secure (Express tự động set nếu trust proxy)
  if (req.secure) {
    return true;
  }

  // Kiểm tra NODE_ENV và giả định production = HTTPS
  if (isProduction()) {
    return true;
  }

  return false;
};

/**
 * Lấy cookie options cho authentication cookies
 * Tự động detect production và HTTPS để set đúng SameSite và Secure
 */
export const getAuthCookieOptions = (req?: any): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "none" | "lax" | "strict";
  path: string;
  maxAge?: number;
} => {
  const isProd = isProduction();
  const isHttps = req ? isHttpsRequest(req) : isProd;

  // Nếu là production hoặc HTTPS request, dùng SameSite=None; Secure
  // Điều này cần thiết cho cross-origin requests
  const useSecureCookies = isProd || isHttps;

  return {
    httpOnly: true,
    secure: useSecureCookies, // Phải true khi dùng SameSite=None
    sameSite: useSecureCookies ? "none" : "lax",
    path: "/",
  };
};

/**
 * Set access token cookie với options phù hợp
 */
export const setAccessTokenCookie = (
  res: Response,
  token: string,
  req?: any
): void => {
  const options = {
    ...getAuthCookieOptions(req),
    maxAge: 15 * 60 * 1000, // 15 phút
  };

  res.cookie("token", token, options);

  // Log để debug (cả development và production để track issues)
  console.log("[Cookie] Set access token cookie:", {
    secure: options.secure,
    sameSite: options.sameSite,
    isHttps: req ? isHttpsRequest(req) : false,
    nodeEnv: process.env.NODE_ENV,
    forwardedProto: req?.headers?.["x-forwarded-proto"],
    origin: req?.headers?.origin,
  });
};

/**
 * Set refresh token cookie với options phù hợp
 */
export const setRefreshTokenCookie = (
  res: Response,
  token: string,
  req?: any
): void => {
  const options = {
    ...getAuthCookieOptions(req),
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
  };

  res.cookie("refreshToken", token, options);

  // Log để debug (cả development và production để track issues)
  console.log("[Cookie] Set refresh token cookie:", {
    secure: options.secure,
    sameSite: options.sameSite,
    isHttps: req ? isHttpsRequest(req) : false,
    nodeEnv: process.env.NODE_ENV,
    forwardedProto: req?.headers?.["x-forwarded-proto"],
    origin: req?.headers?.origin,
  });
};

/**
 * Clear authentication cookies với options phù hợp
 */
export const clearAuthCookies = (res: Response, req?: any): void => {
  const options = getAuthCookieOptions(req);

  res.clearCookie("token", options);
  res.clearCookie("refreshToken", options);
};

