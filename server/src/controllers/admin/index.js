const {
  createGym, updateGym, uploadGymLogo, suspendGym, reactivateGym,
  resetOwnerPassword, getGymDetails, listGymOwners, addGymOwner,
  removeGymOwner, exportGymsExcel, sendBillingEmail, sendBillingSms, recordGymPayment
} = require("./gymController");

const {
  listSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan,
  deleteSubscriptionPlan, assignGymSubscription, extendGymTrial, sendTrialReminder
} = require("./subscriptionController");

const {
  listBankDetails, createBankDetail, updateBankDetail, deleteBankDetail,
  listCheques, createCheque, updateCheque, deleteCheque,
  listPlatformExpenses, createPlatformExpense, updatePlatformExpense, deletePlatformExpense,
  listBankTransactions, createBankTransaction, updateBankTransaction, deleteBankTransaction
} = require("./bankingController");

const {
  listSmsLogs, createSmsLog, deleteSmsLog,
  listEmailLogs, createEmailLog, deleteEmailLog,
  getSystemSettings, updateSystemSettings, uploadSystemLogo, uploadSystemHero,
  testSmtpConnection
} = require("./platformController");

const { backupGymData, backupPlatformData } = require("./backupController");
const { generateAiSummary } = require("./aiSummaryController");

module.exports = {
  createGym, updateGym, uploadGymLogo, suspendGym, reactivateGym,
  resetOwnerPassword, getGymDetails, listGymOwners, addGymOwner,
  removeGymOwner, exportGymsExcel, recordGymPayment,
  listSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan,
  deleteSubscriptionPlan, assignGymSubscription, extendGymTrial, sendTrialReminder,
  listBankDetails, createBankDetail, updateBankDetail, deleteBankDetail,
  listCheques, createCheque, updateCheque, deleteCheque,
  listPlatformExpenses, createPlatformExpense, updatePlatformExpense, deletePlatformExpense,
  listBankTransactions, createBankTransaction, updateBankTransaction, deleteBankTransaction,
  listSmsLogs, createSmsLog, deleteSmsLog,
  listEmailLogs, createEmailLog, deleteEmailLog,
  getSystemSettings, updateSystemSettings, uploadSystemLogo, uploadSystemHero,
  testSmtpConnection,
  backupGymData, backupPlatformData,
  sendBillingEmail, sendBillingSms,
  generateAiSummary
};
