const XLSX = require("xlsx");
const Gym = require("../models/Gym");
const User = require("../models/User");
const Coach = require("../models/Coach");
const Member = require("../models/Member");
const MembershipPlan = require("../models/MembershipPlan");
const Attendance = require("../models/Attendance");
const AuditLog = require("../models/AuditLog");
const Equipment = require("../models/Equipment");
const Expense = require("../models/Expense");
const Sale = require("../models/Sale");
const SaleReturn = require("../models/SaleReturn");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const BankDetail = require("../models/BankDetail");
const ChequePayment = require("../models/ChequePayment");
const PlatformExpense = require("../models/PlatformExpense");
const BankTransaction = require("../models/BankTransaction");
const SmsLog = require("../models/SmsLog");
const EmailLog = require("../models/EmailLog");
const SystemSettings = require("../models/SystemSettings");
const { sendSms } = require("../utils/sms");
const { hashPassword, generateTemporaryPassword } = require("../utils/password");
const { sendMail } = require("../utils/email");

function formatDate(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

function formatDateTime(date) {
  return date ? new Date(date).toISOString() : "";
}

function buildGymPayload(body = {}) {
  const payload = {};
  const fields = ["name", "location", "phone", "website", "facebookUrl", "googleMapsUrl", "brNumber", "description"];
  for (const f of fields) {
    if (body[f] !== undefined) payload[f] = body[f];
  }
  if (body.owner !== undefined) payload.ownerName = body.owner;
  if (body.email !== undefined) payload.ownerEmail = body.email.toLowerCase().trim();
  if (body.plan !== undefined) payload.plan = body.plan;
  if (body.status !== undefined) payload.status = body.status;
  return payload;
}

// ─── Gym CRUD ───────────────────────────────────────────────────────────────

async function createGym(req, res) {
  const { name, owner, email, location, plan } = req.body || {};

  if (!name || !owner || !email || !location || !plan) {
    return res.status(400).json({ message: "All gym fields are required" });
  }

  const gym = await Gym.create({
    name,
    ownerName: owner,
    ownerEmail: email.toLowerCase().trim(),
    location,
    phone: req.body.phone || "",
    website: req.body.website || "",
    facebookUrl: req.body.facebookUrl || "",
    googleMapsUrl: req.body.googleMapsUrl || "",
    brNumber: req.body.brNumber || "",
    description: req.body.description || "",
    plan,
    status: "trial",
    joinedAt: new Date(),
    revenueHistory: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"].map((month) => ({ month, value: 0 }))
  });

  if (req.body.subscriptionPlanId) {
    const subPlan = await SubscriptionPlan.findById(req.body.subscriptionPlanId);
    if (subPlan) {
      const now = new Date();
      const endsAt = new Date(now);
      if (subPlan.billingCycle === "monthly") endsAt.setMonth(endsAt.getMonth() + 1);
      else if (subPlan.billingCycle === "quarterly") endsAt.setMonth(endsAt.getMonth() + 3);
      else endsAt.setFullYear(endsAt.getFullYear() + 1);
      gym.subscriptionPlanId = subPlan._id;
      gym.subscriptionStartedAt = now;
      gym.subscriptionEndsAt = endsAt;
      gym.subscriptionBillingHistory.push({ date: now, amount: subPlan.price, note: "Initial subscription", method: "manual" });
      await gym.save();
    }
  }

  const temporaryPassword = generateTemporaryPassword();
  await User.create({
    name: owner,
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(temporaryPassword),
    role: "owner",
    gym: gym._id,
    mustChangePassword: true,
    passwordUpdatedAt: new Date()
  });

  return res.status(201).json({
    message: "Gym created",
    id: gym._id,
    credentials: {
      role: "owner",
      email: email.toLowerCase().trim(),
      temporaryPassword,
      mustChangePassword: true
    }
  });
}

async function updateGym(req, res) {
  const { id } = req.params;
  const updates = buildGymPayload(req.body);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "At least one field is required to update a gym" });
  }

  const gym = await Gym.findById(id);
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const previousOwnerEmail = gym.ownerEmail;
  Object.assign(gym, updates);
  await gym.save();

  await User.findOneAndUpdate(
    { role: "owner", gym: gym._id, email: previousOwnerEmail },
    { name: gym.ownerName, email: gym.ownerEmail }
  );

  return res.json({ message: "Gym updated" });
}

async function uploadGymLogo(req, res) {
  const { id } = req.params;
  const gym = await Gym.findById(id);
  if (!gym) return res.status(404).json({ message: "Gym not found" });
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const logoUrl = `/uploads/gyms/${req.file.filename}`;
  gym.logoUrl = logoUrl;
  await gym.save();

  return res.json({ message: "Logo uploaded", logoUrl });
}

async function suspendGym(req, res) {
  const { id } = req.params;
  const gym = await Gym.findByIdAndUpdate(id, { status: "suspended" }, { new: true });
  if (!gym) return res.status(404).json({ message: "Gym not found" });
  return res.json({ message: "Gym suspended" });
}

async function reactivateGym(req, res) {
  const { id } = req.params;
  const gym = await Gym.findByIdAndUpdate(id, { status: "active" }, { new: true });
  if (!gym) return res.status(404).json({ message: "Gym not found" });
  return res.json({ message: "Gym reactivated" });
}

async function resetOwnerPassword(req, res) {
  const { id } = req.params;
  const gym = await Gym.findById(id);
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const ownerUser = await User.findOne({ role: "owner", gym: gym._id });
  if (!ownerUser) return res.status(404).json({ message: "Owner account not found for this gym" });

  const temporaryPassword = generateTemporaryPassword();
  ownerUser.passwordHash = hashPassword(temporaryPassword);
  ownerUser.mustChangePassword = true;
  ownerUser.passwordUpdatedAt = new Date();
  ownerUser.status = "active";
  await ownerUser.save();

  return res.json({
    message: "Owner password reset",
    credentials: {
      role: "owner",
      email: ownerUser.email,
      temporaryPassword,
      mustChangePassword: true
    }
  });
}

async function getGymDetails(req, res) {
  const { id } = req.params;
  const [gym, owners, coaches, members, plans, attendance, auditLogs, subPlan] = await Promise.all([
    Gym.findById(id).lean(),
    User.find({ role: "owner", gym: id }).select("_id name email status lastLoginAt createdAt mustChangePassword").lean(),
    Coach.find({ gym: id }).select("_id name specialty status email members joinedAt").sort({ createdAt: 1 }).lean(),
    Member.find({ gym: id }).select("_id name status plan paymentStatus amountPaid amountDue planExpiresAt coach joinedAt").sort({ createdAt: 1 }).lean(),
    MembershipPlan.find({ gym: id }).select("_id name durationMonths price").sort({ createdAt: 1 }).lean(),
    Attendance.find({ gym: id }).sort({ sessionDate: -1, createdAt: -1 }).limit(20).lean(),
    AuditLog.find({ gym: id, actorRole: "coach" }).sort({ createdAt: -1 }).limit(40).lean(),
    null
  ]);

  if (!gym) return res.status(404).json({ message: "Gym not found" });

  let subscriptionPlan = null;
  if (gym.subscriptionPlanId) {
    subscriptionPlan = await SubscriptionPlan.findById(gym.subscriptionPlanId).lean();
  }

  const activeMembers = members.filter((m) => m.status === "active");
  const unpaidMembers = members.filter((m) => m.paymentStatus !== "paid");
  const expiredMembers = members.filter((m) => m.status === "inactive" && m.planExpiresAt);
  const latestAttendance = attendance[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const deleteCountLastWeek = auditLogs.filter((item) => {
    const createdAt = item.createdAt ? new Date(item.createdAt) : null;
    return createdAt && !Number.isNaN(createdAt.getTime()) && item.action === "delete" && createdAt >= sevenDaysAgo;
  }).length;

  const primaryOwner = owners[0] || null;

  return res.json({
    gym: {
      id: gym._id,
      name: gym.name,
      owner: gym.ownerName,
      ownerEmail: gym.ownerEmail,
      location: gym.location,
      phone: gym.phone || "",
      website: gym.website || "",
      facebookUrl: gym.facebookUrl || "",
      googleMapsUrl: gym.googleMapsUrl || "",
      brNumber: gym.brNumber || "",
      logoUrl: gym.logoUrl || "",
      description: gym.description || "",
      status: gym.status,
      plan: gym.plan,
      joinedAt: formatDate(gym.joinedAt),
      trialEndsAt: formatDate(gym.trialEndsAt),
      subscriptionPlanId: gym.subscriptionPlanId ? String(gym.subscriptionPlanId) : null,
      subscriptionPlanName: subscriptionPlan ? subscriptionPlan.name : "",
      subscriptionStartedAt: formatDate(gym.subscriptionStartedAt),
      subscriptionEndsAt: formatDate(gym.subscriptionEndsAt),
      subscriptionBillingHistory: (gym.subscriptionBillingHistory || []).slice(-5).map((e) => ({
        date: formatDate(e.date),
        amount: e.amount,
        note: e.note,
        method: e.method
      }))
    },
    owner: primaryOwner ? {
      id: primaryOwner._id,
      name: primaryOwner.name,
      email: primaryOwner.email,
      status: primaryOwner.status,
      lastLoginAt: formatDateTime(primaryOwner.lastLoginAt),
      createdAt: formatDateTime(primaryOwner.createdAt),
      mustChangePassword: Boolean(primaryOwner.mustChangePassword)
    } : null,
    owners: owners.map((o) => ({
      id: o._id,
      name: o.name,
      email: o.email,
      status: o.status,
      lastLoginAt: formatDateTime(o.lastLoginAt),
      mustChangePassword: Boolean(o.mustChangePassword)
    })),
    summary: {
      totalMembers: members.length,
      activeMembers: activeMembers.length,
      coaches: coaches.length,
      unpaidMembers: unpaidMembers.length,
      expiredMembers: expiredMembers.length,
      plans: plans.length,
      latestAttendanceAt: latestAttendance?.sessionDate ? formatDateTime(latestAttendance.sessionDate) : "",
      coachDeletesLast7Days: deleteCountLastWeek
    },
    coaches: coaches.map((coach) => ({
      id: coach._id,
      name: coach.name,
      specialty: coach.specialty,
      status: coach.status,
      email: coach.email,
      members: coach.members,
      joinedAt: formatDate(coach.joinedAt)
    })),
    membershipPlans: plans.map((p) => ({
      id: p._id,
      name: p.name,
      durationMonths: Number(p.durationMonths || 1),
      price: Number(p.price || 0)
    })),
    recentAttendance: attendance.map((item) => ({
      id: item._id,
      memberName: item.member,
      coachName: item.coachName,
      status: item.status || "checked-in",
      sessionDate: formatDateTime(item.sessionDate),
      checkInAt: formatDateTime(item.checkInAt),
      checkOutAt: formatDateTime(item.checkOutAt)
    })),
    recentAudit: auditLogs.map((item) => ({
      id: item._id,
      actorName: item.actorName,
      action: item.action,
      targetType: item.targetType,
      targetName: item.targetName,
      summary: item.summary,
      createdAt: formatDateTime(item.createdAt)
    }))
  });
}

// ─── Multi-Owner Management ──────────────────────────────────────────────────

async function listGymOwners(req, res) {
  const { id } = req.params;
  const owners = await User.find({ role: "owner", gym: id })
    .select("_id name email status lastLoginAt mustChangePassword createdAt")
    .lean();
  return res.json({ owners: owners.map((o) => ({ id: o._id, name: o.name, email: o.email, status: o.status, lastLoginAt: formatDateTime(o.lastLoginAt), mustChangePassword: Boolean(o.mustChangePassword) })) });
}

async function addGymOwner(req, res) {
  const { id } = req.params;
  const { name, email } = req.body || {};
  if (!name || !email) return res.status(400).json({ message: "Name and email are required" });

  const gym = await Gym.findById(id);
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) return res.status(400).json({ message: "A user with this email already exists" });

  const temporaryPassword = generateTemporaryPassword();
  await User.create({
    name,
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(temporaryPassword),
    role: "owner",
    gym: gym._id,
    mustChangePassword: true,
    passwordUpdatedAt: new Date()
  });

  return res.status(201).json({
    message: "Owner added",
    credentials: {
      role: "owner",
      email: email.toLowerCase().trim(),
      temporaryPassword,
      mustChangePassword: true
    }
  });
}

async function removeGymOwner(req, res) {
  const { id, userId } = req.params;
  const ownerCount = await User.countDocuments({ role: "owner", gym: id });
  if (ownerCount <= 1) return res.status(400).json({ message: "Cannot remove the last owner of a gym" });

  const removed = await User.findOneAndDelete({ _id: userId, role: "owner", gym: id });
  if (!removed) return res.status(404).json({ message: "Owner not found for this gym" });

  return res.json({ message: "Owner removed" });
}

// ─── Subscription Plans ──────────────────────────────────────────────────────

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
    isActive: true
  });
  return res.status(201).json({ message: "Plan created", plan });
}

async function updateSubscriptionPlan(req, res) {
  const { planId } = req.params;
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) return res.status(404).json({ message: "Plan not found" });

  const allowed = ["name", "price", "billingCycle", "memberLimit", "coachLimit", "isActive", "color"];
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

// ─── Trial Management ────────────────────────────────────────────────────────

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

// ─── Billing Email / SMS ─────────────────────────────────────────────────────

async function sendBillingEmail(req, res) {
  const { id } = req.params;
  const { subject, body, type = "payment-reminder" } = req.body || {};
  if (!subject || !body) return res.status(400).json({ message: "subject and body are required" });

  const gym = await Gym.findById(id);
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const log = await EmailLog.create({
    to: gym.ownerEmail,
    subject,
    body,
    type,
    gymId: gym._id,
    gymName: gym.name,
    recipientName: gym.ownerName || "",
    status: "pending",
    sentAt: null
  });

  try {
    await sendMail({ to: gym.ownerEmail, subject, html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.7">${body.replace(/\n/g, "<br>")}</div>` });
    log.status = "sent";
    log.sentAt = new Date();
    await log.save();
    return res.json({ message: "Email sent" });
  } catch (err) {
    log.status = "failed";
    log.errorMessage = err.message || "Send failed";
    await log.save();
    return res.status(500).json({ message: "Failed to send email" });
  }
}

async function sendBillingSms(req, res) {
  const { id } = req.params;
  const { message, type = "payment-reminder" } = req.body || {};
  if (!message) return res.status(400).json({ message: "message is required" });

  const gym = await Gym.findById(id);
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const phone = gym.phone || "";
  const log = await sendSms({
    to: phone,
    message,
    type,
    gymId: gym._id,
    gymName: gym.name,
    recipientName: gym.ownerName || ""
  });

  if (!phone) return res.status(200).json({ message: "SMS logged (no phone number on record)", log });
  return res.json({ message: "SMS logged", log });
}

// ─── Bank Details ────────────────────────────────────────────────────────────

async function listBankDetails(req, res) {
  const details = await BankDetail.find().sort({ isDefault: -1, createdAt: -1 }).lean();
  return res.json({ details });
}

async function createBankDetail(req, res) {
  const { bankName, accountName, accountNumber } = req.body || {};
  if (!bankName || !accountName || !accountNumber) {
    return res.status(400).json({ message: "Bank name, account name, and account number are required" });
  }
  if (req.body.isDefault) {
    await BankDetail.updateMany({}, { isDefault: false });
  }
  const detail = await BankDetail.create(req.body);
  return res.status(201).json({ message: "Bank detail added", detail });
}

async function updateBankDetail(req, res) {
  const { detailId } = req.params;
  const detail = await BankDetail.findById(detailId);
  if (!detail) return res.status(404).json({ message: "Bank detail not found" });
  if (req.body.isDefault) {
    await BankDetail.updateMany({ _id: { $ne: detailId } }, { isDefault: false });
  }
  Object.assign(detail, req.body);
  await detail.save();
  return res.json({ message: "Bank detail updated", detail });
}

async function deleteBankDetail(req, res) {
  const { detailId } = req.params;
  await BankDetail.findByIdAndDelete(detailId);
  return res.json({ message: "Bank detail deleted" });
}

// ─── Cheque Payments ─────────────────────────────────────────────────────────

async function listCheques(req, res) {
  const filter = {};
  if (req.query.gymId) filter.gymId = req.query.gymId;
  const cheques = await ChequePayment.find(filter).sort({ issuedDate: -1 }).lean();
  return res.json({ cheques });
}

async function createCheque(req, res) {
  const { chequeNumber, bankName, amount, issuedDate } = req.body || {};
  if (!chequeNumber || !bankName || amount === undefined || !issuedDate) {
    return res.status(400).json({ message: "Cheque number, bank name, amount, and issued date are required" });
  }
  const cheque = await ChequePayment.create(req.body);
  return res.status(201).json({ message: "Cheque recorded", cheque });
}

async function updateCheque(req, res) {
  const { chequeId } = req.params;
  const cheque = await ChequePayment.findById(chequeId);
  if (!cheque) return res.status(404).json({ message: "Cheque not found" });
  Object.assign(cheque, req.body);
  await cheque.save();
  return res.json({ message: "Cheque updated", cheque });
}

async function deleteCheque(req, res) {
  const { chequeId } = req.params;
  await ChequePayment.findByIdAndDelete(chequeId);
  return res.json({ message: "Cheque deleted" });
}

// ─── Platform Expenses ───────────────────────────────────────────────────────

async function listPlatformExpenses(req, res) {
  const expenses = await PlatformExpense.find().sort({ entryDate: -1 }).lean();
  return res.json({ expenses });
}

async function createPlatformExpense(req, res) {
  const { type, title, category, amount, entryDate } = req.body || {};
  if (!type || !title || !category || amount === undefined || !entryDate) {
    return res.status(400).json({ message: "Type, title, category, amount, and entry date are required" });
  }
  const expense = await PlatformExpense.create(req.body);
  return res.status(201).json({ message: "Entry created", expense });
}

async function updatePlatformExpense(req, res) {
  const { expenseId } = req.params;
  const expense = await PlatformExpense.findById(expenseId);
  if (!expense) return res.status(404).json({ message: "Entry not found" });
  Object.assign(expense, req.body);
  await expense.save();
  return res.json({ message: "Entry updated", expense });
}

async function deletePlatformExpense(req, res) {
  const { expenseId } = req.params;
  await PlatformExpense.findByIdAndDelete(expenseId);
  return res.json({ message: "Entry deleted" });
}

// ─── Exports ─────────────────────────────────────────────────────────────────

async function exportGymsExcel(req, res) {
  const [gyms, memberCounts, coachCounts] = await Promise.all([
    Gym.find().lean(),
    Member.aggregate([{ $group: { _id: "$gym", count: { $sum: 1 } } }]),
    Coach.aggregate([{ $group: { _id: "$gym", count: { $sum: 1 } } }])
  ]);

  const memberMap = {};
  const coachMap = {};
  for (const m of memberCounts) memberMap[String(m._id)] = m.count;
  for (const c of coachCounts) coachMap[String(c._id)] = c.count;

  const rows = gyms.map((g) => ({
    "Gym Name": g.name,
    "Owner": g.ownerName,
    "Email": g.ownerEmail,
    "Location": g.location,
    "Phone": g.phone || "",
    "Website": g.website || "",
    "Facebook": g.facebookUrl || "",
    "BR Number": g.brNumber || "",
    "Plan": g.plan,
    "Status": g.status,
    "Members": memberMap[String(g._id)] || 0,
    "Coaches": coachMap[String(g._id)] || 0,
    "Joined": formatDate(g.joinedAt),
    "Sub Plan Started": formatDate(g.subscriptionStartedAt),
    "Sub Plan Ends": formatDate(g.subscriptionEndsAt)
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Gyms");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", `attachment; filename=gyms-${formatDate(new Date())}.xlsx`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  return res.send(buf);
}

// ─── Bank Transactions ───────────────────────────────────────────────────────

async function listBankTransactions(req, res) {
  const filter = {};
  if (req.query.gymId) filter.gymId = req.query.gymId;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  const transactions = await BankTransaction.find(filter).sort({ transactionDate: -1 }).lean();
  return res.json({ transactions });
}

async function createBankTransaction(req, res) {
  const { type, amount, description, transactionDate } = req.body || {};
  if (!type || amount === undefined || !description || !transactionDate) {
    return res.status(400).json({ message: "Type, amount, description, and date are required" });
  }
  const tx = await BankTransaction.create(req.body);
  return res.status(201).json({ message: "Transaction recorded", transaction: tx });
}

async function updateBankTransaction(req, res) {
  const { txId } = req.params;
  const tx = await BankTransaction.findById(txId);
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  Object.assign(tx, req.body);
  await tx.save();
  return res.json({ message: "Transaction updated", transaction: tx });
}

async function deleteBankTransaction(req, res) {
  const { txId } = req.params;
  await BankTransaction.findByIdAndDelete(txId);
  return res.json({ message: "Transaction deleted" });
}

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

// ─── Backups ─────────────────────────────────────────────────────────────────

async function backupGymData(req, res) {
  const { id } = req.params;
  const gym = await Gym.findById(id).lean();
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const [owners, coaches, members, plans, attendance, auditLogs, equipment, expenses, sales, returns] = await Promise.all([
    User.find({ gym: id, role: "owner" }).select("-passwordHash").lean(),
    Coach.find({ gym: id }).lean(),
    Member.find({ gym: id }).lean(),
    MembershipPlan.find({ gym: id }).lean(),
    Attendance.find({ gym: id }).lean(),
    AuditLog.find({ gym: id }).lean(),
    Equipment.find({ gym: id }).lean(),
    Expense.find({ gym: id }).lean(),
    Sale.find({ gym: id }).lean(),
    SaleReturn.find({ gym: id }).lean()
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    gym,
    owners,
    coaches,
    members,
    membershipPlans: plans,
    attendance,
    auditLogs,
    equipment,
    expenses,
    sales,
    saleReturns: returns
  };

  res.setHeader("Content-Disposition", `attachment; filename=gym-backup-${gym.name.replace(/\s+/g, "-")}-${formatDate(new Date())}.json`);
  res.setHeader("Content-Type", "application/json");
  return res.send(JSON.stringify(backup, null, 2));
}

async function backupPlatformData(req, res) {
  const gyms = await Gym.find().lean();
  const gymIds = gyms.map((g) => g._id);

  const [owners, coaches, members, plans, attendance, auditLogs, equipment, expenses, sales, returns, subPlans, bankDetails, cheques, platformExpenses] = await Promise.all([
    User.find({ gym: { $in: gymIds }, role: "owner" }).select("-passwordHash").lean(),
    Coach.find({ gym: { $in: gymIds } }).lean(),
    Member.find({ gym: { $in: gymIds } }).lean(),
    MembershipPlan.find({ gym: { $in: gymIds } }).lean(),
    Attendance.find({ gym: { $in: gymIds } }).lean(),
    AuditLog.find({ gym: { $in: gymIds } }).lean(),
    Equipment.find({ gym: { $in: gymIds } }).lean(),
    Expense.find({ gym: { $in: gymIds } }).lean(),
    Sale.find({ gym: { $in: gymIds } }).lean(),
    SaleReturn.find({ gym: { $in: gymIds } }).lean(),
    SubscriptionPlan.find().lean(),
    BankDetail.find().lean(),
    ChequePayment.find().lean(),
    PlatformExpense.find().lean()
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    gyms,
    owners,
    coaches,
    members,
    membershipPlans: plans,
    attendance,
    auditLogs,
    equipment,
    expenses,
    sales,
    saleReturns: returns,
    subscriptionPlans: subPlans,
    bankDetails,
    chequePayments: cheques,
    platformExpenses
  };

  res.setHeader("Content-Disposition", `attachment; filename=platform-backup-${formatDate(new Date())}.json`);
  res.setHeader("Content-Type", "application/json");
  return res.send(JSON.stringify(backup, null, 2));
}

module.exports = {
  createGym,
  updateGym,
  uploadGymLogo,
  suspendGym,
  reactivateGym,
  resetOwnerPassword,
  getGymDetails,
  listGymOwners,
  addGymOwner,
  removeGymOwner,
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  assignGymSubscription,
  extendGymTrial,
  sendTrialReminder,
  listBankDetails,
  createBankDetail,
  updateBankDetail,
  deleteBankDetail,
  listCheques,
  createCheque,
  updateCheque,
  deleteCheque,
  listPlatformExpenses,
  createPlatformExpense,
  updatePlatformExpense,
  deletePlatformExpense,
  exportGymsExcel,
  backupGymData,
  backupPlatformData,
  listBankTransactions,
  createBankTransaction,
  updateBankTransaction,
  deleteBankTransaction,
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
  sendBillingEmail,
  sendBillingSms
};
