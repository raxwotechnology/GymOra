const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
    coachName: { type: String, required: true, trim: true },
    member: { type: String, required: true, trim: true },
    avatar: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    sessionDate: { type: Date, required: true },
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date, default: null },
    status: { type: String, enum: ["checked-in", "checked-out"], default: "checked-in" },
    source: { type: String, enum: ["manual", "fingerprint-import"], default: "manual" },
    deviceUserId: { type: String, trim: true, default: "" },
    sourceFileName: { type: String, trim: true, default: "" },
    sessionNumber: { type: Number, default: 1 },
    breakStart: { type: Date, default: null },
    breakEnd: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
