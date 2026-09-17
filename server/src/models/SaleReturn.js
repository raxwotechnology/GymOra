const mongoose = require("mongoose");

const returnItemSchema = new mongoose.Schema(
  {
    supplement: { type: mongoose.Schema.Types.ObjectId, ref: "Supplement", default: null },
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const saleReturnSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
    customerName: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    items: { type: [returnItemSchema], default: [] },
    processedAt: { type: Date, required: true },
    bankDetail: { type: mongoose.Schema.Types.ObjectId, ref: "BankDetail", default: null },
    appliedToBalance: { type: Boolean, default: false },
    balanceMovement: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SaleReturn", saleReturnSchema);
