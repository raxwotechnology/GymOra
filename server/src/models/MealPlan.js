const mongoose = require("mongoose");

const mealItemSchema = new mongoose.Schema(
  {
    time: { type: String, trim: true, default: "" },
    name: { type: String, trim: true, default: "" },
    foods: { type: [String], default: [] }
  },
  { _id: false }
);

const mealPlanSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    name: { type: String, required: true, trim: true },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    goal: { type: String, required: true, trim: true },
    meals: { type: [mealItemSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MealPlan", mealPlanSchema);
