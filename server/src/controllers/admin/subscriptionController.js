const Gym = require("../../models/Gym");
const SubscriptionPlan = require("../../models/SubscriptionPlan");

async function listSubscriptionPlans(req, res) {
  const plans = await SubscriptionPlan.find().sort({ price: 1 }).lean();
  return res.json({ plans });
}

async function createSubscriptionPlan(req, res) {
  const { name, price, billingCycle } = req.body || {};
  if (!name || price === undefined || !billingCycle) {
    return res.status(400).json({ message: "Name, price, and billing cycle are required" });
  }
  const plan = await SubscriptionPlan.create({
    name,
    price: Number(price),
    billingCycle,
    memberLimit: req.body.memberLimit ? Number(req.body.memberLimit) : null,
    coachLimit: req.body.coachLimit ? Number(req.body.coachLimit) : null,
    features: Array.isArray(req.body.features) ? req.body.features : (req.body.features ? req.body.features.split(",").map((f) => f.trim()).filter(Boolean) : []),
    color: req.body.color || "#2563eb",
    isActive: true,
    description: req.body.description || "",
    trialDays: Number(req.body.trialDays) || 0,
    storageGb: Number(req.body.storageGb) || 0,
    supportLevel: req.body.supportLevel || "basic",
    customBranding: req.body.customBranding === true || req.body.customBranding === "true",
    analyticsAccess: req.body.analyticsAccess === true || req.body.analyticsAccess === "true",
    apiAccess: req.body.apiAccess === true || req.body.apiAccess === "true",
    maxLocations: Number(req.body.maxLocations) || 1,
    smsCredits: Number(req.body.smsCredits) || 0
  });
  return res.status(201).json({ message: "Plan created", plan });
}

async function updateSubscriptionPlan(req, res) {
  const { planId } = req.params;
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) return res.status(404).json({ message: "Plan not found" });

  const allowed = ["name", "price", "billingCycle", "memberLimit", "coachLimit", "isActive", "color",
    "description", "trialDays", "storageGb", "supportLevel", "customBranding", "analyticsAccess",
    "apiAccess", "maxLocations", "smsCredits"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) plan[key] = req.body[key];
  }
  if (req.body.features !== undefined) {
    plan.features = Array.isArray(req.body.features) ? req.body.features : req.body.features.split(",").map((f) => f.trim()).filter(Boolean);
  }
  await plan.save();
  return res.json({ message: "Plan updated", plan });
}

async function deleteSubscriptionPlan(req, res) {
  const { planId } = req.params;
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) return res.status(404).json({ message: "Plan not found" });
  plan.isActive = false;
  await plan.save();
  return res.json({ message: "Plan deactivated" });
}

async function assignGymSubscription(req, res) {
  const { id } = req.params;
  const { subscriptionPlanId, note, method } = req.body || {};
  if (!subscriptionPlanId) return res.status(400).json({ message: "subscriptionPlanId is required" });

  const [gym, subPlan] = await Promise.all([Gym.findById(id), SubscriptionPlan.findById(subscriptionPlanId)]);
  if (!gym) return res.status(404).json({ message: "Gym not found" });
  if (!subPlan) return res.status(404).json({ message: "Subscription plan not found" });

  const now = new Date();
  const endsAt = new Date(now);
  if (subPlan.billingCycle === "monthly") endsAt.setMonth(endsAt.getMonth() + 1);
  else if (subPlan.billingCycle === "quarterly") endsAt.setMonth(endsAt.getMonth() + 3);
  else endsAt.setFullYear(endsAt.getFullYear() + 1);

  gym.subscriptionPlanId = subPlan._id;
  gym.subscriptionStartedAt = now;
  gym.subscriptionEndsAt = endsAt;
  gym.status = "active";
  gym.subscriptionBillingHistory.push({ date: now, amount: subPlan.price, note: note || "Subscription assigned", method: method || "manual" });
  await gym.save();

  return res.json({ message: "Subscription assigned", subscriptionEndsAt: endsAt });
}

async function extendGymTrial(req, res) {
  const { id } = req.params;
  const { newEndDate } = req.body || {};
  if (!newEndDate) return res.status(400).json({ message: "newEndDate is required" });

  const gym = await Gym.findById(id);
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  gym.trialEndsAt = new Date(newEndDate);
  await gym.save();
  return res.json({ message: "Trial extended", trialEndsAt: gym.trialEndsAt });
}

async function sendTrialReminder(req, res) {
  const { id } = req.params;
  const gym = await Gym.findById(id);
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const { sendMail } = require("../../utils/email");
  try {
    await sendMail({
      to: gym.ownerEmail,
      subject: `Your FitnessHub trial for ${gym.name} is ending soon`,
      html: `<p>Hi ${gym.ownerName},</p><p>Your trial for <strong>${gym.name}</strong> on FitnessHub is ending soon. Please contact us to upgrade to a paid plan and continue enjoying uninterrupted access.</p><p>Thank you!</p>`
    });
    return res.json({ message: "Reminder sent" });
  } catch {
    return res.status(500).json({ message: "Failed to send reminder email" });
  }
}

module.exports = {
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  assignGymSubscription,
  extendGymTrial,
  sendTrialReminder
};
