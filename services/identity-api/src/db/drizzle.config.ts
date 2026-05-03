import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgres://fivision:fivision@localhost:5432/fivision";

export default defineConfig({
  schema: "./src/db/schema.identity.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
