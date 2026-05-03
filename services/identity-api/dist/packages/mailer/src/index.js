"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initMailer = initMailer;
exports.sendMail = sendMail;
const nodemailer_1 = __importDefault(require("nodemailer"));
let transporter;
function initMailer() {
    if (!process.env.SMTP_HOST) {
        throw new Error("SMTP_HOST not configured");
    }
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error("SMTP_USER or SMTP_PASS not configured");
    }
    console.log("SMTP_USER", process.env.SMTP_USER);
    console.log("SMTP_PASS", process.env.SMTP_PASS);
    transporter = nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}
async function sendMail(options) {
    if (!transporter)
        initMailer();
    await transporter.sendMail({
        from: `"Fivision" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        ...options,
    });
}
//# sourceMappingURL=index.js.map