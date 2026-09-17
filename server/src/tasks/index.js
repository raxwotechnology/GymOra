const cron = require("node-cron");
const { runMemberExpiryTask } = require("./memberExpiry");
const { runTrialExpiryTask } = require("./trialExpiry");

function registerTasks() {
  // Run daily at midnight
  cron.schedule("0 0 * * *", async () => {
    await runMemberExpiryTask();
    await runTrialExpiryTask();
  });

  console.log("[tasks] Scheduled: memberExpiry, trialExpiry (daily at midnight)");
}

module.exports = { registerTasks };
