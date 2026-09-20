// services/identity-api/src/db/connection.ts
import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolConfig } from "pg";
import { requireEnv } from "@poramma/utils";

// DATABASE_URL (ex: postgres://user:pass@host:5432/db) is required: falling back
// to a hardcoded default silently connected the service to the wrong database.
const connectionString = requireEnv("DATABASE_URL");

// Optionnel : config pool (tu peux ajuster selon ton environnement)
const poolConfig: PoolConfig = {
  connectionString,
  max: parseInt(process.env.PG_POOL_MAX ?? "10", 10),
  idleTimeoutMillis: 30000,
  
};

export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  // Erreur fatale au niveau du pool (logguer proprement en prod)
  console.error("Unexpected error on idle PG client", err);
  // Ne pas process.exit en dev si tu veux ; ici on log simplement
});

// Crée l'instance Drizzle (utiliser dans tes repositories/services)
export const db = drizzle(pool);

(async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Database connected! Server time:", result.rows[0].now);
  } catch (err) {
    console.error("Database connection failed:", err);
  }
})();

// Export par défaut si tu préfères cet import
export default db;
