const mongoose = require("mongoose");

const revenuePointSchema = new mongoose.Schema(
  {
    month: { type: String, required: true },
    value: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const billingHistoryEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, default: "" },
    method: { type: String, default: "manual" },
    bankDetail: { type: mongoose.Schema.Types.ObjectId, ref: "BankDetail", default: null },
    balanceMovement: { type: Number, default: 0 },
    appliedToBalance: { type: Boolean, default: false }
  },
  { _id: true }
);

const gymSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },
    location: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    facebookUrl: { type: String, trim: true, default: "" },
    googleMapsUrl: { type: String, trim: true, default: "" },
    brNumber: { type: String, trim: true, default: "" },
    logoUrl: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    status: {
      type: String,
      required: true,
      enum: ["active", "trial", "suspended"],
      default: "trial"
    },
    plan: { type: String, required: true, enum: ["Starter", "Pro", "Enterprise"] },
    joinedAt: { type: Date, required: true },
    trialEndsAt: { type: Date },
    subscriptionPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan" },
    subscriptionStartedAt: { type: Date },
    subscriptionEndsAt: { type: Date },
    subscriptionBillingHistory: { type: [billingHistoryEntrySchema], default: [] },
    revenueHistory: { type: [revenuePointSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Gym", gymSchema);
