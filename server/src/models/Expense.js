const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    type: { type: String, enum: ["income", "expense"], default: "expense" },
    sourceType: { type: String, trim: true, default: "manual" },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["paid", "pending"], default: "paid" },
    vendor: { type: String, trim: true, default: "" },
    contactName: { type: String, trim: true, default: "" },
    paymentMethod: { type: String, trim: true, default: "cash" },
    bankDetail: { type: mongoose.Schema.Types.ObjectId, ref: "BankDetail", default: null },
    referenceNumber: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    expenseDate: { type: Date, required: true },
    appliedToBalance: { type: Boolean, default: false },
    balanceMovement: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
