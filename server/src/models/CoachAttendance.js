const mongoose = require("mongoose");

const coachAttendanceSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    coach: { type: mongoose.Schema.Types.ObjectId, ref: "Coach", required: true },
    coachName: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date, default: null },
    breakStart: { type: Date, default: null },
    breakEnd: { type: Date, default: null },
    totalWorkMinutes: { type: Number, default: 0 },
    breakMinutes: { type: Number, default: 0 },
    status: { type: String, enum: ["clocked-in", "on-break", "clocked-out"], default: "clocked-in" }
  },
  { timestamps: true }
);

coachAttendanceSchema.pre("save", function (next) {
  if (this.clockOut && this.clockIn) {
    const totalMs = new Date(this.clockOut).getTime() - new Date(this.clockIn).getTime();
    const breakMinutes = Math.max(0, this.breakMinutes || 0);
    this.totalWorkMinutes = Math.max(0, Math.round(totalMs / 60000) - breakMinutes);
  }
  next();
});

module.exports = mongoose.model("CoachAttendance", coachAttendanceSchema);
