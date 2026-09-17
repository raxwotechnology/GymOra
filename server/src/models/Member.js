const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema(
  {
    name: String,
    sets: Number,
    reps: String,
    rest: String,
    done: { type: Boolean, default: false },
    loggedWeight: { type: String, trim: true, default: "" },
    completionNotes: { type: String, trim: true, default: "" },
    completedAt: { type: Date, default: null }
  },
  { _id: false }
);

const mealItemSchema = new mongoose.Schema(
  {
    time: String,
    name: String,
    foods: [String],
    cals: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  { _id: false }
);

const memberSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    memberCode: { type: String, trim: true, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    coach: { type: String, required: true, trim: true },
    plan: { type: String, required: true, trim: true },
    subscriptionDurationMonths: { type: Number, required: true, min: 1, default: 1 },
    status: { type: String, required: true, enum: ["active", "inactive"], default: "active" },
    joinedAt: { type: Date, required: true },
    planStartedAt: { type: Date, default: null },
    checkIns: { type: Number, required: true, min: 0, default: 0 },
    goal: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    medicalNotes: { type: String, trim: true, default: "" },
    fitnessLevel: { type: String, trim: true, default: "" },
    preferredWorkoutTime: { type: String, trim: true, default: "" },
    heightCm: { type: Number, min: 0, default: null },
    emergencyContact: { type: String, trim: true, default: "" },
    emergencyContactRelationship: { type: String, trim: true, default: "" },
    currentWeightKg: { type: Number, min: 0, default: null },
    targetWeightKg: { type: Number, min: 0, default: null },
    targetBodyFat: { type: Number, min: 0, max: 100, default: null },
    bodyFatPercentage: { type: Number, min: 0, max: 100, default: null },
    bmi: { type: Number, min: 0, default: null },
    waistToHipRatio: { type: Number, min: 0, default: null },
    personalNotes: { type: String, trim: true, default: "" },
    joinSource: { type: String, trim: true, default: "" },
    renewalReminderPreference: { type: String, trim: true, default: "" },
    attendanceNotes: { type: String, trim: true, default: "" },
    assignedLocker: { type: String, trim: true, default: "" },
    memberTag: { type: String, trim: true, default: "" },
    barcode: { type: String, trim: true, default: "" },
    progressPhotos: { type: [String], default: [] },
    supplementUsage: { type: String, trim: true, default: "" },
    membershipFreezeStatus: { type: String, trim: true, default: "" },
    goalTargetDate: { type: Date, default: null },
    bodyMeasurements: {
      chestCm: { type: Number, min: 0, default: null },
      waistCm: { type: Number, min: 0, default: null },
      armsCm: { type: Number, min: 0, default: null },
      thighsCm: { type: Number, min: 0, default: null }
    },
    planExpiresAt: { type: Date, default: null },
    paymentStatus: { type: String, enum: ["paid", "partial", "unpaid"], default: "unpaid" },
    amountPaid: { type: Number, min: 0, default: 0 },
    amountDue: { type: Number, min: 0, default: 0 },
    paymentMethod: { type: String, trim: true, default: "" },
    dietPlanName: { type: String, trim: true, default: "" },
    fingerprintDeviceUserId: { type: String, trim: true, default: "" },
    avatar: { type: String, required: true, trim: true },
    progress: { type: Number, required: true, min: 0, max: 100, default: 0 },
    myStats: {
      weight: [Number],
      bodyFat: [Number],
      labels: [String],
      benchPress: [Number],
      checkInsThisMonth: Number,
      streak: Number,
      totalCheckIns: Number,
      lastCheckInDate: { type: Date, default: null }
    },
    myWorkoutPlan: {
      name: String,
      week: Number,
      totalWeeks: Number,
      today: {
        day: String,
        exercises: [exerciseSchema]
      }
    },
    myMealPlan: {
      name: String,
      meals: [mealItemSchema]
    },
    workoutHistory: {
      type: [
        {
          date: { type: Date, default: Date.now },
          planName: { type: String, trim: true, default: "" },
          day: { type: String, trim: true, default: "" },
          exercises: [exerciseSchema]
        }
      ],
      default: []
    },
    paymentHistory: {
      type: [
        {
          date: { type: Date, default: Date.now },
          amount: { type: Number, default: 0 },
          method: { type: String, trim: true, default: "" },
          planName: { type: String, trim: true, default: "" },
          months: { type: Number, default: 1 },
          note: { type: String, trim: true, default: "" },
          chequeNumber: { type: String, trim: true, default: "" },
          bankName: { type: String, trim: true, default: "" },
          referenceNumber: { type: String, trim: true, default: "" }
        }
      ],
      default: []
    },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Member", memberSchema);
