const mongoose = require("mongoose");

const supplementSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    brand: { type: String, trim: true, default: "" },
    category: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true, default: "" },
    stockQty: { type: Number, required: true, min: 0, default: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    buyingPrice: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["in-stock", "low-stock", "out-of-stock"], default: "in-stock" },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    supplierName: { type: String, trim: true, default: "" },
    sqn: { type: String, trim: true, default: "" },
    grn: { type: String, trim: true, default: "" },
    supplierPriceNote: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supplement", supplementSchema);
