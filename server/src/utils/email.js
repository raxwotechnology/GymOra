const nodemailer = require("nodemailer");

let cachedTransporter = null;

function getEmailConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 0);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const from = String(process.env.SMTP_FROM || user || "").trim();
  const secure = String(process.env.SMTP_SECURE || "").trim().toLowerCase() === "true" || port === 465;

  return { host, port, user, pass, from, secure };
}

function isEmailConfigured() {
  const { host, port, user, pass, from } = getEmailConfig();
  return Boolean(host && port && user && pass && from);
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = getEmailConfig();
  if (!isEmailConfigured()) {
    throw new Error("SMTP configuration is incomplete");
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  return cachedTransporter;
}

async function sendMail({ to, subject, text, html, from, replyTo }) {
  const transporter = getTransporter();
  const config = getEmailConfig();

  return transporter.sendMail({
    from: from || config.from,
    ...(replyTo ? { replyTo } : {}),
    to,
    subject,
    text,
    html
  });
}

module.exports = {
  isEmailConfigured,
  sendMail
};
