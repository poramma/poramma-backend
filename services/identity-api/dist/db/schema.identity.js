"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessions = exports.otps = exports.users = exports.identity = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.identity = (0, pg_core_1.pgSchema)("identity");
exports.users = exports.identity.table("users", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }).notNull(),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }).notNull(),
    passwordHash: (0, pg_core_1.varchar)("password_hash", { length: 255 }).notNull(),
    emailVerified: (0, pg_core_1.boolean)("email_verified").default(false),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).default("UNVERIFIED"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.otps = exports.identity.table("otps", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    codeHash: (0, pg_core_1.varchar)("code_hash", { length: 255 }).notNull(),
    channel: (0, pg_core_1.varchar)("channel", { length: 10 }).notNull(),
    purpose: (0, pg_core_1.varchar)("purpose", { length: 20 }).notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    consumedAt: (0, pg_core_1.timestamp)("consumed_at"),
});
exports.sessions = exports.identity.table("sessions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    refreshTokenHash: (0, pg_core_1.varchar)("refresh_token_hash", { length: 255 }).notNull(),
    ip: (0, pg_core_1.varchar)("ip", { length: 100 }),
    userAgent: (0, pg_core_1.text)("user_agent"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    revokedAt: (0, pg_core_1.timestamp)("revoked_at"),
});
//# sourceMappingURL=schema.identity.js.map