const mongoose = require("mongoose");

const serviceHistorySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    type: { type: String, enum: ["service", "repair", "inspection"], required: true },
    description: { type: String, trim: true, default: "" },
    cost: { type: Number, default: 0, min: 0 },
    technician: { type: String, trim: true, default: "" },
    linkedExpenseId: { type: mongoose.Schema.Types.ObjectId, ref: "Expense", default: null }
  },
  { _id: true }
);

const breakageHistorySchema = new mongoose.Schema(
  {
    reportedAt: { type: Date, required: true },
    description: { type: String, trim: true, default: "" },
    reportedBy: { type: String, trim: true, default: "" },
    resolvedAt: { type: Date, default: null },
    resolutionNotes: { type: String, trim: true, default: "" }
  },
  { _id: true }
);

const equipmentSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: ["good", "maintenance", "replace"] },
    lastService: { type: Date, required: true },
    nextServiceDate: { type: Date, required: true },
    purchaseDate: { type: Date, default: null },
    purchasePrice: { type: Number, default: 0, min: 0 },
    vendor: { type: String, trim: true, default: "" },
    serialNumber: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    warrantyExpiresAt: { type: Date, default: null },
    serviceHistory: { type: [serviceHistorySchema], default: [] },
    breakageHistory: { type: [breakageHistorySchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Equipment", equipmentSchema);
