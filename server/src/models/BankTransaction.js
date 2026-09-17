const mongoose = require("mongoose");

const bankTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "" },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", default: null },
    gymName: { type: String, default: "" },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank-transfer", "cheque", "card", "other"],
      default: "bank-transfer"
    },
    referenceNumber: { type: String, default: "" },
    bankDetail: { type: mongoose.Schema.Types.ObjectId, ref: "BankDetail", default: null },
    bankName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    transactionDate: { type: Date, required: true },
    status: { type: String, enum: ["completed", "pending", "failed", "reversed"], default: "completed" },
    notes: { type: String, default: "" },
    recordedBy: { type: String, default: "super-admin" },
    appliedToBalance: { type: Boolean, default: false },
    balanceMovement: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankTransaction", bankTransactionSchema);
