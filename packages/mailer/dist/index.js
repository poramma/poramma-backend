"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initMailer = initMailer;
exports.htmlToText = htmlToText;
exports.sendMail = sendMail;
exports.renderEmail = renderEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
let primary;
let mirror;
function initMailer() {
    if (!process.env.SMTP_HOST) {
        throw new Error("SMTP_HOST not configured");
    }
    primary = nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
    });
    const mirrorHost = process.env.MAILHOG_HOST;
    mirror =
        process.env.MAIL_MIRROR_TO_MAILHOG === "true" && mirrorHost && mirrorHost !== process.env.SMTP_HOST
            ? nodemailer_1.default.createTransport({ host: mirrorHost, port: Number(process.env.MAILHOG_PORT || 1025), secure: false, connectionTimeout: 3_000 })
            : undefined;
}
function htmlToText(html) {
    return html
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
        .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
        .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
async function sendMail(options) {
    if (!primary)
        initMailer();
    const message = {
        from: `"${process.env.MAIL_FROM_NAME || "Poramma"}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        ...options,
        text: options.text ?? htmlToText(options.html),
    };
    const mirrored = mirror
        ? mirror.sendMail(message).catch((err) => console.warn("[mailer] copie Mailhog échouée :", err.message))
        : Promise.resolve();
    try {
        await primary.sendMail(message);
    }
    finally {
        await mirrored;
    }
}
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function renderEmail(params) {
    const paragraphs = (params.paragraphs ?? [])
        .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#374151;">${escapeHtml(p)}</p>`)
        .join("");
    const action = params.action
        ? `<p style="margin:22px 0 6px;"><a href="${escapeHtml(params.action.url)}" style="display:inline-block;background:#00572c;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${escapeHtml(params.action.label)}</a></p>`
        : "";
    const footer = params.footer ?? "Ambassade du Mali au Maroc — Services consulaires. Ceci est un message automatique, merci de ne pas y répondre.";
    return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:#00572c;padding:18px 24px;color:#ffffff;font-size:17px;font-weight:700;">Ambassade du Mali au Maroc</td></tr>
<tr><td style="padding:26px 24px 20px;">
<h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${escapeHtml(params.title)}</h1>
${paragraphs}${params.rawHtml ?? ""}${action}
</td></tr>
<tr><td style="padding:14px 24px 22px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${escapeHtml(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}
//# sourceMappingURL=index.js.map