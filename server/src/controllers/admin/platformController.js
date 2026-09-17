const SmsLog = require("../../models/SmsLog");
const EmailLog = require("../../models/EmailLog");
const SystemSettings = require("../../models/SystemSettings");
const { isEmailConfigured } = require("../../utils/email");
const nodemailer = require("nodemailer");

// ─── SMS Logs ─────────────────────────────────────────────────────────────────

async function listSmsLogs(req, res) {
  const filter = {};
  if (req.query.gymId) filter.gymId = req.query.gymId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  const logs = await SmsLog.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  return res.json({ logs });
}

async function createSmsLog(req, res) {
  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ message: "to and message are required" });
  const log = await SmsLog.create({ ...req.body, sentAt: new Date() });
  return res.status(201).json({ message: "SMS log created", log });
}

async function deleteSmsLog(req, res) {
  const { logId } = req.params;
  await SmsLog.findByIdAndDelete(logId);
  return res.json({ message: "Log deleted" });
}

// ─── Email Logs ───────────────────────────────────────────────────────────────

async function listEmailLogs(req, res) {
  const filter = {};
  if (req.query.gymId) filter.gymId = req.query.gymId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  const logs = await EmailLog.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  return res.json({ logs });
}

async function createEmailLog(req, res) {
  const { to, subject } = req.body || {};
  if (!to || !subject) return res.status(400).json({ message: "to and subject are required" });
  const log = await EmailLog.create({ ...req.body, sentAt: new Date() });
  return res.status(201).json({ message: "Email log created", log });
}

async function deleteEmailLog(req, res) {
  const { logId } = req.params;
  await EmailLog.findByIdAndDelete(logId);
  return res.json({ message: "Log deleted" });
}

// ─── System Settings ─────────────────────────────────────────────────────────

async function getSystemSettings(req, res) {
  const settings = await SystemSettings.getSingleton();
  return res.json({ settings });
}

async function updateSystemSettings(req, res) {
  const allowed = ["systemName", "tagline", "supportEmail", "trialDays", "privacyPolicy", "termsOfUse", "helpCenter", "primaryColor", "heroImageUrl"];
  let settings = await SystemSettings.findOne();
  if (!settings) settings = new SystemSettings();
  for (const key of allowed) {
    if (req.body[key] !== undefined) settings[key] = req.body[key];
  }
  await settings.save();
  return res.json({ message: "Settings saved", settings });
}

async function uploadSystemLogo(req, res) {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const logoUrl = `/uploads/system/${req.file.filename}`;
  let settings = await SystemSettings.findOne();
  if (!settings) settings = new SystemSettings();
  settings.logoUrl = logoUrl;
  await settings.save();
  return res.json({ message: "Logo updated", logoUrl });
}

async function uploadSystemHero(req, res) {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const heroImageUrl = `/uploads/system/${req.file.filename}`;
  let settings = await SystemSettings.findOne();
  if (!settings) settings = new SystemSettings();
  settings.heroImageUrl = heroImageUrl;
  await settings.save();
  return res.json({ message: "Hero image updated", heroImageUrl });
}

async function testSmtpConnection(req, res) {
  if (!isEmailConfigured()) {
    return res.status(400).json({
      ok: false,
      message: "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in the server environment."
    });
  }

  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 0);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const secure = String(process.env.SMTP_SECURE || "").trim().toLowerCase() === "true" || port === 465;

  try {
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    await transporter.verify();
    return res.json({ ok: true, message: `SMTP connection verified (${host}:${port})` });
  } catch (err) {
    return res.status(400).json({ ok: false, message: `SMTP connection failed: ${err.message}` });
  }
}

module.exports = {
  listSmsLogs,
  createSmsLog,
  deleteSmsLog,
  listEmailLogs,
  createEmailLog,
  deleteEmailLog,
  getSystemSettings,
  updateSystemSettings,
  uploadSystemLogo,
  uploadSystemHero,
  testSmtpConnection
};
