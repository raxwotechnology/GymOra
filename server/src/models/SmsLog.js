const mongoose = require("mongoose");

const smsLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["trial-reminder", "subscription-reminder", "payment-reminder", "reset-password", "welcome", "custom", "other"],
      default: "other"
    },
    status: { type: String, enum: ["sent", "failed", "pending"], default: "pending" },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", default: null },
    gymName: { type: String, default: "" },
    recipientName: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
    provider: { type: String, default: "" },
    sentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SmsLog", smsLogSchema);
