const mongoose = require("mongoose");

const salaryAdvanceSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    coach: { type: mongoose.Schema.Types.ObjectId, ref: "Coach", required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    reason: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["pending", "approved", "deducted"], default: "pending" },
    note: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalaryAdvance", salaryAdvanceSchema);
