const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    gym:              { type: mongoose.Schema.Types.ObjectId, ref: "Gym",   required: true },
    coach:            { type: mongoose.Schema.Types.ObjectId, ref: "Coach", required: true },
    coachName:        { type: String, required: true, trim: true },
    month:            { type: String, required: true }, // "YYYY-MM"
    baseSalary:       { type: Number, required: true, min: 0 },
    hoursWorked:      { type: Number, default: 0, min: 0 },
    overtimeHours:    { type: Number, default: 0, min: 0 },
    overtimeRate:     { type: Number, default: 0, min: 0 }, // LKR per hour
    bonuses:          { type: Number, default: 0, min: 0 },
    bonusNote:        { type: String, trim: true, default: "" },
    advancesDeducted: { type: Number, default: 0, min: 0 },
    otherDeductions:  { type: Number, default: 0, min: 0 },
    deductionNote:    { type: String, trim: true, default: "" },
    grossPay:         { type: Number, default: 0 },
    netPay:           { type: Number, default: 0 },
    status:           { type: String, enum: ["draft", "approved", "paid"], default: "draft" },
    paymentMethod:    { type: String, trim: true, default: "" },
    paidAt:           { type: Date, default: null },
    notes:            { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

// Auto-compute grossPay and netPay before save
payrollSchema.pre("save", function (next) {
  this.grossPay = this.baseSalary + (this.overtimeHours * this.overtimeRate) + this.bonuses;
  this.netPay   = Math.max(0, this.grossPay - this.advancesDeducted - this.otherDeductions);
  next();
});

module.exports = mongoose.model("Payroll", payrollSchema);
