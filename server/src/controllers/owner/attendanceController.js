const Coach = require("../../models/Coach");
const Member = require("../../models/Member");
const Attendance = require("../../models/Attendance");
const CoachAttendance = require("../../models/CoachAttendance");
const XLSX = require("xlsx");
const AuditLog = require("../../models/AuditLog");
const {
  canManageGym, findOwnedDocument, resolveAttendanceMember,
  createOrUpdateAttendanceSession, logCoachActivity
} = require("./ownerUtils");

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
    summary: { totalRows: rows.length, imported, clockIns, clockOuts, skipped },
    unmatchedRows: unmatchedRows.slice(0, 20)
  });
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

  await AuditLog.create({
    gym: req.user.gym, actorUser: req.user._id, actorName: req.user.name || "Coach", actorRole: "coach",
    action: "self-clock-in", targetType: "coach-attendance", targetId: String(record._id), targetName: coachDoc.name,
    summary: `${coachDoc.name} clocked in for the day`,
    after: { clockIn: record.clockIn, status: record.status }
  });

  return res.status(201).json({ id: record._id, clockIn: record.clockIn, status: record.status });
}

async function clockOutCoachAttendance(req, res) {
  const record = await CoachAttendance.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Attendance record not found" });
  if (String(record.gym) !== String(req.user.gym)) return res.status(403).json({ message: "Access denied" });
  if (record.status === "clocked-out") return res.status(400).json({ message: "Already clocked out" });

  record.clockOut = new Date();
  record.status = "clocked-out";
  await record.save();

  await AuditLog.create({
    gym: req.user.gym, actorUser: req.user._id, actorName: req.user.name || "Coach", actorRole: "coach",
    action: "self-clock-out", targetType: "coach-attendance", targetId: String(record._id), targetName: record.coachName || req.user.name,
    summary: `${record.coachName || req.user.name} clocked out (${record.totalWorkMinutes || 0} min worked)`,
    after: { clockOut: record.clockOut, status: record.status, totalWorkMinutes: record.totalWorkMinutes || 0 }
  });

  return res.json({ message: "Clocked out", totalWorkMinutes: record.totalWorkMinutes });
}

async function startCoachBreak(req, res) {
  const record = await CoachAttendance.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Attendance record not found" });
  if (String(record.gym) !== String(req.user.gym)) return res.status(403).json({ message: "Access denied" });
  if (record.status !== "clocked-in") return res.status(400).json({ message: "Must be clocked in to start a break" });

  record.breakStart = new Date();
  record.status = "on-break";
  await record.save();

  await AuditLog.create({
    gym: req.user.gym, actorUser: req.user._id, actorName: req.user.name || "Coach", actorRole: "coach",
    action: "self-break-start", targetType: "coach-attendance", targetId: String(record._id), targetName: record.coachName || req.user.name,
    summary: `${record.coachName || req.user.name} started a break`,
    after: { breakStart: record.breakStart, status: record.status }
  });

  return res.json({ message: "Break started", breakStart: record.breakStart });
}

async function endCoachBreak(req, res) {
  const record = await CoachAttendance.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Attendance record not found" });
  if (String(record.gym) !== String(req.user.gym)) return res.status(403).json({ message: "Access denied" });
  if (record.status !== "on-break") return res.status(400).json({ message: "Not currently on break" });

  const breakEnd = new Date();
  const breakMs = record.breakStart ? breakEnd.getTime() - new Date(record.breakStart).getTime() : 0;
  record.breakEnd = breakEnd;
  record.breakMinutes = Math.max(0, record.breakMinutes || 0) + Math.max(0, Math.round(breakMs / 60000));
  record.status = "clocked-in";
  await record.save();

  await AuditLog.create({
    gym: req.user.gym, actorUser: req.user._id, actorName: req.user.name || "Coach", actorRole: "coach",
    action: "self-break-end", targetType: "coach-attendance", targetId: String(record._id), targetName: record.coachName || req.user.name,
    summary: `${record.coachName || req.user.name} ended their break (${record.breakMinutes || 0} min)`,
    after: { breakEnd: record.breakEnd, breakMinutes: record.breakMinutes || 0, status: record.status }
  });

  return res.json({ message: "Break ended", breakEnd: record.breakEnd });
}

async function getMyCoachAttendance(req, res) {
  const coachDoc = await Coach.findOne({ user: req.user._id, gym: req.user.gym });
  if (!coachDoc) return res.status(404).json({ message: "Coach profile not found" });

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
  if (!coachDoc) return res.status(404).json({ message: "Coach profile not found" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await CoachAttendance.findOne({
    coach: coachDoc._id,
    gym: req.user.gym,
    date: { $gte: today }
  }).sort({ createdAt: -1 }).lean();

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

async function listAttendance(req, res) {
  const gymId = req.query.gymId || req.user?.gym;
  if (!gymId) return res.status(400).json({ message: "gymId is required" });
  if (!canManageGym(req, gymId)) return res.status(403).json({ message: "Access denied" });

  const { filter = "today", from, to, memberId } = req.query;
  const now = new Date();
  let start, end;

  if (filter === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start.getTime() + 86400000);
  } else if (filter === "week") {
    const day = now.getDay();
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    end = new Date(start.getTime() + 7 * 86400000);
  } else if (filter === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (filter === "custom" && from && to) {
    start = new Date(from);
    end = new Date(new Date(to).getTime() + 86400000);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start.getTime() + 86400000);
  }

  const query = { gym: gymId, sessionDate: { $gte: start, $lt: end } };
  if (memberId) query.memberId = memberId;

  const records = await Attendance.find(query).sort({ checkInAt: -1 }).lean();
  return res.json({ records: records.map((r) => ({
    id: r._id,
    member: r.member,
    memberId: r.memberId,
    avatar: r.avatar,
    coachName: r.coachName,
    date: r.date,
    sessionDate: r.sessionDate,
    checkInAt: r.checkInAt,
    checkOutAt: r.checkOutAt,
    status: r.status,
    sessionNumber: r.sessionNumber || 1,
    breakStart: r.breakStart || null,
    breakEnd: r.breakEnd || null,
    source: r.source
  })) });
}

async function listCoachAttendance(req, res) {
  const gymId = req.query.gymId || req.user?.gym;
  if (!gymId) return res.status(400).json({ message: "gymId is required" });
  if (!canManageGym(req, gymId)) return res.status(403).json({ message: "Access denied" });

  const { filter = "today", from, to } = req.query;
  const now = new Date();
  let start, end;

  if (filter === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start.getTime() + 86400000);
  } else if (filter === "week") {
    const day = now.getDay();
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    end = new Date(start.getTime() + 7 * 86400000);
  } else if (filter === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (filter === "custom" && from && to) {
    start = new Date(from);
    end = new Date(new Date(to).getTime() + 86400000);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start.getTime() + 86400000);
  }

  const records = await CoachAttendance.find({
    gym: gymId,
    date: { $gte: start, $lt: end }
  }).sort({ clockIn: -1 }).lean();

  return res.json({ records: records.map((r) => ({
    id: r._id,
    coachId: r.coach,
    coachName: r.coachName,
    date: r.date,
    clockIn: r.clockIn,
    clockOut: r.clockOut,
    breakStart: r.breakStart,
    breakEnd: r.breakEnd,
    totalWorkMinutes: r.totalWorkMinutes || 0,
    breakMinutes: r.breakMinutes || 0,
    status: r.status
  })) });
}

async function markCoachAttendance(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });

  const { coachId, date, clockIn, clockOut, breakStart, breakEnd } = req.body || {};
  if (!coachId || !date || !clockIn) {
    return res.status(400).json({ message: "coachId, date, and clockIn are required" });
  }

  const coachDoc = await Coach.findOne({ _id: coachId, gym: gymId });
  if (!coachDoc) return res.status(404).json({ message: "Coach not found" });

  const clockInAt = new Date(clockIn);
  const clockOutAt = clockOut ? new Date(clockOut) : null;
  const breakStartAt = breakStart ? new Date(breakStart) : null;
  const breakEndAt = breakEnd ? new Date(breakEnd) : null;
  const status = clockOutAt ? "clocked-out" : (breakStartAt && !breakEndAt ? "on-break" : "clocked-in");

  const record = await CoachAttendance.create({
    gym: gymId,
    coach: coachDoc._id,
    coachName: coachDoc.name,
    date: new Date(date),
    clockIn: clockInAt,
    clockOut: clockOutAt,
    breakStart: breakStartAt,
    breakEnd: breakEndAt,
    status
  });

  await AuditLog.create({
    gym: gymId, actorUser: req.user._id, actorName: req.user.name || "Owner", actorRole: req.user.role || "owner",
    action: "mark-coach-attendance", targetType: "coach-attendance", targetId: String(record._id), targetName: coachDoc.name,
    summary: `Marked attendance for ${coachDoc.name} on ${new Date(date).toLocaleDateString()}`,
    after: { clockIn: record.clockIn, clockOut: record.clockOut, status: record.status }
  });

  return res.status(201).json({ message: "Attendance recorded", record: {
    id: record._id,
    coachId: record.coach,
    coachName: record.coachName,
    date: record.date,
    clockIn: record.clockIn,
    clockOut: record.clockOut,
    breakStart: record.breakStart,
    breakEnd: record.breakEnd,
    totalWorkMinutes: record.totalWorkMinutes || 0,
    breakMinutes: record.breakMinutes || 0,
    status: record.status
  } });
}

async function startMemberBreak(req, res) {
  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) return res.status(404).json({ message: "Attendance record not found" });
  if (String(attendance.gym) !== String(req.user?.gym) && !["super-admin", "owner"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  if (attendance.status !== "checked-in") return res.status(400).json({ message: "Member is not checked in" });

  attendance.breakStart = new Date();
  await attendance.save();

  await logCoachActivity(req, {
    action: "member-break-start", targetType: "attendance", targetId: attendance._id, targetName: attendance.member,
    summary: `Started break for ${attendance.member}`,
    after: { memberName: attendance.member, breakStart: attendance.breakStart, status: attendance.status }
  });

  return res.json({ message: "Break started", breakStart: attendance.breakStart });
}

async function endMemberBreak(req, res) {
  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) return res.status(404).json({ message: "Attendance record not found" });
  if (String(attendance.gym) !== String(req.user?.gym) && !["super-admin", "owner"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  if (!attendance.breakStart) return res.status(400).json({ message: "No active break" });

  attendance.breakEnd = new Date();
  await attendance.save();

  await logCoachActivity(req, {
    action: "member-break-end", targetType: "attendance", targetId: attendance._id, targetName: attendance.member,
    summary: `Ended break for ${attendance.member}`,
    after: { memberName: attendance.member, breakEnd: attendance.breakEnd, status: attendance.status }
  });

  return res.json({ message: "Break ended", breakEnd: attendance.breakEnd });
}

module.exports = {
  createAttendanceCheckIn, clockOutAttendance, importAttendanceExcel,
  clockInCoachAttendance, clockOutCoachAttendance, startCoachBreak, endCoachBreak,
  getMyCoachAttendance, getTodayCoachAttendance,
  listAttendance, listCoachAttendance, markCoachAttendance, startMemberBreak, endMemberBreak
};
