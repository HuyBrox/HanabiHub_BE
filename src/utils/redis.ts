import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redisClient.on("ready", () => {
      console.log("✅ Redis ready");
    });
  }

  return redisClient;
};

export const redisGet = async (key: string): Promise<string | null> => {
  try {
    const client = getRedisClient();
    return await client.get(key);
  } catch (error) {
    console.error(`Redis GET error for key ${key}:`, error);
    return null;
  }
};

export const redisSet = async (
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<boolean> => {
  try {
    const client = getRedisClient();
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    console.error(`Redis SET error for key ${key}:`, error);
    return false;
  }
};

export const redisDel = async (key: string | string[]): Promise<number> => {
  try {
    const client = getRedisClient();
    if (Array.isArray(key)) {
      if (key.length === 0) return 0;
      return await client.del(...key);
    }
    return await client.del(key);
  } catch (error) {
    console.error(`Redis DEL error for key ${key}:`, error);
    return 0;
  }
};

export const redisExists = async (key: string): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`Redis EXISTS error for key ${key}:`, error);
    return false;
  }
};

export const redisExpire = async (
  key: string,
  seconds: number
): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const result = await client.expire(key, seconds);
    return result === 1;
  } catch (error) {
    console.error(`Redis EXPIRE error for key ${key}:`, error);
    return false;
  }
};

export const redisIncr = async (key: string): Promise<number> => {
  try {
    const client = getRedisClient();
    return await client.incr(key);
  } catch (error) {
    console.error(`Redis INCR error for key ${key}:`, error);
    return 0;
  }
};

export const redisGetJson = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await redisGet(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Redis GET JSON error for key ${key}:`, error);
    return null;
  }
};

export const redisSetJson = async <T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<boolean> => {
  try {
    const jsonString = JSON.stringify(value);
    return await redisSet(key, jsonString, ttlSeconds);
  } catch (error) {
    console.error(`Redis SET JSON error for key ${key}:`, error);
    return false;
  }
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

