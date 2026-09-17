const SmsLog = require("../models/SmsLog");

function getSmsConfig() {
  return {
    userId: String(process.env.SMSLENZ_USER_ID || "").trim(),
    apiKey: String(process.env.SMSLENZ_API_KEY || "").trim(),
    senderId: String(process.env.SMSLENZ_SENDER_ID || "").trim()
  };
}

function isSmsConfigured() {
  const { userId, apiKey, senderId } = getSmsConfig();
  return Boolean(userId && apiKey && senderId);
}

function formatPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("94")) return "+" + digits;
  if (digits.startsWith("0")) return "+94" + digits.slice(1);
  return digits ? "+" + digits : "";
}

async function sendSms({ to, message, type = "other", gymId, gymName, recipientName }) {
  const contact = formatPhone(to);
  const config = getSmsConfig();

  if (!contact || !isSmsConfigured()) {
    return SmsLog.create({
      to: to || "unknown",
      message,
      type,
      gymId: gymId || null,
      gymName: gymName || "",
      recipientName: recipientName || "",
      status: "failed",
      errorMessage: !contact ? "No phone number on record" : "SMSLenz is not configured",
      provider: "smslenz"
    });
  }

  try {
    const res = await fetch("https://smslenz.lk/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: config.userId,
        api_key: config.apiKey,
        sender_id: config.senderId,
        contact,
        message
      })
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && data && (data.success === true || data.status === "success");

    return SmsLog.create({
      to: contact,
      message,
      type,
      gymId: gymId || null,
      gymName: gymName || "",
      recipientName: recipientName || "",
      status: ok ? "sent" : "failed",
      errorMessage: ok ? "" : (data && (data.message || JSON.stringify(data))) || `HTTP ${res.status}`,
      provider: "smslenz",
      sentAt: ok ? new Date() : null
    });
  } catch (err) {
    return SmsLog.create({
      to: contact,
      message,
      type,
      gymId: gymId || null,
      gymName: gymName || "",
      recipientName: recipientName || "",
      status: "failed",
      errorMessage: err.message,
      provider: "smslenz"
    });
  }
}

module.exports = { isSmsConfigured, sendSms };
