"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.redisConfig = {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    prefix: process.env.REDIS_PREFIX ?? "fivision:",
};
//# sourceMappingURL=redis.js.map