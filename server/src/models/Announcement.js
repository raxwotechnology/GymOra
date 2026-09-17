const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    priority: { type: String, required: true, enum: ["info", "warning", "success"] },
    audience: { type: String, enum: ["all", "members", "coaches", "specific"], default: "all" },
    targetMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
    targetCoachIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coach" }],
    expiresAt: { type: Date, default: null },
    pinned: { type: Boolean, default: false },
    imageUrl: { type: String, trim: true, default: "" },
    ctaLabel: { type: String, trim: true, default: "" },
    ctaUrl: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
