const BankDetail = require("../../models/BankDetail");
const ChequePayment = require("../../models/ChequePayment");
const PlatformExpense = require("../../models/PlatformExpense");
const BankTransaction = require("../../models/BankTransaction");
const { applyLedgerEntry, reconcileLedgerEntry, revertLedgerEntry } = require("../../services/bankLedger");

// A bank-transaction only moves a bank's balance once it's "completed" and linked to a bank.
function bankTxLedgerTarget(tx) {
  if (!tx || tx.status !== "completed" || !tx.bankDetail) return { bankDetailId: null, signedAmount: 0 };
  const signedAmount = tx.type === "credit" ? Number(tx.amount || 0) : -Number(tx.amount || 0);
  return { bankDetailId: tx.bankDetail, signedAmount };
}

// A platform income/expense entry only moves a bank's balance when paid by bank-transfer
// with a specific bank chosen, and the entry is "paid" (not pending).
function platformExpenseLedgerTarget(entry) {
  if (!entry || entry.status !== "paid" || entry.paymentMethod !== "bank-transfer" || !entry.bankDetail) {
    return { bankDetailId: null, signedAmount: 0 };
  }
  const signedAmount = entry.type === "income" ? Number(entry.amount || 0) : -Number(entry.amount || 0);
  return { bankDetailId: entry.bankDetail, signedAmount };
}

// ─── Bank Details ────────────────────────────────────────────────────────────

async function listBankDetails(req, res) {
  const details = await BankDetail.find({ gym: null }).sort({ isDefault: -1, createdAt: -1 }).lean();
  return res.json({ details });
}

async function createBankDetail(req, res) {
  const { bankName, accountName, accountNumber } = req.body || {};
  if (!bankName || !accountName || !accountNumber) {
    return res.status(400).json({ message: "Bank name, account name, and account number are required" });
  }
  if (req.body.isDefault) {
    await BankDetail.updateMany({}, { isDefault: false });
  }
  const opening = Number(req.body.openingBalance || 0);
  const detail = await BankDetail.create({ ...req.body, gym: null, openingBalance: opening, currentBalance: opening });
  return res.status(201).json({ message: "Bank detail added", detail });
}

async function updateBankDetail(req, res) {
  const { detailId } = req.params;
  const detail = await BankDetail.findById(detailId);
  if (!detail) return res.status(404).json({ message: "Bank detail not found" });
  if (req.body.isDefault) {
    await BankDetail.updateMany({ _id: { $ne: detailId } }, { isDefault: false });
  }
  const payload = { ...req.body };
  // Changing the opening balance shifts the running balance by the same delta.
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

async function deleteBankDetail(req, res) {
  const { detailId } = req.params;
  await BankDetail.findByIdAndDelete(detailId);
  return res.json({ message: "Bank detail deleted" });
}

// ─── Cheque Payments ─────────────────────────────────────────────────────────

async function listCheques(req, res) {
  const filter = {};
  if (req.query.gymId) filter.gymId = req.query.gymId;
  const cheques = await ChequePayment.find(filter).sort({ issuedDate: -1 }).lean();
  return res.json({ cheques });
}

async function createCheque(req, res) {
  const { chequeNumber, bankName, amount, issuedDate } = req.body || {};
  if (!chequeNumber || !bankName || amount === undefined || !issuedDate) {
    return res.status(400).json({ message: "Cheque number, bank name, amount, and issued date are required" });
  }
  const cheque = await ChequePayment.create(req.body);
  return res.status(201).json({ message: "Cheque recorded", cheque });
}

async function updateCheque(req, res) {
  const { chequeId } = req.params;
  const cheque = await ChequePayment.findById(chequeId);
  if (!cheque) return res.status(404).json({ message: "Cheque not found" });
  Object.assign(cheque, req.body);
  await cheque.save();
  return res.json({ message: "Cheque updated", cheque });
}

async function deleteCheque(req, res) {
  const { chequeId } = req.params;
  await ChequePayment.findByIdAndDelete(chequeId);
  return res.json({ message: "Cheque deleted" });
}

// ─── Platform Expenses ───────────────────────────────────────────────────────

async function listPlatformExpenses(req, res) {
  const expenses = await PlatformExpense.find().sort({ entryDate: -1 }).lean();
  return res.json({ expenses });
}

async function createPlatformExpense(req, res) {
  const { type, title, category, amount, entryDate } = req.body || {};
  if (!type || !title || !category || amount === undefined || !entryDate) {
    return res.status(400).json({ message: "Type, title, category, amount, and entry date are required" });
  }
  const expense = new PlatformExpense(req.body);
  const target = platformExpenseLedgerTarget(expense);
  await applyLedgerEntry(expense, { bankDetailId: target.bankDetailId, signedAmount: target.signedAmount });
  await expense.save();
  return res.status(201).json({ message: "Entry created", expense });
}

async function updatePlatformExpense(req, res) {
  const { expenseId } = req.params;
  const expense = await PlatformExpense.findById(expenseId);
  if (!expense) return res.status(404).json({ message: "Entry not found" });
  Object.assign(expense, req.body);
  const target = platformExpenseLedgerTarget(expense);
  await reconcileLedgerEntry(expense, { bankDetailId: target.bankDetailId, signedAmount: target.signedAmount });
  await expense.save();
  return res.json({ message: "Entry updated", expense });
}

async function deletePlatformExpense(req, res) {
  const { expenseId } = req.params;
  const expense = await PlatformExpense.findById(expenseId);
  if (!expense) return res.status(404).json({ message: "Entry not found" });
  await revertLedgerEntry(expense);
  await expense.deleteOne();
  return res.json({ message: "Entry deleted" });
}

// ─── Bank Transactions ───────────────────────────────────────────────────────

async function listBankTransactions(req, res) {
  const filter = {};
  if (req.query.gymId) filter.gymId = req.query.gymId;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  const transactions = await BankTransaction.find(filter).sort({ transactionDate: -1 }).lean();
  return res.json({ transactions });
}

async function createBankTransaction(req, res) {
  const { type, amount, description, transactionDate } = req.body || {};
  if (!type || amount === undefined || !description || !transactionDate) {
    return res.status(400).json({ message: "Type, amount, description, and date are required" });
  }
  const tx = new BankTransaction(req.body);
  const target = bankTxLedgerTarget(tx);
  await applyLedgerEntry(tx, { bankDetailId: target.bankDetailId, signedAmount: target.signedAmount });
  await tx.save();
  return res.status(201).json({ message: "Transaction recorded", transaction: tx });
}

async function updateBankTransaction(req, res) {
  const { txId } = req.params;
  const tx = await BankTransaction.findById(txId);
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  Object.assign(tx, req.body);
  const target = bankTxLedgerTarget(tx);
  await reconcileLedgerEntry(tx, { bankDetailId: target.bankDetailId, signedAmount: target.signedAmount });
  await tx.save();
  return res.json({ message: "Transaction updated", transaction: tx });
}

async function deleteBankTransaction(req, res) {
  const { txId } = req.params;
  const tx = await BankTransaction.findById(txId);
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  await revertLedgerEntry(tx);
  await tx.deleteOne();
  return res.json({ message: "Transaction deleted" });
}

module.exports = {
  listBankDetails,
  createBankDetail,
  updateBankDetail,
  deleteBankDetail,
  listCheques,
  createCheque,
  updateCheque,
  deleteCheque,
  listPlatformExpenses,
  createPlatformExpense,
  updatePlatformExpense,
  deletePlatformExpense,
  listBankTransactions,
  createBankTransaction,
  updateBankTransaction,
  deleteBankTransaction
};
