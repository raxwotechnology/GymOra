const { createCoach, updateCoach, deleteCoach, resetCoachPassword } = require("./coachController");
const {
  createMember, updateMember, resetMemberPassword, updateMemberSubscription,
  deleteMember, approveMemberRequest, rejectMemberRequest
} = require("./memberController");
const {
  createAttendanceCheckIn, clockOutAttendance, importAttendanceExcel,
  clockInCoachAttendance, clockOutCoachAttendance, startCoachBreak, endCoachBreak,
  getMyCoachAttendance, getTodayCoachAttendance,
  listAttendance, listCoachAttendance, markCoachAttendance, startMemberBreak, endMemberBreak
} = require("./attendanceController");
const { serviceEquipment, createEquipment, updateEquipment, reportBreakage, resolveBreakage } = require("./equipmentController");
const {
  createMembershipPlan, updateMembershipPlan,
  createWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan,
  assignWorkoutPlanToMember, removeWorkoutPlanFromMember,
  createMealPlan, updateMealPlan, deleteMealPlan,
  assignMealPlanToMember, removeMealPlanFromMember,
  createAnnouncement, updateAnnouncement, deleteAnnouncement
} = require("./plansController");
const {
  createMessage, markMessagesRead, createExpense, updateExpense,
  createSupplement, updateSupplement, createSale, createSaleReturn,
  listSuppliers, createSupplier, updateSupplier, deleteSupplier,
  addSupplierProduct, updateSupplierProduct, removeSupplierProduct,
  addRestockRecord, updateRestockRecord, deleteRestockRecord, recordRestockPayment
} = require("./salesController");
const {
  listCoachLeaves, createCoachLeave, updateCoachLeave, deleteCoachLeave,
  requestCoachLeave, getMyCoachLeaves
} = require("./leaveController");
const {
  listSalaryAdvances, createSalaryAdvance, updateSalaryAdvance, deleteSalaryAdvance, getMyAdvances
} = require("./salaryController");
const {
  listPayroll, getMyPayroll, generateMonthlyPayroll, updatePayroll, approvePayroll, markPayrollPaid, deletePayroll
} = require("./payrollController");
const {
  listOwnerBankDetails, createOwnerBankDetail, updateOwnerBankDetail, deleteOwnerBankDetail,
  listOwnerBankTransactions, createOwnerBankTransaction, updateOwnerBankTransaction, deleteOwnerBankTransaction
} = require("./bankingController");

module.exports = {
  createCoach, updateCoach, deleteCoach, resetCoachPassword,
  createMember, updateMember, resetMemberPassword, updateMemberSubscription,
  deleteMember, approveMemberRequest, rejectMemberRequest,
  createAttendanceCheckIn, clockOutAttendance, importAttendanceExcel,
  clockInCoachAttendance, clockOutCoachAttendance, startCoachBreak, endCoachBreak,
  getMyCoachAttendance, getTodayCoachAttendance,
  listAttendance, listCoachAttendance, markCoachAttendance, startMemberBreak, endMemberBreak,
  serviceEquipment, createEquipment, updateEquipment, reportBreakage, resolveBreakage,
  createMembershipPlan, updateMembershipPlan,
  createWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan,
  assignWorkoutPlanToMember, removeWorkoutPlanFromMember,
  createMealPlan, updateMealPlan, deleteMealPlan,
  assignMealPlanToMember, removeMealPlanFromMember,
  createAnnouncement, updateAnnouncement, deleteAnnouncement,
  createMessage, markMessagesRead, createExpense, updateExpense,
  createSupplement, updateSupplement, createSale, createSaleReturn,
  listSuppliers, createSupplier, updateSupplier, deleteSupplier,
  addSupplierProduct, updateSupplierProduct, removeSupplierProduct,
  addRestockRecord, updateRestockRecord, deleteRestockRecord, recordRestockPayment,
  listSalaryAdvances, createSalaryAdvance, updateSalaryAdvance, deleteSalaryAdvance, getMyAdvances,
  listPayroll, getMyPayroll, generateMonthlyPayroll, updatePayroll, approvePayroll, markPayrollPaid, deletePayroll,
  listCoachLeaves, createCoachLeave, updateCoachLeave, deleteCoachLeave,
  requestCoachLeave, getMyCoachLeaves,
  listOwnerBankDetails, createOwnerBankDetail, updateOwnerBankDetail, deleteOwnerBankDetail,
  listOwnerBankTransactions, createOwnerBankTransaction, updateOwnerBankTransaction, deleteOwnerBankTransaction
};
