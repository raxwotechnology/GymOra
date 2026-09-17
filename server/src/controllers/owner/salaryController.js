const Coach = require("../../models/Coach");
const SalaryAdvance = require("../../models/SalaryAdvance");
const { canManageGym } = require("./ownerUtils");

async function listSalaryAdvances(req, res) {
  const coachDoc = await Coach.findById(req.params.id);
  if (!coachDoc) return res.status(404).json({ message: "Coach not found" });
  if (!canManageGym(req, coachDoc.gym)) return res.status(403).json({ message: "Access denied" });

  const advances = await SalaryAdvance.find({ coach: coachDoc._id }).sort({ date: -1 }).lean();
  return res.json({ advances });
}

async function createSalaryAdvance(req, res) {
  const coachDoc = await Coach.findById(req.params.id);
  if (!coachDoc) return res.status(404).json({ message: "Coach not found" });
  if (!canManageGym(req, coachDoc.gym)) return res.status(403).json({ message: "Access denied" });

  const { amount, date, reason, status, note } = req.body || {};
  if (!amount || !date) return res.status(400).json({ message: "amount and date are required" });

  const advance = await SalaryAdvance.create({
    gym: coachDoc.gym, coach: coachDoc._id, amount: Number(amount), date: new Date(date),
    reason: String(reason || "").trim(), status: status || "approved", note: String(note || "").trim()
  });

  return res.status(201).json({ id: advance._id });
}

async function updateSalaryAdvance(req, res) {
  const advance = await SalaryAdvance.findById(req.params.advId);
  if (!advance) return res.status(404).json({ message: "Advance not found" });
  if (!canManageGym(req, advance.gym)) return res.status(403).json({ message: "Access denied" });

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
  if (!advance) return res.status(404).json({ message: "Advance not found" });
  if (!canManageGym(req, advance.gym)) return res.status(403).json({ message: "Access denied" });

  await SalaryAdvance.findByIdAndDelete(advance._id);
  return res.json({ message: "Advance deleted" });
}

async function getMyAdvances(req, res) {
  const coachDoc = await Coach.findOne({ user: req.user._id, gym: req.user.gym });
  if (!coachDoc) return res.status(404).json({ message: "Coach profile not found" });

  const advances = await SalaryAdvance.find({ coach: coachDoc._id }).sort({ date: -1 }).lean();
  return res.json({ advances });
}

module.exports = {
  listSalaryAdvances, createSalaryAdvance, updateSalaryAdvance, deleteSalaryAdvance, getMyAdvances
};
