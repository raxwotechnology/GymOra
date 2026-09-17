const Gym = require("../../models/Gym");
const User = require("../../models/User");
const Coach = require("../../models/Coach");
const Member = require("../../models/Member");
const MembershipPlan = require("../../models/MembershipPlan");
const Attendance = require("../../models/Attendance");
const AuditLog = require("../../models/AuditLog");
const Equipment = require("../../models/Equipment");
const Expense = require("../../models/Expense");
const Sale = require("../../models/Sale");
const SaleReturn = require("../../models/SaleReturn");
const SubscriptionPlan = require("../../models/SubscriptionPlan");
const BankDetail = require("../../models/BankDetail");
const ChequePayment = require("../../models/ChequePayment");
const PlatformExpense = require("../../models/PlatformExpense");
const { formatDate } = require("./adminUtils");

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

module.exports = { backupGymData, backupPlatformData };
