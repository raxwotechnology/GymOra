const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  orderId:    { type: String, required: true, unique: true, index: true },
  ownerName:  { type: String, required: true },
  ownerEmail: { type: String, required: true, lowercase: true },
  gymName:    { type: String, required: true },
  location:   { type: String, required: true },
  phone:      { type: String, default: "" },
  planId:     { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan" },
  amount:     { type: Number, required: true },
  currency:   { type: String, default: "LKR" },
  status:     { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  credentials: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt:  { type: Date, default: Date.now, expires: 7200 }
});

module.exports = mongoose.model("PendingGymRegistration", schema);
