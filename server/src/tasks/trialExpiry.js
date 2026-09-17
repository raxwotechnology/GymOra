const Gym = require("../models/Gym");
const { sendSms } = require("../utils/sms");

async function runTrialExpiryTask() {
  try {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringSoon = await Gym.find({
      status: "trial",
      trialEndsAt: { $gt: now, $lte: in3Days },
    }).select("name trialEndsAt phone ownerName");

    if (expiringSoon.length > 0) {
      console.log(`[task:trialExpiry] ${expiringSoon.length} gym(s) trial ending within 3 days:`);
      for (const gym of expiringSoon) {
        console.log(`  - ${gym.name} (expires: ${gym.trialEndsAt?.toDateString()})`);
        if (gym.phone) {
          await sendSms({
            to: gym.phone,
            message: `Reminder: Your FitnessHub trial for "${gym.name}" expires in 3 days. Upgrade now at ${process.env.CLIENT_URL}.`,
            type: "trial-reminder",
            gymId: gym._id,
            gymName: gym.name,
            recipientName: gym.ownerName
          });
        }
      }
    }

    // Suspend gyms whose trial has already ended
    const result = await Gym.updateMany(
      { status: "trial", trialEndsAt: { $lt: now } },
      { $set: { status: "suspended" } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[task:trialExpiry] Suspended ${result.modifiedCount} gym(s) with expired trials`);
    }
  } catch (err) {
    console.error("[task:trialExpiry] Failed:", err.message);
  }
}

module.exports = { runTrialExpiryTask };
