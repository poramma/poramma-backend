"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const cors_1 = __importDefault(require("cors"));
const utils_1 = require("@poramma/utils");
const audit_1 = require("./shared/audit");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const roles_routes_1 = __importDefault(require("./modules/roles/roles.routes"));
const agents_routes_1 = __importDefault(require("./modules/agents/agents.routes"));
const profile_routes_1 = __importDefault(require("./modules/profile/profile.routes"));
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174").split(",").map((o) => o.trim());
app.use((0, cors_1.default)({
    origin: corsOrigins,
    credentials: true,
}));
app.use((0, body_parser_1.json)());
app.use((0, utils_1.auditTrail)({ write: (entry) => (0, audit_1.writeAudit)(entry) }));
app.use("/auth", auth_routes_1.default);
app.use("/users", users_routes_1.default);
app.use("/", roles_routes_1.default);
app.use("/agents", agents_routes_1.default);
app.use("/profile", profile_routes_1.default);
app.use(utils_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map