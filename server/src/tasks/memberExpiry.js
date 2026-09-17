const Member = require("../models/Member");
const { sendSms } = require("../utils/sms");

async function runMemberExpiryTask() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredMembers = await Member.find({
      planExpiresAt: { $lt: today }, status: "active"
    }).select("name phone gym");

    if (expiredMembers.length > 0) {
      await Member.updateMany(
        { _id: { $in: expiredMembers.map((m) => m._id) } },
        { $set: { status: "inactive" } }
      );
      console.log(`[task:memberExpiry] Marked ${expiredMembers.length} member(s) as inactive`);

      for (const member of expiredMembers) {
        if (member.phone) {
          await sendSms({
            to: member.phone,
            message: `Hi ${member.name}, your membership at your gym has expired. Please contact your gym to renew.`,
            type: "subscription-reminder",
            gymId: member.gym,
            recipientName: member.name
          });
        }
      }
    }
  } catch (err) {
    console.error("[task:memberExpiry] Failed:", err.message);
  }
}

module.exports = { runMemberExpiryTask };
