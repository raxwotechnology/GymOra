const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    billingCycle: {
      type: String,
      required: true,
      enum: ["monthly", "quarterly", "annual"],
      default: "monthly"
    },
    memberLimit: { type: Number, default: null },
    coachLimit: { type: Number, default: null },
    features: { type: [String], default: [] },
    color: { type: String, default: "#2563eb" },
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true, default: "" },
    trialDays: { type: Number, default: 0, min: 0 },
    storageGb: { type: Number, default: 0, min: 0 },
    supportLevel: { type: String, enum: ["basic", "standard", "priority", "dedicated"], default: "basic" },
    customBranding: { type: Boolean, default: false },
    analyticsAccess: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    maxLocations: { type: Number, default: 1, min: 1 },
    smsCredits: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
