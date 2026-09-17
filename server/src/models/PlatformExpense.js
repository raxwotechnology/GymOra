const mongoose = require("mongoose");

const platformExpenseSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["income", "expense"],
      default: "expense"
    },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", default: null },
    gymName: { type: String, trim: true, default: "" },
    paymentMethod: { type: String, trim: true, default: "cash" },
    bankDetail: { type: mongoose.Schema.Types.ObjectId, ref: "BankDetail", default: null },
    referenceNumber: { type: String, trim: true, default: "" },
    appliedToBalance: { type: Boolean, default: false },
    balanceMovement: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ["paid", "pending"],
      default: "paid"
    },
    entryDate: { type: Date, required: true },
    notes: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlatformExpense", platformExpenseSchema);
