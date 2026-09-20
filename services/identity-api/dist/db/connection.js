"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const utils_1 = require("@poramma/utils");
const connectionString = (0, utils_1.requireEnv)("DATABASE_URL");
const poolConfig = {
    connectionString,
    max: parseInt(process.env.PG_POOL_MAX ?? "10", 10),
    idleTimeoutMillis: 30000,
};
exports.pool = new pg_1.Pool(poolConfig);
exports.pool.on("error", (err) => {
    console.error("Unexpected error on idle PG client", err);
});
exports.db = (0, node_postgres_1.drizzle)(exports.pool);
(async () => {
    try {
        const result = await exports.pool.query("SELECT NOW()");
        console.log("Database connected! Server time:", result.rows[0].now);
    }
    catch (err) {
        console.error("Database connection failed:", err);
    }
})();
exports.default = exports.db;
//# sourceMappingURL=connection.js.map