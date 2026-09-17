/**
 * recomputeBankBalances.js
 *
 * Resets every BankDetail's currentBalance back to its openingBalance, then replays
 * every historical bank-transfer-method record that references it (BankTransaction,
 * Expense, Gym.subscriptionBillingHistory) in chronological order, writing the signed
 * movement + appliedToBalance flag onto each source so the live ledger service won't
 * double-apply them again.
 *
 * Safe to re-run: it always recomputes from openingBalance rather than incrementing.
 *
 * Usage:
 *   node src/scripts/recomputeBankBalances.js            (writes changes)
 *   node src/scripts/recomputeBankBalances.js --dry-run  (prints the plan, writes nothing)
 */

const mongoose = require("mongoose");
const BankDetail = require("../models/BankDetail");
const BankTransaction = require("../models/BankTransaction");
const Expense = require("../models/Expense");
const PlatformExpense = require("../models/PlatformExpense");
const Gym = require("../models/Gym");

const DRY_RUN = process.argv.includes("--dry-run");

// Only these statuses represent money that actually moved.
const LIVE_TX_STATUSES = ["completed"];

function signedAmountForTx(tx) {
  return tx.type === "credit" ? Number(tx.amount || 0) : -Number(tx.amount || 0);
}

function signedAmountForExpense(expense) {
  return expense.type === "income" ? Number(expense.amount || 0) : -Number(expense.amount || 0);
}

function signedAmountForPlatformExpense(entry) {
  if (entry.status !== "paid") return 0;
  return entry.type === "income" ? Number(entry.amount || 0) : -Number(entry.amount || 0);
}

// Legacy BankTransaction rows may only carry free-text bankName/accountNumber.
// Best-effort match them to a BankDetail by exact (bankName, accountNumber).
function matchLegacyBank(record, banks) {
  const name = String(record.bankName || "").trim().toLowerCase();
  const account = String(record.accountNumber || "").trim();
  if (!name || !account) return null;
  const candidates = banks.filter(
    (b) => String(b.bankName || "").trim().toLowerCase() === name && String(b.accountNumber || "").trim() === account
  );
  if (candidates.length === 1) return candidates[0];
  return null; // none or ambiguous — leave untouched
}

async function run() {
  const banks = await BankDetail.find();
  console.log(`Found ${banks.length} bank account(s).`);

  const allTxs = await BankTransaction.find({ paymentMethod: "bank-transfer", status: { $in: LIVE_TX_STATUSES } });
  const allExpenses = await Expense.find({ paymentMethod: "bank-transfer" });
  const allPlatformExpenses = await PlatformExpense.find({ paymentMethod: "bank-transfer", status: "paid" });
  const gyms = await Gym.find({ "subscriptionBillingHistory.0": { $exists: true } });

  const matchReport = { matched: 0, ambiguousOrUnmatched: 0 };
  const dirtyTxIds = new Set();
  const dirtyExpenseIds = new Set();
  const dirtyPlatformExpenseIds = new Set();
  const dirtyGymIds = new Set();

  for (const bank of banks) {
    const movements = [];

    for (const tx of allTxs) {
      let bankId = tx.bankDetail ? String(tx.bankDetail) : null;
      if (!bankId) {
        const matched = matchLegacyBank(tx, banks);
        if (matched) {
          bankId = String(matched._id);
          matchReport.matched += 1;
        } else if (tx.bankName) {
          matchReport.ambiguousOrUnmatched += 1;
        }
      }
      if (bankId === String(bank._id)) {
        movements.push({
          kind: "bank-transaction",
          source: tx,
          date: tx.transactionDate || tx.createdAt,
          signedAmount: signedAmountForTx(tx),
          apply: (amount) => {
            tx.bankDetail = bank._id;
            tx.balanceMovement = amount;
            tx.appliedToBalance = true;
            dirtyTxIds.add(tx._id.toString());
          }
        });
      }
    }

    for (const expense of allExpenses) {
      if (expense.bankDetail && String(expense.bankDetail) === String(bank._id)) {
        movements.push({
          kind: "expense",
          source: expense,
          date: expense.expenseDate || expense.createdAt,
          signedAmount: signedAmountForExpense(expense),
          apply: (amount) => {
            expense.balanceMovement = amount;
            expense.appliedToBalance = true;
            dirtyExpenseIds.add(expense._id.toString());
          }
        });
      }
    }

    for (const entry of allPlatformExpenses) {
      if (entry.bankDetail && String(entry.bankDetail) === String(bank._id)) {
        movements.push({
          kind: "platform-expense",
          source: entry,
          date: entry.entryDate || entry.createdAt,
          signedAmount: signedAmountForPlatformExpense(entry),
          apply: (amount) => {
            entry.balanceMovement = amount;
            entry.appliedToBalance = true;
            dirtyPlatformExpenseIds.add(entry._id.toString());
          }
        });
      }
    }

    for (const gym of gyms) {
      for (const entry of gym.subscriptionBillingHistory) {
        if (entry.bankDetail && String(entry.bankDetail) === String(bank._id)) {
          movements.push({
            kind: "billing-history",
            source: entry,
            date: entry.date,
            signedAmount: Number(entry.amount || 0),
            apply: (amount) => {
              entry.balanceMovement = amount;
              entry.appliedToBalance = true;
              dirtyGymIds.add(gym._id.toString());
            }
          });
        }
      }
    }

    movements.sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = Number(bank.openingBalance || 0);
    for (const movement of movements) {
      running += movement.signedAmount;
      movement.apply(movement.signedAmount);
    }

    console.log(
      `${bank.bankName} (${bank.accountNumber}): opening ${bank.openingBalance} -> ` +
        `${running} across ${movements.length} movement(s)` +
        (bank.currentBalance !== running ? ` [was ${bank.currentBalance}]` : " [unchanged]")
    );
    bank.currentBalance = running;
  }

  console.log(
    `\nLegacy match report: ${matchReport.matched} matched by name+account, ` +
      `${matchReport.ambiguousOrUnmatched} ambiguous/unmatched (left untouched).`
  );

  if (DRY_RUN) {
    console.log("\nDry run — no changes written.");
    return;
  }

  for (const bank of banks) await bank.save();
  for (const tx of allTxs) if (dirtyTxIds.has(tx._id.toString())) await tx.save();
  for (const expense of allExpenses) if (dirtyExpenseIds.has(expense._id.toString())) await expense.save();
  for (const entry of allPlatformExpenses) if (dirtyPlatformExpenseIds.has(entry._id.toString())) await entry.save();
  for (const gym of gyms) if (dirtyGymIds.has(gym._id.toString())) await gym.save();

  console.log("\nBalances recomputed and saved.");
}

if (require.main === module) {
  mongoose
    .connect(process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/fitnesshub")
    .then(async () => {
      console.log(`Connected to MongoDB${DRY_RUN ? " (dry run)" : ""}\n`);
      await run();
      await mongoose.disconnect();
    })
    .catch((err) => {
      console.error("Failed:", err.message);
      process.exit(1);
    });
}

module.exports = { run };
