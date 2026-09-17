const AuditLog = require("../../models/AuditLog");
const Coach = require("../../models/Coach");
const Member = require("../../models/Member");
const MembershipPlan = require("../../models/MembershipPlan");
const Attendance = require("../../models/Attendance");
const {
  isMembershipExpired,
  syncExpiredMemberStatus
} = require("../../utils/subscription");

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

  const sessionCount = await Attendance.countDocuments({
    gym: gymId,
    memberId: member._id,
    sessionDate: { $gte: dayStart, $lt: dayEnd }
  });

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
    sourceFileName,
    sessionNumber: sessionCount + 1
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

module.exports = {
  avatarFromName,
  normalizeEmail,
  formatReceiptDateTime,
  buildReceiptNumber,
  buildSaleReceiptEmail,
  parseStringList,
  parseDateOrNull,
  parseNumberOrNull,
  parseMealItems,
  buildWorkoutExercises,
  canManageGym,
  formatMessageTime,
  toAuditValue,
  findChangedFields,
  logCoachActivity,
  mapWorkoutPlanAuditSnapshot,
  mapMealPlanAuditSnapshot,
  findOwnedDocument,
  addMonths,
  parsePlanExercises,
  normalizeSupplementStatus,
  getRandomMembershipPlanColor,
  startOfDay,
  sameDay,
  formatAttendanceDate,
  resolveAttendanceMember,
  createOrUpdateAttendanceSession,
  resolveMembershipPlan,
  normalizeCurrencyAmount,
  resolveSubscriptionDuration,
  resolveSubscriptionCharge,
  derivePaymentStatus,
  resolveSubscriptionDates,
  syncMemberStatsOnCheckIn
};
