import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Missing required environment variable DATABASE_URL. Set it in services/ambassade-api/.env."
  );
}

export default defineConfig({
  schema: [
    "./src/db/schema.ambassade.ts",
    "./src/db/schema.demandes.ts",
    "./src/db/schema.rendezvous.ts",
    "./src/db/schema.documents.ts",
    "./src/db/schema.communication.ts",
    "./src/db/schema.audit.ts",
    "./src/db/schema.messaging.ts",
    "./src/db/schema.etudiants.ts",
    "./src/db/schema.agent-requests.ts",
    "./src/db/schema.support.ts",
    "./src/db/schema.culture.ts",
    "./src/db/schema.walkin.ts",
  ],
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
