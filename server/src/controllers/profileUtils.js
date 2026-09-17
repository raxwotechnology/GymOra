const AuditLog = require("../models/AuditLog");

function toNumberOrNull(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toStringList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function syncLatestWeightEntry(member, weightValue) {
  if (weightValue == null) return;
  const today = new Date().toISOString().slice(0, 10);
  if (!member.myStats || typeof member.myStats !== "object") member.myStats = {};
  if (!Array.isArray(member.myStats.weight)) member.myStats.weight = [];
  if (!Array.isArray(member.myStats.labels)) member.myStats.labels = [];

  const { weight, labels } = member.myStats;
  const latestLabelIndex = labels.length - 1;
  if (latestLabelIndex >= 0 && labels[latestLabelIndex] === today) {
    weight[latestLabelIndex] = weightValue;
    return;
  }
  labels.push(today);
  weight.push(weightValue);
}

function toAuditValue(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toAuditValue(item));
  if (typeof value === "object") {
    if (typeof value.toObject === "function") return toAuditValue(value.toObject());
    if (value._bsontype === "ObjectId") return String(value);
    return Object.entries(value).reduce((result, [key, entryValue]) => {
      if (key === "__v") return result;
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

async function logCoachProfileEdit(authUser, details = {}) {
  if (authUser?.role !== "coach" || !authUser?._id || !authUser?.gym) return;
  const before = details.before != null ? toAuditValue(details.before) : null;
  const after = details.after != null ? toAuditValue(details.after) : null;

  await AuditLog.create({
    gym: authUser.gym,
    actorUser: authUser._id,
    actorName: authUser.name || "Coach",
    actorRole: authUser.role,
    action: "edit-profile",
    targetType: "coach-profile",
    targetId: String(authUser._id),
    targetName: authUser.name || "",
    summary: "Updated coach profile details",
    before,
    after,
    changedFields: findChangedFields(before || {}, after || {}),
    metadata: details.metadata != null ? toAuditValue(details.metadata) : null
  });
}

module.exports = { toNumberOrNull, toDateOrNull, toStringList, syncLatestWeightEntry, toAuditValue, findChangedFields, logCoachProfileEdit };
