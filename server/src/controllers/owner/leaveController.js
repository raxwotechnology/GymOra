const CoachLeave = require("../../models/CoachLeave");
const Coach = require("../../models/Coach");
const { canManageGym } = require("./ownerUtils");

async function listCoachLeaves(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });

  const { coachId, status, month } = req.query;
  const filter = { gym: gymId };
  if (coachId) filter.coach = coachId;
  if (status && status !== "all") filter.status = status;
  if (month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    filter.startDate = { $lt: end };
    filter.endDate = { $gte: start };
  }

  const leaves = await CoachLeave.find(filter).sort({ createdAt: -1 }).lean();
  return res.json(leaves);
}

async function createCoachLeave(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });

  const { coachId, coachName, leaveType, startDate, endDate, reason, ownerNotes } = req.body || {};
  if (!coachId || !leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ message: "coachId, leaveType, startDate, endDate, and reason are required" });
  }

  const coach = await Coach.findOne({ _id: coachId, gym: gymId }).lean();
  if (!coach) return res.status(404).json({ message: "Coach not found" });

  const leave = await CoachLeave.create({
    gym: gymId, coach: coachId,
    coachName: coachName || coach.name,
    leaveType, reason,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    ownerNotes: ownerNotes || "",
    status: req.user?.role === "owner" ? "approved" : "pending",
    approvedBy: req.user?.role === "owner" ? (req.user.name || "Owner") : "",
    approvedAt: req.user?.role === "owner" ? new Date() : null
  });

  return res.status(201).json({ id: leave._id });
}

async function updateCoachLeave(req, res) {
  const gymId = req.user?.gym;
  const leave = await CoachLeave.findOne({ _id: req.params.id, gym: gymId });
  if (!leave) return res.status(404).json({ message: "Leave record not found" });

  const { status, ownerNotes, leaveType, startDate, endDate, reason } = req.body || {};

  if (leaveType) leave.leaveType = leaveType;
  if (startDate) leave.startDate = new Date(startDate);
  if (endDate) leave.endDate = new Date(endDate);
  if (reason) leave.reason = reason;
  if (ownerNotes != null) leave.ownerNotes = ownerNotes;

  if (status && ["approved", "rejected"].includes(status) && req.user?.role === "owner") {
    leave.status = status;
    leave.approvedBy = req.user.name || "Owner";
    leave.approvedAt = new Date();
  }

  await leave.save();
  return res.json({ message: "Leave updated" });
}

async function deleteCoachLeave(req, res) {
  const gymId = req.user?.gym;
  const leave = await CoachLeave.findOneAndDelete({ _id: req.params.id, gym: gymId });
  if (!leave) return res.status(404).json({ message: "Leave record not found" });
  return res.json({ message: "Leave deleted" });
}

// Coach requests own leave
async function requestCoachLeave(req, res) {
  const userId = req.user?._id;
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });

  const { leaveType, startDate, endDate, reason } = req.body || {};
  if (!leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ message: "leaveType, startDate, endDate, and reason are required" });
  }

  const coach = await Coach.findOne({ gym: gymId, user: userId }).lean();
  if (!coach) return res.status(404).json({ message: "Coach record not found" });

  const leave = await CoachLeave.create({
    gym: gymId, coach: coach._id, coachName: coach.name,
    leaveType, reason,
    startDate: new Date(startDate), endDate: new Date(endDate),
    status: "pending"
  });

  return res.status(201).json({ id: leave._id });
}

// Coach views own leaves
async function getMyCoachLeaves(req, res) {
  const userId = req.user?._id;
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });

  const coach = await Coach.findOne({ gym: gymId, user: userId }).lean();
  if (!coach) return res.status(404).json({ message: "Coach record not found" });

  const leaves = await CoachLeave.find({ gym: gymId, coach: coach._id }).sort({ createdAt: -1 }).lean();
  return res.json(leaves);
}

module.exports = {
  listCoachLeaves, createCoachLeave, updateCoachLeave, deleteCoachLeave,
  requestCoachLeave, getMyCoachLeaves
};
