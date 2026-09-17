const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, default: "" },
    type: {
      type: String,
      enum: ["trial-reminder", "subscription-reminder", "payment-reminder", "reset-password", "welcome", "invite", "custom", "other"],
      default: "other"
    },
    status: { type: String, enum: ["sent", "failed", "pending"], default: "pending" },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", default: null },
    gymName: { type: String, default: "" },
    recipientName: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
    sentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailLog", emailLogSchema);
