const mongoose = require("mongoose");

const coachSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    coachCode: { type: String, trim: true, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    members: { type: Number, required: true, min: 0, default: 0 },

    status: { type: String, required: true, enum: ["active", "inactive"], default: "active" },
    email: { type: String, required: true, trim: true, lowercase: true },
    certifications: { type: String, trim: true, default: "" },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    nationalId: { type: String, trim: true, default: "" },
    employeeCode: { type: String, trim: true, default: "" },
    hireDate: { type: Date, default: null },
    employmentType: { type: String, trim: true, default: "" },
    salaryModel: { type: String, trim: true, default: "" },
    baseSalary: { type: Number, default: 0, min: 0 },
    shiftSchedule: { type: String, trim: true, default: "" },
    specializations: { type: [String], default: [] },
    yearsOfExperience: { type: Number, min: 0, default: null },
    languages: { type: [String], default: [] },
    certificationExpiryDates: { type: [String], default: [] },
    availableHours: { type: String, trim: true, default: "" },
    maxClientCapacity: { type: Number, min: 0, default: null },
    performanceNotes: { type: String, trim: true, default: "" },
    bankPaymentDetails: { type: String, trim: true, default: "" },
    emergencyContact: { type: String, trim: true, default: "" },
    documents: { type: [String], default: [] },
    joinedAt: { type: Date, required: true },
    avatar: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coach", coachSchema);
