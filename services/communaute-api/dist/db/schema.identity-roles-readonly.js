"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identityUserRoles = exports.identityRoles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const identity = (0, pg_core_1.pgSchema)("identity");
exports.identityRoles = identity.table("roles", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 50 }).notNull(),
});
exports.identityUserRoles = identity.table("user_roles", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    roleId: (0, pg_core_1.uuid)("role_id").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active"),
});
//# sourceMappingURL=schema.identity-roles-readonly.js.map