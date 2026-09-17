const Gym = require("../models/Gym");
const User = require("../models/User");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const PendingGymRegistration = require("../models/PendingGymRegistration");
const SystemSettings = require("../models/SystemSettings");
const { generatePayhereHash } = require("../utils/payhere");
const { hashPassword, generateTemporaryPassword } = require("../utils/password");
const { sendSms } = require("../utils/sms");

async function getSystemName() {
  const settings = await SystemSettings.findOne().select("systemName").lean();
  return settings?.systemName || "Gymora";
}

function last6MonthsAt0() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: d.toLocaleString("en", { month: "short" }), value: 0 });
  }
  return months;
}

async function getPublicPlans(req, res) {
  const plans = await SubscriptionPlan.find({ isActive: { $ne: false } })
    .select("name price billingCycle features description color trialDays");
  return res.json(plans);
}

async function registerTrial(req, res) {
  const { ownerName, ownerEmail, gymName, location, phone } = req.body || {};

  if (!ownerName || !ownerEmail || !gymName || !location) {
    return res.status(400).json({ message: "ownerName, ownerEmail, gymName, and location are required" });
  }

  const normalizedEmail = ownerEmail.toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const gym = await Gym.create({
    name: gymName,
    ownerName,
    ownerEmail: normalizedEmail,
    location,
    phone: phone || "",
    plan: "Starter",
    status: "trial",
    joinedAt: now,
    trialEndsAt,
    revenueHistory: last6MonthsAt0()
  });

  const tempPassword = generateTemporaryPassword();
  await User.create({
    name: ownerName,
    email: normalizedEmail,
    passwordHash: hashPassword(tempPassword),
    role: "owner",
    gym: gym._id,
    mustChangePassword: true,
    passwordUpdatedAt: now
  });

  if (phone) {
    const systemName = await getSystemName();
    await sendSms({
      to: phone,
      message: `Welcome to ${systemName}! Your 14-day free trial for "${gymName}" has started.\nEmail: ${normalizedEmail}\nTemp Password: ${tempPassword}\nLogin: ${process.env.CLIENT_URL}/login`,
      type: "welcome",
      gymName,
      recipientName: ownerName
    });
  }

  return res.status(201).json({
    message: "Trial started",
    email: normalizedEmail,
    temporaryPassword: tempPassword
  });
}

async function initiateRegistration(req, res) {
  const { ownerName, ownerEmail, gymName, location, phone, planId } = req.body || {};

  if (!ownerName || !ownerEmail || !gymName || !location || !planId) {
    return res.status(400).json({ message: "ownerName, ownerEmail, gymName, location, and planId are required" });
  }

  const normalizedEmail = ownerEmail.toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) return res.status(404).json({ message: "Subscription plan not found" });

  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const orderId = `REG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const amount = plan.price;
  const currency = "LKR";

  const hash = generatePayhereHash({ merchantId, orderId, amount, currency });

  await PendingGymRegistration.create({
    orderId,
    ownerName,
    ownerEmail: normalizedEmail,
    gymName,
    location,
    phone: phone || "",
    planId: plan._id,
    amount
  });

  return res.json({
    merchantId,
    orderId,
    amount,
    currency,
    hash,
    notifyUrl: process.env.PAYHERE_NOTIFY_URL,
    returnUrl: process.env.CLIENT_URL,
    cancelUrl: process.env.CLIENT_URL,
    itemsDescription: `${plan.name} — ${gymName}`,
    firstName: ownerName,
    email: normalizedEmail,
    phone: phone || "0000000000"
  });
}

async function getRegistrationStatus(req, res) {
  const record = await PendingGymRegistration.findOne({ orderId: req.params.orderId });
  if (!record) return res.status(404).json({ message: "Registration not found" });

  const isPaid = record.status === "paid" && record.credentials;
  return res.json({
    status: isPaid ? "completed" : record.status,
    email: isPaid ? record.credentials.email : undefined,
    temporaryPassword: isPaid ? record.credentials.temporaryPassword : undefined,
  });
}

module.exports = { getPublicPlans, registerTrial, initiateRegistration, getRegistrationStatus };
