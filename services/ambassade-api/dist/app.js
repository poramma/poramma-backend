"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const app = (0, express_1.default)();
app.use((0, body_parser_1.json)());
app.get("/", (req, res) => {
    res.json({
        service: "Ambassade API",
        status: "running",
        timestamp: new Date().toISOString()
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map