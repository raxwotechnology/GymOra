const mongoose = require("mongoose");

const planExerciseSchema = new mongoose.Schema(
  {
    day: { type: String, trim: true, default: "" },
    name: { type: String, trim: true, default: "" },
    sets: { type: Number, min: 0, default: null },
    reps: { type: String, trim: true, default: "" },
    rest: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const workoutPlanSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    name: { type: String, required: true, trim: true },
    level: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    days: { type: Number, required: true, min: 1 },
    category: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    exercises: { type: [planExerciseSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkoutPlan", workoutPlanSchema);
