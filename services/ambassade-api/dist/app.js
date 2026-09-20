"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const cors_1 = __importDefault(require("cors"));
const utils_1 = require("@poramma/utils");
const ambassade_core_1 = require("@poramma/ambassade-core");
const connection_1 = require("./db/connection");
const services_routes_1 = __importDefault(require("./modules/services/services.routes"));
const demandes_routes_1 = __importDefault(require("./modules/demandes/demandes.routes"));
const rendezvous_routes_1 = __importDefault(require("./modules/rendezvous/rendezvous.routes"));
const agent_schedule_routes_1 = __importDefault(require("./modules/agent-schedule/agent-schedule.routes"));
const documents_routes_1 = __importDefault(require("./modules/documents/documents.routes"));
const internal_documents_routes_1 = __importDefault(require("./modules/internal-documents/internal-documents.routes"));
const communication_routes_1 = __importDefault(require("./modules/communication/communication.routes"));
const notifications_routes_1 = __importDefault(require("./modules/notifications/notifications.routes"));
const audit_routes_1 = __importDefault(require("./modules/audit/audit.routes"));
const messaging_routes_1 = __importDefault(require("./modules/messaging/messaging.routes"));
const etudiants_routes_1 = __importDefault(require("./modules/etudiants/etudiants.routes"));
const agent_requests_routes_1 = __importDefault(require("./modules/agent-requests/agent-requests.routes"));
const support_routes_1 = __importDefault(require("./modules/support/support.routes"));
const culture_routes_1 = __importDefault(require("./modules/culture/culture.routes"));
const reception_routes_1 = __importDefault(require("./modules/reception/reception.routes"));
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174").split(",").map((o) => o.trim());
app.use((0, cors_1.default)({
    origin: corsOrigins,
    credentials: true,
}));
app.use((0, body_parser_1.json)());
app.use((0, utils_1.auditTrail)({ write: (entry) => ambassade_core_1.auditLogic.writeAudit(connection_1.db, entry) }));
app.get("/", (req, res) => {
    res.json({
        service: "Ambassade API",
        status: "running",
        timestamp: new Date().toISOString()
    });
});
app.use("/", services_routes_1.default);
app.use("/", demandes_routes_1.default);
app.use("/", rendezvous_routes_1.default);
app.use("/", agent_schedule_routes_1.default);
app.use("/", documents_routes_1.default);
app.use("/", internal_documents_routes_1.default);
app.use("/", communication_routes_1.default);
app.use("/", notifications_routes_1.default);
app.use("/", audit_routes_1.default);
app.use("/", messaging_routes_1.default);
app.use("/", etudiants_routes_1.default);
app.use("/", agent_requests_routes_1.default);
app.use("/", support_routes_1.default);
app.use("/", culture_routes_1.default);
app.use("/", reception_routes_1.default);
app.use(utils_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map