const BankDetail = require("../../models/BankDetail");
const BankTransaction = require("../../models/BankTransaction");
const Gym = require("../../models/Gym");
const { applyLedgerEntry, reconcileLedgerEntry, revertLedgerEntry } = require("../../services/bankLedger");

function bankTxLedgerTarget(tx) {
  if (!tx || tx.status !== "completed" || !tx.bankDetail) return { bankDetailId: null, signedAmount: 0 };
  const signedAmount = tx.type === "credit" ? Number(tx.amount || 0) : -Number(tx.amount || 0);
  return { bankDetailId: tx.bankDetail, signedAmount };
}

// ─── Bank Details (gym-scoped) ───────────────────────────────────────────────

async function listOwnerBankDetails(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });
  const details = await BankDetail.find({ gym: gymId }).sort({ isDefault: -1, createdAt: -1 }).lean();
  return res.json({ details });
}

async function createOwnerBankDetail(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });
  const { bankName, accountName, accountNumber } = req.body || {};
  if (!bankName || !accountName || !accountNumber) {
    return res.status(400).json({ message: "Bank name, account name, and account number are required" });
  }
  if (req.body.isDefault) {
    await BankDetail.updateMany({ gym: gymId }, { isDefault: false });
  }
  const opening = Number(req.body.openingBalance || 0);
  const detail = await BankDetail.create({ ...req.body, gym: gymId, openingBalance: opening, currentBalance: opening });
  return res.status(201).json({ message: "Bank detail added", detail });
}

async function updateOwnerBankDetail(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });
  const { detailId } = req.params;
  const detail = await BankDetail.findOne({ _id: detailId, gym: gymId });
  if (!detail) return res.status(404).json({ message: "Bank detail not found" });
  if (req.body.isDefault) {
    await BankDetail.updateMany({ gym: gymId, _id: { $ne: detailId } }, { isDefault: false });
  }
  const payload = { ...req.body };
  if (payload.openingBalance !== undefined) {
    const nextOpening = Number(payload.openingBalance || 0);
    const delta = nextOpening - Number(detail.openingBalance || 0);
    detail.currentBalance = Number(detail.currentBalance || 0) + delta;
    detail.openingBalance = nextOpening;
    delete payload.openingBalance;
  }
  delete payload.currentBalance;
  delete payload.gym;
  Object.assign(detail, payload);
  await detail.save();
  return res.json({ message: "Bank detail updated", detail });
}

async function deleteOwnerBankDetail(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });
  const { detailId } = req.params;
  await BankDetail.findOneAndDelete({ _id: detailId, gym: gymId });
  return res.json({ message: "Bank detail deleted" });
}

// ─── Bank Transactions (gym-scoped) ──────────────────────────────────────────

async function listOwnerBankTransactions(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });
  const filter = { gymId };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  const transactions = await BankTransaction.find(filter).sort({ transactionDate: -1 }).lean();
  return res.json({ transactions });
}

async function createOwnerBankTransaction(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });
  const { type, amount, description, transactionDate } = req.body || {};
  if (!type || amount === undefined || !description || !transactionDate) {
    return res.status(400).json({ message: "Type, amount, description, and date are required" });
  }
  const payload = { ...req.body };
  delete payload.gymId;
  const gym = await Gym.findById(gymId).select("name").lean();
  const tx = new BankTransaction({ ...payload, gymId, gymName: gym ? gym.name : "" });
  const target = bankTxLedgerTarget(tx);
  await applyLedgerEntry(tx, { bankDetailId: target.bankDetailId, signedAmount: target.signedAmount });
  await tx.save();
  return res.status(201).json({ message: "Transaction recorded", transaction: tx });
}

async function updateOwnerBankTransaction(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });
  const { txId } = req.params;
  const tx = await BankTransaction.findOne({ _id: txId, gymId });
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  const payload = { ...req.body };
  delete payload.gymId;
  Object.assign(tx, payload);
  const target = bankTxLedgerTarget(tx);
  await reconcileLedgerEntry(tx, { bankDetailId: target.bankDetailId, signedAmount: target.signedAmount });
  await tx.save();
  return res.json({ message: "Transaction updated", transaction: tx });
}

async function deleteOwnerBankTransaction(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });
  const { txId } = req.params;
  const tx = await BankTransaction.findOne({ _id: txId, gymId });
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  await revertLedgerEntry(tx);
  await tx.deleteOne();
  return res.json({ message: "Transaction deleted" });
}

module.exports = {
  listOwnerBankDetails,
  createOwnerBankDetail,
  updateOwnerBankDetail,
  deleteOwnerBankDetail,
  listOwnerBankTransactions,
  createOwnerBankTransaction,
  updateOwnerBankTransaction,
  deleteOwnerBankTransaction
};
