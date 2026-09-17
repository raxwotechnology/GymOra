const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  createGym,
  updateGym,
  uploadGymLogo,
  suspendGym,
  reactivateGym,
  resetOwnerPassword,
  getGymDetails,
  listGymOwners,
  addGymOwner,
  removeGymOwner,
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  assignGymSubscription,
  recordGymPayment,
  extendGymTrial,
  sendTrialReminder,
  listBankDetails,
  createBankDetail,
  updateBankDetail,
  deleteBankDetail,
  listCheques,
  createCheque,
  updateCheque,
  deleteCheque,
  listPlatformExpenses,
  createPlatformExpense,
  updatePlatformExpense,
  deletePlatformExpense,
  exportGymsExcel,
  backupGymData,
  backupPlatformData,
  listBankTransactions,
  createBankTransaction,
  updateBankTransaction,
  deleteBankTransaction,
  listSmsLogs,
  createSmsLog,
  deleteSmsLog,
  listEmailLogs,
  createEmailLog,
  deleteEmailLog,
  getSystemSettings,
  updateSystemSettings,
  uploadSystemLogo,
  uploadSystemHero,
  testSmtpConnection,
  sendBillingEmail,
  sendBillingSms,
  generateAiSummary
} = require("../controllers/admin");
const { allowRoles, requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  createGymSchema, updateGymSchema, addGymOwnerSchema,
  createSubscriptionPlanSchema, assignGymSubscriptionSchema, extendGymTrialSchema,
  sendBillingEmailSchema, sendBillingSmsSchema,
  createBankDetailSchema, createBankTransactionSchema,
} = require("../schemas/adminSchemas");

const router = express.Router();
router.use(requireAuth, allowRoles("super-admin"));

// Gym logo upload setup
const gymLogoDir = path.join(__dirname, "..", "..", "uploads", "gyms");
fs.mkdirSync(gymLogoDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, gymLogoDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `gym-${req.params.id}-${Date.now()}${extension}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (String(file.mimetype || "").startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  }
});

// System assets upload (logo, hero image)
const systemUploadDir = path.join(__dirname, "..", "..", "uploads", "system");
fs.mkdirSync(systemUploadDir, { recursive: true });

const systemStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, systemUploadDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `system-${Date.now()}${extension}`);
  }
});

const systemUpload = multer({
  storage: systemStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (String(file.mimetype || "").startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  }
});

// ─── Gyms ────────────────────────────────────────────────────────────────────
router.post("/gyms", validate(createGymSchema), createGym);
router.get("/gyms/export/excel", exportGymsExcel);
router.get("/gyms/:id", getGymDetails);
router.patch("/gyms/:id", validate(updateGymSchema), updateGym);
router.post("/gyms/:id/logo", logoUpload.single("logo"), uploadGymLogo);
router.patch("/gyms/:id/suspend", suspendGym);
router.patch("/gyms/:id/reactivate", reactivateGym);
router.post("/gyms/:id/reset-owner-password", resetOwnerPassword);
router.get("/gyms/:id/backup", backupGymData);
router.patch("/gyms/:id/subscription", validate(assignGymSubscriptionSchema), assignGymSubscription);
router.patch("/gyms/:id/trial/extend", validate(extendGymTrialSchema), extendGymTrial);
router.post("/gyms/:id/trial/remind", sendTrialReminder);
router.post("/gyms/:id/billing/email", validate(sendBillingEmailSchema), sendBillingEmail);
router.post("/gyms/:id/billing/sms", validate(sendBillingSmsSchema), sendBillingSms);
router.post("/gyms/:id/billing/record-payment", recordGymPayment);

// ─── Gym Owners ──────────────────────────────────────────────────────────────
router.get("/gyms/:id/owners", listGymOwners);
router.post("/gyms/:id/owners", validate(addGymOwnerSchema), addGymOwner);
router.delete("/gyms/:id/owners/:userId", removeGymOwner);

// ─── Subscription Plans ──────────────────────────────────────────────────────
router.get("/subscription-plans", listSubscriptionPlans);
router.post("/subscription-plans", validate(createSubscriptionPlanSchema), createSubscriptionPlan);
router.patch("/subscription-plans/:planId", updateSubscriptionPlan);
router.delete("/subscription-plans/:planId", deleteSubscriptionPlan);

// ─── Platform Backup ─────────────────────────────────────────────────────────
router.get("/backup/platform", backupPlatformData);

// ─── Bank Details ────────────────────────────────────────────────────────────
router.get("/bank-details", listBankDetails);
router.post("/bank-details", validate(createBankDetailSchema), createBankDetail);
router.patch("/bank-details/:detailId", updateBankDetail);
router.delete("/bank-details/:detailId", deleteBankDetail);

// ─── Cheques ─────────────────────────────────────────────────────────────────
router.get("/cheques", listCheques);
router.post("/cheques", createCheque);
router.patch("/cheques/:chequeId", updateCheque);
router.delete("/cheques/:chequeId", deleteCheque);

// ─── Platform Expenses ───────────────────────────────────────────────────────
router.get("/platform-expenses", listPlatformExpenses);
router.post("/platform-expenses", createPlatformExpense);
router.patch("/platform-expenses/:expenseId", updatePlatformExpense);
router.delete("/platform-expenses/:expenseId", deletePlatformExpense);

// ─── Bank Transactions ────────────────────────────────────────────────────────
router.get("/bank-transactions", listBankTransactions);
router.post("/bank-transactions", validate(createBankTransactionSchema), createBankTransaction);
router.patch("/bank-transactions/:txId", updateBankTransaction);
router.delete("/bank-transactions/:txId", deleteBankTransaction);

// ─── SMS Logs ─────────────────────────────────────────────────────────────────
router.get("/sms-logs", listSmsLogs);
router.post("/sms-logs", createSmsLog);
router.delete("/sms-logs/:logId", deleteSmsLog);

// ─── Email Logs ───────────────────────────────────────────────────────────────
router.get("/email-logs", listEmailLogs);
router.post("/email-logs", createEmailLog);
router.delete("/email-logs/:logId", deleteEmailLog);

// ─── System Settings ─────────────────────────────────────────────────────────
router.get("/system-settings", getSystemSettings);
router.patch("/system-settings", updateSystemSettings);
router.post("/system-settings/logo", systemUpload.single("logo"), uploadSystemLogo);
router.post("/system-settings/hero", systemUpload.single("hero"), uploadSystemHero);
router.post("/system-settings/test-smtp", testSmtpConnection);

// ─── AI Summary ───────────────────────────────────────────────────────────────
router.post("/ai-summary", generateAiSummary);

module.exports = router;
