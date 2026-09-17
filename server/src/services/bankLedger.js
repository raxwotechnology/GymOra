const BankDetail = require("../models/BankDetail");

/**
 * Shared "ledger" helpers so every place that can move money through a bank account
 * (bank transactions, income/expense entries, subscription billing payments, supplier
 * credit payoffs, POS, payroll, ...) adjusts BankDetail.currentBalance the same way.
 *
 * A "ledger source" is any record carrying { bankDetail, balanceMovement, appliedToBalance }.
 * `balanceMovement` stores the SIGNED amount actually applied (positive = credited the bank,
 * negative = debited it) so edits/deletes can be reversed precisely even if the record's
 * amount/type/bank changes later — this is what keeps the system idempotent and re-runnable.
 */

async function shiftBalance(bankDetailId, signedAmount) {
  if (!bankDetailId || !signedAmount) return null;
  return BankDetail.findByIdAndUpdate(
    bankDetailId,
    { $inc: { currentBalance: signedAmount } },
    { new: true }
  );
}

/**
 * Apply a brand-new ledger movement to a source object (mutates it in place — caller saves).
 * No-ops if there's no bank-transfer destination or the source was already applied.
 * Returns the signed amount that was applied (0 if nothing happened).
 */
async function applyLedgerEntry(source, { bankDetailId, signedAmount }) {
  if (!source || source.appliedToBalance) return 0;
  if (!bankDetailId || !signedAmount) return 0;
  await shiftBalance(bankDetailId, signedAmount);
  source.bankDetail = bankDetailId;
  source.balanceMovement = signedAmount;
  source.appliedToBalance = true;
  return signedAmount;
}

/**
 * Reverse whatever movement a source previously applied (based on its OWN stored
 * bankDetail/balanceMovement, not any new values), then mutates it back to "unapplied".
 */
async function revertLedgerEntry(source) {
  if (!source || !source.appliedToBalance) return 0;
  const { bankDetail, balanceMovement } = source;
  if (bankDetail && balanceMovement) {
    await shiftBalance(bankDetail, -balanceMovement);
  }
  const reversed = balanceMovement || 0;
  source.bankDetail = null;
  source.balanceMovement = 0;
  source.appliedToBalance = false;
  return -reversed;
}

/**
 * Reconcile a source's ledger movement with a new desired state — reverses any prior
 * movement (using the stored values) and applies the new one (if any). Safe to call on
 * every update regardless of whether the bank/amount/method actually changed.
 */
async function reconcileLedgerEntry(source, { bankDetailId, signedAmount }) {
  await revertLedgerEntry(source);
  return applyLedgerEntry(source, { bankDetailId, signedAmount });
}

module.exports = {
  shiftBalance,
  applyLedgerEntry,
  revertLedgerEntry,
  reconcileLedgerEntry
};
