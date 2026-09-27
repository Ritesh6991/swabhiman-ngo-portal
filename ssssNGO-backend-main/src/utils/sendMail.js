const fs = require("fs");
const nodemailer = require("nodemailer");
const { Resend } = require("resend");

const attachmentForResend = (attachment) => ({
  filename: attachment.filename,
  content: attachment.content || (attachment.path ? fs.readFileSync(attachment.path) : undefined),
});

module.exports = async ({ to, subject, text, html, attachments = [] }) => {
  if (!to) throw new Error("Email recipient is required");
  const provider = (process.env.MAIL_PROVIDER || (process.env.RESEND_API_KEY ? "resend" : "smtp")).toLowerCase();
  const fromAddress = process.env.MAIL_FROM_ADDRESS || "admin@swabhimanshikshasanskriti.in";
  const fromName = process.env.MAIL_FROM_NAME || "Swabhiman Shiksha Sanskriti Samajotthan Nyas";
  const safeHtml = html || `<p>${String(text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;

  if (provider === "resend") {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: [to],
      subject,
      html: safeHtml,
      attachments: attachments.map(attachmentForResend),
    });
    if (result.error) throw new Error(result.error.message || "Resend delivery failed");
    return result.data;
  }

  if (provider === "smtp") {
    const mailUsername = process.env.MAIL_USERNAME || process.env.MAIL_USER;
    const mailPassword = process.env.MAIL_PASSWORD || process.env.MAIL_PASS;
    const missing = [
      !process.env.MAIL_HOST && "MAIL_HOST",
      !process.env.MAIL_PORT && "MAIL_PORT",
      !mailUsername && "MAIL_USERNAME/MAIL_USER",
      !mailPassword && "MAIL_PASSWORD/MAIL_PASS",
    ].filter(Boolean);
    if (missing.length) throw new Error(`Missing mail configuration: ${missing.join(", ")}`);
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: String(process.env.MAIL_SECURE).toLowerCase() === "true",
      auth: { user: mailUsername, pass: mailPassword },
    });
    const result = await transporter.sendMail({
      from: `${fromName} <${fromAddress}>`, to, subject, text, html: safeHtml, attachments,
    });
    return { id: result.messageId };
  }

  throw new Error(`Unsupported mail provider: ${provider}`);
};
