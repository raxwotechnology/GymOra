const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const {
  createCoach,
  deleteCoach,
  resetCoachPassword,
  updateCoach,
  createMember,
  deleteMember,
  resetMemberPassword,
  updateMember,
  updateMemberSubscription,
  approveMemberRequest,
  rejectMemberRequest,
  createAttendanceCheckIn,
  clockOutAttendance,
  importAttendanceExcel,
  listAttendance,
  listCoachAttendance,
  markCoachAttendance,
  startMemberBreak,
  endMemberBreak,
  serviceEquipment,
  createEquipment,
  updateEquipment,
  reportBreakage,
  resolveBreakage,
  createMembershipPlan,
  updateMembershipPlan,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  assignWorkoutPlanToMember,
  removeWorkoutPlanFromMember,
  createMessage,
  markMessagesRead,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  assignMealPlanToMember,
  removeMealPlanFromMember,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  createExpense,
  updateExpense,
  createSupplement,
  updateSupplement,
  createSale,
  createSaleReturn,
  clockInCoachAttendance,
  clockOutCoachAttendance,
  startCoachBreak,
  endCoachBreak,
  getMyCoachAttendance,
  getTodayCoachAttendance,
  listSalaryAdvances,
  createSalaryAdvance,
  updateSalaryAdvance,
  deleteSalaryAdvance,
  getMyAdvances,
  listPayroll,
  getMyPayroll,
  generateMonthlyPayroll,
  updatePayroll,
  approvePayroll,
  markPayrollPaid,
  deletePayroll,
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  addSupplierProduct,
  updateSupplierProduct,
  removeSupplierProduct,
  addRestockRecord,
  updateRestockRecord,
  deleteRestockRecord,
  recordRestockPayment,
  listCoachLeaves,
  createCoachLeave,
  updateCoachLeave,
  deleteCoachLeave,
  requestCoachLeave,
  getMyCoachLeaves,
  listOwnerBankDetails,
  createOwnerBankDetail,
  updateOwnerBankDetail,
  deleteOwnerBankDetail,
  listOwnerBankTransactions,
  createOwnerBankTransaction,
  updateOwnerBankTransaction,
  deleteOwnerBankTransaction
} = require("../controllers/owner");
const { allowRoles, requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { createMemberSchema, updateMemberSchema, updateMemberSubscriptionSchema } = require("../schemas/memberSchemas");
const { createCoachSchema, updateCoachSchema, createSalaryAdvanceSchema, requestCoachLeaveSchema, createCoachLeaveSchema } = require("../schemas/coachSchemas");
const { createSaleSchema, createSaleReturnSchema, createMessageSchema, markMessagesReadSchema, createExpenseSchema, createSupplementSchema } = require("../schemas/salesSchemas");
const { createBankDetailSchema, createBankTransactionSchema, generatePayrollSchema } = require("../schemas/financeSchemas");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const { getUploadDir } = require("../utils/storage");
const supplementUploadDir = getUploadDir("supplements");

const supplementStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, supplementUploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `${req.user._id}-${Date.now()}${extension}`);
  }
});

const supplementUpload = multer({
  storage: supplementStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (String(file.mimetype || "").startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  }
});

router.use(requireAuth);

router.post("/coaches", allowRoles("super-admin", "owner"), validate(createCoachSchema), createCoach);
router.patch("/coaches/:id", allowRoles("super-admin", "owner"), validate(updateCoachSchema), updateCoach);
router.delete("/coaches/:id", allowRoles("super-admin", "owner"), deleteCoach);
router.post("/coaches/:id/reset-password", allowRoles("super-admin", "owner"), resetCoachPassword);
router.get("/coaches/:id/salary-advances", allowRoles("super-admin", "owner"), listSalaryAdvances);
router.post("/coaches/:id/salary-advances", allowRoles("super-admin", "owner"), validate(createSalaryAdvanceSchema), createSalaryAdvance);
router.patch("/coaches/:id/salary-advances/:advId", allowRoles("super-admin", "owner"), updateSalaryAdvance);
router.delete("/coaches/:id/salary-advances/:advId", allowRoles("super-admin", "owner"), deleteSalaryAdvance);

// ── Payroll ────────────────────────────────────────────────────────────────
router.get("/payroll", allowRoles("super-admin", "owner"), listPayroll);
router.post("/payroll/generate", allowRoles("super-admin", "owner"), validate(generatePayrollSchema), generateMonthlyPayroll);
router.patch("/payroll/:id", allowRoles("super-admin", "owner"), updatePayroll);
router.patch("/payroll/:id/approve", allowRoles("super-admin", "owner"), approvePayroll);
router.patch("/payroll/:id/pay", allowRoles("super-admin", "owner"), markPayrollPaid);
router.delete("/payroll/:id", allowRoles("super-admin", "owner"), deletePayroll);

router.post("/members", allowRoles("super-admin", "owner", "coach"), validate(createMemberSchema), createMember);
router.patch("/members/:id", allowRoles("super-admin", "owner"), validate(updateMemberSchema), updateMember);
router.post("/members/:id/reset-password", allowRoles("super-admin", "owner"), resetMemberPassword);
router.patch("/members/:id/subscription", allowRoles("super-admin", "owner", "coach"), validate(updateMemberSubscriptionSchema), updateMemberSubscription);
router.patch("/member-requests/:id/approve", allowRoles("super-admin", "owner"), approveMemberRequest);
router.patch("/member-requests/:id/reject", allowRoles("super-admin", "owner"), rejectMemberRequest);
router.delete("/members/:id", allowRoles("super-admin", "owner", "coach"), deleteMember);

router.get("/attendance", allowRoles("super-admin", "owner", "coach"), listAttendance);
router.get("/attendance/coaches", allowRoles("super-admin", "owner"), listCoachAttendance);
router.post("/attendance/coaches/mark", allowRoles("super-admin", "owner"), markCoachAttendance);
router.post("/attendance/check-in", allowRoles("super-admin", "owner", "coach", "member"), createAttendanceCheckIn);
router.patch("/attendance/:id/clock-out", allowRoles("super-admin", "owner", "coach", "member"), clockOutAttendance);
router.patch("/attendance/:id/break-start", allowRoles("super-admin", "owner", "coach"), startMemberBreak);
router.patch("/attendance/:id/break-end", allowRoles("super-admin", "owner", "coach"), endMemberBreak);
router.post("/attendance/import", allowRoles("super-admin", "owner"), upload.single("file"), importAttendanceExcel);

router.post("/coach-attendance/clock-in", allowRoles("coach", "staff"), clockInCoachAttendance);
router.patch("/coach-attendance/:id/clock-out", allowRoles("coach", "staff"), clockOutCoachAttendance);
router.post("/coach-attendance/:id/break-start", allowRoles("coach", "staff"), startCoachBreak);
router.patch("/coach-attendance/:id/break-end", allowRoles("coach", "staff"), endCoachBreak);
router.get("/coach-attendance/my", allowRoles("coach", "staff"), getMyCoachAttendance);
router.get("/coach-attendance/today", allowRoles("coach", "staff"), getTodayCoachAttendance);

router.get("/salary-advances/my", allowRoles("coach", "staff"), getMyAdvances);
router.get("/payroll/my", allowRoles("coach", "staff"), getMyPayroll);

router.post("/plans", allowRoles("super-admin", "owner"), createMembershipPlan);
router.patch("/plans/:id", allowRoles("super-admin", "owner"), updateMembershipPlan);
router.post("/equipment", allowRoles("super-admin", "owner"), createEquipment);
router.patch("/equipment/:id", allowRoles("super-admin", "owner"), updateEquipment);
router.patch("/equipment/:id/service", allowRoles("super-admin", "owner"), serviceEquipment);
router.post("/equipment/:id/breakage", allowRoles("super-admin", "owner"), reportBreakage);
router.patch("/equipment/:id/breakage/:bid/resolve", allowRoles("super-admin", "owner"), resolveBreakage);
router.post("/workout-plans", allowRoles("owner", "coach"), createWorkoutPlan);
router.patch("/workout-plans/:id", allowRoles("super-admin", "owner", "coach"), updateWorkoutPlan);
router.delete("/workout-plans/:id", allowRoles("super-admin", "owner", "coach"), deleteWorkoutPlan);
router.patch("/members/:id/workout-plan", allowRoles("super-admin", "owner", "coach"), assignWorkoutPlanToMember);
router.delete("/members/:id/workout-plan", allowRoles("super-admin", "owner", "coach"), removeWorkoutPlanFromMember);
router.post("/messages", allowRoles("coach", "member"), validate(createMessageSchema), createMessage);
router.patch("/messages/read", allowRoles("coach", "member"), validate(markMessagesReadSchema), markMessagesRead);
router.post("/meal-plans", allowRoles("owner", "coach"), createMealPlan);
router.patch("/meal-plans/:id", allowRoles("super-admin", "owner", "coach"), updateMealPlan);
router.delete("/meal-plans/:id", allowRoles("super-admin", "owner", "coach"), deleteMealPlan);
router.patch("/members/:id/meal-plan", allowRoles("super-admin", "owner", "coach"), assignMealPlanToMember);
router.delete("/members/:id/meal-plan", allowRoles("super-admin", "owner", "coach"), removeMealPlanFromMember);
router.post("/announcements", allowRoles("super-admin", "owner"), createAnnouncement);
router.patch("/announcements/:id", allowRoles("super-admin", "owner"), updateAnnouncement);
router.delete("/announcements/:id", allowRoles("super-admin", "owner"), deleteAnnouncement);
router.post("/expenses", allowRoles("super-admin", "owner"), validate(createExpenseSchema), createExpense);
router.patch("/expenses/:id", allowRoles("super-admin", "owner"), updateExpense);
router.get("/banks", allowRoles("super-admin", "owner"), listOwnerBankDetails);
router.post("/banks", allowRoles("super-admin", "owner"), validate(createBankDetailSchema), createOwnerBankDetail);
router.patch("/banks/:detailId", allowRoles("super-admin", "owner"), updateOwnerBankDetail);
router.delete("/banks/:detailId", allowRoles("super-admin", "owner"), deleteOwnerBankDetail);
router.get("/bank-transactions", allowRoles("super-admin", "owner"), listOwnerBankTransactions);
router.post("/bank-transactions", allowRoles("super-admin", "owner"), validate(createBankTransactionSchema), createOwnerBankTransaction);
router.patch("/bank-transactions/:txId", allowRoles("super-admin", "owner"), updateOwnerBankTransaction);
router.delete("/bank-transactions/:txId", allowRoles("super-admin", "owner"), deleteOwnerBankTransaction);
router.post("/supplements", allowRoles("super-admin", "owner"), validate(createSupplementSchema), createSupplement);
router.patch("/supplements/:id", allowRoles("super-admin", "owner"), updateSupplement);

router.get("/suppliers", allowRoles("super-admin", "owner"), listSuppliers);
router.post("/suppliers", allowRoles("super-admin", "owner"), createSupplier);
router.patch("/suppliers/:id", allowRoles("super-admin", "owner"), updateSupplier);
router.delete("/suppliers/:id", allowRoles("super-admin", "owner"), deleteSupplier);
router.post("/suppliers/:id/products", allowRoles("super-admin", "owner"), addSupplierProduct);
router.patch("/suppliers/:id/products/:pid", allowRoles("super-admin", "owner"), updateSupplierProduct);
router.delete("/suppliers/:id/products/:pid", allowRoles("super-admin", "owner"), removeSupplierProduct);
router.post("/sales", allowRoles("super-admin", "owner"), validate(createSaleSchema), createSale);
router.post("/returns", allowRoles("super-admin", "owner"), validate(createSaleReturnSchema), createSaleReturn);

// ─── Supplier restock log ──────────────────────────────────────────────────────
router.post("/suppliers/:id/restock", allowRoles("super-admin", "owner"), addRestockRecord);
router.patch("/suppliers/:id/restock/:rid", allowRoles("super-admin", "owner"), updateRestockRecord);
router.delete("/suppliers/:id/restock/:rid", allowRoles("super-admin", "owner"), deleteRestockRecord);
router.post("/suppliers/:id/restock/:rid/payments", allowRoles("super-admin", "owner"), recordRestockPayment);

// ─── Coach leave management ───────────────────────────────────────────────────
router.get("/coach-leaves", allowRoles("super-admin", "owner"), listCoachLeaves);
router.post("/coach-leaves", allowRoles("super-admin", "owner"), validate(createCoachLeaveSchema), createCoachLeave);
router.patch("/coach-leaves/:id", allowRoles("super-admin", "owner"), updateCoachLeave);
router.delete("/coach-leaves/:id", allowRoles("super-admin", "owner"), deleteCoachLeave);
// Coach-side leave routes
router.get("/coach-leaves/my", allowRoles("coach", "staff"), getMyCoachLeaves);
router.post("/coach-leaves/request", allowRoles("coach", "staff"), validate(requestCoachLeaveSchema), requestCoachLeave);

module.exports = router;
