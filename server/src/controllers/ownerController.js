const Coach = require("../models/Coach");
const Member = require("../models/Member");
const Equipment = require("../models/Equipment");
const Announcement = require("../models/Announcement");
const Gym = require("../models/Gym");
const MembershipPlan = require("../models/MembershipPlan");
const WorkoutPlan = require("../models/WorkoutPlan");
const MealPlan = require("../models/MealPlan");
const Message = require("../models/Message");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Expense = require("../models/Expense");
const Supplement = require("../models/Supplement");
const Sale = require("../models/Sale");
const SaleReturn = require("../models/SaleReturn");
const AuditLog = require("../models/AuditLog");
const CoachAttendance = require("../models/CoachAttendance");
const SalaryAdvance = require("../models/SalaryAdvance");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const { hashPassword, generateTemporaryPassword } = require("../utils/password");
const { isEmailConfigured, sendMail } = require("../utils/email");
const { buildCoachCode, buildMemberCode } = require("../utils/entityCodes");
const {
  deriveSubscriptionStatus,
  isMembershipExpired,
  syncExpiredMemberStatus
} = require("../utils/subscription");

function avatarFromName(name) {
  return String(name)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeEmail(email) {
  return String(email).toLowerCase().trim();
}

function formatReceiptDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function buildReceiptNumber(id) {
  const safeId = String(id || "").trim();
  return safeId ? `SALE-${safeId.slice(-6).toUpperCase()}` : "SALE";
}

function buildSaleReceiptEmail({ gymName, sale }) {
  const itemsMarkup = sale.items
    .map((item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${item.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:center;">${item.qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">LKR ${Number(item.unitPrice || 0).toLocaleString()}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">LKR ${Number(item.lineTotal || 0).toLocaleString()}</td>
      </tr>
    `)
    .join("");

  const notesBlock = sale.notes
    ? `<p style="margin:16px 0 0;color:#475569;"><strong>Notes:</strong> ${sale.notes}</p>`
    : "";

  const memberBlock = sale.memberName
    ? `<p style="margin:4px 0;color:#334155;"><strong>Linked Member:</strong> ${sale.memberName}</p>`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:24px;">
        <div style="border-bottom:2px solid #0f172a;padding-bottom:16px;margin-bottom:20px;">
          <h1 style="margin:0;font-size:24px;">${gymName}</h1>
          <p style="margin:6px 0 0;color:#64748b;">Supplement POS Bill</p>
        </div>
        <p style="margin:0 0 4px;color:#334155;"><strong>Bill No:</strong> ${buildReceiptNumber(sale.id)}</p>
        <p style="margin:4px 0;color:#334155;"><strong>Date:</strong> ${formatReceiptDateTime(sale.soldAt)}</p>
        <p style="margin:4px 0;color:#334155;"><strong>Buyer:</strong> ${sale.customerName}</p>
        ${memberBlock}
        <p style="margin:4px 0 16px;color:#334155;"><strong>Payment Method:</strong> ${sale.paymentMethod}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr>
              <th style="padding:8px 0;border-bottom:1px solid #cbd5e1;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;">Item</th>
              <th style="padding:8px 0;border-bottom:1px solid #cbd5e1;text-align:center;color:#64748b;font-size:12px;text-transform:uppercase;">Qty</th>
              <th style="padding:8px 0;border-bottom:1px solid #cbd5e1;text-align:right;color:#64748b;font-size:12px;text-transform:uppercase;">Unit Price</th>
              <th style="padding:8px 0;border-bottom:1px solid #cbd5e1;text-align:right;color:#64748b;font-size:12px;text-transform:uppercase;">Line Total</th>
            </tr>
          </thead>
          <tbody>${itemsMarkup}</tbody>
        </table>
        <div style="margin-top:20px;padding-top:16px;border-top:2px solid #0f172a;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#334155;">
            <span>Subtotal</span>
            <strong>LKR ${Number(sale.subtotal || 0).toLocaleString()}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:16px;color:#0f172a;">
            <span><strong>Total</strong></span>
            <strong>LKR ${Number(sale.total || 0).toLocaleString()}</strong>
          </div>
        </div>
        ${notesBlock}
        <p style="margin:20px 0 0;color:#64748b;font-size:13px;">Thank you for purchasing from ${gymName}.</p>
      </div>
    </div>
  `;

  const textLines = [
    `${gymName} - Supplement POS Bill`,
    `Bill No: ${buildReceiptNumber(sale.id)}`,
    `Date: ${formatReceiptDateTime(sale.soldAt)}`,
    `Buyer: ${sale.customerName}`
  ];

  if (sale.memberName) {
    textLines.push(`Linked Member: ${sale.memberName}`);
  }

  textLines.push(`Payment Method: ${sale.paymentMethod}`, "", "Items:");
  sale.items.forEach((item) => {
    textLines.push(`- ${item.name} x${item.qty} @ LKR ${Number(item.unitPrice || 0).toLocaleString()} = LKR ${Number(item.lineTotal || 0).toLocaleString()}`);
  });
  textLines.push("", `Subtotal: LKR ${Number(sale.subtotal || 0).toLocaleString()}`, `Total: LKR ${Number(sale.total || 0).toLocaleString()}`);
  if (sale.notes) {
    textLines.push(`Notes: ${sale.notes}`);
  }

  return {
    subject: `${gymName} bill ${buildReceiptNumber(sale.id)}`,
    html,
    text: textLines.join("\n")
  };
}

function parseStringList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDateOrNull(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumberOrNull(value) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMealItems(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        time: String(item?.time || "").trim(),
        name: String(item?.name || "").trim(),
        foods: Array.isArray(item?.foods) ? item.foods.map((food) => String(food).trim()).filter(Boolean) : parseStringList(item?.foods || "")
      }))
      .filter((item) => item.name || item.time || item.foods.length);
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return parseMealItems(parsed);
  } catch (_error) {
    return String(value)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [time = "", mealName = "", foods = ""] = line.split("|").map((part) => part.trim());
        return {
          time,
          name: mealName,
          foods: parseStringList(foods)
        };
      })
      .filter((item) => item.name || item.time || item.foods.length);
  }
}

function buildWorkoutExercises(plan) {
  const category = String(plan?.category || "").toLowerCase();

  if (category.includes("strength")) {
    return [
      { name: "Barbell Squat", sets: 4, reps: "6-8", rest: "90 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
      { name: "Bench Press", sets: 4, reps: "6-8", rest: "90 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
      { name: "Deadlift", sets: 3, reps: "5", rest: "120 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
      { name: "Overhead Press", sets: 3, reps: "8", rest: "75 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null }
    ];
  }

  if (category.includes("cardio")) {
    return [
      { name: "Treadmill Intervals", sets: 1, reps: "20 min", rest: "0 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
      { name: "Rowing Machine", sets: 1, reps: "15 min", rest: "0 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
      { name: "Battle Ropes", sets: 4, reps: "45 sec", rest: "30 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
      { name: "Bike Cooldown", sets: 1, reps: "10 min", rest: "0 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null }
    ];
  }

  if (category.includes("weight") || category.includes("fat")) {
    return [
      { name: "Goblet Squat", sets: 4, reps: "12", rest: "45 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
      { name: "Kettlebell Swing", sets: 4, reps: "15", rest: "45 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
      { name: "Walking Lunges", sets: 3, reps: "12/leg", rest: "45 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
      { name: "Mountain Climbers", sets: 3, reps: "40 sec", rest: "20 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null }
    ];
  }

  return [
    { name: "Lat Pulldown", sets: 3, reps: "12", rest: "60 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
    { name: "Dumbbell Press", sets: 3, reps: "10", rest: "60 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
    { name: "Leg Press", sets: 3, reps: "12", rest: "60 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null },
    { name: "Plank", sets: 3, reps: "45 sec", rest: "30 sec", done: false, loggedWeight: "", completionNotes: "", completedAt: null }
  ];
}

function canManageGym(req, gymId) {
  return req.user?.role === "super-admin" || String(req.user?.gym || "") === String(gymId || "");
}

function formatMessageTime(date = new Date()) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toAuditValue(value) {
  if (value == null) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toAuditValue(item));
  }

  if (typeof value === "object") {
    if (typeof value.toObject === "function") {
      return toAuditValue(value.toObject());
    }

    if (value._bsontype === "ObjectId") {
      return String(value);
    }

    return Object.entries(value).reduce((result, [key, entryValue]) => {
      if (key === "__v") {
        return result;
      }
      result[key] = toAuditValue(entryValue);
      return result;
    }, {});
  }

  return value;
}

function findChangedFields(before = {}, after = {}) {
  const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
  return keys.filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
}

async function logCoachActivity(req, details = {}) {
  if (req.user?.role !== "coach" || !req.user?._id || !req.user?.gym) {
    return;
  }

  const before = details.before != null ? toAuditValue(details.before) : null;
  const after = details.after != null ? toAuditValue(details.after) : null;
  const changedFields = Array.isArray(details.changedFields)
    ? details.changedFields
    : findChangedFields(before || {}, after || {});

  await AuditLog.create({
    gym: req.user.gym,
    actorUser: req.user._id,
    actorName: req.user.name || "Coach",
    actorRole: req.user.role,
    action: details.action || "update",
    targetType: details.targetType || "record",
    targetId: details.targetId ? String(details.targetId) : "",
    targetName: details.targetName || "",
    summary: details.summary || "Coach activity recorded",
    before,
    after,
    changedFields,
    metadata: details.metadata != null ? toAuditValue(details.metadata) : null
  });
}

function mapWorkoutPlanAuditSnapshot(plan) {
  if (!plan) {
    return null;
  }

  return {
    name: plan.name,
    level: plan.level,
    duration: plan.duration,
    days: Number(plan.days || 0),
    category: plan.category
  };
}

function mapMealPlanAuditSnapshot(plan) {
  if (!plan) {
    return null;
  }

  return {
    name: plan.name,
    calories: Number(plan.calories || 0),
    protein: Number(plan.protein || 0),
    carbs: Number(plan.carbs || 0),
    fat: Number(plan.fat || 0),
    goal: plan.goal,
    meals: Array.isArray(plan.meals)
      ? plan.meals.map((meal) => ({
        time: meal.time || "",
        name: meal.name || "",
        foods: Array.isArray(meal.foods) ? meal.foods : []
      }))
      : []
  };
}

async function findOwnedDocument(Model, req, id) {
  const doc = await Model.findById(id);
  if (!doc) {
    return null;
  }

  if (!canManageGym(req, doc.gym)) {
    return "forbidden";
  }

  return doc;
}

async function createMessage(req, res) {
  const { recipientUserId, memberId, text } = req.body || {};
  const trimmedText = String(text || "").trim();

  if (!trimmedText) {
    return res.status(400).json({ message: "Message text is required" });
  }

  if (!canManageGym(req, req.user?.gym)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  if (!["coach", "member"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Only coaches and members can send messages" });
  }

  if (req.user.role === "coach") {
    const coach = await Coach.findOne({ user: req.user._id, gym: req.user.gym });
    if (!coach) {
      return res.status(404).json({ message: "Coach profile not found" });
    }

    const member = memberId
      ? await Member.findOne({ _id: memberId, gym: req.user.gym })
      : await Member.findOne({ user: recipientUserId, gym: req.user.gym });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (member.coach !== coach.name) {
      return res.status(403).json({ message: "You can only message your assigned members" });
    }

    const message = await Message.create({
      gym: req.user.gym,
      coachName: coach.name,
      memberName: member.name,
      coachUser: coach.user,
      memberUser: member.user,
      from: coach.name,
      avatar: coach.avatar || avatarFromName(coach.name),
      senderRole: "coach",
      senderUser: req.user._id,
      recipientRole: "member",
      recipientUser: member.user,
      text: trimmedText,
      time: formatMessageTime(),
      unread: true
    });

    await logCoachActivity(req, {
      action: "message",
      targetType: "member",
      targetId: member._id,
      targetName: member.name,
      summary: `Sent a message to ${member.name}`,
      after: {
        text: trimmedText,
        sentAt: message.createdAt,
        memberName: member.name
      },
      metadata: {
        coachName: coach.name,
        messageId: message._id
      }
    });

    return res.status(201).json({ message: "Message sent" });
  }

  const member = await Member.findOne({ user: req.user._id, gym: req.user.gym });
  if (!member) {
    return res.status(404).json({ message: "Member profile not found" });
  }

  const coach = await Coach.findOne({ gym: req.user.gym, name: member.coach });
  if (!coach) {
    return res.status(404).json({ message: "Assigned coach not found" });
  }

  await Message.create({
    gym: req.user.gym,
    coachName: coach.name,
    memberName: member.name,
    coachUser: coach.user,
    memberUser: member.user,
    from: member.name,
    avatar: member.avatar || avatarFromName(member.name),
    senderRole: "member",
    senderUser: req.user._id,
    recipientRole: "coach",
    recipientUser: coach.user,
    text: trimmedText,
    time: formatMessageTime(),
    unread: true
  });

  return res.status(201).json({ message: "Message sent" });
}

async function markMessagesRead(req, res) {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

  if (ids.length === 0) {
    return res.status(400).json({ message: "At least one message id is required" });
  }

  await Message.updateMany(
    {
      _id: { $in: ids },
      recipientUser: req.user._id,
      gym: req.user.gym
    },
    {
      $set: {
        unread: false,
        readAt: new Date()
      }
    }
  );

  return res.json({ message: "Messages marked as read" });
}

function addMonths(dateValue, months) {
  const date = new Date(dateValue);
  const normalized = Number(months) || 1;
  date.setMonth(date.getMonth() + normalized);
  return date;
}

function normalizeSupplementStatus(stockQty, reorderLevel, providedStatus) {
  if (providedStatus) {
    return providedStatus;
  }

  if (stockQty <= 0) {
    return "out-of-stock";
  }

  if (stockQty <= reorderLevel) {
    return "low-stock";
  }

  return "in-stock";
}

const MEMBERSHIP_PLAN_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#db2777"
];

function getRandomMembershipPlanColor() {
  return MEMBERSHIP_PLAN_COLORS[Math.floor(Math.random() * MEMBERSHIP_PLAN_COLORS.length)];
}

function startOfDay(dateValue) {
  const date = new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(left, right) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function formatAttendanceDate(dateValue) {
  if (sameDay(dateValue, new Date())) {
    return "Today";
  }
  return new Date(dateValue).toISOString().slice(0, 10);
}

async function resolveAttendanceMember(req, gymId, memberId) {
  if (req.user?.role === "member") {
    const member = await Member.findOne({ user: req.user._id, gym: gymId });
    if (!member) {
      return null;
    }

    await syncExpiredMemberStatus(member);
    return member;
  }

  const member = await Member.findById(memberId);
  if (!member || String(member.gym) !== String(gymId)) {
    return null;
  }

  if (req.user?.role === "coach" && member.coach !== req.user.name) {
    return "forbidden";
  }

  await syncExpiredMemberStatus(member);
  return member;
}

async function createOrUpdateAttendanceSession({ gymId, member, coachName, timestamp, source = "manual", deviceUserId = "", sourceFileName = "" }) {
  const eventAt = new Date(timestamp || new Date());
  await syncExpiredMemberStatus(member, eventAt);

  if (isMembershipExpired(member, eventAt) || member.status !== "active") {
    const error = new Error("This member's subscription has expired.");
    error.code = "MEMBERSHIP_EXPIRED";
    throw error;
  }

  const dayStart = startOfDay(eventAt);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const openSession = await Attendance.findOne({
    gym: gymId,
    memberId: member._id,
    sessionDate: { $gte: dayStart, $lt: dayEnd },
    status: "checked-in"
  }).sort({ checkInAt: -1 });

  if (openSession) {
    openSession.checkOutAt = eventAt;
    openSession.status = "checked-out";
    openSession.source = source;
    if (deviceUserId) openSession.deviceUserId = deviceUserId;
    if (sourceFileName) openSession.sourceFileName = sourceFileName;
    await openSession.save();
    return { action: "clock-out", record: openSession };
  }

  const attendance = await Attendance.create({
    gym: gymId,
    memberId: member._id,
    coachName: coachName || member.coach,
    member: member.name,
    avatar: member.avatar,
    time: eventAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: formatAttendanceDate(eventAt),
    sessionDate: eventAt,
    checkInAt: eventAt,
    checkOutAt: null,
    status: "checked-in",
    source,
    deviceUserId,
    sourceFileName
  });

  member.checkIns = Number(member.checkIns || 0) + 1;
  syncMemberStatsOnCheckIn(member);
  await member.save();

  return { action: "clock-in", record: attendance };
}

async function resolveMembershipPlan(gymId, planName) {
  if (!gymId || !planName) {
    return null;
  }

  return MembershipPlan.findOne({ gym: gymId, name: planName });
}

function normalizeCurrencyAmount(value, fallback = 0) {
  if (value == null || value === "") {
    return Math.max(0, Number(fallback || 0));
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return Math.max(0, Number(fallback || 0));
  }

  return Math.max(0, amount);
}

function resolveSubscriptionDuration(planDoc, requestedDuration) {
  const duration = Number(requestedDuration || planDoc?.durationMonths || 1);
  return Number.isFinite(duration) && duration > 0 ? duration : 1;
}

function resolveSubscriptionCharge(planDoc, requestedCharge) {
  if (requestedCharge != null && requestedCharge !== "") {
    return normalizeCurrencyAmount(requestedCharge);
  }

  return normalizeCurrencyAmount(planDoc?.price || 0);
}

function derivePaymentStatus(amountPaid, amountDue) {
  const paid = normalizeCurrencyAmount(amountPaid);
  const due = normalizeCurrencyAmount(amountDue);

  if (due <= 0 || paid >= due) {
    return "paid";
  }

  if (paid > 0) {
    return "partial";
  }

  return "unpaid";
}

function resolveSubscriptionDates(currentMember, startDateInput, durationMonths) {
  const startDate = startDateInput
    ? new Date(startDateInput)
    : (currentMember?.planStartedAt || currentMember?.joinedAt || new Date());

  return {
    planStartedAt: startDate,
    planExpiresAt: addMonths(startDate, durationMonths)
  };
}

function syncMemberStatsOnCheckIn(member) {
  const currentStats = member.myStats && typeof member.myStats === "object" ? member.myStats : {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last = currentStats.lastCheckInDate ? new Date(currentStats.lastCheckInDate) : null;
  if (last) last.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let streak;
  if (last && last.getTime() === today.getTime()) {
    streak = Number(currentStats.streak || 1);
  } else if (last && last.getTime() === yesterday.getTime()) {
    streak = Number(currentStats.streak || 0) + 1;
  } else {
    streak = 1;
  }

  member.myStats = {
    ...currentStats,
    weight: Array.isArray(currentStats.weight) ? currentStats.weight : [],
    bodyFat: Array.isArray(currentStats.bodyFat) ? currentStats.bodyFat : [],
    labels: Array.isArray(currentStats.labels) ? currentStats.labels : [],
    benchPress: Array.isArray(currentStats.benchPress) ? currentStats.benchPress : [],
    checkInsThisMonth: Number(currentStats.checkInsThisMonth || 0) + 1,
    streak,
    totalCheckIns: Number(currentStats.totalCheckIns || member.checkIns || 0) + 1,
    lastCheckInDate: today
  };
}

async function createCoach(req, res) {
  const {
    gymId,
    name,
    specialty,
    email,
    gender,
    address,
    nationalId,
    employeeCode,
    hireDate,
    employmentType,
    salaryModel,
    shiftSchedule,
    specializations,
    yearsOfExperience,
    languages,
    certificationExpiryDates,
    availableHours,
    maxClientCapacity,
    performanceNotes,
    bankPaymentDetails,
    emergencyContact,
    dateOfBirth,
    certifications
  } = req.body || {};

  if (!gymId || !name || !specialty || !email) {
    return res.status(400).json({ message: "gymId, name, specialty, and email are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    return res.status(400).json({ message: "A user with that email already exists" });
  }

  const temporaryPassword = generateTemporaryPassword();
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: hashPassword(temporaryPassword),
    role: "coach",
    gym: gymId,
    mustChangePassword: true,
    passwordUpdatedAt: new Date()
  });

  const coach = new Coach({
    gym: gymId,
    user: user._id,
    name,
    specialty,
    members: 0,
    status: "active",
    email: normalizedEmail,
    certifications: certifications || "",
    dateOfBirth: parseDateOrNull(dateOfBirth),
    gender: gender || "",
    address: address || "",
    nationalId: nationalId || "",
    employeeCode: employeeCode || "",
    hireDate: parseDateOrNull(hireDate),
    employmentType: employmentType || "",
    salaryModel: salaryModel || "",
    shiftSchedule: shiftSchedule || "",
    specializations: parseStringList(specializations),
    yearsOfExperience: parseNumberOrNull(yearsOfExperience),
    languages: parseStringList(languages),
    certificationExpiryDates: parseStringList(certificationExpiryDates),
    availableHours: availableHours || "",
    maxClientCapacity: parseNumberOrNull(maxClientCapacity),
    performanceNotes: performanceNotes || "",
    bankPaymentDetails: bankPaymentDetails || "",
    emergencyContact: emergencyContact || "",
    joinedAt: new Date(),
    avatar: avatarFromName(name)
  });
  coach.coachCode = buildCoachCode(coach._id);
  await coach.save();

  await User.findByIdAndUpdate(user._id, { coachProfile: coach._id });

  return res.status(201).json({
    id: coach._id,
    credentials: {
      role: "coach",
      email: normalizedEmail,
      temporaryPassword,
      mustChangePassword: true
    }
  });
}

async function updateCoach(req, res) {
  const coach = await findOwnedDocument(Coach, req, req.params.id);
  if (coach === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this coach" });
  }
  if (!coach) {
    return res.status(404).json({ message: "Coach not found" });
  }

  const {
    name,
    specialty,
    email,
    status,
    members,
    gender,
    address,
    nationalId,
    employeeCode,
    hireDate,
    employmentType,
    salaryModel,
    shiftSchedule,
    specializations,
    yearsOfExperience,
    languages,
    certificationExpiryDates,
    availableHours,
    maxClientCapacity,
    performanceNotes,
    bankPaymentDetails,
    emergencyContact,
    dateOfBirth,
    certifications
  } = req.body || {};

  if (name) {
    coach.name = name;
    coach.avatar = avatarFromName(name);
  }
  if (specialty) coach.specialty = specialty;
  if (certifications != null) coach.certifications = String(certifications);
  if (status) coach.status = status;
  if (members != null) coach.members = Number(members);
  if (gender != null) coach.gender = String(gender);
  if (address != null) coach.address = String(address);
  if (nationalId != null) coach.nationalId = String(nationalId);
  if (employeeCode != null) coach.employeeCode = String(employeeCode);
  if (hireDate !== undefined) coach.hireDate = parseDateOrNull(hireDate);
  if (employmentType != null) coach.employmentType = String(employmentType);
  if (salaryModel != null) coach.salaryModel = String(salaryModel);
  if (shiftSchedule != null) coach.shiftSchedule = String(shiftSchedule);
  if (specializations != null) coach.specializations = parseStringList(specializations);
  if (yearsOfExperience !== undefined) coach.yearsOfExperience = parseNumberOrNull(yearsOfExperience);
  if (languages != null) coach.languages = parseStringList(languages);
  if (certificationExpiryDates != null) coach.certificationExpiryDates = parseStringList(certificationExpiryDates);
  if (availableHours != null) coach.availableHours = String(availableHours);
  if (maxClientCapacity !== undefined) coach.maxClientCapacity = parseNumberOrNull(maxClientCapacity);
  if (performanceNotes != null) coach.performanceNotes = String(performanceNotes);
  if (bankPaymentDetails != null) coach.bankPaymentDetails = String(bankPaymentDetails);
  if (emergencyContact != null) coach.emergencyContact = String(emergencyContact);
  if (dateOfBirth !== undefined) coach.dateOfBirth = parseDateOrNull(dateOfBirth);

  if (email) {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: coach.user } }).lean();
    if (existingUser) {
      return res.status(400).json({ message: "A user with that email already exists" });
    }
    coach.email = normalizedEmail;
  }

  await coach.save();

  if (coach.user) {
    await User.findByIdAndUpdate(coach.user, {
      name: coach.name,
      email: coach.email
    });
  }

  return res.json({ message: "Coach updated" });
}

async function deleteCoach(req, res) {
  const coach = await findOwnedDocument(Coach, req, req.params.id);
  if (coach === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this coach" });
  }
  if (!coach) {
    return res.status(404).json({ message: "Coach not found" });
  }

  await Coach.findByIdAndDelete(req.params.id);
  if (coach?.user) {
    await User.findByIdAndDelete(coach.user);
  }
  return res.json({ message: "Coach removed" });
}

async function resetCoachPassword(req, res) {
  const coach = await findOwnedDocument(Coach, req, req.params.id);
  if (coach === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this coach" });
  }
  if (!coach) {
    return res.status(404).json({ message: "Coach not found" });
  }
  if (!coach.user) {
    return res.status(404).json({ message: "Coach account is not linked to a login user" });
  }

  const user = await User.findById(coach.user);
  if (!user) {
    return res.status(404).json({ message: "Coach login account not found" });
  }

  const temporaryPassword = generateTemporaryPassword();
  user.passwordHash = hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  user.passwordUpdatedAt = new Date();
  user.status = "active";
  await user.save();

  return res.json({
    message: "Coach password reset",
    credentials: {
      role: "coach",
      email: user.email,
      temporaryPassword,
      mustChangePassword: true
    }
  });
}

async function createMember(req, res) {
  const {
    gymId,
    name,
    coach,
    plan,
    goal,
    email,
    subscriptionDurationMonths,
    paymentStatus,
    amountPaid,
    amountDue,
    dietPlanName,
    dateOfBirth,
    gender,
    address,
    medicalNotes,
    fitnessLevel,
    preferredWorkoutTime,
    emergencyContact,
    emergencyContactRelationship,
    joinSource,
    renewalReminderPreference,
    attendanceNotes,
    assignedLocker,
    memberTag,
    barcode,
    progressPhotos,
    bodyFatPercentage,
    bmi,
    waistToHipRatio,
    supplementUsage,
    paymentMethod,
    membershipFreezeStatus,
    goalTargetDate,
    heightCm,
    currentWeightKg,
    targetWeightKg,
    targetBodyFat,
    personalNotes,
    chestCm,
    waistCm,
    armsCm,
    thighsCm
  } = req.body || {};

  if (!gymId || !name || !plan || !goal || !email) {
    return res.status(400).json({ message: "gymId, name, plan, goal, and email are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  let resolvedCoach = coach;
  if (req.user?.role === "coach" && !resolvedCoach) {
    const coachDoc = await Coach.findOne({ user: req.user._id, gym: gymId });
    resolvedCoach = coachDoc?.name || "Unassigned Coach";
  }
  if (!resolvedCoach) {
    return res.status(400).json({ message: "coach is required" });
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    return res.status(400).json({ message: "A user with that email already exists" });
  }

  const planDoc = await resolveMembershipPlan(gymId, plan);
  const durationMonths = resolveSubscriptionDuration(planDoc, subscriptionDurationMonths);
  const joinedAt = new Date();
  const computedAmountDue = resolveSubscriptionCharge(planDoc, amountDue);
  const computedAmountPaid = normalizeCurrencyAmount(amountPaid);
  const computedPaymentStatus = derivePaymentStatus(computedAmountPaid, computedAmountDue);

  const temporaryPassword = generateTemporaryPassword();
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: hashPassword(temporaryPassword),
    role: "member",
    gym: gymId,
    mustChangePassword: true,
    passwordUpdatedAt: new Date()
  });

  const member = new Member({
    gym: gymId,
    user: user._id,
    name,
    email: normalizedEmail,
    phone: req.body?.phone || "",
    coach: resolvedCoach,
    plan,
    subscriptionDurationMonths: durationMonths,
    goal,
    status: deriveSubscriptionStatus({ planExpiresAt: addMonths(joinedAt, durationMonths) }, "active"),
    joinedAt,
    planStartedAt: joinedAt,
    planExpiresAt: addMonths(joinedAt, durationMonths),
    paymentStatus: computedPaymentStatus,
    amountPaid: computedAmountPaid,
    amountDue: computedAmountDue,
    dateOfBirth: parseDateOrNull(dateOfBirth),
    gender: gender || "",
    address: address || "",
    medicalNotes: medicalNotes || "",
    fitnessLevel: fitnessLevel || "",
    preferredWorkoutTime: preferredWorkoutTime || "",
    emergencyContact: emergencyContact || "",
    emergencyContactRelationship: emergencyContactRelationship || "",
    joinSource: joinSource || "",
    renewalReminderPreference: renewalReminderPreference || "",
    attendanceNotes: attendanceNotes || "",
    assignedLocker: assignedLocker || "",
    memberTag: memberTag || "",
    barcode: barcode || "",
    progressPhotos: parseStringList(progressPhotos),
    bodyFatPercentage: parseNumberOrNull(bodyFatPercentage),
    bmi: parseNumberOrNull(bmi),
    waistToHipRatio: parseNumberOrNull(waistToHipRatio),
    supplementUsage: supplementUsage || "",
    paymentMethod: paymentMethod || "",
    membershipFreezeStatus: membershipFreezeStatus || "",
    goalTargetDate: parseDateOrNull(goalTargetDate),
    heightCm: parseNumberOrNull(heightCm),
    currentWeightKg: parseNumberOrNull(currentWeightKg),
    targetWeightKg: parseNumberOrNull(targetWeightKg),
    targetBodyFat: parseNumberOrNull(targetBodyFat),
    personalNotes: personalNotes || "",
    bodyMeasurements: {
      chestCm: parseNumberOrNull(chestCm),
      waistCm: parseNumberOrNull(waistCm),
      armsCm: parseNumberOrNull(armsCm),
      thighsCm: parseNumberOrNull(thighsCm)
    },
    dietPlanName: dietPlanName || "",
    checkIns: 0,
    progress: 0,
    avatar: avatarFromName(name)
  });
  member.memberCode = buildMemberCode(member._id);
  await member.save();

  await User.findByIdAndUpdate(user._id, { memberProfile: member._id });

  return res.status(201).json({
    id: member._id,
    credentials: {
      role: "member",
      email: normalizedEmail,
      temporaryPassword,
      mustChangePassword: true
    }
  });
}

async function updateMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this member" });
  }
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  const {
    name,
    coach,
    plan,
    goal,
    status,
    progress,
    checkIns,
    email,
    subscriptionDurationMonths,
    paymentStatus,
    amountPaid,
    amountDue,
    planStartedAt,
    planExpiresAt,
    dietPlanName,
    emergencyContact,
    heightCm,
    dateOfBirth,
    gender,
    address,
    medicalNotes,
    fitnessLevel,
    preferredWorkoutTime,
    emergencyContactRelationship,
    joinSource,
    renewalReminderPreference,
    attendanceNotes,
    assignedLocker,
    memberTag,
    barcode,
    progressPhotos,
    bodyFatPercentage,
    bmi,
    waistToHipRatio,
    supplementUsage,
    paymentMethod,
    membershipFreezeStatus,
    goalTargetDate,
    currentWeightKg,
    targetWeightKg,
    targetBodyFat,
    personalNotes,
    chestCm,
    waistCm,
    armsCm,
    thighsCm
  } = req.body || {};

  if (name) {
    member.name = name;
    member.avatar = avatarFromName(name);
  }
  if (coach) member.coach = coach;
  if (plan) member.plan = plan;
  if (goal) member.goal = goal;
  if (progress != null) member.progress = Number(progress);
  if (checkIns != null) member.checkIns = Number(checkIns);
  const nextPlanDoc = plan ? await resolveMembershipPlan(member.gym, plan) : null;
  const nextDurationMonths = subscriptionDurationMonths != null
    ? resolveSubscriptionDuration(nextPlanDoc, subscriptionDurationMonths)
    : member.subscriptionDurationMonths;
  const nextAmountDue = amountDue != null
    ? resolveSubscriptionCharge(nextPlanDoc, amountDue)
    : member.amountDue;
  const nextAmountPaid = amountPaid != null
    ? normalizeCurrencyAmount(amountPaid)
    : member.amountPaid;

  member.subscriptionDurationMonths = nextDurationMonths;
  member.amountDue = nextAmountDue;
  member.amountPaid = nextAmountPaid;
  member.paymentStatus = derivePaymentStatus(nextAmountPaid, nextAmountDue);
  if (planStartedAt) member.planStartedAt = new Date(planStartedAt);
  if (planExpiresAt) {
    member.planExpiresAt = new Date(planExpiresAt);
  } else if (subscriptionDurationMonths != null || planStartedAt) {
    const subscriptionDates = resolveSubscriptionDates(member, member.planStartedAt, nextDurationMonths);
    member.planStartedAt = subscriptionDates.planStartedAt;
    member.planExpiresAt = subscriptionDates.planExpiresAt;
  }
  const subscriptionTouched = plan != null || subscriptionDurationMonths != null || planStartedAt != null || planExpiresAt != null;
  member.status = deriveSubscriptionStatus(
    member,
    status || (subscriptionTouched ? "active" : (member.status || "active"))
  );
  if (dietPlanName != null) member.dietPlanName = String(dietPlanName);
  if (emergencyContact != null) member.emergencyContact = String(emergencyContact);
  if (heightCm != null && heightCm !== "") member.heightCm = Number(heightCm);
  if (dateOfBirth !== undefined) member.dateOfBirth = parseDateOrNull(dateOfBirth);
  if (gender != null) member.gender = String(gender);
  if (address != null) member.address = String(address);
  if (medicalNotes != null) member.medicalNotes = String(medicalNotes);
  if (fitnessLevel != null) member.fitnessLevel = String(fitnessLevel);
  if (preferredWorkoutTime != null) member.preferredWorkoutTime = String(preferredWorkoutTime);
  if (emergencyContactRelationship != null) member.emergencyContactRelationship = String(emergencyContactRelationship);
  if (joinSource != null) member.joinSource = String(joinSource);
  if (renewalReminderPreference != null) member.renewalReminderPreference = String(renewalReminderPreference);
  if (attendanceNotes != null) member.attendanceNotes = String(attendanceNotes);
  if (assignedLocker != null) member.assignedLocker = String(assignedLocker);
  if (memberTag != null) member.memberTag = String(memberTag);
  if (barcode != null) member.barcode = String(barcode);
  if (progressPhotos != null) member.progressPhotos = parseStringList(progressPhotos);
  if (bodyFatPercentage !== undefined) member.bodyFatPercentage = parseNumberOrNull(bodyFatPercentage);
  if (bmi !== undefined) member.bmi = parseNumberOrNull(bmi);
  if (waistToHipRatio !== undefined) member.waistToHipRatio = parseNumberOrNull(waistToHipRatio);
  if (supplementUsage != null) member.supplementUsage = String(supplementUsage);
  if (paymentMethod != null) member.paymentMethod = String(paymentMethod);
  if (membershipFreezeStatus != null) member.membershipFreezeStatus = String(membershipFreezeStatus);
  if (goalTargetDate !== undefined) member.goalTargetDate = parseDateOrNull(goalTargetDate);
  if (currentWeightKg !== undefined) member.currentWeightKg = parseNumberOrNull(currentWeightKg);
  if (targetWeightKg !== undefined) member.targetWeightKg = parseNumberOrNull(targetWeightKg);
  if (targetBodyFat !== undefined) member.targetBodyFat = parseNumberOrNull(targetBodyFat);
  if (personalNotes != null) member.personalNotes = String(personalNotes);
  if (!member.bodyMeasurements || typeof member.bodyMeasurements !== "object") member.bodyMeasurements = {};
  if (chestCm !== undefined) member.bodyMeasurements.chestCm = parseNumberOrNull(chestCm);
  if (waistCm !== undefined) member.bodyMeasurements.waistCm = parseNumberOrNull(waistCm);
  if (armsCm !== undefined) member.bodyMeasurements.armsCm = parseNumberOrNull(armsCm);
  if (thighsCm !== undefined) member.bodyMeasurements.thighsCm = parseNumberOrNull(thighsCm);

  await member.save();

  if (member.user) {
    const userUpdates = { name: member.name };
    if (email) {
      const normalizedEmail = normalizeEmail(email);
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: member.user } }).lean();
      if (existingUser) {
        return res.status(400).json({ message: "A user with that email already exists" });
      }
      userUpdates.email = normalizedEmail;
    }
    await User.findByIdAndUpdate(member.user, userUpdates);
  }

  return res.json({ message: "Member updated" });
}

async function resetMemberPassword(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this member" });
  }
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }
  if (!member.user) {
    return res.status(404).json({ message: "Member account is not linked to a login user" });
  }

  const user = await User.findById(member.user);
  if (!user) {
    return res.status(404).json({ message: "Member login account not found" });
  }

  const temporaryPassword = generateTemporaryPassword();
  user.passwordHash = hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  user.passwordUpdatedAt = new Date();
  user.status = "active";
  await user.save();

  return res.json({
    message: "Member password reset",
    credentials: {
      role: "member",
      email: user.email,
      temporaryPassword,
      mustChangePassword: true
    }
  });
}

async function updateMemberSubscription(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this member" });
  }
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  const { plan, durationMonths, paymentStatus, amountPaid, amountDue, dietPlanName, planStartedAt } = req.body || {};

  if (plan) {
    member.plan = plan;
  }

  const nextPlanDoc = await resolveMembershipPlan(member.gym, member.plan);
  const nextDurationMonths = resolveSubscriptionDuration(nextPlanDoc, durationMonths != null ? durationMonths : member.subscriptionDurationMonths);
  const nextAmountDue = resolveSubscriptionCharge(nextPlanDoc, amountDue != null ? amountDue : member.amountDue);
  const nextAmountPaid = amountPaid != null ? normalizeCurrencyAmount(amountPaid) : member.amountPaid;

  member.subscriptionDurationMonths = nextDurationMonths;
  member.amountDue = nextAmountDue;
  member.amountPaid = nextAmountPaid;
  member.paymentStatus = derivePaymentStatus(nextAmountPaid, nextAmountDue);

  if (dietPlanName != null) {
    member.dietPlanName = String(dietPlanName);
  }

  const subscriptionDates = resolveSubscriptionDates(member, planStartedAt, nextDurationMonths);
  member.planStartedAt = subscriptionDates.planStartedAt;
  member.planExpiresAt = subscriptionDates.planExpiresAt;
  member.status = deriveSubscriptionStatus(member, "active");

  if (!Array.isArray(member.paymentHistory)) {
    member.paymentHistory = [];
  }
  member.paymentHistory.push({
    date: new Date(),
    amount: nextAmountPaid,
    method: req.body?.paymentMethod || member.paymentMethod || "",
    planName: member.plan,
    months: nextDurationMonths,
    note: req.body?.note || ""
  });

  if (req.body?.paymentMethod) {
    member.paymentMethod = String(req.body.paymentMethod);
  }

  await member.save();
  return res.json({ message: "Member subscription updated" });
}

async function deleteMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this member" });
  }
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  await Member.findByIdAndDelete(req.params.id);
  if (member?.user) {
    await User.findByIdAndDelete(member.user);
  }
  return res.json({ message: "Member removed" });
}

async function approveMemberRequest(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "Registration request not found" });
  }

  if (user.role !== "member" || user.status !== "pending") {
    return res.status(400).json({ message: "This account is not a pending member request" });
  }

  if (!canManageGym(req, user.gym)) {
    return res.status(403).json({ message: "You do not have access to this member request" });
  }

  const firstCoach = await Coach.findOne({ gym: user.gym, status: "active" }).sort({ createdAt: 1 }).lean();
  const firstPlan = await MembershipPlan.findOne({ gym: user.gym }).sort({ createdAt: 1 }).lean();
  const joinedAt = new Date();
  const durationMonths = Number(firstPlan?.durationMonths || 1);
  const amountDue = Number(firstPlan?.price || 0);

  const member = new Member({
    gym: user.gym,
    user: user._id,
    name: user.name,
    coach: firstCoach?.name || "Unassigned Coach",
    plan: firstPlan?.name || "Pending Plan",
    subscriptionDurationMonths: durationMonths,
    goal: user.requestedGoal || "General Fitness",
    status: deriveSubscriptionStatus({ planExpiresAt: addMonths(joinedAt, durationMonths) }, "active"),
    joinedAt,
    planStartedAt: joinedAt,
    planExpiresAt: addMonths(joinedAt, durationMonths),
    paymentStatus: amountDue > 0 ? "unpaid" : "paid",
    amountPaid: 0,
    amountDue,
    dietPlanName: "",
    checkIns: 0,
    progress: 0,
    avatar: avatarFromName(user.name)
  });
  member.memberCode = buildMemberCode(member._id);
  await member.save();

  user.memberProfile = member._id;
  user.status = "active";
  await user.save();

  return res.json({ message: "Member registration approved" });
}

async function rejectMemberRequest(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "Registration request not found" });
  }

  if (user.role !== "member" || user.status !== "pending") {
    return res.status(400).json({ message: "This account is not a pending member request" });
  }

  if (!canManageGym(req, user.gym)) {
    return res.status(403).json({ message: "You do not have access to this member request" });
  }

  user.status = "rejected";
  await user.save();

  return res.json({ message: "Member registration rejected" });
}

async function createAttendanceCheckIn(req, res) {
  const { gymId, memberId, coachName, timestamp } = req.body || {};

  if (!gymId) {
    return res.status(400).json({ message: "gymId is required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const member = await resolveAttendanceMember(req, gymId, memberId);
  if (member === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this member attendance" });
  }
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }
  let result;
  try {
    result = await createOrUpdateAttendanceSession({
      gymId,
      member,
      coachName: coachName || (req.user?.role === "coach" ? req.user.name : member.coach),
      timestamp,
      source: "manual"
    });
  } catch (error) {
    if (error?.code === "MEMBERSHIP_EXPIRED") {
      return res.status(403).json({ message: error.message });
    }
    throw error;
  }

  await logCoachActivity(req, {
    action: result.action,
    targetType: "attendance",
    targetId: result.record._id,
    targetName: member.name,
    summary: `${result.action === "clock-in" ? "Checked in" : "Checked out"} ${member.name}`,
    after: {
      memberName: member.name,
      status: result.record.status,
      sessionDate: result.record.sessionDate,
      checkInAt: result.record.checkInAt,
      checkOutAt: result.record.checkOutAt
    },
    metadata: {
      memberId: member._id,
      coachName: result.record.coachName
    }
  });

  return res.status(201).json({ id: result.record._id, action: result.action });
}

async function clockOutAttendance(req, res) {
  const attendance = await findOwnedDocument(Attendance, req, req.params.id);
  if (attendance === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this attendance record" });
  }
  if (!attendance) {
    return res.status(404).json({ message: "Attendance record not found" });
  }

  if (req.user?.role === "coach" && attendance.coachName !== req.user.name) {
    return res.status(403).json({ message: "You do not have access to this attendance record" });
  }
  if (req.user?.role === "member") {
    const member = await Member.findOne({ user: req.user._id, gym: attendance.gym });
    if (!member || String(member._id) !== String(attendance.memberId || "")) {
      return res.status(403).json({ message: "You do not have access to this attendance record" });
    }
  }

  const before = {
    memberName: attendance.member,
    status: attendance.status,
    checkInAt: attendance.checkInAt,
    checkOutAt: attendance.checkOutAt
  };

  attendance.checkOutAt = new Date();
  attendance.status = "checked-out";
  await attendance.save();

  await logCoachActivity(req, {
    action: "clock-out",
    targetType: "attendance",
    targetId: attendance._id,
    targetName: attendance.member,
    summary: `Clocked out ${attendance.member}`,
    before,
    after: {
      memberName: attendance.member,
      status: attendance.status,
      checkInAt: attendance.checkInAt,
      checkOutAt: attendance.checkOutAt
    },
    metadata: {
      memberId: attendance.memberId,
      coachName: attendance.coachName
    }
  });

  return res.json({ message: "Member clocked out" });
}

async function importAttendanceExcel(req, res) {
  const gymId = req.body?.gymId;

  if (!gymId) {
    return res.status(400).json({ message: "gymId is required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  if (!req.file?.buffer) {
    return res.status(400).json({ message: "Excel file is required" });
  }

  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

  if (!rows.length) {
    return res.status(400).json({ message: "No attendance rows were found in the Excel file" });
  }

  const members = await Member.find({ gym: gymId }).lean();
  const byFingerprintId = new Map(
    members
      .filter((member) => member.fingerprintDeviceUserId)
      .map((member) => [String(member.fingerprintDeviceUserId).trim().toLowerCase(), member])
  );
  const byName = new Map(members.map((member) => [String(member.name).trim().toLowerCase(), member]));

  let imported = 0;
  let clockIns = 0;
  let clockOuts = 0;
  let skipped = 0;
  const unmatchedRows = [];

  for (const row of rows) {
    const deviceUserId = String(
      row.deviceUserId || row.DeviceUserId || row["Device User ID"] || row["User ID"] || row.UserID || row.EmpCode || ""
    ).trim();
    const memberName = String(
      row.member || row.Member || row.Name || row["Member Name"] || row.EmployeeName || row["Employee Name"] || ""
    ).trim();
    const rawTimestamp = row.timestamp || row.Timestamp || row.DateTime || row["Date Time"] || row.date || row.Date || "";
    const parsedTimestamp = rawTimestamp ? new Date(rawTimestamp) : new Date();

    if (Number.isNaN(parsedTimestamp.getTime())) {
      skipped += 1;
      unmatchedRows.push({ reason: "Invalid timestamp", deviceUserId, memberName });
      continue;
    }

    const matchedMember = byFingerprintId.get(deviceUserId.toLowerCase()) || byName.get(memberName.toLowerCase());
    if (!matchedMember) {
      skipped += 1;
      unmatchedRows.push({ reason: "Member not matched", deviceUserId, memberName });
      continue;
    }

    const liveMember = await Member.findById(matchedMember._id);
    if (!liveMember) {
      skipped += 1;
      unmatchedRows.push({ reason: "Matched member no longer exists", deviceUserId, memberName });
      continue;
    }

    let result;
    try {
      result = await createOrUpdateAttendanceSession({
        gymId,
        member: liveMember,
        coachName: liveMember.coach,
        timestamp: parsedTimestamp,
        source: "fingerprint-import",
        deviceUserId,
        sourceFileName: req.file.originalname
      });
    } catch (error) {
      if (error?.code === "MEMBERSHIP_EXPIRED") {
        skipped += 1;
        unmatchedRows.push({ reason: "Membership expired", deviceUserId, memberName: liveMember.name });
        continue;
      }
      throw error;
    }

    imported += 1;
    if (result.action === "clock-in") {
      clockIns += 1;
    } else {
      clockOuts += 1;
    }
  }

  return res.json({
    message: "Attendance Excel imported successfully",
    summary: {
      totalRows: rows.length,
      imported,
      clockIns,
      clockOuts,
      skipped
    },
    unmatchedRows: unmatchedRows.slice(0, 20)
  });
}

async function serviceEquipment(req, res) {
  const equipment = await findOwnedDocument(Equipment, req, req.params.id);
  if (equipment === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this equipment" });
  }
  if (!equipment) {
    return res.status(404).json({ message: "Equipment not found" });
  }

  const servicedAt = new Date();
  await Equipment.findByIdAndUpdate(req.params.id, {
    status: "good",
    lastService: servicedAt,
    nextServiceDate: new Date(servicedAt.getFullYear(), servicedAt.getMonth() + 3, servicedAt.getDate())
  });
  return res.json({ message: "Equipment updated" });
}

async function createEquipment(req, res) {
  const { gymId, name, qty, status, nextServiceDate } = req.body || {};

  if (!gymId || !name || !qty || !status) {
    return res.status(400).json({ message: "gymId, name, qty, and status are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const lastService = new Date();
  const parsedNextServiceDate = parseDateOrNull(nextServiceDate) || new Date(lastService.getFullYear(), lastService.getMonth() + 3, lastService.getDate());

  const equipment = await Equipment.create({
    gym: gymId,
    name,
    qty: Number(qty),
    status,
    lastService,
    nextServiceDate: parsedNextServiceDate
  });

  return res.status(201).json({ id: equipment._id });
}

async function updateEquipment(req, res) {
  const equipment = await findOwnedDocument(Equipment, req, req.params.id);
  if (equipment === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this equipment" });
  }
  if (!equipment) {
    return res.status(404).json({ message: "Equipment not found" });
  }

  const { name, qty, status, nextServiceDate } = req.body || {};

  if (name) equipment.name = name;
  if (qty != null) equipment.qty = Number(qty);
  if (status) equipment.status = status;
  if (nextServiceDate !== undefined) equipment.nextServiceDate = parseDateOrNull(nextServiceDate) || equipment.nextServiceDate;

  await equipment.save();
  return res.json({ message: "Equipment updated" });
}

async function createMembershipPlan(req, res) {
  const { gymId, name, durationMonths, price, features } = req.body || {};

  if (!gymId || !name || price == null) {
    return res.status(400).json({ message: "gymId, name, and price are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const plan = await MembershipPlan.create({
    gym: gymId,
    name,
    durationMonths: Number(durationMonths || 1),
    price: Number(price),
    features: parseStringList(features),
    color: getRandomMembershipPlanColor()
  });

  return res.status(201).json({ id: plan._id });
}

async function updateMembershipPlan(req, res) {
  const plan = await findOwnedDocument(MembershipPlan, req, req.params.id);
  if (plan === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this membership plan" });
  }
  if (!plan) {
    return res.status(404).json({ message: "Membership plan not found" });
  }

  const { name, durationMonths, price, features } = req.body || {};

  if (name) plan.name = name;
  if (durationMonths != null) plan.durationMonths = Number(durationMonths);
  if (price != null) plan.price = Number(price);
  if (features != null) plan.features = parseStringList(features);

  await plan.save();
  return res.json({ message: "Membership plan updated" });
}

function parsePlanExercises(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => ({
      day: String(item?.day || "").trim(),
      name: String(item?.name || "").trim(),
      sets: item?.sets != null ? Number(item.sets) || 0 : 0,
      reps: String(item?.reps || "").trim(),
      rest: String(item?.rest || "").trim(),
      notes: String(item?.notes || "").trim()
    }))
    .filter((item) => item.name);
}

async function createWorkoutPlan(req, res) {
  const { gymId, name, level, duration, days, category, description, exercises } = req.body || {};

  if (!gymId || !name || !level || !duration || !days || !category) {
    return res.status(400).json({ message: "gymId, name, level, duration, days, and category are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const plan = await WorkoutPlan.create({
    gym: gymId,
    name,
    level,
    duration,
    days: Number(days),
    category,
    description: String(description || "").trim(),
    exercises: parsePlanExercises(exercises)
  });

  await logCoachActivity(req, {
    action: "create",
    targetType: "workout-plan",
    targetId: plan._id,
    targetName: plan.name,
    summary: `Created workout plan ${plan.name}`,
    after: mapWorkoutPlanAuditSnapshot(plan)
  });

  return res.status(201).json({ id: plan._id });
}

async function updateWorkoutPlan(req, res) {
  const plan = await findOwnedDocument(WorkoutPlan, req, req.params.id);
  if (plan === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this workout plan" });
  }
  if (!plan) {
    return res.status(404).json({ message: "Workout plan not found" });
  }

  const before = mapWorkoutPlanAuditSnapshot(plan);
  const { name, level, duration, days, category, description, exercises } = req.body || {};

  if (name) plan.name = name;
  if (level) plan.level = level;
  if (duration) plan.duration = duration;
  if (days != null) plan.days = Number(days);
  if (category) plan.category = category;
  if (description != null) plan.description = String(description).trim();
  if (exercises != null) plan.exercises = parsePlanExercises(exercises);

  await plan.save();

  await logCoachActivity(req, {
    action: "update",
    targetType: "workout-plan",
    targetId: plan._id,
    targetName: plan.name,
    summary: `Updated workout plan ${plan.name}`,
    before,
    after: mapWorkoutPlanAuditSnapshot(plan)
  });

  return res.json({ message: "Workout plan updated" });
}

async function deleteWorkoutPlan(req, res) {
  const plan = await findOwnedDocument(WorkoutPlan, req, req.params.id);
  if (plan === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this workout plan" });
  }
  if (!plan) {
    return res.status(404).json({ message: "Workout plan not found" });
  }

  const snapshot = mapWorkoutPlanAuditSnapshot(plan);
  await WorkoutPlan.findByIdAndDelete(plan._id);

  await logCoachActivity(req, {
    action: "delete",
    targetType: "workout-plan",
    targetId: plan._id,
    targetName: plan.name,
    summary: `Deleted workout plan ${plan.name}`,
    before: snapshot
  });

  return res.json({ message: "Workout plan deleted" });
}

async function assignWorkoutPlanToMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this member" });
  }
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  if (req.user?.role === "coach" && member.coach !== req.user.name) {
    return res.status(403).json({ message: "You do not have access to assign workout plans to this member" });
  }

  const { workoutPlanId } = req.body || {};
  if (!workoutPlanId) {
    return res.status(400).json({ message: "workoutPlanId is required" });
  }

  const plan = await findOwnedDocument(WorkoutPlan, req, workoutPlanId);
  if (plan === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this workout plan" });
  }
  if (!plan) {
    return res.status(404).json({ message: "Workout plan not found" });
  }

  const before = member.myWorkoutPlan
    ? {
      name: member.myWorkoutPlan.name || "",
      week: Number(member.myWorkoutPlan.week || 0),
      totalWeeks: Number(member.myWorkoutPlan.totalWeeks || 0),
      day: member.myWorkoutPlan.today?.day || ""
    }
    : null;

  const planHasExercises = Array.isArray(plan.exercises) && plan.exercises.length > 0;
  const exercisesForMember = planHasExercises
    ? plan.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets || 3,
      reps: ex.reps || "10",
      rest: ex.rest || "60 sec",
      done: false,
      loggedWeight: "",
      completionNotes: "",
      completedAt: null
    }))
    : buildWorkoutExercises(plan);

  member.myWorkoutPlan = {
    name: plan.name,
    week: 1,
    totalWeeks: Math.max(1, Number(plan.days || 1)),
    today: {
      day: `${plan.category} Day`,
      exercises: exercisesForMember
    }
  };

  await member.save();

  await logCoachActivity(req, {
    action: "assign-workout-plan",
    targetType: "member",
    targetId: member._id,
    targetName: member.name,
    summary: `Assigned workout plan ${plan.name} to ${member.name}`,
    before,
    after: {
      name: member.myWorkoutPlan.name,
      week: member.myWorkoutPlan.week,
      totalWeeks: member.myWorkoutPlan.totalWeeks,
      day: member.myWorkoutPlan.today?.day || ""
    },
    metadata: {
      workoutPlanId: plan._id,
      workoutPlanName: plan.name
    }
  });

  return res.json({ message: "Workout plan assigned to member" });
}

async function removeWorkoutPlanFromMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this member" });
  }
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  if (req.user?.role === "coach" && member.coach !== req.user.name) {
    return res.status(403).json({ message: "You do not have access to remove workout plans from this member" });
  }

  const before = member.myWorkoutPlan
    ? {
      name: member.myWorkoutPlan.name || "",
      week: Number(member.myWorkoutPlan.week || 0),
      totalWeeks: Number(member.myWorkoutPlan.totalWeeks || 0),
      day: member.myWorkoutPlan.today?.day || ""
    }
    : null;

  member.myWorkoutPlan = null;
  await member.save();

  await logCoachActivity(req, {
    action: "remove-workout-plan",
    targetType: "member",
    targetId: member._id,
    targetName: member.name,
    summary: `Removed workout plan from ${member.name}`,
    before,
    after: null
  });

  return res.json({ message: "Workout plan removed from member" });
}

async function createMealPlan(req, res) {
  const { gymId, name, calories, protein, carbs, fat, goal, meals } = req.body || {};

  if (!gymId || !name || calories == null || protein == null || carbs == null || fat == null || !goal) {
    return res.status(400).json({ message: "gymId, name, calories, protein, carbs, fat, and goal are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const plan = await MealPlan.create({
    gym: gymId,
    name,
    calories: Number(calories),
    protein: Number(protein),
    carbs: Number(carbs),
    fat: Number(fat),
    goal,
    meals: parseMealItems(meals)
  });

  await logCoachActivity(req, {
    action: "create",
    targetType: "meal-plan",
    targetId: plan._id,
    targetName: plan.name,
    summary: `Created meal plan ${plan.name}`,
    after: mapMealPlanAuditSnapshot(plan)
  });

  return res.status(201).json({ id: plan._id });
}

async function updateMealPlan(req, res) {
  const plan = await findOwnedDocument(MealPlan, req, req.params.id);
  if (plan === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this meal plan" });
  }
  if (!plan) {
    return res.status(404).json({ message: "Meal plan not found" });
  }

  const before = mapMealPlanAuditSnapshot(plan);
  const { name, calories, protein, carbs, fat, goal, meals } = req.body || {};

  if (name) plan.name = name;
  if (calories != null) plan.calories = Number(calories);
  if (protein != null) plan.protein = Number(protein);
  if (carbs != null) plan.carbs = Number(carbs);
  if (fat != null) plan.fat = Number(fat);
  if (goal) plan.goal = goal;
  if (meals != null) plan.meals = parseMealItems(meals);

  await plan.save();

  await logCoachActivity(req, {
    action: "update",
    targetType: "meal-plan",
    targetId: plan._id,
    targetName: plan.name,
    summary: `Updated meal plan ${plan.name}`,
    before,
    after: mapMealPlanAuditSnapshot(plan)
  });

  return res.json({ message: "Meal plan updated" });
}

async function deleteMealPlan(req, res) {
  const plan = await findOwnedDocument(MealPlan, req, req.params.id);
  if (plan === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this meal plan" });
  }
  if (!plan) {
    return res.status(404).json({ message: "Meal plan not found" });
  }

  const snapshot = mapMealPlanAuditSnapshot(plan);
  await MealPlan.findByIdAndDelete(plan._id);

  await logCoachActivity(req, {
    action: "delete",
    targetType: "meal-plan",
    targetId: plan._id,
    targetName: plan.name,
    summary: `Deleted meal plan ${plan.name}`,
    before: snapshot
  });

  return res.json({ message: "Meal plan deleted" });
}

async function assignMealPlanToMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this member" });
  }
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  if (req.user?.role === "coach" && member.coach !== req.user.name) {
    return res.status(403).json({ message: "You do not have access to assign meal plans to this member" });
  }

  const { mealPlanId } = req.body || {};
  if (!mealPlanId) {
    return res.status(400).json({ message: "mealPlanId is required" });
  }

  const plan = await findOwnedDocument(MealPlan, req, mealPlanId);
  if (plan === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this meal plan" });
  }
  if (!plan) {
    return res.status(404).json({ message: "Meal plan not found" });
  }

  const before = member.myMealPlan
    ? {
      name: member.myMealPlan.name || "",
      meals: Array.isArray(member.myMealPlan.meals) ? member.myMealPlan.meals : []
    }
    : null;

  member.dietPlanName = plan.name;
  member.myMealPlan = {
    name: plan.name,
    meals: Array.isArray(plan.meals)
      ? plan.meals.map((meal) => ({
        time: meal.time || "",
        name: meal.name || "",
        foods: Array.isArray(meal.foods) ? meal.foods : [],
        cals: Number(meal.cals || 0),
        protein: Number(meal.protein || 0),
        carbs: Number(meal.carbs || 0),
        fat: Number(meal.fat || 0)
      }))
      : []
  };

  await member.save();

  await logCoachActivity(req, {
    action: "assign-meal-plan",
    targetType: "member",
    targetId: member._id,
    targetName: member.name,
    summary: `Assigned meal plan ${plan.name} to ${member.name}`,
    before,
    after: {
      name: member.myMealPlan.name,
      meals: member.myMealPlan.meals
    },
    metadata: {
      mealPlanId: plan._id,
      mealPlanName: plan.name
    }
  });

  return res.json({ message: "Meal plan assigned to member" });
}

async function removeMealPlanFromMember(req, res) {
  const member = await findOwnedDocument(Member, req, req.params.id);
  if (member === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this member" });
  }
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  if (req.user?.role === "coach" && member.coach !== req.user.name) {
    return res.status(403).json({ message: "You do not have access to remove meal plans from this member" });
  }

  const before = member.myMealPlan
    ? {
      name: member.myMealPlan.name || "",
      meals: Array.isArray(member.myMealPlan.meals) ? member.myMealPlan.meals : []
    }
    : null;

  member.dietPlanName = "";
  member.myMealPlan = null;
  await member.save();

  await logCoachActivity(req, {
    action: "remove-meal-plan",
    targetType: "member",
    targetId: member._id,
    targetName: member.name,
    summary: `Removed meal plan from ${member.name}`,
    before,
    after: null
  });

  return res.json({ message: "Meal plan removed from member" });
}

async function createAnnouncement(req, res) {
  const { gymId, title, body, priority } = req.body || {};

  if (!gymId || !title || !body || !priority) {
    return res.status(400).json({ message: "gymId, title, body, and priority are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const announcement = await Announcement.create({
    gym: gymId,
    title,
    body,
    priority,
    date: new Date()
  });

  return res.status(201).json({ id: announcement._id });
}

async function updateAnnouncement(req, res) {
  const announcement = await findOwnedDocument(Announcement, req, req.params.id);
  if (announcement === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this announcement" });
  }
  if (!announcement) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  const { title, body, priority } = req.body || {};
  if (title) announcement.title = title;
  if (body) announcement.body = body;
  if (priority) announcement.priority = priority;
  announcement.date = new Date();

  await announcement.save();
  return res.json({ message: "Announcement updated" });
}

async function deleteAnnouncement(req, res) {
  const announcement = await findOwnedDocument(Announcement, req, req.params.id);
  if (announcement === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this announcement" });
  }
  if (!announcement) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  await Announcement.findByIdAndDelete(req.params.id);
  return res.json({ message: "Announcement deleted" });
}

async function createExpense(req, res) {
  const { gymId, type, sourceType, title, category, amount, expenseDate, status, vendor, contactName, paymentMethod, referenceNumber, notes } = req.body || {};

  if (!gymId || !title || !category || amount == null || !expenseDate) {
    return res.status(400).json({ message: "gymId, title, category, amount, and expenseDate are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const expense = await Expense.create({
    gym: gymId,
    type: type === "income" ? "income" : "expense",
    sourceType: sourceType || "manual",
    title,
    category,
    amount: Number(amount),
    expenseDate: new Date(expenseDate),
    status: status || "paid",
    vendor: vendor || "",
    contactName: contactName || "",
    paymentMethod: paymentMethod || "cash",
    referenceNumber: referenceNumber || "",
    notes: notes || ""
  });

  return res.status(201).json({ id: expense._id });
}

async function updateExpense(req, res) {
  const expense = await findOwnedDocument(Expense, req, req.params.id);
  if (expense === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this expense" });
  }
  if (!expense) {
    return res.status(404).json({ message: "Expense not found" });
  }

  const { type, sourceType, title, category, amount, expenseDate, status, vendor, contactName, paymentMethod, referenceNumber, notes } = req.body || {};

  if (type) expense.type = type === "income" ? "income" : "expense";
  if (sourceType != null) expense.sourceType = sourceType || "manual";
  if (title) expense.title = title;
  if (category) expense.category = category;
  if (amount != null) expense.amount = Number(amount);
  if (expenseDate) expense.expenseDate = new Date(expenseDate);
  if (status) expense.status = status;
  if (vendor != null) expense.vendor = vendor;
  if (contactName != null) expense.contactName = contactName;
  if (paymentMethod != null) expense.paymentMethod = paymentMethod;
  if (referenceNumber != null) expense.referenceNumber = referenceNumber;
  if (notes != null) expense.notes = notes;

  await expense.save();
  return res.json({ message: "Expense updated" });
}

async function createSupplement(req, res) {
  const { gymId, name, sku, brand, category, stockQty, unitPrice, reorderLevel, status } = req.body || {};

  if (!gymId || !name || !sku || !category || stockQty == null || unitPrice == null) {
    return res.status(400).json({ message: "gymId, name, sku, category, stockQty, and unitPrice are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const normalizedSku = String(sku).trim().toUpperCase();
  const existing = await Supplement.findOne({ gym: gymId, sku: normalizedSku }).lean();
  if (existing) {
    return res.status(400).json({ message: "A supplement with that SKU already exists" });
  }

  const qty = Number(stockQty);
  const reorder = Number(reorderLevel || 0);
  const supplement = await Supplement.create({
    gym: gymId,
    name,
    sku: normalizedSku,
    brand: brand || "",
    category,
    imageUrl: req.file?.filename ? `/uploads/supplements/${req.file.filename}` : "",
    stockQty: qty,
    unitPrice: Number(unitPrice),
    reorderLevel: reorder,
    status: normalizeSupplementStatus(qty, reorder, status)
  });

  return res.status(201).json({ id: supplement._id });
}

async function updateSupplement(req, res) {
  const supplement = await findOwnedDocument(Supplement, req, req.params.id);
  if (supplement === "forbidden") {
    return res.status(403).json({ message: "You do not have access to this supplement" });
  }
  if (!supplement) {
    return res.status(404).json({ message: "Supplement not found" });
  }

  const { name, sku, brand, category, stockQty, unitPrice, reorderLevel, status } = req.body || {};

  if (name) supplement.name = name;
  if (sku) supplement.sku = String(sku).trim().toUpperCase();
  if (brand != null) supplement.brand = brand;
  if (category) supplement.category = category;
  if (req.file?.filename) supplement.imageUrl = `/uploads/supplements/${req.file.filename}`;
  if (stockQty != null) supplement.stockQty = Number(stockQty);
  if (unitPrice != null) supplement.unitPrice = Number(unitPrice);
  if (reorderLevel != null) supplement.reorderLevel = Number(reorderLevel);
  supplement.status = normalizeSupplementStatus(supplement.stockQty, supplement.reorderLevel, status);

  await supplement.save();
  return res.json({ message: "Supplement updated" });
}

async function createSale(req, res) {
  const { gymId, customerName, memberId, memberName, paymentMethod, notes, items } = req.body || {};

  if (!gymId || !customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "gymId, customerName, and at least one item are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const saleItems = [];
  let subtotal = 0;
  let linkedMember = null;
  let linkedMemberEmail = "";

  if (memberId) {
    linkedMember = await Member.findById(memberId).lean();
    if (!linkedMember || String(linkedMember.gym) !== String(gymId)) {
      return res.status(404).json({ message: "Selected member not found for this gym" });
    }

    if (linkedMember.user) {
      const linkedUser = await User.findById(linkedMember.user).select("email").lean();
      linkedMemberEmail = linkedUser?.email || "";
    }
  }

  for (const item of items) {
    const supplement = await Supplement.findById(item.supplementId);
    if (!supplement || String(supplement.gym) !== String(gymId)) {
      return res.status(404).json({ message: "Supplement not found for sale item" });
    }

    const qty = Number(item.qty || 0);
    if (qty <= 0) {
      return res.status(400).json({ message: "Sale quantities must be greater than zero" });
    }

    if (supplement.stockQty < qty) {
      return res.status(400).json({ message: `${supplement.name} does not have enough stock` });
    }

    const lineTotal = qty * supplement.unitPrice;
    subtotal += lineTotal;
    saleItems.push({
      supplement: supplement._id,
      name: supplement.name,
      qty,
      unitPrice: supplement.unitPrice,
      lineTotal
    });

    supplement.stockQty -= qty;
    supplement.status = normalizeSupplementStatus(supplement.stockQty, supplement.reorderLevel);
    await supplement.save();
  }

  const resolvedMemberName = linkedMember?.name || memberName || "";
  const sale = await Sale.create({
    gym: gymId,
    customerName,
    memberName: resolvedMemberName,
    paymentMethod: paymentMethod || "cash",
    notes: notes || "",
    items: saleItems,
    subtotal,
    total: subtotal,
    status: "paid",
    soldAt: new Date()
  });

  let receiptEmail = { status: "not-requested" };
  const gym = linkedMemberEmail ? await Gym.findById(gymId).select("name").lean() : null;

  if (linkedMemberEmail) {
    if (isEmailConfigured()) {
      try {
        const emailPayload = buildSaleReceiptEmail({
          gymName: gym?.name || "FitnessHub Gym",
          sale: {
            id: sale._id,
            customerName: sale.customerName,
            memberName: sale.memberName,
            paymentMethod: sale.paymentMethod,
            notes: sale.notes,
            subtotal: sale.subtotal,
            total: sale.total,
            soldAt: sale.soldAt,
            items: sale.items.map((item) => ({
              name: item.name,
              qty: item.qty,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal
            }))
          }
        });

        await sendMail({
          to: linkedMemberEmail,
          subject: emailPayload.subject,
          html: emailPayload.html,
          text: emailPayload.text
        });
        receiptEmail = { status: "sent", to: linkedMemberEmail };
      } catch (error) {
        console.error("[email] Failed to send sale receipt", error);
        receiptEmail = { status: "failed", to: linkedMemberEmail };
      }
    } else {
      receiptEmail = { status: "skipped", reason: "email-not-configured", to: linkedMemberEmail };
    }
  }

  return res.status(201).json({
    id: sale._id,
    customerName: sale.customerName,
    memberName: sale.memberName,
    paymentMethod: sale.paymentMethod,
    notes: sale.notes,
    subtotal: sale.subtotal,
    total: sale.total,
    status: sale.status,
    soldAt: sale.soldAt,
    items: sale.items.map((item) => ({
      supplementId: item.supplement,
      name: item.name,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal
    })),
    receiptEmail
  });
}

async function createSaleReturn(req, res) {
  const { gymId, saleId, reason, amount, items } = req.body || {};

  if (!gymId || !saleId || !reason || amount == null || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "gymId, saleId, reason, amount, and return items are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const sale = await Sale.findById(saleId);
  if (!sale || String(sale.gym) !== String(gymId)) {
    return res.status(404).json({ message: "Sale not found" });
  }

  const returnItems = [];
  for (const item of items) {
    const saleItem = sale.items.find((entry) => String(entry.supplement) === String(item.supplementId));
    if (!saleItem) {
      return res.status(400).json({ message: "Return item does not belong to the selected sale" });
    }

    const supplement = await Supplement.findById(item.supplementId);
    if (!supplement || String(supplement.gym) !== String(gymId)) {
      return res.status(404).json({ message: "Supplement not found for return item" });
    }

    const qty = Number(item.qty || 0);
    if (qty <= 0 || qty > saleItem.qty) {
      return res.status(400).json({ message: "Return quantity is invalid" });
    }

    supplement.stockQty += qty;
    supplement.status = normalizeSupplementStatus(supplement.stockQty, supplement.reorderLevel);
    await supplement.save();

    returnItems.push({
      supplement: supplement._id,
      name: supplement.name,
      qty
    });
  }

  const numericAmount = Number(amount);
  const saleReturn = await SaleReturn.create({
    gym: gymId,
    sale: sale._id,
    customerName: sale.customerName,
    reason,
    amount: numericAmount,
    items: returnItems,
    processedAt: new Date()
  });

  sale.returnAmount = Number(sale.returnAmount || 0) + numericAmount;
  sale.status = sale.returnAmount >= sale.total ? "refunded" : "partial";
  await sale.save();

  return res.status(201).json({ id: saleReturn._id });
}

async function uploadGymLogo(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) {
    return res.status(403).json({ message: "No gym associated with this account" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "Logo file is required" });
  }

  const gym = await Gym.findById(gymId);
  if (!gym) {
    return res.status(404).json({ message: "Gym not found" });
  }

  if (gym.logoUrl) {
    const oldFile = path.join(__dirname, "..", "..", gym.logoUrl.replace(/^\//, ""));
    if (fs.existsSync(oldFile)) {
      fs.unlinkSync(oldFile);
    }
  }

  gym.logoUrl = `/uploads/gyms/${req.file.filename}`;
  await gym.save();

  return res.json({ message: "Gym logo updated", logoUrl: gym.logoUrl });
}

async function clockInCoachAttendance(req, res) {
  const coachDoc = await Coach.findOne({ user: req.user._id, gym: req.user.gym });
  if (!coachDoc) {
    return res.status(404).json({ message: "Coach profile not found" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await CoachAttendance.findOne({
    coach: coachDoc._id,
    gym: req.user.gym,
    date: { $gte: today },
    status: { $in: ["clocked-in", "on-break"] }
  });

  if (existing) {
    return res.status(400).json({ message: "Already clocked in today" });
  }

  const record = await CoachAttendance.create({
    gym: req.user.gym,
    coach: coachDoc._id,
    coachName: coachDoc.name,
    date: new Date(),
    clockIn: new Date(),
    status: "clocked-in"
  });

  return res.status(201).json({ id: record._id, clockIn: record.clockIn, status: record.status });
}

async function clockOutCoachAttendance(req, res) {
  const record = await CoachAttendance.findById(req.params.id);
  if (!record) {
    return res.status(404).json({ message: "Attendance record not found" });
  }
  if (String(record.gym) !== String(req.user.gym)) {
    return res.status(403).json({ message: "Access denied" });
  }
  if (record.status === "clocked-out") {
    return res.status(400).json({ message: "Already clocked out" });
  }

  record.clockOut = new Date();
  record.status = "clocked-out";
  await record.save();

  return res.json({ message: "Clocked out", totalWorkMinutes: record.totalWorkMinutes });
}

async function startCoachBreak(req, res) {
  const record = await CoachAttendance.findById(req.params.id);
  if (!record) {
    return res.status(404).json({ message: "Attendance record not found" });
  }
  if (String(record.gym) !== String(req.user.gym)) {
    return res.status(403).json({ message: "Access denied" });
  }
  if (record.status !== "clocked-in") {
    return res.status(400).json({ message: "Must be clocked in to start a break" });
  }

  record.breakStart = new Date();
  record.status = "on-break";
  await record.save();

  return res.json({ message: "Break started", breakStart: record.breakStart });
}

async function endCoachBreak(req, res) {
  const record = await CoachAttendance.findById(req.params.id);
  if (!record) {
    return res.status(404).json({ message: "Attendance record not found" });
  }
  if (String(record.gym) !== String(req.user.gym)) {
    return res.status(403).json({ message: "Access denied" });
  }
  if (record.status !== "on-break") {
    return res.status(400).json({ message: "Not currently on break" });
  }

  record.breakEnd = new Date();
  record.status = "clocked-in";
  await record.save();

  return res.json({ message: "Break ended", breakEnd: record.breakEnd });
}

async function getMyCoachAttendance(req, res) {
  const coachDoc = await Coach.findOne({ user: req.user._id, gym: req.user.gym });
  if (!coachDoc) {
    return res.status(404).json({ message: "Coach profile not found" });
  }

  const records = await CoachAttendance.find({ coach: coachDoc._id, gym: req.user.gym })
    .sort({ date: -1 })
    .limit(60)
    .lean();

  return res.json({ attendance: records.map((r) => ({
    id: r._id,
    date: r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
    clockIn: r.clockIn || null,
    clockOut: r.clockOut || null,
    breakStart: r.breakStart || null,
    breakEnd: r.breakEnd || null,
    totalWorkMinutes: r.totalWorkMinutes || 0,
    breakMinutes: r.breakMinutes || 0,
    status: r.status
  })) });
}

async function getTodayCoachAttendance(req, res) {
  const coachDoc = await Coach.findOne({ user: req.user._id, gym: req.user.gym });
  if (!coachDoc) {
    return res.status(404).json({ message: "Coach profile not found" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await CoachAttendance.findOne({
    coach: coachDoc._id,
    gym: req.user.gym,
    date: { $gte: today }
  }).lean();

  return res.json({ record: record ? {
    id: record._id,
    date: record.date,
    clockIn: record.clockIn,
    clockOut: record.clockOut,
    breakStart: record.breakStart,
    breakEnd: record.breakEnd,
    totalWorkMinutes: record.totalWorkMinutes || 0,
    breakMinutes: record.breakMinutes || 0,
    status: record.status
  } : null });
}

async function listSalaryAdvances(req, res) {
  const coachDoc = await Coach.findById(req.params.id);
  if (!coachDoc) {
    return res.status(404).json({ message: "Coach not found" });
  }
  if (!canManageGym(req, coachDoc.gym)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const advances = await SalaryAdvance.find({ coach: coachDoc._id }).sort({ date: -1 }).lean();
  return res.json({ advances });
}

async function createSalaryAdvance(req, res) {
  const coachDoc = await Coach.findById(req.params.id);
  if (!coachDoc) {
    return res.status(404).json({ message: "Coach not found" });
  }
  if (!canManageGym(req, coachDoc.gym)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { amount, date, reason, status, note } = req.body || {};
  if (!amount || !date) {
    return res.status(400).json({ message: "amount and date are required" });
  }

  const advance = await SalaryAdvance.create({
    gym: coachDoc.gym,
    coach: coachDoc._id,
    amount: Number(amount),
    date: new Date(date),
    reason: String(reason || "").trim(),
    status: status || "approved",
    note: String(note || "").trim()
  });

  return res.status(201).json({ id: advance._id });
}

async function updateSalaryAdvance(req, res) {
  const advance = await SalaryAdvance.findById(req.params.advId);
  if (!advance) {
    return res.status(404).json({ message: "Advance not found" });
  }
  if (!canManageGym(req, advance.gym)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { amount, date, reason, status, note } = req.body || {};
  if (amount != null) advance.amount = Number(amount);
  if (date) advance.date = new Date(date);
  if (reason != null) advance.reason = String(reason).trim();
  if (status) advance.status = status;
  if (note != null) advance.note = String(note).trim();

  await advance.save();
  return res.json({ message: "Advance updated" });
}

async function deleteSalaryAdvance(req, res) {
  const advance = await SalaryAdvance.findById(req.params.advId);
  if (!advance) {
    return res.status(404).json({ message: "Advance not found" });
  }
  if (!canManageGym(req, advance.gym)) {
    return res.status(403).json({ message: "Access denied" });
  }

  await SalaryAdvance.findByIdAndDelete(advance._id);
  return res.json({ message: "Advance deleted" });
}

async function getMyAdvances(req, res) {
  const coachDoc = await Coach.findOne({ user: req.user._id, gym: req.user.gym });
  if (!coachDoc) {
    return res.status(404).json({ message: "Coach profile not found" });
  }

  const advances = await SalaryAdvance.find({ coach: coachDoc._id }).sort({ date: -1 }).lean();
  return res.json({ advances });
}

module.exports = {
  createCoach,
  updateCoach,
  deleteCoach,
  resetCoachPassword,
  createMember,
  updateMember,
  resetMemberPassword,
  updateMemberSubscription,
  deleteMember,
  approveMemberRequest,
  rejectMemberRequest,
  createAttendanceCheckIn,
  clockOutAttendance,
  importAttendanceExcel,
  serviceEquipment,
  createEquipment,
  updateEquipment,
  createMembershipPlan,
  updateMembershipPlan,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  assignWorkoutPlanToMember,
  removeWorkoutPlanFromMember,
  createMessage,
  markMessagesRead,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  assignMealPlanToMember,
  removeMealPlanFromMember,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  createExpense,
  updateExpense,
  createSupplement,
  updateSupplement,
  createSale,
  createSaleReturn,
  uploadGymLogo,
  clockInCoachAttendance,
  clockOutCoachAttendance,
  startCoachBreak,
  endCoachBreak,
  getMyCoachAttendance,
  getTodayCoachAttendance,
  listSalaryAdvances,
  createSalaryAdvance,
  updateSalaryAdvance,
  deleteSalaryAdvance,
  getMyAdvances
};
