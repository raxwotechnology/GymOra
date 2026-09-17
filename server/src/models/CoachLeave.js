const mongoose = require("mongoose");

const coachLeaveSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    coach: { type: mongoose.Schema.Types.ObjectId, ref: "Coach", required: true },
    coachName: { type: String, required: true, trim: true },
    leaveType: {
      type: String,
      enum: ["sick", "vacation", "personal", "unpaid", "emergency"],
      required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, default: 1 },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    approvedBy: { type: String, trim: true, default: "" },
    approvedAt: { type: Date, default: null },
    ownerNotes: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

coachLeaveSchema.pre("save", function (next) {
  if (this.startDate && this.endDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    this.totalDays = Math.max(1, Math.round((this.endDate - this.startDate) / msPerDay) + 1);
  }
  next();
});

module.exports = mongoose.model("CoachLeave", coachLeaveSchema);
