import nodemailer from "nodemailer";

export type MailOptions = {
  to: string;
  subject: string;
  html: string;
};

let transporter: nodemailer.Transporter;

export function initMailer() {
  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST not configured");
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP_USER or SMTP_PASS not configured");
  }
  console.log("SMTP_USER", process.env.SMTP_USER);
  console.log("SMTP_PASS", process.env.SMTP_PASS);

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // true si TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendMail(options: MailOptions) {
  if (!transporter) initMailer();
  await transporter.sendMail({
    from: `"Fivision" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    ...options,
  });
}
