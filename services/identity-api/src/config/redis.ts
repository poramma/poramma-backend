// src/config/redis.ts
import dotenv from "dotenv";
dotenv.config();

export const redisConfig = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
  prefix: process.env.REDIS_PREFIX ?? "fivision:",
};
