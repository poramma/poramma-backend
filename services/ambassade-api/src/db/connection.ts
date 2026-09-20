import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolConfig } from "pg";
import { requireEnv } from "@poramma/utils";

const connectionString = requireEnv("DATABASE_URL");

const poolConfig: PoolConfig = {
  connectionString,
  max: parseInt(process.env.PG_POOL_MAX ?? "10", 10),
  idleTimeoutMillis: 30000,
};

export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected error on idle PG client", err);
});

export const db = drizzle(pool);

export default db;
