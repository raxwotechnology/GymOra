const mongoose = require("mongoose");

const chequePaymentSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym" },
    gymName: { type: String, trim: true, default: "" },
    chequeNumber: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    issuedDate: { type: Date, required: true },
    depositedDate: { type: Date },
    clearedDate: { type: Date },
    status: {
      type: String,
      required: true,
      enum: ["pending", "deposited", "cleared", "bounced"],
      default: "pending"
    },
    notes: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChequePayment", chequePaymentSchema);
