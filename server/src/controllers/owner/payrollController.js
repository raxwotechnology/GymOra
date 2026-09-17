const Coach = require("../../models/Coach");
const Payroll = require("../../models/Payroll");
const SalaryAdvance = require("../../models/SalaryAdvance");
const CoachAttendance = require("../../models/CoachAttendance");
const { canManageGym } = require("./ownerUtils");

function gymId(req) {
  return req.user?.gym || req.user?.gymId;
}

// GET /payroll?month=YYYY-MM
async function listPayroll(req, res) {
  const gid = gymId(req);
  const filter = { gym: gid };
  if (req.query.month) filter.month = req.query.month;
  const records = await Payroll.find(filter).sort({ month: -1, coachName: 1 }).lean();
  return res.json({ records });
}

// GET /payroll/my
async function getMyPayroll(req, res) {
  const coachDoc = await Coach.findOne({ user: req.user._id, gym: req.user.gym });
  if (!coachDoc) return res.status(404).json({ message: "Coach profile not found" });
  const records = await Payroll.find({ gym: req.user.gym, coach: coachDoc._id }).sort({ month: -1 }).lean();
  return res.json({ records });
}

// POST /payroll/generate  { month: "YYYY-MM" }
async function generateMonthlyPayroll(req, res) {
  const gid = gymId(req);
  const { month } = req.body || {};
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ message: "month is required (YYYY-MM)" });
  }

  const coaches = await Coach.find({ gym: gid, status: "active" }).lean();
  if (coaches.length === 0) return res.status(400).json({ message: "No active coaches found" });

  const created = [];
  for (const coach of coaches) {
    // Skip if record already exists for this coach + month
    const exists = await Payroll.findOne({ gym: gid, coach: coach._id, month });
    if (exists) continue;

    // Sum approved advances for the month
    const startDate = new Date(`${month}-01`);
    const endDate   = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
    const advances  = await SalaryAdvance.find({
      gym: gid, coach: coach._id, status: "approved",
      date: { $gte: startDate, $lte: endDate }
    }).lean();
    const advancesDeducted = advances.reduce((s, a) => s + Number(a.amount || 0), 0);

    // Hours worked from attendance
    const attRecords = await CoachAttendance.find({
      gym: gid, coach: coach._id, status: "clocked-out",
      date: { $gte: startDate, $lte: endDate }
    }).lean();
    const hoursWorked = Math.round(attRecords.reduce((s, r) => s + (r.totalWorkMinutes || 0), 0) / 60 * 10) / 10;

    const baseSalary = Number(coach.baseSalary) || 0;

    const record = await Payroll.create({
      gym: gid,
      coach: coach._id,
      coachName: coach.name,
      month,
      baseSalary,
      hoursWorked,
      overtimeHours: 0,
      overtimeRate: 0,
      bonuses: 0,
      advancesDeducted,
      otherDeductions: 0,
      status: "draft"
    });
    created.push(record._id);

    // Mark those advances as deducted
    await SalaryAdvance.updateMany(
      { _id: { $in: advances.map((a) => a._id) } },
      { status: "deducted" }
    );
  }

  if (created.length === 0) {
    return res.status(409).json({ message: "Payroll records already exist for all coaches this month." });
  }
  return res.status(201).json({ message: `Generated ${created.length} payroll record(s).`, count: created.length });
}

// PATCH /payroll/:id
async function updatePayroll(req, res) {
  const record = await Payroll.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Payroll record not found" });
  if (!canManageGym(req, record.gym)) return res.status(403).json({ message: "Access denied" });
  if (record.status === "paid") return res.status(400).json({ message: "Cannot edit a paid payroll record" });

  const fields = ["baseSalary", "hoursWorked", "overtimeHours", "overtimeRate", "bonuses", "bonusNote", "advancesDeducted", "otherDeductions", "deductionNote", "notes", "status"];
  fields.forEach((f) => { if (req.body[f] != null) record[f] = req.body[f]; });

  await record.save(); // pre-save hook recomputes grossPay/netPay
  return res.json({ message: "Payroll updated", record: record.toObject() });
}

// PATCH /payroll/:id/approve
async function approvePayroll(req, res) {
  const record = await Payroll.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Payroll record not found" });
  if (!canManageGym(req, record.gym)) return res.status(403).json({ message: "Access denied" });
  if (record.status === "paid") return res.status(400).json({ message: "Already paid" });
  record.status = "approved";
  await record.save();
  return res.json({ message: "Payroll approved" });
}

// PATCH /payroll/:id/pay
async function markPayrollPaid(req, res) {
  const record = await Payroll.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Payroll record not found" });
  if (!canManageGym(req, record.gym)) return res.status(403).json({ message: "Access denied" });

  record.status        = "paid";
  record.paidAt        = new Date();
  record.paymentMethod = req.body.paymentMethod || record.paymentMethod || "bank-transfer";
  if (req.body.notes) record.notes = req.body.notes;
  await record.save();
  return res.json({ message: "Payroll marked as paid", record: record.toObject() });
}

// DELETE /payroll/:id
async function deletePayroll(req, res) {
  const record = await Payroll.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Payroll record not found" });
  if (!canManageGym(req, record.gym)) return res.status(403).json({ message: "Access denied" });

  // Restore any advances that were marked "deducted" when this payroll was generated
  const startDate = new Date(`${record.month}-01`);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
  await SalaryAdvance.updateMany(
    { gym: record.gym, coach: record.coach, status: "deducted", date: { $gte: startDate, $lte: endDate } },
    { status: "approved" }
  );

  await Payroll.findByIdAndDelete(record._id);
  return res.json({ message: "Payroll record deleted" });
}

module.exports = {
  listPayroll, getMyPayroll, generateMonthlyPayroll, updatePayroll, approvePayroll, markPayrollPaid, deletePayroll
};
