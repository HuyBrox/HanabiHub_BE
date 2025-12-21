import { Response, NextFunction } from "express";
import { AuthRequest, ApiResponse } from "../types";
import { redisIncr, redisExpire, redisGet } from "../utils/redis";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  createPost: {
    windowMs: 60000,
    maxRequests: 10,
    keyPrefix: "ratelimit:createPost",
  },
  createComment: {
    windowMs: 60000,
    maxRequests: 30,
    keyPrefix: "ratelimit:createComment",
  },
  like: {
    windowMs: 60000,
    maxRequests: 100,
    keyPrefix: "ratelimit:like",
  },
};

export const createRateLimiter = (
  configKey: keyof typeof RATE_LIMITS
) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          data: null,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const config = RATE_LIMITS[configKey];
      if (!config) {
        next();
        return;
      }

      const now = Date.now();
      const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
      const key = `${config.keyPrefix}:${userId}:${windowStart}`;

      try {
        const currentCount = await redisIncr(key);
        
        if (currentCount === 1) {
          await redisExpire(key, Math.ceil(config.windowMs / 1000));
        }

        if (currentCount > config.maxRequests) {
          res.status(429).json({
            success: false,
            message: `Too many requests. Limit: ${config.maxRequests} requests per ${config.windowMs / 1000} seconds`,
            data: {
              limit: config.maxRequests,
              windowMs: config.windowMs,
              retryAfter: config.windowMs / 1000,
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse);
          return;
        }

        next();
      } catch (redisError) {
        console.error("Rate limiter Redis error:", redisError);
        next();
      }
    } catch (error) {
      console.error("Rate limiter error:", error);
      next();
    }
  };
};

export const rateLimitCreatePost = createRateLimiter("createPost");
export const rateLimitCreateComment = createRateLimiter("createComment");
export const rateLimitLike = createRateLimiter("like");

