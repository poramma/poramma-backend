"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const cors_1 = __importDefault(require("cors"));
const utils_1 = require("@poramma/utils");
const services_routes_1 = __importDefault(require("./modules/services/services.routes"));
const profile_routes_1 = __importDefault(require("./modules/profile/profile.routes"));
const documents_routes_1 = __importDefault(require("./modules/documents/documents.routes"));
const demandes_routes_1 = __importDefault(require("./modules/demandes/demandes.routes"));
const notifications_routes_1 = __importDefault(require("./modules/notifications/notifications.routes"));
const rendezvous_routes_1 = __importDefault(require("./modules/rendezvous/rendezvous.routes"));
const campagnes_routes_1 = __importStar(require("./modules/campagnes/campagnes.routes"));
const support_routes_1 = __importDefault(require("./modules/support/support.routes"));
const culture_routes_1 = __importDefault(require("./modules/culture/culture.routes"));
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174").split(",").map((o) => o.trim());
app.use((0, cors_1.default)({
    origin: corsOrigins,
    credentials: true,
}));
app.use((0, body_parser_1.json)());
app.get("/", (req, res) => {
    res.json({
        service: "Communauté API",
        status: "running",
        timestamp: new Date().toISOString(),
    });
});
app.use("/", services_routes_1.default);
app.use("/", campagnes_routes_1.campagnesMediaRouter);
app.use("/", profile_routes_1.default);
app.use("/", documents_routes_1.default);
app.use("/", demandes_routes_1.default);
app.use("/", notifications_routes_1.default);
app.use("/", rendezvous_routes_1.default);
app.use("/", campagnes_routes_1.default);
app.use("/", support_routes_1.default);
app.use("/", culture_routes_1.default);
app.use(utils_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map