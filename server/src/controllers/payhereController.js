const Gym = require("../models/Gym");
const User = require("../models/User");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const PayherePayment = require("../models/PayherePayment");
const PendingGymRegistration = require("../models/PendingGymRegistration");
const SystemSettings = require("../models/SystemSettings");
const { generatePayhereHash, verifyPayhereWebhook } = require("../utils/payhere");
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

async function initiateGymPayment(req, res) {
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ message: "planId is required" });

  // Owners pay for their own gym; super-admin may specify a gymId
  const gymId = req.user.role === "owner" ? req.user.gym : req.body.gymId;
  if (!gymId) return res.status(400).json({ message: "gymId is required" });

  const [gym, plan] = await Promise.all([
    Gym.findById(gymId),
    SubscriptionPlan.findById(planId)
  ]);
  if (!gym) return res.status(404).json({ message: "Gym not found" });
  if (!plan) return res.status(404).json({ message: "Subscription plan not found" });

  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const orderId = `GYM-${gymId}-${Date.now()}`;
  const amount = plan.price;
  const currency = "LKR";

  const hash = generatePayhereHash({ merchantId, orderId, amount, currency });

  await PayherePayment.create({
    orderId,
    gymId,
    planId,
    amount,
    currency,
    status: "pending",
    applyPayload: {
      gymId: String(gymId),
      planId: String(planId),
      amount,
      note: `PayHere — ${plan.name} subscription`
    }
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
    itemsDescription: `${plan.name} Subscription — ${gym.name}`,
    firstName: gym.ownerName || "Owner",
    email: gym.ownerEmail || "",
    phone: gym.phone || "0000000000"
  });
}

async function handlePayhereNotify(req, res) {
  // Always respond 200 — PayHere retries on any other status
  res.sendStatus(200);

  if (!verifyPayhereWebhook(req.body)) {
    console.warn("[payhere] IPN signature verification failed", req.body);
    return;
  }

  const { order_id, status_code, payment_id } = req.body;

  const statusMap = { "2": "success", "0": "pending", "-1": "cancelled", "-2": "failed", "-3": "chargedback" };
  const mappedStatus = statusMap[String(status_code)];

  // Self-service gym registration path
  if (order_id && order_id.startsWith("REG-")) {
    // Atomic claim: only one concurrent IPN can flip status away from "pending",
    // so retries (PayHere resends IPNs) can never replay gym creation or the welcome SMS.
    const pending = await PendingGymRegistration.findOneAndUpdate(
      { orderId: order_id, status: "pending" },
      { $set: { status: mappedStatus || "failed" } },
      { new: true }
    );
    if (!pending) return;
    if (String(status_code) !== "2") return;

    // Idempotency: abort if account already created (duplicate IPN)
    const existingUser = await User.findOne({ email: pending.ownerEmail });
    if (existingUser) return;

    const plan = await SubscriptionPlan.findById(pending.planId);
    const paidAt = new Date();
    const endsAt = new Date(paidAt);
    if (plan?.billingCycle === "monthly") endsAt.setMonth(endsAt.getMonth() + 1);
    else if (plan?.billingCycle === "quarterly") endsAt.setMonth(endsAt.getMonth() + 3);
    else endsAt.setFullYear(endsAt.getFullYear() + 1);

    const gym = await Gym.create({
      name: pending.gymName,
      ownerName: pending.ownerName,
      ownerEmail: pending.ownerEmail,
      location: pending.location,
      phone: pending.phone,
      plan: plan?.name || "Starter",
      status: "active",
      joinedAt: paidAt,
      subscriptionPlanId: plan?._id,
      subscriptionStartedAt: paidAt,
      subscriptionEndsAt: endsAt,
      subscriptionBillingHistory: [{
        date: paidAt,
        amount: pending.amount,
        note: `PayHere — ${plan?.name}`,
        method: "payhere"
      }],
      revenueHistory: last6MonthsAt0()
    });

    const tempPassword = generateTemporaryPassword();
    await User.create({
      name: pending.ownerName,
      email: pending.ownerEmail,
      role: "owner",
      gym: gym._id,
      passwordHash: hashPassword(tempPassword),
      mustChangePassword: true,
      passwordUpdatedAt: paidAt
    });

    pending.credentials = { email: pending.ownerEmail, temporaryPassword: tempPassword };
    await pending.save();
    console.log(`[payhere] Registered new gym "${pending.gymName}" via paid registration, order ${order_id}`);

    const systemName = await getSystemName();
    await sendSms({
      to: pending.phone,
      message: `Welcome to ${systemName}! Your gym "${pending.gymName}" is now active.\nEmail: ${pending.ownerEmail}\nTemp Password: ${tempPassword}\nLogin: ${process.env.CLIENT_URL}/login`,
      type: "welcome",
      gymId: gym._id,
      gymName: pending.gymName,
      recipientName: pending.ownerName
    });
    return;
  }

  // Atomic claim, same as the REG- path above: retries can never re-apply the
  // subscription or re-send the renewal SMS once status has left "pending".
  const record = await PayherePayment.findOneAndUpdate(
    { orderId: order_id, status: "pending" },
    { $set: { status: mappedStatus || "failed", payherePaymentId: payment_id || "", processedAt: new Date() } },
    { new: true }
  );
  if (!record) return;

  if (String(status_code) !== "2") return;

  // Apply subscription from the snapshot — never from the IPN body
  const { gymId, planId, amount, note } = record.applyPayload;

  const [gym, plan] = await Promise.all([
    Gym.findById(gymId).populate("subscriptionPlanId"),
    SubscriptionPlan.findById(planId)
  ]);
  if (!gym || !plan) {
    console.error("[payhere] Gym or plan not found for order", order_id);
    return;
  }

  const paidAt = new Date();
  const baseDate = gym.subscriptionEndsAt && gym.subscriptionEndsAt > paidAt
    ? gym.subscriptionEndsAt
    : paidAt;
  const endsAt = new Date(baseDate);

  if (plan.billingCycle === "monthly") endsAt.setMonth(endsAt.getMonth() + 1);
  else if (plan.billingCycle === "quarterly") endsAt.setMonth(endsAt.getMonth() + 3);
  else endsAt.setFullYear(endsAt.getFullYear() + 1);

  gym.subscriptionPlanId = plan._id;
  gym.plan = plan.name;
  gym.subscriptionEndsAt = endsAt;
  if (gym.status === "trial" || gym.status === "suspended") gym.status = "active";

  gym.subscriptionBillingHistory.push({
    date: paidAt,
    amount: Number(amount),
    note: note || `PayHere — ${plan.name} subscription`,
    method: "payhere"
  });

  await gym.save();
  console.log(`[payhere] Subscription applied for gym ${gymId}, plan ${plan.name}, expires ${endsAt}`);

  await sendSms({
    to: gym.phone,
    message: `Payment confirmed for ${gym.name}. Plan: ${plan.name}. Valid until ${endsAt.toLocaleDateString("en-LK")}. Thank you!`,
    type: "subscription-reminder",
    gymId: gym._id,
    gymName: gym.name,
    recipientName: gym.ownerName
  });
}

module.exports = { initiateGymPayment, handlePayhereNotify };
