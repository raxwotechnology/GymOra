const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["super-admin", "owner", "coach", "member"]
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "pending", "rejected", "suspended"],
      default: "active"
    },
    phone: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    profileImageUrl: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: ["", "male", "female", "other", "prefer-not-to-say"], default: "" },
    emergencyContactName: { type: String, trim: true, default: "" },
    emergencyContactPhone: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    requestedGoal: { type: String, trim: true, default: "" },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", default: null },
    coachProfile: { type: mongoose.Schema.Types.ObjectId, ref: "Coach", default: null },
    memberProfile: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    passwordUpdatedAt: { type: Date, default: null },
    passwordResetOtpHash: { type: String, default: "" },
    passwordResetOtpExpiresAt: { type: Date, default: null },
    passwordResetOtpRequestedAt: { type: Date, default: null },
    readNotificationIds: { type: [String], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
