import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      auth?: { email: string; userId?: string };
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Try cookies first (support both 'token' and 'access_token'), then Authorization header
  const cookies = (req as any).cookies || {};
  let token = cookies.token || cookies.access_token || "";
  if (!token) {
    const authHeader = (req as any).headers?.authorization || "";
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
    if (!payload?.email) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    req.auth = { email: payload.email, userId: payload.userId };
    next();
  } catch {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
}
