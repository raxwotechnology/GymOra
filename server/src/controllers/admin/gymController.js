const XLSX = require("xlsx");
const Gym = require("../../models/Gym");
const User = require("../../models/User");
const Coach = require("../../models/Coach");
const Member = require("../../models/Member");
const MembershipPlan = require("../../models/MembershipPlan");
const Attendance = require("../../models/Attendance");
const AuditLog = require("../../models/AuditLog");
const SubscriptionPlan = require("../../models/SubscriptionPlan");
const BankTransaction = require("../../models/BankTransaction");
const { applyLedgerEntry } = require("../../services/bankLedger");
const { hashPassword, generateTemporaryPassword } = require("../../utils/password");
const { sendMail } = require("../../utils/email");
const { formatDate, formatDateTime, buildGymPayload } = require("./adminUtils");
const { sendSms } = require("../../utils/sms");
const EmailLog = require("../../models/EmailLog");

async function createGym(req, res) {
  const { name, owner, email, location, plan } = req.body || {};

  if (!name || !owner || !email || !location || !plan) {
    return res.status(400).json({ message: "All gym fields are required" });
  }

  const gym = await Gym.create({
    name, ownerName: owner, ownerEmail: email.toLowerCase().trim(), location,
    phone: req.body.phone || "", website: req.body.website || "",
    facebookUrl: req.body.facebookUrl || "", googleMapsUrl: req.body.googleMapsUrl || "",
    brNumber: req.body.brNumber || "", description: req.body.description || "",
    plan, status: "trial", joinedAt: new Date(),
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
    name: owner, email: email.toLowerCase().trim(), passwordHash: hashPassword(temporaryPassword),
    role: "owner", gym: gym._id, mustChangePassword: true, passwordUpdatedAt: new Date()
  });

  return res.status(201).json({
    message: "Gym created", id: gym._id,
    credentials: { role: "owner", email: email.toLowerCase().trim(), temporaryPassword, mustChangePassword: true }
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
    credentials: { role: "owner", email: ownerUser.email, temporaryPassword, mustChangePassword: true }
  });
}

async function getGymDetails(req, res) {
  const { id } = req.params;
  const [gym, owners, coaches, members, plans, attendance, auditLogs] = await Promise.all([
    Gym.findById(id).lean(),
    User.find({ role: "owner", gym: id }).select("_id name email status lastLoginAt createdAt mustChangePassword").lean(),
    Coach.find({ gym: id }).select("_id name specialty status email members joinedAt").sort({ createdAt: 1 }).lean(),
    Member.find({ gym: id }).select("_id name status plan paymentStatus amountPaid amountDue planExpiresAt coach joinedAt").sort({ createdAt: 1 }).lean(),
    MembershipPlan.find({ gym: id }).select("_id name durationMonths price").sort({ createdAt: 1 }).lean(),
    Attendance.find({ gym: id }).sort({ sessionDate: -1, createdAt: -1 }).limit(20).lean(),
    AuditLog.find({ gym: id, actorRole: "coach" }).sort({ createdAt: -1 }).limit(40).lean()
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
      id: gym._id, name: gym.name, owner: gym.ownerName, ownerEmail: gym.ownerEmail,
      location: gym.location, phone: gym.phone || "", website: gym.website || "",
      facebookUrl: gym.facebookUrl || "", googleMapsUrl: gym.googleMapsUrl || "",
      brNumber: gym.brNumber || "", logoUrl: gym.logoUrl || "", description: gym.description || "",
      status: gym.status, plan: gym.plan, joinedAt: formatDate(gym.joinedAt),
      trialEndsAt: formatDate(gym.trialEndsAt),
      subscriptionPlanId: gym.subscriptionPlanId ? String(gym.subscriptionPlanId) : null,
      subscriptionPlanName: subscriptionPlan ? subscriptionPlan.name : "",
      subscriptionStartedAt: formatDate(gym.subscriptionStartedAt),
      subscriptionEndsAt: formatDate(gym.subscriptionEndsAt),
      subscriptionBillingHistory: (gym.subscriptionBillingHistory || []).slice(-5).map((e) => ({
        date: formatDate(e.date), amount: e.amount, note: e.note, method: e.method
      }))
    },
    owner: primaryOwner ? {
      id: primaryOwner._id, name: primaryOwner.name, email: primaryOwner.email,
      status: primaryOwner.status, lastLoginAt: formatDateTime(primaryOwner.lastLoginAt),
      createdAt: formatDateTime(primaryOwner.createdAt), mustChangePassword: Boolean(primaryOwner.mustChangePassword)
    } : null,
    owners: owners.map((o) => ({
      id: o._id, name: o.name, email: o.email, status: o.status,
      lastLoginAt: formatDateTime(o.lastLoginAt), mustChangePassword: Boolean(o.mustChangePassword)
    })),
    summary: {
      totalMembers: members.length, activeMembers: activeMembers.length, coaches: coaches.length,
      unpaidMembers: unpaidMembers.length, expiredMembers: expiredMembers.length, plans: plans.length,
      latestAttendanceAt: latestAttendance?.sessionDate ? formatDateTime(latestAttendance.sessionDate) : "",
      coachDeletesLast7Days: deleteCountLastWeek
    },
    coaches: coaches.map((coach) => ({
      id: coach._id, name: coach.name, specialty: coach.specialty, status: coach.status,
      rating: coach.rating, email: coach.email, members: coach.members, joinedAt: formatDate(coach.joinedAt)
    })),
    membershipPlans: plans.map((p) => ({
      id: p._id, name: p.name, durationMonths: Number(p.durationMonths || 1), price: Number(p.price || 0)
    })),
    recentAttendance: attendance.map((item) => ({
      id: item._id, memberName: item.member, coachName: item.coachName,
      status: item.status || "checked-in", sessionDate: formatDateTime(item.sessionDate),
      checkInAt: formatDateTime(item.checkInAt), checkOutAt: formatDateTime(item.checkOutAt)
    })),
    recentAudit: auditLogs.map((item) => ({
      id: item._id, actorName: item.actorName, action: item.action, targetType: item.targetType,
      targetName: item.targetName, summary: item.summary, createdAt: formatDateTime(item.createdAt)
    }))
  });
}

async function listGymOwners(req, res) {
  const { id } = req.params;
  const owners = await User.find({ role: "owner", gym: id })
    .select("_id name email status lastLoginAt mustChangePassword createdAt")
    .lean();
  return res.json({ owners: owners.map((o) => ({
    id: o._id, name: o.name, email: o.email, status: o.status,
    lastLoginAt: formatDateTime(o.lastLoginAt), mustChangePassword: Boolean(o.mustChangePassword)
  })) });
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
    name, email: email.toLowerCase().trim(), passwordHash: hashPassword(temporaryPassword),
    role: "owner", gym: gym._id, mustChangePassword: true, passwordUpdatedAt: new Date()
  });

  return res.status(201).json({
    message: "Owner added",
    credentials: { role: "owner", email: email.toLowerCase().trim(), temporaryPassword, mustChangePassword: true }
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

async function recordGymPayment(req, res) {
  const { id } = req.params;
  const { amount, date, method, bankDetail, reference, notes } = req.body || {};
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) return res.status(400).json({ message: "A valid amount is required" });
  if (method === "bank-transfer" && !bankDetail) return res.status(400).json({ message: "Bank account is required for bank-transfer payments" });

  const gym = await Gym.findById(id).populate("subscriptionPlanId");
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const subPlan = gym.subscriptionPlanId;
  const paidAt = date ? new Date(date) : new Date();
  const baseDate = gym.subscriptionEndsAt && gym.subscriptionEndsAt > paidAt ? gym.subscriptionEndsAt : paidAt;
  const endsAt = new Date(baseDate);
  if (subPlan) {
    if (subPlan.billingCycle === "monthly") endsAt.setMonth(endsAt.getMonth() + 1);
    else if (subPlan.billingCycle === "quarterly") endsAt.setMonth(endsAt.getMonth() + 3);
    else endsAt.setFullYear(endsAt.getFullYear() + 1);
    gym.subscriptionEndsAt = endsAt;
  }
  if (gym.status === "trial" || gym.status === "suspended") gym.status = "active";

  const entry = {
    date: paidAt,
    amount: numericAmount,
    note: notes || reference || "Payment recorded",
    method: method || "manual"
  };

  if (method === "bank-transfer" && bankDetail) {
    const gymName = gym.name || "";
    const tx = new BankTransaction({
      type: "credit",
      amount: numericAmount,
      description: `Subscription payment — ${gymName}`,
      category: "subscription",
      gymId: gym._id,
      gymName,
      paymentMethod: "bank-transfer",
      referenceNumber: reference || "",
      bankDetail,
      transactionDate: paidAt,
      status: "completed",
      notes: notes || "",
      recordedBy: "super-admin"
    });
    await applyLedgerEntry(tx, { bankDetailId: bankDetail, signedAmount: numericAmount });
    await tx.save();
    entry.bankDetail = bankDetail;
    entry.balanceMovement = numericAmount;
    entry.appliedToBalance = true;
  }

  gym.subscriptionBillingHistory.push(entry);
  await gym.save();

  return res.json({ message: "Payment recorded", subscriptionEndsAt: gym.subscriptionEndsAt, status: gym.status });
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
    await sendMail({
      to: gym.ownerEmail,
      subject,
      html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.7">${body.replace(/\n/g, "<br>")}</div>`
    });
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
    "Gym Name": g.name, "Owner": g.ownerName, "Email": g.ownerEmail,
    "Location": g.location, "Phone": g.phone || "", "Website": g.website || "",
    "Facebook": g.facebookUrl || "", "BR Number": g.brNumber || "",
    "Plan": g.plan, "Status": g.status,
    "Members": memberMap[String(g._id)] || 0, "Coaches": coachMap[String(g._id)] || 0,
    "Joined": formatDate(g.joinedAt), "Sub Plan Started": formatDate(g.subscriptionStartedAt),
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

module.exports = {
  createGym, updateGym, uploadGymLogo, suspendGym, reactivateGym, resetOwnerPassword,
  getGymDetails, listGymOwners, addGymOwner, removeGymOwner,
  assignGymSubscription, recordGymPayment, extendGymTrial, sendTrialReminder, exportGymsExcel,
  sendBillingEmail, sendBillingSms
};
