const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    supplement: { type: mongoose.Schema.Types.ObjectId, ref: "Supplement", default: null },
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    memberName: { type: String, trim: true, default: "" },
    customerName: { type: String, required: true, trim: true },
    paymentMethod: { type: String, trim: true, default: "cash" },
    status: { type: String, enum: ["paid", "partial", "refunded"], default: "paid" },
    items: { type: [saleItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    returnAmount: { type: Number, required: true, min: 0, default: 0 },
    notes: { type: String, trim: true, default: "" },
    soldAt: { type: Date, required: true },
    bankDetail: { type: mongoose.Schema.Types.ObjectId, ref: "BankDetail", default: null },
    appliedToBalance: { type: Boolean, default: false },
    balanceMovement: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema);
