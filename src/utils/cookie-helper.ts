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
 * Kiểm tra xem request có phải cross-origin không
 */
export const isCrossOriginRequest = (req?: any): boolean => {
  if (!req) return false;

  const origin = req.headers?.origin;
  const host = req.headers?.host;
  const referer = req.headers?.referer;

  // Nếu có origin header và khác với host, là cross-origin
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      const hostUrl = new URL(`https://${host}`);

      // Cross-origin nếu protocol, hostname, hoặc port khác nhau
      if (
        originUrl.hostname !== hostUrl.hostname ||
        originUrl.protocol !== hostUrl.protocol ||
        originUrl.port !== hostUrl.port
      ) {
        return true;
      }
    } catch (e) {
      // Nếu không parse được URL, kiểm tra đơn giản
      if (origin && !origin.includes(host)) {
        return true;
      }
    }
  }

  // Nếu có referer và khác với host, có thể là cross-origin
  if (referer && host) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.hostname !== host.split(":")[0]) {
        return true;
      }
    } catch (e) {
      // Ignore
    }
  }

  return false;
};

/**
 * Lấy cookie options cho authentication cookies
 * Tự động detect production, HTTPS, và cross-origin để set đúng SameSite và Secure
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
  const isCrossOrigin = req ? isCrossOriginRequest(req) : false;

  // QUAN TRỌNG:
  // 1. Nếu là production, LUÔN dùng SameSite=None; Secure (vì production luôn cross-origin)
  // 2. Nếu là HTTPS request (qua proxy), cũng dùng SameSite=None; Secure
  // 3. Nếu detect được cross-origin, cũng dùng SameSite=None; Secure
  // Điều này đảm bảo cookies được gửi trong cross-origin requests, đặc biệt quan trọng trong incognito mode
  const useSecureCookies = isProd || isHttps || isCrossOrigin;

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
    isCrossOrigin: req ? isCrossOriginRequest(req) : false,
    isProduction: isProduction(),
    nodeEnv: process.env.NODE_ENV,
    forwardedProto: req?.headers?.["x-forwarded-proto"],
    origin: req?.headers?.origin,
    host: req?.headers?.host,
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
    isCrossOrigin: req ? isCrossOriginRequest(req) : false,
    isProduction: isProduction(),
    nodeEnv: process.env.NODE_ENV,
    forwardedProto: req?.headers?.["x-forwarded-proto"],
    origin: req?.headers?.origin,
    host: req?.headers?.host,
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

