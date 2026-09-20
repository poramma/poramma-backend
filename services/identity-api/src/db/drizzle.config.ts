import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

// Kept inline rather than importing @poramma/utils: drizzle-kit loads this file
// directly, before the shared packages are necessarily built.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Missing required environment variable DATABASE_URL. Set it in services/identity-api/.env."
  );
}

export default defineConfig({
  schema: "./src/db/schema.identity.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
