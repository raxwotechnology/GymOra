const mongoose = require("mongoose");

const bankDetailSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", default: null },
    bankName: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    branchCode: { type: String, trim: true, default: "" },
    swiftCode: { type: String, trim: true, default: "" },
    currency: { type: String, trim: true, default: "LKR" },
    isDefault: { type: Boolean, default: false },
    accountType: { type: String, enum: ["savings", "current", "fixed-deposit", ""], default: "" },
    iban: { type: String, trim: true, default: "" },
    bankAddress: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

bankDetailSchema.index({ gym: 1, isDefault: 1 });

module.exports = mongoose.model("BankDetail", bankDetailSchema);
