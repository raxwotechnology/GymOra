const mongoose = require("mongoose");

const payherePaymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "LKR" },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled", "chargedback"],
      default: "pending"
    },
    payherePaymentId: { type: String, default: "" },
    // Snapshot of intent at creation time — webhook uses this, never the IPN body
    applyPayload: { type: mongoose.Schema.Types.Mixed },
    processedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PayherePayment", payherePaymentSchema);
