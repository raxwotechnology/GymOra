const mongoose = require("mongoose");

const membershipPlanSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    name: { type: String, required: true, trim: true },
    durationMonths: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true, min: 0 },
    features: { type: [String], default: [] },
    color: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    maxMembers: { type: Number, default: 0 },
    accessHours: { type: String, default: "" },
    sessionsPerWeek: { type: Number, default: 0 },
    trialDays: { type: Number, default: 0 },
    setupFee: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MembershipPlan", membershipPlanSchema);
