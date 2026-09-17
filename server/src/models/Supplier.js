const mongoose = require("mongoose");

const supplierProductSchema = new mongoose.Schema(
  {
    supplementId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplement", default: null },
    supplementName: { type: String, trim: true, default: "" },
    supplierPrice: { type: Number, min: 0, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: "" }
  },
  { _id: true }
);

const restockPaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, min: 0, default: 0 },
    paidAt: { type: Date, default: Date.now },
    method: { type: String, enum: ["cash", "card", "bank-transfer", "cheque", "other"], default: "cash" },
    bankDetail: { type: mongoose.Schema.Types.ObjectId, ref: "BankDetail", default: null },
    balanceMovement: { type: Number, default: 0 },
    appliedToBalance: { type: Boolean, default: false },
    reference: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" }
  },
  { _id: true }
);

const restockLogSchema = new mongoose.Schema(
  {
    supplementId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplement", default: null },
    supplementName: { type: String, trim: true, default: "" },
    qty: { type: Number, min: 0, default: 0 },
    unitCost: { type: Number, min: 0, default: 0 },
    totalCost: { type: Number, min: 0, default: 0 },
    orderedAt: { type: Date, default: Date.now },
    receivedAt: { type: Date, default: null },
    status: { type: String, enum: ["ordered", "received", "cancelled"], default: "ordered" },
    invoiceNumber: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    paymentType: { type: String, enum: ["cash", "credit"], default: "cash" },
    amountPaid: { type: Number, min: 0, default: 0 },
    dueDate: { type: Date, default: null },
    paymentStatus: { type: String, enum: ["unpaid", "partial", "paid"], default: "paid" },
    payments: { type: [restockPaymentSchema], default: [] }
  },
  { _id: true, timestamps: true }
);

const supplierSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    name: { type: String, required: true, trim: true },
    contactName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    paymentTerms: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    ratingNotes: { type: String, trim: true, default: "" },
    products: { type: [supplierProductSchema], default: [] },
    restockLog: { type: [restockLogSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supplier", supplierSchema);
