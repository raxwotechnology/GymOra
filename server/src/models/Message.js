const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true },
    coachName: { type: String, required: true, trim: true },
    memberName: { type: String, required: true, trim: true },
    coachUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    memberUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    from: { type: String, required: true, trim: true },
    avatar: { type: String, required: true, trim: true },
    senderRole: { type: String, enum: ["coach", "member", "owner"], default: "member" },
    senderUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    recipientRole: { type: String, enum: ["coach", "member", "owner"], default: "coach" },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    text: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    unread: { type: Boolean, default: false },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
