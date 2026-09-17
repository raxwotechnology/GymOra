import React from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useDashboard } from "../../context/DashboardContext";
import { useAuth } from "../../../auth/context/AuthContext";
import { apiFetch } from "../../../../lib/api/client";
import {
  listOwnerBankDetails,
  createOwnerBankDetail,
  updateOwnerBankDetail,
  deleteOwnerBankDetail,
  listOwnerBankTransactions,
  createOwnerBankTransaction,
  updateOwnerBankTransaction,
  deleteOwnerBankTransaction
} from "../../../owner/api/salesApi";
import { initiatePayhereGymPayment } from "../../../owner/api/subscriptionApi";
import {
  Avatar,
  StatCard,
  Badge,
  Modal,
  FormField,
  Input,
  TextArea,
  Select,
  Btn,
  BarChart,
  MiniChart,
  ProgressBar,
  RingStat,
  Table,
  SectionHeader,
  Card,
  BankPicker,
  resolveImageUrl
} from "../../../../components/shared";
import { SUPPLEMENT_CATEGORIES } from "../../shared/lib/constants";
import { useIsMobile, responsiveGrid, useNotificationReadState } from "../../shared/lib/hooks";
import {
  sanitizeFilePart,
  formatCurrencyValue,
  normalizePaymentNumber,
  deriveSubscriptionPaymentStatus,
  calculateRemainingBalance,
  matchesQuery,
  getExpenseCategories,
  paginateItems,
  toPlanFeatures,
  toMealEntries,
  RevenueBreakdown
} from "../../shared/lib/formatters";
import { getPdfTheme, addPdfHeader, addPdfSectionTitle, addPdfSummaryCards, getPdfTableConfig, finalizePdf } from "../../shared/lib/pdf";
import { IconBtn, IcoView, IcoEdit, IcoKey, IcoCheck, IcoTrash, IcoPlus, IcoTag, IcoWrench, IcoAlert, IcoClock, IcoCoffee, IcoX, IcoAssign } from "../../shared/components/icons";
import { DonutChart, DualBarChart } from "../../shared/components/charts";
import { DashboardStatus, NotificationCard, DashboardShell } from "../../shared/components/DashboardShell";
import {
  EmptyState,
  ExportButtonGroup,
  ReportExportButton,
  SpreadsheetExportButton,
  AuditFieldList,
  ProfilePhotoField,
  InfoTile,
  ProfileSection,
  DetailStack,
  ModalSectionBlock,
  ModalFormGrid,
  Toolbar,
  SearchableCategoryFilter,
  PaginationControls,
  TemporaryCredentialModal,
  SaleReceiptModal,
  BankAccountsPanel
} from "../../shared/components/common";
import { AttendanceMemberLookupCard, ProfileHeroCard } from "../../shared/components/management";
import { MacroPill, WorkoutPlanCard, MealPlanCard } from "../../shared/components/plans";

export default function GymOwnerDash() {
  const { user, logout } = useAuth();
  const {
    data,
    error,
    editMyProfile,
    addCoach,
    editCoach,
    removeCoach,
    resetCoachPassword,
    addMember,
    editMember,
    editMemberSubscription,
    approveMemberRequest,
    rejectMemberRequest,
    removeMember,
    resetMemberPassword,
    checkInMember,
    clockOutMember,
    memberStartBreak,
    memberEndBreak,
    importAttendanceFile,
    addAnnouncement,
    editAnnouncement,
    removeAnnouncement,
    markEquipmentServiced,
    addEquipment,
    editEquipment,
    addMembershipPlan,
    editMembershipPlan,
    addWorkoutPlan,
    editWorkoutPlan,
    removeWorkoutPlan,
    assignWorkoutPlan,
    addMealPlan,
    editMealPlan,
    removeMealPlan,
    assignMealPlan,
    addExpense,
    editExpense,
    addSupplement,
    editSupplement,
    addSale,
    addReturn,
    refresh,
    fetchPayroll,
    runGeneratePayroll,
    editPayroll,
    runApprovePayroll,
    runMarkPayrollPaid,
    runDeletePayroll,
    addSalaryAdvance,
    editSalaryAdvance,
    removeSalaryAdvance,
    getSalaryAdvances
  } = useDashboard();
  const isMobile = useIsMobile();
  const [page, setPage] = React.useState("dashboard");
  const [coachSearch, setCoachSearch] = React.useState("");
  const [coachStatus, setCoachStatus] = React.useState("all");
  const [coachSort, setCoachSort] = React.useState("name-asc");
  const [coachPage, setCoachPage] = React.useState(1);
  const [memberSearch, setMemberSearch] = React.useState("");
  const [memberStatus, setMemberStatus] = React.useState("all");
  const [memberPlanFilter, setMemberPlanFilter] = React.useState("all");
  const [memberPaymentFilter, setMemberPaymentFilter] = React.useState("all");
  const [memberPage, setMemberPage] = React.useState(1);
  const [planSearch, setPlanSearch] = React.useState("");
  const [planPage, setPlanPage] = React.useState(1);
  const [workoutSearch, setWorkoutSearch] = React.useState("");
  const [workoutLevel, setWorkoutLevel] = React.useState("all");
  const [workoutPage, setWorkoutPage] = React.useState(1);
  const [mealSearch, setMealSearch] = React.useState("");
  const [mealPage, setMealPage] = React.useState(1);
  const [workoutModal, setWorkoutModal] = React.useState(null);
  const [assignWorkoutModal, setAssignWorkoutModal] = React.useState(false);
  const [mealModal, setMealModal] = React.useState(null);
  const [assignMealModal, setAssignMealModal] = React.useState(false);
  const emptyWorkoutForm = React.useMemo(() => ({ id: "", name: "", level: "Beginner", duration: "", days: "", category: "", description: "", exercises: [] }), []);
  const emptyMealForm = React.useMemo(() => ({ id: "", name: "", calories: "", protein: "", carbs: "", fat: "", goal: "", meals: [{ time: "", name: "", foods: "" }] }), []);
  const emptyAssignWorkoutForm = React.useMemo(() => ({ memberId: "", workoutPlanId: "" }), []);
  const emptyAssignMealForm = React.useMemo(() => ({ memberId: "", mealPlanId: "" }), []);
  const [workoutForm, setWorkoutForm] = React.useState(emptyWorkoutForm);
  const [mealForm, setMealForm] = React.useState(emptyMealForm);
  const [assignWorkoutForm, setAssignWorkoutForm] = React.useState(emptyAssignWorkoutForm);
  const [assignMealForm, setAssignMealForm] = React.useState(emptyAssignMealForm);
  // Payroll page state
  const [payrollMonth, setPayrollMonth] = React.useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [payrollRecords, setPayrollRecords] = React.useState([]);
  const [payrollLoading, setPayrollLoading] = React.useState(false);
  const [payrollGenerating, setPayrollGenerating] = React.useState(false);
  const [payrollMsg, setPayrollMsg] = React.useState({ text: "", ok: true });
  const [payrollEditModal, setPayrollEditModal] = React.useState(null); // { record }
  const [payrollEditForm, setPayrollEditForm] = React.useState({});
  const [payrollEditSaving, setPayrollEditSaving] = React.useState(false);
  const [payrollPayModal, setPayrollPayModal] = React.useState(null); // { record }
  const [payrollPayForm, setPayrollPayForm] = React.useState({ paymentMethod: "bank-transfer", notes: "" });
  const [payrollPaySaving, setPayrollPaySaving] = React.useState(false);
  const [payrollAdvModal, setPayrollAdvModal] = React.useState(null); // { coach }
  const [payrollAdvances, setPayrollAdvances] = React.useState([]); // for the selected coach in modal
  const [payrollAdvLoading, setPayrollAdvLoading] = React.useState(false);
  const [advForm, setAdvForm] = React.useState({ amount: "", date: new Date().toISOString().slice(0, 10), reason: "", status: "approved", note: "" });
  const [advFormSaving, setAdvFormSaving] = React.useState(false);
  const [advFormMsg, setAdvFormMsg] = React.useState({ text: "", ok: true });
  const [payrollSearch, setPayrollSearch] = React.useState("");
  const [payrollStatusFilter, setPayrollStatusFilter] = React.useState("all");
  const [payrollPage, setPayrollPage] = React.useState(1);

  // Owner billing page state
  const [ownerBillingSearch, setOwnerBillingSearch] = React.useState("");
  const [ownerBillingStatusFilter, setOwnerBillingStatusFilter] = React.useState("all");
  const [ownerBillingPlanFilter, setOwnerBillingPlanFilter] = React.useState("all");
  const [ownerBillingPage, setOwnerBillingPage] = React.useState(1);

  // Finance page period filter state
  const [financePeriod, setFinancePeriod] = React.useState("all");
  const [financeStart, setFinanceStart] = React.useState("");
  const [financeEnd, setFinanceEnd] = React.useState("");
  const [financeMethodFilter, setFinanceMethodFilter] = React.useState("all");

  // Coach leave management state (owner side)
  const [attendanceSubTab, setAttendanceSubTab] = React.useState("records");
  const [coachLeaves, setCoachLeaves] = React.useState([]);
  const [coachLeavesLoading, setCoachLeavesLoading] = React.useState(false);
  const [leaveModal, setLeaveModal] = React.useState(null);
  const [leaveForm, setLeaveForm] = React.useState({ coachId: "", leaveType: "sick", startDate: "", endDate: "", reason: "", ownerNotes: "" });
  const [leaveFormError, setLeaveFormError] = React.useState("");
  const [leaveFormSaving, setLeaveFormSaving] = React.useState(false);
  const [leaveCoachFilter, setLeaveCoachFilter] = React.useState("all");
  const [leaveStatusFilter, setLeaveStatusFilter] = React.useState("all");
  const [leaveMonthFilter, setLeaveMonthFilter] = React.useState("");
  const [leavePage, setLeavePage] = React.useState(1);
  const [ownerBillingHistorySearch, setOwnerBillingHistorySearch] = React.useState("");
  const [ownerPayModal, setOwnerPayModal] = React.useState(null); // { member }
  const [ownerPayForm, setOwnerPayForm] = React.useState({ amount: "", method: "cash", note: "", chequeNumber: "", bankName: "", referenceNumber: "" });
  const [ownerPaySaving, setOwnerPaySaving] = React.useState(false);
  const [ownerPayMsg, setOwnerPayMsg] = React.useState({ text: "", ok: true });

  // Subscription / PayHere state
  const [selectedPlan, setSelectedPlan] = React.useState(null);
  const [payLoading, setPayLoading] = React.useState(false);
  const [payError, setPayError] = React.useState("");
  const [paySuccess, setPaySuccess] = React.useState(false);
  const [ownerBillingMethodFilter, setOwnerBillingMethodFilter] = React.useState("all");

  async function handlePayherePay() {
    if (!selectedPlan) return;
    setPayLoading(true);
    setPayError("");
    setPaySuccess(false);
    try {
      const data = await initiatePayhereGymPayment({ planId: selectedPlan.id });
      window.payhere.onCompleted = function () {
        setTimeout(() => { refresh(); setSelectedPlan(null); setPaySuccess(true); setPayLoading(false); }, 2500);
      };
      window.payhere.onDismissed = function () { setPayLoading(false); };
      window.payhere.onError = function (err) { setPayError("PayHere error: " + err); setPayLoading(false); };
      window.payhere.startPayment({
        sandbox: false,
        merchant_id: data.merchantId,
        return_url: data.returnUrl,
        cancel_url: data.cancelUrl,
        notify_url: data.notifyUrl,
        order_id: data.orderId,
        items: data.itemsDescription,
        amount: data.amount,
        currency: data.currency,
        hash: data.hash,
        first_name: data.firstName || "Owner",
        last_name: "",
        email: data.email || "",
        phone: data.phone || "0000000000",
        address: "N/A",
        city: "Colombo",
        country: "Sri Lanka"
      });
    } catch (err) {
      setPayError(err.message || "Failed to initiate payment");
      setPayLoading(false);
    }
  }

  const [assignPlanQuery, setAssignPlanQuery] = React.useState("");
  const [assignPlanSelectedId, setAssignPlanSelectedId] = React.useState("");
  const [assignPlanName, setAssignPlanName] = React.useState("");
  const [assignPlanSaving, setAssignPlanSaving] = React.useState(false);
  const [assignPlanMsg, setAssignPlanMsg] = React.useState({ text: "", ok: true });
  const [equipmentSearch, setEquipmentSearch] = React.useState("");
  const [equipmentStatus, setEquipmentStatus] = React.useState("all");
  const [equipmentSort, setEquipmentSort] = React.useState("name-asc");
  const [equipmentPage, setEquipmentPage] = React.useState(1);
  const [supplementSearch, setSupplementSearch] = React.useState("");
  const [supplementStatus, setSupplementStatus] = React.useState("all");
  const [supplementCategory, setSupplementCategory] = React.useState("all");
  const [supplementPage, setSupplementPage] = React.useState(1);
  const [supplierSearch, setSupplierSearch] = React.useState("");
  const [supplierPage, setSupplierPage] = React.useState(1);
  const [ownerBankDetails, setOwnerBankDetails] = React.useState([]);
  const [ownerBankTxList, setOwnerBankTxList] = React.useState([]);
  const [ownerBankLoading, setOwnerBankLoading] = React.useState(false);
  const [ownerBankModal, setOwnerBankModal] = React.useState(null);
  const [ownerBankError, setOwnerBankError] = React.useState("");
  const emptyOwnerBankForm = React.useMemo(() => ({ id: "", bankName: "", accountName: "", accountNumber: "", branchCode: "", swiftCode: "", currency: "LKR", openingBalance: "", isDefault: false, notes: "" }), []);
  const [ownerBankForm, setOwnerBankForm] = React.useState(emptyOwnerBankForm);
  const emptyOwnerBankTxForm = React.useMemo(() => ({ id: "", type: "credit", amount: "", description: "", category: "", paymentMethod: "bank-transfer", bankDetail: "", bankName: "", accountNumber: "", referenceNumber: "", transactionDate: new Date().toISOString().slice(0, 10), status: "completed", notes: "" }), []);
  const [ownerBankTxForm, setOwnerBankTxForm] = React.useState(emptyOwnerBankTxForm);
  const [ownerBankTxModal, setOwnerBankTxModal] = React.useState(null);
  const [ownerBankTxError, setOwnerBankTxError] = React.useState("");
  const [ownerBankTxSearch, setOwnerBankTxSearch] = React.useState("");
  const [ownerBankTxTypeFilter, setOwnerBankTxTypeFilter] = React.useState("all");
  const [ownerBankTxStatusFilter, setOwnerBankTxStatusFilter] = React.useState("all");
  const [ownerBankTxSort, setOwnerBankTxSort] = React.useState("date-desc");
  const [ownerBankTxPage, setOwnerBankTxPage] = React.useState(1);
  const [ownerBankTxBankFilter, setOwnerBankTxBankFilter] = React.useState("all");
  const [ownerBankAccountSort, setOwnerBankAccountSort] = React.useState("name");
  const [supplierList, setSupplierList] = React.useState([]);
  const [supplierLoading, setSupplierLoading] = React.useState(false);
  const [supplierModal, setSupplierModal] = React.useState(null);
  const [supplierForm, setSupplierForm] = React.useState({ id: "", name: "", contactName: "", phone: "", email: "", address: "", website: "", notes: "", paymentTerms: "", isActive: true, rating: "", ratingNotes: "" });
  const [supplierViewItem, setSupplierViewItem] = React.useState(null);
  const [supplierProductModal, setSupplierProductModal] = React.useState(null);
  const [supplierProductForm, setSupplierProductForm] = React.useState({ supplementId: "", supplementName: "", supplierPrice: "", notes: "" });
  const [supplierError, setSupplierError] = React.useState("");
  const [supplierRestockModal, setSupplierRestockModal] = React.useState(null);
  const [supplierRestockForm, setSupplierRestockForm] = React.useState({ supplementName: "", supplementId: "", qty: "", unitCost: "", orderedAt: new Date().toISOString().slice(0,10), status: "ordered", invoiceNumber: "", notes: "", paymentType: "cash", dueDate: "", paymentMethod: "cash", bankDetail: "" });
  const [supplierRestockError, setSupplierRestockError] = React.useState("");
  const [supplierActiveFilter, setSupplierActiveFilter] = React.useState("all");
  const [supplierPaymentStatusFilter, setSupplierPaymentStatusFilter] = React.useState("all");
  const [restockPaymentModal, setRestockPaymentModal] = React.useState(null);
  const [restockPaymentForm, setRestockPaymentForm] = React.useState({ amount: "", method: "cash", bankDetail: "", paidAt: new Date().toISOString().slice(0,10), reference: "", notes: "" });
  const [restockPaymentError, setRestockPaymentError] = React.useState("");
  const [attendanceSearch, setAttendanceSearch] = React.useState("");
  const [attendanceStatus, setAttendanceStatus] = React.useState("all");
  const [attendancePage, setAttendancePage] = React.useState(1);
  const [coachAttSearch, setCoachAttSearch] = React.useState("");
  const [coachAttStatus, setCoachAttStatus] = React.useState("all");
  const [coachAttPage, setCoachAttPage] = React.useState(1);
  const [attendanceMemberQuery, setAttendanceMemberQuery] = React.useState("");
  const [attendanceTab, setAttendanceTab] = React.useState("members");
  const [attendanceDateFilter, setAttendanceDateFilter] = React.useState("today");
  const [attendanceDateFrom, setAttendanceDateFrom] = React.useState("");
  const [attendanceDateTo, setAttendanceDateTo] = React.useState("");
  const [attendanceLiveRecords, setAttendanceLiveRecords] = React.useState(null);
  const [coachAttendanceLiveRecords, setCoachAttendanceLiveRecords] = React.useState(null);
  const emptyMarkCoachAttForm = React.useMemo(() => ({ coachId: "", date: new Date().toISOString().slice(0, 10), clockIn: "09:00", clockOut: "17:00", breakStart: "", breakEnd: "" }), []);
  const [markCoachAttModal, setMarkCoachAttModal] = React.useState(false);
  const [markCoachAttForm, setMarkCoachAttForm] = React.useState(emptyMarkCoachAttForm);
  const [markCoachAttSaving, setMarkCoachAttSaving] = React.useState(false);
  const [markCoachAttError, setMarkCoachAttError] = React.useState("");
  const [attendanceLiveLoading, setAttendanceLiveLoading] = React.useState(false);
  const [equipmentViewItem, setEquipmentViewItem] = React.useState(null);
  const [equipmentViewTab, setEquipmentViewTab] = React.useState("overview");
  const [equipmentBreakageForm, setEquipmentBreakageForm] = React.useState({ description: "", reportedBy: "" });
  const [equipmentBreakageModal, setEquipmentBreakageModal] = React.useState(null);
  const [equipmentServiceForm, setEquipmentServiceForm] = React.useState({ type: "service", description: "", cost: "", technician: "" });
  const [equipmentServiceModal, setEquipmentServiceModal] = React.useState(null);
  const [memberViewModal, setMemberViewModal] = React.useState(null);
  const [coachViewModal, setCoachViewModal] = React.useState(null);
  const [expenseSearch, setExpenseSearch] = React.useState("");
  const [expenseStatus, setExpenseStatus] = React.useState("all");
  const [expenseType, setExpenseType] = React.useState("all");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = React.useState("all");
  const [expensePage, setExpensePage] = React.useState(1);
  const [announcementSearch, setAnnouncementSearch] = React.useState("");
  const [announcementPriority, setAnnouncementPriority] = React.useState("all");
  const [announcementPage, setAnnouncementPage] = React.useState(1);
  const [notificationPage, setNotificationPage] = React.useState(1);
  const [activitySearch, setActivitySearch] = React.useState("");
  const [activityCoachFilter, setActivityCoachFilter] = React.useState("all");
  const [activityActionFilter, setActivityActionFilter] = React.useState("all");
  const [activityDateRange, setActivityDateRange] = React.useState("all");
  const [activityPage, setActivityPage] = React.useState(1);
  const [salesSearch, setSalesSearch] = React.useState("");
  const [salesPaymentFilter, setSalesPaymentFilter] = React.useState("all");
  const [salesDateFilter, setSalesDateFilter] = React.useState("all");
  const [returnsSearch, setReturnsSearch] = React.useState("");
  const [returnsDateFilter, setReturnsDateFilter] = React.useState("all");
  const [activityDetail, setActivityDetail] = React.useState(null);
  const [credentialNotice, setCredentialNotice] = React.useState(null);
  const [ownerFormError, setOwnerFormError] = React.useState("");
  const [coachModal, setCoachModal] = React.useState(null);
  const [memberModal, setMemberModal] = React.useState(null);
  const [planModal, setPlanModal] = React.useState(null);
  const [equipmentModal, setEquipmentModal] = React.useState(null);
  const [announcementModal, setAnnouncementModal] = React.useState(null);
  const [expenseModal, setExpenseModal] = React.useState(null);
  const [supplementModal, setSupplementModal] = React.useState(null);
  const [profileModal, setProfileModal] = React.useState(false);
  const emptyCoachForm = React.useMemo(() => ({
    id: "", name: "", specialty: "", email: "", status: "active", members: 0,
    certifications: "", dateOfBirth: "", gender: "", address: "", nationalId: "", employeeCode: "",
    hireDate: "", employmentType: "", baseSalary: "", salaryModel: "", shiftSchedule: "", specializations: "",
    yearsOfExperience: "", languages: "", certificationExpiryDates: "", availableHours: "",
    maxClientCapacity: "", performanceNotes: "", bankPaymentDetails: "", emergencyContact: ""
  }), []);
  const emptyMemberForm = React.useMemo(() => ({
    id: "",
    name: "",
    email: "",
    coach: "",
    plan: "Basic",
    goal: "",
    status: "active",
    progress: 0,
    checkIns: 0,
    subscriptionDurationMonths: 1,
    paymentStatus: "unpaid",
    amountPaid: 0,
    amountDue: 0,
    dietPlanName: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    medicalNotes: "",
    fitnessLevel: "",
    preferredWorkoutTime: "",
    emergencyContact: "",
    emergencyContactRelationship: "",
    joinSource: "",
    renewalReminderPreference: "",
    attendanceNotes: "",
    assignedLocker: "",
    memberTag: "",
    barcode: "",
    progressPhotos: "",
    bodyFatPercentage: "",
    bmi: "",
    waistToHipRatio: "",
    supplementUsage: "",
    paymentMethod: "",
    membershipFreezeStatus: "",
    goalTargetDate: "",
    heightCm: "",
    currentWeightKg: "",
    targetWeightKg: "",
    targetBodyFat: "",
    personalNotes: "",
    chestCm: "",
    waistCm: "",
    armsCm: "",
    thighsCm: ""
  }), []);
  const emptyPlanForm = React.useMemo(() => ({ id: "", name: "", durationMonths: 1, price: "", features: "", description: "", color: "#2563eb", maxMembers: "", accessHours: "", sessionsPerWeek: "", trialDays: 0, setupFee: 0, discountPercent: 0, isActive: true }), []);
  const emptyEquipmentForm = React.useMemo(() => ({ id: "", name: "", qty: "", status: "good", nextServiceDate: new Date().toISOString().slice(0, 10), purchaseDate: "", purchasePrice: "", vendor: "", serialNumber: "", location: "", warrantyExpiresAt: "" }), []);
  const emptySupplementForm = React.useMemo(() => ({ id: "", name: "", sku: "", brand: "", category: "Protein", imageUrl: "", stockQty: "", unitPrice: "", buyingPrice: "", reorderLevel: 5, status: "in-stock", supplierId: "", supplierName: "", sqn: "", grn: "", supplierPriceNote: "" }), []);
  const [supplementSaveMsg, setSupplementSaveMsg] = React.useState("");
  const emptyAnnouncementForm = React.useMemo(() => ({ id: "", title: "", body: "", priority: "info", audience: "all", targetMemberIds: [], targetCoachIds: [], expiresAt: "", pinned: false, imageUrl: "", ctaLabel: "", ctaUrl: "" }), []);
  const emptyExpenseForm = React.useMemo(() => ({
    id: "",
    type: "expense",
    sourceType: "manual",
    title: "",
    category: "Rent",
    amount: "",
    status: "paid",
    vendor: "",
    contactName: "",
    paymentMethod: "cash",
    bankDetail: "",
    referenceNumber: "",
    notes: "",
    expenseDate: new Date().toISOString().slice(0, 10)
  }), []);
  const [coachForm, setCoachForm] = React.useState(emptyCoachForm);
  const [memberForm, setMemberForm] = React.useState(emptyMemberForm);
  const [planForm, setPlanForm] = React.useState(emptyPlanForm);
  const [equipmentForm, setEquipmentForm] = React.useState(emptyEquipmentForm);
  const [supplementForm, setSupplementForm] = React.useState(emptySupplementForm);
  const [announcementForm, setAnnouncementForm] = React.useState(emptyAnnouncementForm);
  const [expenseForm, setExpenseForm] = React.useState(emptyExpenseForm);
  const [profileForm, setProfileForm] = React.useState({ name: "", email: "", phone: "", bio: "", title: "", profileImageFile: null, address: "", city: "", country: "", dateOfBirth: "", gender: "", emergencyContactName: "", emergencyContactPhone: "", website: "" });
  const [posForm, setPosForm] = React.useState({ memberId: "", memberName: "", memberQuery: "", paymentMethod: "cash", notes: "", supplementId: "", qty: 1 });
  const [posError, setPosError] = React.useState("");
  const [posProductSearch, setPosProductSearch] = React.useState("");
  const [posProductOpen, setPosProductOpen] = React.useState(false);
  const [returnError, setReturnError] = React.useState("");
  const [saleReceipt, setSaleReceipt] = React.useState(null);
  const [returnForm, setReturnForm] = React.useState({ saleId: "", reason: "", amount: "", supplementId: "", qty: 1 });
  const [returnSaleSearch, setReturnSaleSearch] = React.useState("");
  const [returnSaleOpen, setReturnSaleOpen] = React.useState(false);
  const [attendanceMemberId, setAttendanceMemberId] = React.useState("");
  const [attendanceFile, setAttendanceFile] = React.useState(null);
  const [attendanceImportModal, setAttendanceImportModal] = React.useState(false);
  const [ownerMemberPopup, setOwnerMemberPopup] = React.useState(null);
  const [ownerCoachPopup, setOwnerCoachPopup] = React.useState(null);
  const [ownerPopupTab, setOwnerPopupTab] = React.useState("dashboard");
  const notificationState = useNotificationReadState(`owner-${user?.id}`, data ? (data.notifications || []) : null, data?.readNotificationIds);

  React.useEffect(() => setCoachPage(1), [coachSearch, coachStatus, coachSort]);
  React.useEffect(() => setMemberPage(1), [memberSearch, memberStatus, memberPlanFilter, memberPaymentFilter]);
  React.useEffect(() => setPlanPage(1), [planSearch]);
  React.useEffect(() => setWorkoutPage(1), [workoutSearch, workoutLevel]);
  React.useEffect(() => setMealPage(1), [mealSearch]);
  React.useEffect(() => setEquipmentPage(1), [equipmentSearch, equipmentStatus, equipmentSort]);
  React.useEffect(() => setSupplementPage(1), [supplementSearch, supplementStatus, supplementCategory]);
  React.useEffect(() => setAttendancePage(1), [attendanceSearch, attendanceStatus]);
  React.useEffect(() => setCoachAttPage(1), [coachAttSearch, coachAttStatus]);
  React.useEffect(() => setOwnerBillingPage(1), [ownerBillingSearch, ownerBillingStatusFilter, ownerBillingPlanFilter]);
  React.useEffect(() => setPayrollPage(1), [payrollSearch, payrollStatusFilter]);
  React.useEffect(() => setExpensePage(1), [expenseSearch, expenseStatus, expenseType, expenseCategoryFilter]);
  React.useEffect(() => setAnnouncementPage(1), [announcementSearch, announcementPriority]);
  React.useEffect(() => setActivityPage(1), [activitySearch, activityCoachFilter, activityActionFilter, activityDateRange]);

  async function fetchLiveAttendance(filter, from, to) {
    if (!user?.gymId) return;
    setAttendanceLiveLoading(true);
    try {
      const params = { filter };
      if (filter === "custom" && from && to) { params.from = from; params.to = to; }
      const [memberData, coachData] = await Promise.all([
        apiFetch(`/api/owner/attendance?${new URLSearchParams({ gymId: user.gymId, ...params })}`),
        apiFetch(`/api/owner/attendance/coaches?${new URLSearchParams({ gymId: user.gymId, ...params })}`)
      ]);
      setAttendanceLiveRecords(memberData.records || []);
      setCoachAttendanceLiveRecords(coachData.records || []);
    } catch {
      // fall back to context data
    } finally {
      setAttendanceLiveLoading(false);
    }
  }

  function openMarkCoachAttendance() {
    setMarkCoachAttForm({ ...emptyMarkCoachAttForm, coachId: coaches[0] ? (coaches[0].id || coaches[0]._id) : "" });
    setMarkCoachAttError("");
    setMarkCoachAttModal(true);
  }
  async function saveMarkCoachAttendance() {
    setMarkCoachAttError("");
    if (!markCoachAttForm.coachId) { setMarkCoachAttError("Select a coach."); return; }
    if (!markCoachAttForm.date || !markCoachAttForm.clockIn) { setMarkCoachAttError("Date and clock-in time are required."); return; }
    setMarkCoachAttSaving(true);
    try {
      const toIso = (time) => (time ? new Date(`${markCoachAttForm.date}T${time}:00`).toISOString() : null);
      await apiFetch("/api/owner/attendance/coaches/mark", {
        method: "POST",
        body: JSON.stringify({
          coachId: markCoachAttForm.coachId,
          date: markCoachAttForm.date,
          clockIn: toIso(markCoachAttForm.clockIn),
          clockOut: toIso(markCoachAttForm.clockOut),
          breakStart: toIso(markCoachAttForm.breakStart),
          breakEnd: toIso(markCoachAttForm.breakEnd)
        })
      });
      setMarkCoachAttModal(false);
      setMarkCoachAttForm(emptyMarkCoachAttForm);
      fetchLiveAttendance(attendanceDateFilter, attendanceDateFrom, attendanceDateTo);
    } catch (e) { setMarkCoachAttError(e.message || "Failed to record attendance"); }
    finally { setMarkCoachAttSaving(false); }
  }

  React.useEffect(() => {
    if (page === "attendance") {
      fetchLiveAttendance(attendanceDateFilter, attendanceDateFrom, attendanceDateTo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, attendanceDateFilter, attendanceDateFrom, attendanceDateTo]);

  async function fetchSuppliers() {
    if (!user?.gymId) return;
    setSupplierLoading(true);
    try {
      const data = await apiFetch(`/api/owner/suppliers`);
      setSupplierList(Array.isArray(data) ? data : []);
    } catch (_) {
      setSupplierList([]);
    } finally {
      setSupplierLoading(false);
    }
  }

  React.useEffect(() => {
    if (page === "suppliers") fetchSuppliers();
  }, [page]);

  async function fetchOwnerBanks() {
    setOwnerBankLoading(true);
    try {
      const [detailsRes, txRes] = await Promise.all([
        listOwnerBankDetails().catch(() => ({ details: [] })),
        listOwnerBankTransactions().catch(() => ({ transactions: [] }))
      ]);
      setOwnerBankDetails(Array.isArray(detailsRes.details) ? detailsRes.details : []);
      setOwnerBankTxList(Array.isArray(txRes.transactions) ? txRes.transactions : []);
    } finally {
      setOwnerBankLoading(false);
    }
  }

  React.useEffect(() => {
    if (page === "owner-banks" || page === "owner-bank-transactions" || page === "expenses") fetchOwnerBanks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function openCreateOwnerBank() { setOwnerBankForm(emptyOwnerBankForm); setOwnerBankError(""); setOwnerBankModal("create"); }
  function openEditOwnerBank(d) {
    setOwnerBankForm({ id: d._id || d.id, bankName: d.bankName || "", accountName: d.accountName || "", accountNumber: d.accountNumber || "", branchCode: d.branchCode || "", swiftCode: d.swiftCode || "", currency: d.currency || "LKR", openingBalance: String(d.openingBalance ?? 0), isDefault: !!d.isDefault, notes: d.notes || "" });
    setOwnerBankError(""); setOwnerBankModal("edit");
  }
  async function saveOwnerBank() {
    setOwnerBankError("");
    if (!ownerBankForm.bankName || !ownerBankForm.accountName || !ownerBankForm.accountNumber) { setOwnerBankError("Bank name, account name, and account number are required."); return; }
    try {
      const payload = { ...ownerBankForm, openingBalance: Number(ownerBankForm.openingBalance || 0) };
      if (ownerBankModal === "edit") {
        const r = await updateOwnerBankDetail(ownerBankForm.id, payload);
        setOwnerBankDetails((prev) => prev.map((d) => (String(d._id || d.id) === ownerBankForm.id ? r.detail : d)));
      } else {
        const r = await createOwnerBankDetail(payload);
        setOwnerBankDetails((prev) => [r.detail, ...prev]);
      }
      setOwnerBankModal(null);
    } catch (e) { setOwnerBankError(e.message || "Failed to save bank account"); }
  }
  async function removeOwnerBankDetail(id) {
    if (!window.confirm("Delete this bank account?")) return;
    await deleteOwnerBankDetail(id).catch(() => {});
    setOwnerBankDetails((prev) => prev.filter((d) => String(d._id || d.id) !== String(id)));
  }

  function openCreateOwnerBankTx() { setOwnerBankTxForm(emptyOwnerBankTxForm); setOwnerBankTxError(""); setOwnerBankTxModal("create"); }
  function openEditOwnerBankTx(tx) {
    setOwnerBankTxForm({ id: tx._id || tx.id, type: tx.type, amount: String(tx.amount), description: tx.description, category: tx.category || "", paymentMethod: tx.paymentMethod || "bank-transfer", bankDetail: tx.bankDetail ? String(tx.bankDetail._id || tx.bankDetail) : "", bankName: tx.bankName || "", accountNumber: tx.accountNumber || "", referenceNumber: tx.referenceNumber || "", transactionDate: tx.transactionDate ? tx.transactionDate.slice(0, 10) : "", status: tx.status || "completed", notes: tx.notes || "" });
    setOwnerBankTxError(""); setOwnerBankTxModal("edit");
  }
  async function saveOwnerBankTx() {
    setOwnerBankTxError("");
    if (!ownerBankTxForm.type || !ownerBankTxForm.amount || !ownerBankTxForm.description || !ownerBankTxForm.transactionDate) { setOwnerBankTxError("Type, amount, description, and date are required."); return; }
    try {
      const payload = { ...ownerBankTxForm, amount: Number(ownerBankTxForm.amount) };
      if (ownerBankTxModal === "edit") {
        const r = await updateOwnerBankTransaction(ownerBankTxForm.id, payload);
        setOwnerBankTxList((prev) => prev.map((t) => (String(t._id || t.id) === ownerBankTxForm.id ? { ...t, ...r.transaction } : t)));
      } else {
        const r = await createOwnerBankTransaction(payload);
        setOwnerBankTxList((prev) => [r.transaction, ...prev]);
      }
      setOwnerBankTxModal(null);
    } catch (e) { setOwnerBankTxError(e.message || "Failed to save transaction"); }
  }
  async function removeOwnerBankTx(id) {
    if (!window.confirm("Delete this transaction?")) return;
    await deleteOwnerBankTransaction(id).catch(() => {});
    setOwnerBankTxList((prev) => prev.filter((t) => String(t._id || t.id) !== String(id)));
  }

  async function fetchPayrollData(month) {
    if (!user?.gymId) return;
    setPayrollLoading(true);
    try {
      const d = await fetchPayroll(month);
      let records = d.records || [];
      // Auto-generate if no records exist for this month
      if (records.length === 0) {
        try {
          await runGeneratePayroll(month);
          const d2 = await fetchPayroll(month);
          records = d2.records || [];
        } catch (_) { /* no active coaches or already generated */ }
      }
      setPayrollRecords(records);
    } catch (_) { setPayrollRecords([]); }
    finally { setPayrollLoading(false); }
  }

  React.useEffect(() => {
    if (page === "payroll") fetchPayrollData(payrollMonth);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, payrollMonth]);

  if (!data) {
    return <DashboardStatus error={error} />;
  }

  const {
    currentGym,
    coaches,
    members,
    pendingMemberRequests = [],
    equipment,
    membershipPlans,
    announcements,
    revenueData,
    profile,
    financials,
    attendance = [],
    expenses = [],
    supplements = [],
    sales = [],
    returns = [],
    notifications = [],
    activityLogs = [],
    workoutPlans = [],
    mealPlans = [],
    availableSubscriptionPlans = []
  } = data;
  const hasGym = Boolean(user?.gymId && currentGym?.id);
  const memberRevenue = RevenueBreakdown({ members, plans: membershipPlans });
  const planOptions = membershipPlans.map((plan) => plan.name);
  const paymentBreakdown = [
    { label: "Paid", value: financials.paidMembers, color: "#16a34a" },
    { label: "Non-Paid", value: financials.nonPaidMembers, color: "#dc2626" }
  ];
  const attendanceBreakdown = [
    { label: "Checked In", value: attendance.filter((item) => item.status === "checked-in").length, color: "#2563eb" },
    { label: "Checked Out", value: attendance.filter((item) => item.status === "checked-out").length, color: "#16a34a" }
  ];
  const supplementBreakdown = [
    { label: "In Stock", value: supplements.filter((item) => item.status === "in-stock").length, color: "#16a34a" },
    { label: "Low Stock", value: supplements.filter((item) => item.status === "low-stock").length, color: "#f59e0b" },
    { label: "Out", value: supplements.filter((item) => item.status === "out-of-stock").length, color: "#dc2626" }
  ];
  const activeMembersCount = members.filter((member) => member.status === "active").length;
  const checkedInTodayPercent = activeMembersCount ? Math.round((currentGym.stats.checkInsToday / activeMembersCount) * 100) : 0;
  const paidCoveragePercent = members.length ? Math.round((financials.paidMembers / members.length) * 100) : 0;
  const stockHealthyPercent = supplements.length ? Math.round((supplementBreakdown[0].value / supplements.length) * 100) : 0;
  const memberPlanCounts = memberRevenue.filter((plan) => plan.count > 0);
  const membershipMixLabels = memberPlanCounts.length ? memberPlanCounts.map((plan) => plan.name) : ["No Plans"];
  const membershipMixValues = memberPlanCounts.length ? memberPlanCounts.map((plan) => plan.count) : [0];
  const coachLoad = [...coaches]
    .sort((left, right) => Number(right.members || 0) - Number(left.members || 0))
    .slice(0, 5);
  const peakCoachMembers = Math.max(1, ...coachLoad.map((coach) => Number(coach.members || 0)));
  const businessMix = [
    { label: "Memberships", value: financials.membershipCollected, color: "#16a34a" },
    { label: "Other Income", value: financials.otherIncomeTotal || 0, color: "#0f766e" },
    { label: "POS Sales", value: financials.posSalesTotal, color: "#2563eb" },
    { label: "Expenses", value: financials.expenseTotal, color: "#f59e0b" },
    { label: "Returns", value: financials.returnTotal, color: "#dc2626" }
  ];
  const businessMixMax = Math.max(1, ...businessMix.map((item) => item.value));
  const recentAlerts = notifications.slice(0, 4);
  const recentCoachActivity = activityLogs.slice(0, 4);
  const activityActionOptions = Array.from(new Set(activityLogs.map((item) => item.action).filter(Boolean)));

  // Attendance trend: last 14 days
  const last14Days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return d.toISOString().slice(0, 10); });
  const attendanceByDayMap = new Map();
  attendance.forEach(item => { const day = (item.checkInAt || item.sessionDate || item.date || "").slice(0, 10); if (day) attendanceByDayMap.set(day, (attendanceByDayMap.get(day) || 0) + 1); });
  const attendanceTrendValues = last14Days.map(d => attendanceByDayMap.get(d) || 0);
  const attendanceTrendLabels = last14Days.map((d, i) => i % 2 === 0 ? d.slice(5).replace("-", "/") : "");

  // Member growth: last 6 months
  const growthMonthKeys = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("default", { month: "short" }) }; });
  const memberJoinByMonth = new Map();
  members.forEach(m => { const mo = (m.createdAt || "").slice(0, 7); if (mo) memberJoinByMonth.set(mo, (memberJoinByMonth.get(mo) || 0) + 1); });
  const memberGrowthValues = growthMonthKeys.map(mo => memberJoinByMonth.get(mo.key) || 0);
  const memberGrowthLabels = growthMonthKeys.map(mo => mo.label);

  // Revenue vs Expenses: last 6 months
  const monthlyExpenseByKey = new Map();
  expenses.filter(e => e.type !== "income" && e.status === "paid").forEach(e => { const mo = (e.expenseDate || "").slice(0, 7); if (mo) monthlyExpenseByKey.set(mo, (monthlyExpenseByKey.get(mo) || 0) + Number(e.amount || 0)); });
  const revenueByMonthValues = growthMonthKeys.map(mo => { const idx = (revenueData.months || []).findIndex(m => m === mo.label); return idx >= 0 ? (revenueData.values || [])[idx] || 0 : 0; });
  const expenseByMonthValues = growthMonthKeys.map(mo => monthlyExpenseByKey.get(mo.key) || 0);

  // Expense categories
  const expenseCatMap = new Map();
  expenses.filter(e => e.type !== "income" && e.status === "paid").forEach(e => { const cat = e.category || "Other"; expenseCatMap.set(cat, (expenseCatMap.get(cat) || 0) + Number(e.amount || 0)); });
  const topExpenseCats = [...expenseCatMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxExpenseCat = topExpenseCats[0]?.[1] || 1;

  // Expiring members: next 30 days
  const todayDate = new Date();
  const in30Days = new Date(Date.now() + 30 * 86400000);
  const expiringMembers = members.filter(m => { if (!m.planExpiresAt) return false; const d = new Date(m.planExpiresAt); return d >= todayDate && d <= in30Days; }).sort((a, b) => new Date(a.planExpiresAt) - new Date(b.planExpiresAt)).slice(0, 6);

  // Recent sales
  const recentSalesList = sales.slice(0, 5);

  // Plan stats for membership plans page
  const planMemberCounts = new Map();
  const planRevenue = new Map();
  members.forEach(m => {
    if (m.plan) {
      planMemberCounts.set(m.plan, (planMemberCounts.get(m.plan) || 0) + 1);
      planRevenue.set(m.plan, (planRevenue.get(m.plan) || 0) + Number(m.amountPaid || 0));
    }
  });
  const mostPopularPlanName = membershipPlans.length
    ? [...membershipPlans].sort((a, b) => (planMemberCounts.get(b.name) || 0) - (planMemberCounts.get(a.name) || 0))[0]?.name
    : null;
  const bestValuePlanName = membershipPlans.length
    ? [...membershipPlans].sort((a, b) => (a.price / (a.durationMonths * 30)) - (b.price / (b.durationMonths * 30)))[0]?.name
    : null;

  // Donut segments
  const memberStatusSegments = [
    { label: "Active", value: members.filter(m => m.status === "active").length, color: "#16a34a" },
    { label: "Inactive", value: members.filter(m => m.status === "inactive").length, color: "#f59e0b" },
    { label: "Expired", value: members.filter(m => m.status === "expired").length, color: "#dc2626" },
  ];
  const equipmentStatusSegments = [
    { label: "Good", value: equipment.filter(e => e.status === "good").length, color: "#16a34a" },
    { label: "Maintenance", value: equipment.filter(e => e.status === "maintenance").length, color: "#f59e0b" },
    { label: "Replace", value: equipment.filter(e => e.status === "replace").length, color: "#dc2626" },
  ];

  // Top members by check-ins
  const topMembersByAttendance = [...members]
    .sort((a, b) => Number(b.checkIns || 0) - Number(a.checkIns || 0))
    .slice(0, 5);
  const peakMemberCheckIns = Math.max(1, ...topMembersByAttendance.map(m => Number(m.checkIns || 0)));

  // Workout & meal plan stats
  const workoutLevelBreakdown = [
    { label: "Beginner", value: workoutPlans.filter(p => p.level === "Beginner").length, color: "#16a34a" },
    { label: "Intermediate", value: workoutPlans.filter(p => p.level === "Intermediate").length, color: "#f59e0b" },
    { label: "Advanced", value: workoutPlans.filter(p => p.level === "Advanced").length, color: "#dc2626" },
  ];
  const mealGoalBreakdown = [...new Set(mealPlans.map(p => p.goal).filter(Boolean))].slice(0, 4).map(goal => ({
    label: goal,
    value: mealPlans.filter(p => p.goal === goal).length
  }));

  // Finance page — date range helper
  const _now = new Date();
  const financeRange = (() => {
    if (financePeriod === "week") {
      const start = new Date(_now); start.setDate(_now.getDate() - _now.getDay()); start.setHours(0,0,0,0);
      return { start, end: _now };
    }
    if (financePeriod === "month") {
      return { start: new Date(_now.getFullYear(), _now.getMonth(), 1), end: _now };
    }
    if (financePeriod === "year") {
      return { start: new Date(_now.getFullYear(), 0, 1), end: _now };
    }
    if (financePeriod === "custom" && financeStart && financeEnd) {
      return { start: new Date(financeStart), end: new Date(financeEnd + "T23:59:59") };
    }
    return null;
  })();

  const inRange = (dateVal) => {
    if (!financeRange) return true;
    const d = new Date(dateVal);
    return d >= financeRange.start && d <= financeRange.end;
  };

  // Finance page — filtered raw data
  const financeFilteredSales = sales.filter(s => inRange(s.soldAt));
  const financeFilteredReturns = returns.filter(r => inRange(r.processedAt));
  const financeFilteredExpenses = expenses.filter(e => inRange(e.expenseDate));
  const filteredMemberPayments = members.flatMap(m => (m.paymentHistory || []).filter(p => inRange(p.date)).map(p => ({ ...p, memberId: m.id, memberName: m.name })));

  // Finance page — recalculated KPIs from filtered data
  const fMembershipCollected = filteredMemberPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const fPosSalesTotal = financeFilteredSales.reduce((s, sale) => s + Number(sale.total || 0), 0);
  const fReturnTotal = financeFilteredReturns.reduce((s, r) => s + Number(r.amount || 0), 0);
  const fOtherIncomeTotal = financeFilteredExpenses.filter(e => e.type === "income").reduce((s, e) => s + Number(e.amount || 0), 0);
  const fExpenseTotal = financeFilteredExpenses.filter(e => e.type !== "income" && e.status === "paid").reduce((s, e) => s + Number(e.amount || 0), 0);

  // Finance page computed data (now uses filtered values)
  const totalRevenue = fMembershipCollected + fPosSalesTotal + fOtherIncomeTotal;
  const netProfit = totalRevenue - fExpenseTotal - fReturnTotal;
  const profitMarginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
  const posNetRevenue = fPosSalesTotal - fReturnTotal;
  const posReturnRate = fPosSalesTotal > 0 ? Math.round((fReturnTotal / fPosSalesTotal) * 100) : 0;
  const totalExpensesAndReturns = fExpenseTotal + fReturnTotal;

  const revenueBreakdownSegments = [
    { label: "Memberships", value: fMembershipCollected, color: "#2563eb" },
    { label: "POS Sales", value: fPosSalesTotal, color: "#7c3aed" },
    { label: "Other Income", value: fOtherIncomeTotal, color: "#0891b2" },
  ];

  // Finance expense category breakdown (filtered)
  const fExpenseCatMap = new Map();
  financeFilteredExpenses.filter(e => e.type !== "income" && e.status === "paid").forEach(e => {
    const cat = e.category || "Other";
    fExpenseCatMap.set(cat, (fExpenseCatMap.get(cat) || 0) + Number(e.amount || 0));
  });
  const fTopExpenseCats = [...fExpenseCatMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const expenseCategorySegments = fTopExpenseCats.map(([cat, val], i) => ({
    label: cat, value: val,
    color: ["#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"][i] || "#94a3b8"
  }));

  // Inventory & COGS
  const supplementPriceMap = new Map(supplements.map(s => [String(s.id || s._id), Number(s.buyingPrice || 0)]));
  const inventoryValue = supplements.reduce((s, sup) => s + (Number(sup.buyingPrice || 0) * Number(sup.stockQty || 0)), 0);
  const cogsSold = financeFilteredSales.reduce((s, sale) => s + (sale.items || []).reduce((si, item) => si + (supplementPriceMap.get(String(item.supplementId)) || 0) * Number(item.qty || 1), 0), 0);
  const unitsSold = financeFilteredSales.reduce((s, sale) => s + (sale.items || []).reduce((si, item) => si + Number(item.qty || 1), 0), 0);
  const grossMarginPct = fPosSalesTotal > 0 ? Math.round(((fPosSalesTotal - cogsSold) / fPosSalesTotal) * 100) : 0;

  const paymentMethodMap = new Map();
  members.forEach(m => { if (m.paymentMethod) paymentMethodMap.set(m.paymentMethod, (paymentMethodMap.get(m.paymentMethod) || 0) + 1); });
  financeFilteredExpenses.forEach(e => { if (e.paymentMethod) paymentMethodMap.set(e.paymentMethod, (paymentMethodMap.get(e.paymentMethod) || 0) + 1); });
  const paymentMethodBreakdown = [...paymentMethodMap.entries()]
    .filter(([method]) => financeMethodFilter === "all" || method === financeMethodFilter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxPaymentMethod = Math.max(1, ...paymentMethodBreakdown.map(([, v]) => v));
  const methodColors = { cash: "#16a34a", card: "#2563eb", "bank-transfer": "#0891b2", cheque: "#7c3aed", online: "#f59e0b", other: "#94a3b8" };
  const unpaidMembers = members
    .filter(m => m.paymentStatus !== "paid" || Number(m.remainingBalance || 0) > 0)
    .sort((a, b) => Number(b.remainingBalance || 0) - Number(a.remainingBalance || 0))
    .slice(0, 8);
  const recentExpenses = [...financeFilteredExpenses].sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate)).slice(0, 6);
  const recentSalesForFinance = [...financeFilteredSales].sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt)).slice(0, 6);

  const filteredCoaches = coaches.filter((coach) => (
    matchesQuery(coach, coachSearch, ["name", "specialty", "email", "coachCode", "employeeCode"]) &&
    (coachStatus === "all" || coach.status === coachStatus)
  ));
  const sortedCoaches = [...filteredCoaches].sort((a, b) => {
    switch (coachSort) {
      case "name-desc":
        return String(b.name || "").localeCompare(String(a.name || ""));
      case "members-desc":
        return Number(b.members || 0) - Number(a.members || 0);
      case "members-asc":
        return Number(a.members || 0) - Number(b.members || 0);
      case "hire-desc":
        return new Date(b.hireDate || 0) - new Date(a.hireDate || 0);
      case "hire-asc":
        return new Date(a.hireDate || 0) - new Date(b.hireDate || 0);
      case "name-asc":
      default:
        return String(a.name || "").localeCompare(String(b.name || ""));
    }
  });
  const filteredMembers = members.filter((member) => (
    matchesQuery(member, memberSearch, ["name", "email", "memberCode", "coach", "goal", "plan", "dietPlanName"]) &&
    (memberStatus === "all" || member.status === memberStatus) &&
    (memberPlanFilter === "all" || member.plan === memberPlanFilter) &&
    (memberPaymentFilter === "all" || member.paymentStatus === memberPaymentFilter)
  ));
  const filteredPlans = membershipPlans.filter((plan) => matchesQuery(plan, planSearch, ["name"]));
  const filteredWorkouts = workoutPlans.filter((plan) => (
    matchesQuery(plan, workoutSearch, ["name", "category", "level"]) && (workoutLevel === "all" || plan.level === workoutLevel)
  ));
  const filteredMeals = mealPlans.filter((plan) => matchesQuery(plan, mealSearch, ["name", "goal"]));
  const pagedWorkouts = paginateItems(filteredWorkouts, workoutPage);
  const pagedMeals = paginateItems(filteredMeals, mealPage);
  const filteredEquipment = equipment.filter((item) => (
    matchesQuery(item, equipmentSearch, ["name", "location", "vendor", "serialNumber"]) &&
    (equipmentStatus === "all" || item.status === equipmentStatus)
  ));
  const statusOrder = { good: 0, maintenance: 1, replace: 2 };
  const sortedEquipment = [...filteredEquipment].sort((a, b) => {
    switch (equipmentSort) {
      case "name-desc": return String(b.name || "").localeCompare(String(a.name || ""));
      case "service-asc": return new Date(a.nextServiceDate || "9999-12-31") - new Date(b.nextServiceDate || "9999-12-31");
      case "service-desc": return new Date(b.nextServiceDate || "0000-01-01") - new Date(a.nextServiceDate || "0000-01-01");
      case "status": return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
      case "purchase-desc": return new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0);
      case "breakages-desc": return (b.breakageHistory || []).filter(x => !x.resolvedAt).length - (a.breakageHistory || []).filter(x => !x.resolvedAt).length;
      case "value-desc": return Number(b.purchasePrice || 0) * Number(b.qty || 1) - Number(a.purchasePrice || 0) * Number(a.qty || 1);
      case "name-asc":
      default: return String(a.name || "").localeCompare(String(b.name || ""));
    }
  });
  const filteredSupplements = supplements.filter((item) => (
    matchesQuery(item, supplementSearch, ["name", "sku", "brand", "category", "supplierName"]) &&
    (supplementStatus === "all" || item.status === supplementStatus) &&
    (supplementCategory === "all" || item.category === supplementCategory)
  ));
  const filteredAttendance = attendance.filter((item) => (
    matchesQuery(item, attendanceSearch, ["member", "coachName"]) &&
    (attendanceStatus === "all" || item.status === attendanceStatus)
  ));
  const expenseCategoryOptions = getExpenseCategories(expenseType, expenses);
  const filteredExpenses = expenses.filter((item) => (
    matchesQuery(item, expenseSearch, ["title", "category", "vendor", "contactName", "referenceNumber", "paymentMethod", "notes"]) &&
    (expenseStatus === "all" || item.status === expenseStatus) &&
    (expenseType === "all" || item.type === expenseType) &&
    (expenseCategoryFilter === "all" || item.category === expenseCategoryFilter)
  ));
  const filteredAnnouncements = announcements.filter((announcement) => (
    matchesQuery(announcement, announcementSearch, ["title", "body"]) &&
    (announcementPriority === "all" || announcement.priority === announcementPriority)
  ));
  const activityDateThreshold = activityDateRange === "today"
    ? new Date(new Date().setHours(0, 0, 0, 0))
    : activityDateRange === "7days"
    ? new Date(Date.now() - 7 * 86400000)
    : activityDateRange === "30days"
    ? new Date(Date.now() - 30 * 86400000)
    : null;
  const filteredActivityLogs = activityLogs.filter((item) => (
    matchesQuery(item, activitySearch, ["actorName", "summary", "targetName", "targetType", "action"]) &&
    (activityCoachFilter === "all" || item.actorName === activityCoachFilter) &&
    (activityActionFilter === "all" || item.action === activityActionFilter) &&
    (activityDateThreshold === null || new Date(item.createdAt) >= activityDateThreshold)
  ));

  const pagedCoaches = paginateItems(sortedCoaches, coachPage);
  const pagedMembers = paginateItems(filteredMembers, memberPage);
  const pagedPlans = paginateItems(filteredPlans, planPage);
  const pagedEquipment = paginateItems(sortedEquipment, equipmentPage);
  const pagedSupplements = paginateItems(filteredSupplements, supplementPage);
  const pagedAttendance = paginateItems(filteredAttendance, attendancePage);
  const pagedExpenses = paginateItems(filteredExpenses, expensePage);
  const manualIncomeEntries = expenses.filter((item) => item.type === "income");
  const expenseEntries = expenses.filter((item) => item.type !== "income");
  const incomePaidTotal = manualIncomeEntries.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const incomePendingTotal = manualIncomeEntries.filter((item) => item.status === "pending").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expensePaidTotal = expenseEntries.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expensePendingTotal = expenseEntries.filter((item) => item.status === "pending").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const selectedPosSupplement = supplements.find((item) => String(item.id) === String(posForm.supplementId || "")) || null;
  const pagedAnnouncements = paginateItems(filteredAnnouncements, announcementPage);
  const pagedNotifications = paginateItems(notifications, notificationPage);
  const pagedActivityLogs = paginateItems(filteredActivityLogs, activityPage);
  const activityTodayCount = activityLogs.filter((item) => new Date(item.createdAt) >= new Date(new Date().setHours(0, 0, 0, 0))).length;
  const mostActiveCoach = (() => {
    const counts = {};
    activityLogs.forEach((item) => { if (item.actorName) counts[item.actorName] = (counts[item.actorName] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  })();
  const mostCommonAction = (() => {
    const counts = {};
    activityLogs.forEach((item) => { if (item.action) counts[item.action] = (counts[item.action] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/-/g, " ") || "—";
  })();
  const coachActivityBreakdown = coaches
    .map((coach) => ({ name: coach.name, count: filteredActivityLogs.filter((item) => item.actorName === coach.name).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxCoachActivityCount = Math.max(1, ...coachActivityBreakdown.map((c) => c.count));
  const membershipPlanMap = new Map(membershipPlans.map((plan) => [plan.name, plan]));
  const selectedAttendanceMember = members.find((member) => String(member.id) === String(attendanceMemberId || "")) || null;
  const selectedAttendanceOpenSession = selectedAttendanceMember
    ? attendance.find((item) => String(item.memberId || "") === String(selectedAttendanceMember.id) && item.status === "checked-in")
    : null;
  const checkedInSessions = attendance.filter((item) => item.status === "checked-in");
  const checkedOutSessions = attendance.filter((item) => item.status === "checked-out");
  const activeCoachesCount = coaches.filter((coach) => coach.status === "active").length;
  const equipmentNeedingAttention = equipment.filter((item) => item.status !== "good");
  const equipmentDueSoon = equipment.filter((item) => {
    if (!item.nextServiceDate) return false;
    const diffDays = Math.round((new Date(item.nextServiceDate).getTime() - Date.now()) / 86400000);
    return diffDays <= 7;
  });
  const equipmentWarrantyExpiring = equipment.filter((item) => {
    if (!item.warrantyExpiresAt) return false;
    const diffDays = Math.round((new Date(item.warrantyExpiresAt).getTime() - Date.now()) / 86400000);
    return diffDays >= 0 && diffDays <= 30;
  });
  const equipmentTotalPurchaseValue = equipment.reduce((sum, item) => sum + Number(item.purchasePrice || 0) * Number(item.qty || 1), 0);
  const equipmentTotalServiceCost = equipment.reduce((sum, item) => sum + (item.serviceHistory || []).reduce((s, h) => s + Number(h.cost || 0), 0), 0);
  const equipmentOpenBreakages = equipment.reduce((sum, item) => sum + (item.breakageHistory || []).filter((b) => !b.resolvedAt).length, 0);
  const salesTotalValue = sales.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const returnsTotalValue = returns.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const salesToday = sales.filter((s) => {
    if (!s.soldAt) return false;
    const d = new Date(s.soldAt);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return dStr === todayStr;
  });
  const salesTodayValue = salesToday.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const avgSaleValue = sales.length ? Math.round(salesTotalValue / sales.length) : 0;
  const topProducts = Object.values(
    sales.reduce((acc, s) => {
      const key = s.supplementName || s.supplementId || "Unknown";
      if (!acc[key]) acc[key] = { name: key, qty: 0, revenue: 0 };
      acc[key].qty += Number(s.qty || 1);
      acc[key].revenue += Number(s.total || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const filteredSales = sales.filter((s) => {
    const q = salesSearch.toLowerCase();
    const matchSearch = !q || (s.memberName || s.customerName || "").toLowerCase().includes(q) || (s.supplementName || "").toLowerCase().includes(q);
    const matchPayment = salesPaymentFilter === "all" || s.paymentMethod === salesPaymentFilter;
    const matchDate = (() => {
      if (salesDateFilter === "all") return true;
      if (!s.soldAt) return false;
      const d = new Date(s.soldAt);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (salesDateFilter === "today") return dStr === todayStr;
      if (salesDateFilter === "week") return (Date.now() - d.getTime()) <= 7 * 86400000;
      if (salesDateFilter === "month") return (Date.now() - d.getTime()) <= 30 * 86400000;
      return true;
    })();
    return matchSearch && matchPayment && matchDate;
  });

  const filteredReturns = returns.filter((r) => {
    const q = returnsSearch.toLowerCase();
    const matchSearch = !q || (r.customerName || r.memberName || "").toLowerCase().includes(q) || (r.supplementName || "").toLowerCase().includes(q) || (r.reason || "").toLowerCase().includes(q);
    const matchDate = (() => {
      if (returnsDateFilter === "all") return true;
      if (!r.processedAt) return false;
      const d = new Date(r.processedAt);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (returnsDateFilter === "today") return dStr === todayStr;
      if (returnsDateFilter === "week") return (Date.now() - d.getTime()) <= 7 * 86400000;
      if (returnsDateFilter === "month") return (Date.now() - d.getTime()) <= 30 * 86400000;
      return true;
    })();
    return matchSearch && matchDate;
  });

  const returnRate = salesTotalValue > 0 ? Math.round((returnsTotalValue / salesTotalValue) * 100) : 0;
  const avgReturnValue = returns.length ? Math.round(returnsTotalValue / returns.length) : 0;

  function getMembershipPlanDefaults(planName) {
    const selectedPlan = membershipPlanMap.get(planName);
    return {
      durationMonths: Number(selectedPlan?.durationMonths || 1),
      amountDue: Number(selectedPlan?.price || 0)
    };
  }

  function buildMemberFormState(member = emptyMemberForm, overridePlanName = "") {
    const selectedPlanName = overridePlanName || member.plan || membershipPlans[0]?.name || "Basic";
    const defaults = getMembershipPlanDefaults(selectedPlanName);
    const nextAmountPaid = normalizePaymentNumber(member.amountPaid, 0);
    const nextAmountDue = normalizePaymentNumber(member.amountDue, defaults.amountDue);

    return {
      id: member.id || "",
      name: member.name || "",
      email: member.email || "",
      coach: member.coach || "",
      plan: selectedPlanName,
      goal: member.goal || "",
      status: member.status || "active",
      progress: member.progress ?? 0,
      checkIns: member.checkIns ?? 0,
      subscriptionDurationMonths: member.subscriptionDurationMonths ?? defaults.durationMonths,
      paymentStatus: deriveSubscriptionPaymentStatus(nextAmountPaid, nextAmountDue),
      amountPaid: nextAmountPaid,
      amountDue: nextAmountDue,
      dietPlanName: member.dietPlanName || "",
      dateOfBirth: member.dateOfBirth || "",
      gender: member.gender || "",
      address: member.address || "",
      medicalNotes: member.medicalNotes || "",
      fitnessLevel: member.fitnessLevel || "",
      preferredWorkoutTime: member.preferredWorkoutTime || "",
      emergencyContact: member.emergencyContact || "",
      emergencyContactRelationship: member.emergencyContactRelationship || "",
      joinSource: member.joinSource || "",
      renewalReminderPreference: member.renewalReminderPreference || "",
      attendanceNotes: member.attendanceNotes || "",
      assignedLocker: member.assignedLocker || "",
      memberTag: member.memberTag || "",
      barcode: member.barcode || "",
      progressPhotos: Array.isArray(member.progressPhotos) ? member.progressPhotos.join(", ") : (member.progressPhotos || ""),
      bodyFatPercentage: member.bodyFatPercentage ?? "",
      bmi: member.bmi ?? "",
      waistToHipRatio: member.waistToHipRatio ?? "",
      supplementUsage: member.supplementUsage || "",
      paymentMethod: member.paymentMethod || "",
      membershipFreezeStatus: member.membershipFreezeStatus || "",
      goalTargetDate: member.goalTargetDate || "",
      heightCm: member.heightCm ?? "",
      currentWeightKg: member.currentWeightKg ?? "",
      targetWeightKg: member.targetWeightKg ?? "",
      targetBodyFat: member.targetBodyFat ?? "",
      personalNotes: member.personalNotes || "",
      chestCm: member.bodyMeasurements?.chestCm ?? "",
      waistCm: member.bodyMeasurements?.waistCm ?? "",
      armsCm: member.bodyMeasurements?.armsCm ?? "",
      thighsCm: member.bodyMeasurements?.thighsCm ?? ""
    };
  }

  function openCoachModal(mode, coach = emptyCoachForm) {
    setCoachModal(mode);
    setOwnerFormError("");
    setCoachForm({
      id: coach.id || "",
      name: coach.name || "",
      specialty: coach.specialty || "",
      email: coach.email || "",
      status: coach.status || "active",
      members: coach.members ?? 0,
      certifications: coach.certifications || "",
      dateOfBirth: coach.dateOfBirth || "",
      gender: coach.gender || "",
      address: coach.address || "",
      nationalId: coach.nationalId || "",
      employeeCode: coach.employeeCode || "",
      hireDate: coach.hireDate || "",
      employmentType: coach.employmentType || "",
      baseSalary: coach.baseSalary ?? "",
      salaryModel: coach.salaryModel || "",
      shiftSchedule: coach.shiftSchedule || "",
      specializations: Array.isArray(coach.specializations) ? coach.specializations.join(", ") : (coach.specializations || ""),
      yearsOfExperience: coach.yearsOfExperience ?? "",
      languages: Array.isArray(coach.languages) ? coach.languages.join(", ") : (coach.languages || ""),
      certificationExpiryDates: Array.isArray(coach.certificationExpiryDates) ? coach.certificationExpiryDates.join(", ") : (coach.certificationExpiryDates || ""),
      availableHours: coach.availableHours || "",
      maxClientCapacity: coach.maxClientCapacity ?? "",
      performanceNotes: coach.performanceNotes || "",
      bankPaymentDetails: coach.bankPaymentDetails || "",
      emergencyContact: coach.emergencyContact || ""
    });
  }

  function openMemberModal(mode, member = emptyMemberForm) {
    setMemberModal(mode);
    setOwnerFormError("");
    setMemberForm(buildMemberFormState(member));
  }

  function openPlanModal(mode, plan = emptyPlanForm) {
    setPlanModal(mode);
    setPlanForm({
      id: plan.id || "",
      name: plan.name || "",
      durationMonths: plan.durationMonths ?? 1,
      price: plan.price ?? "",
      features: toPlanFeatures(plan.features),
      description: plan.description || "",
      color: plan.color || "#2563eb",
      maxMembers: plan.maxMembers ?? "",
      accessHours: plan.accessHours || "",
      sessionsPerWeek: plan.sessionsPerWeek ?? "",
      trialDays: plan.trialDays ?? 0,
      setupFee: plan.setupFee ?? 0,
      discountPercent: plan.discountPercent ?? 0,
      isActive: plan.isActive !== false
    });
  }

  function openEquipmentModal(mode, item = emptyEquipmentForm) {
    setEquipmentModal(mode);
    setEquipmentForm({
      id: item._id || item.id || "",
      name: item.name || "",
      qty: item.qty ?? "",
      status: item.status || "good",
      nextServiceDate: item.nextServiceDate ? new Date(item.nextServiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().slice(0, 10) : "",
      purchasePrice: item.purchasePrice != null ? String(item.purchasePrice) : "",
      vendor: item.vendor || "",
      serialNumber: item.serialNumber || "",
      location: item.location || "",
      warrantyExpiresAt: item.warrantyExpiresAt ? new Date(item.warrantyExpiresAt).toISOString().slice(0, 10) : ""
    });
  }

  function openSupplementModal(mode, item = emptySupplementForm) {
    setSupplementModal(mode);
    setSupplementForm({
      id: item._id || item.id || "",
      name: item.name || "",
      sku: item.sku || "",
      brand: item.brand || "",
      category: item.category || "Protein",
      imageUrl: item.imageUrl || "",
      stockQty: item.stockQty ?? "",
      unitPrice: item.unitPrice ?? "",
      buyingPrice: item.buyingPrice ?? "",
      reorderLevel: item.reorderLevel ?? 5,
      status: item.status || "in-stock",
      supplierName: item.supplierName || "",
      sqn: item.sqn || "",
      grn: item.grn || "",
      supplierPriceNote: item.supplierPriceNote || ""
    });
  }

  function openAnnouncementModal(mode, announcement = emptyAnnouncementForm) {
    setAnnouncementModal(mode);
    setAnnouncementForm({
      id: announcement.id || "",
      title: announcement.title || "",
      body: announcement.body || "",
      priority: announcement.priority || "info"
    });
  }

  function openExpenseModal(mode, item = emptyExpenseForm) {
    const nextType = item.type || "expense";
    const categoryOptions = getExpenseCategories(nextType, expenses);
    setExpenseModal(mode);
    setExpenseForm({
      id: item.id || "",
      type: nextType,
      sourceType: item.sourceType || "manual",
      title: item.title || "",
      category: item.category || categoryOptions[0] || "Other Expense",
      amount: item.amount ?? "",
      status: item.status || "paid",
      vendor: item.vendor || "",
      contactName: item.contactName || "",
      paymentMethod: item.paymentMethod || "cash",
      bankDetail: item.bankDetail ? String(item.bankDetail._id || item.bankDetail) : "",
      referenceNumber: item.referenceNumber || "",
      notes: item.notes || "",
      expenseDate: item.expenseDate || new Date().toISOString().slice(0, 10)
    });
  }

  function handleMemberPlanChange(planName) {
    const defaults = getMembershipPlanDefaults(planName);
    setMemberForm((prev) => {
      const nextAmountPaid = normalizePaymentNumber(prev.amountPaid, 0);
      const nextAmountDue = defaults.amountDue;
      return {
        ...prev,
        plan: planName,
        subscriptionDurationMonths: defaults.durationMonths,
        amountDue: nextAmountDue,
        paymentStatus: deriveSubscriptionPaymentStatus(nextAmountPaid, nextAmountDue)
      };
    });
  }

  function handleMemberAmountPaidChange(value) {
    setMemberForm((prev) => {
      const nextAmountPaid = normalizePaymentNumber(value, 0);
      const nextAmountDue = normalizePaymentNumber(prev.amountDue, 0);
      return {
        ...prev,
        amountPaid: value,
        paymentStatus: deriveSubscriptionPaymentStatus(nextAmountPaid, nextAmountDue)
      };
    });
  }

  async function saveCoach() {
    setOwnerFormError("");

    if (!coachForm.name || !coachForm.specialty || !coachForm.email) {
      setOwnerFormError("Full name, specialty, and email are required.");
      return;
    }

    try {
      if (coachModal === "edit") {
        await editCoach(coachForm.id, coachForm);
      } else {
        const result = await addCoach({ gymId: user.gymId, ...coachForm });
        if (result?.credentials) {
          setCredentialNotice(result.credentials);
        }
      }

      setCoachModal(null);
      setCoachForm(emptyCoachForm);
    } catch (error) {
      setOwnerFormError(error.message || "Failed to save coach");
    }
  }

  async function handleCoachPasswordReset(coachId) {
    const result = await resetCoachPassword(coachId);
    if (result?.credentials) {
      setCredentialNotice(result.credentials);
    }
  }

  async function assignPlanToMember() {
    if (!assignPlanSelectedId || !assignPlanName) return;
    setAssignPlanSaving(true);
    setAssignPlanMsg({ text: "", ok: true });
    try {
      await editMemberSubscription(assignPlanSelectedId, { plan: assignPlanName });
      const memberName = members.find((m) => String(m.id) === String(assignPlanSelectedId))?.name || "Member";
      setAssignPlanMsg({ text: `${memberName} successfully moved to "${assignPlanName}".`, ok: true });
      setAssignPlanSelectedId("");
      setAssignPlanQuery("");
      setAssignPlanName("");
    } catch (e) {
      setAssignPlanMsg({ text: e.message || "Failed to update plan.", ok: false });
    } finally {
      setAssignPlanSaving(false);
    }
  }

  async function saveMember() {
    setOwnerFormError("");

    if (!memberForm.name || !memberForm.email || !memberForm.coach || !memberForm.goal || !memberForm.plan) {
      setOwnerFormError("Full name, email, coach, plan, and goal are required.");
      return;
    }

    try {
      if (memberModal === "edit") {
        await editMember(memberForm.id, memberForm);
        await editMemberSubscription(memberForm.id, {
          plan: memberForm.plan,
          durationMonths: memberForm.subscriptionDurationMonths,
          paymentStatus: memberForm.paymentStatus,
          amountPaid: memberForm.amountPaid,
          amountDue: memberForm.amountDue,
          dietPlanName: memberForm.dietPlanName
        });
      } else {
        const result = await addMember({ gymId: user.gymId, ...memberForm });
        if (result?.credentials) {
          setCredentialNotice(result.credentials);
        }
      }

      setMemberModal(null);
      setMemberForm(emptyMemberForm);
    } catch (error) {
      setOwnerFormError(error.message || "Failed to save member");
    }
  }

  async function handleMemberPasswordReset(memberId) {
    const result = await resetMemberPassword(memberId);
    if (result?.credentials) {
      setCredentialNotice(result.credentials);
    }
  }

  async function savePlan() {
    if (!planForm.name || !planForm.price) {
      return;
    }

    if (planModal === "edit") {
      await editMembershipPlan(planForm.id, planForm);
    } else {
      await addMembershipPlan({ gymId: user.gymId, ...planForm });
    }

    setPlanModal(null);
    setPlanForm(emptyPlanForm);
  }

  function openWorkoutModal(mode, plan = emptyWorkoutForm) {
    setWorkoutModal(mode);
    setWorkoutForm({
      id: plan.id || "",
      name: plan.name || "",
      level: plan.level || "Beginner",
      duration: plan.duration || "",
      days: plan.days ?? "",
      category: plan.category || "",
      description: plan.description || "",
      exercises: Array.isArray(plan.exercises) ? plan.exercises.map((ex) => ({ day: ex.day || "", name: ex.name || "", sets: ex.sets ?? "", reps: ex.reps || "", rest: ex.rest || "", notes: ex.notes || "" })) : []
    });
  }

  function openMealModal(mode, plan = emptyMealForm) {
    setMealModal(mode);
    setMealForm({
      id: plan.id || "",
      name: plan.name || "",
      calories: plan.calories ?? "",
      protein: plan.protein ?? "",
      carbs: plan.carbs ?? "",
      fat: plan.fat ?? "",
      goal: plan.goal || "",
      meals: toMealEntries(plan.meals)
    });
  }

  function openAssignWorkoutModal(member = null, selectedPlanId = "") {
    setAssignWorkoutForm({ memberId: member?.id || "", workoutPlanId: selectedPlanId || "" });
    setAssignWorkoutModal(true);
  }

  function openAssignMealModal(member = null, selectedPlanId = "") {
    setAssignMealForm({ memberId: member?.id || "", mealPlanId: selectedPlanId || "" });
    setAssignMealModal(true);
  }

  async function saveWorkout() {
    if (!workoutForm.name || !workoutForm.duration || !workoutForm.days || !workoutForm.category) return;

    const payload = {
      ...workoutForm,
      exercises: (workoutForm.exercises || []).filter((ex) => ex.name).map((ex) => ({ ...ex, sets: Number(ex.sets) || 0 }))
    };

    if (workoutModal === "edit") {
      await editWorkoutPlan(workoutForm.id, payload);
    } else {
      await addWorkoutPlan({ gymId: user.gymId, ...payload });
    }

    setWorkoutModal(null);
    setWorkoutForm(emptyWorkoutForm);
  }

  async function saveAssignedWorkoutPlan() {
    if (!assignWorkoutForm.memberId || !assignWorkoutForm.workoutPlanId) return;
    await assignWorkoutPlan(assignWorkoutForm.memberId, { workoutPlanId: assignWorkoutForm.workoutPlanId });
    setAssignWorkoutModal(false);
    setAssignWorkoutForm(emptyAssignWorkoutForm);
  }

  async function saveMeal() {
    if (!mealForm.name || !mealForm.calories || !mealForm.protein || !mealForm.carbs || !mealForm.fat || !mealForm.goal) return;

    const cleanedMeals = (mealForm.meals || [])
      .map((meal) => ({
        time: String(meal.time || "").trim(),
        name: String(meal.name || "").trim(),
        foods: String(meal.foods || "").split(",").map((item) => item.trim()).filter(Boolean)
      }))
      .filter((meal) => meal.time || meal.name || meal.foods.length);

    const payload = { ...mealForm, meals: cleanedMeals };

    if (mealModal === "edit") {
      await editMealPlan(mealForm.id, payload);
    } else {
      await addMealPlan({ gymId: user.gymId, ...payload });
    }

    setMealModal(null);
    setMealForm(emptyMealForm);
  }

  async function saveAssignedMealPlan() {
    if (!assignMealForm.memberId || !assignMealForm.mealPlanId) return;
    await assignMealPlan(assignMealForm.memberId, { mealPlanId: assignMealForm.mealPlanId });
    setAssignMealModal(false);
    setAssignMealForm(emptyAssignMealForm);
  }

  async function deleteWorkout(planId) {
    if (!window.confirm("Delete this workout plan? This action cannot be undone.")) return;
    await removeWorkoutPlan(planId);
  }

  async function deleteMeal(planId) {
    if (!window.confirm("Delete this meal plan? This action cannot be undone.")) return;
    await removeMealPlan(planId);
  }

  function exportWorkoutsExcel() {
    xlsxExport(
      ["Name", "Level", "Duration", "Category", "Days", "Description", "Exercise Count"],
      filteredWorkouts.map((p) => [p.name, p.level || "", p.duration || "", p.category || "", p.days || "", p.description || "", (p.exercises || []).length]),
      "Workout Plans", "workout-plans"
    );
  }

  function exportWorkoutsPdf() {
    const reportDate = new Date().toISOString().slice(0, 10);
    const ownerName = profile?.name || currentGym.owner || "Gym Owner";
    const location = profile?.location || "Not set";
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const contentStartY = addPdfHeader(doc, {
      title: "Workout Plans",
      subtitle: "Training programs available for assignment to members",
      gymName: currentGym.name || "Gymora Gym",
      ownerName, location, generatedAt: reportDate, accent: [22, 163, 74]
    });
    const tableY = addPdfSectionTitle(doc, "Workout Plan Library", contentStartY + 4, [22, 163, 74], `${filteredWorkouts.length} plan(s) listed`);
    autoTable(doc, getPdfTableConfig(
      doc, [22, 163, 74], tableY,
      [["Name", "Level", "Duration", "Category", "Days", "Exercises"]],
      filteredWorkouts.map((p) => [p.name, p.level || "", p.duration || "", p.category || "", p.days || "", (p.exercises || []).length])
    ));
    finalizePdf(doc, "workout-plans");
  }

  function exportMealsExcel() {
    xlsxExport(
      ["Name", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Goal", "Meal Count"],
      filteredMeals.map((p) => [p.name, p.calories || "", p.protein || "", p.carbs || "", p.fat || "", p.goal || "", (p.meals || []).length]),
      "Meal Plans", "meal-plans"
    );
  }

  function exportMealsPdf() {
    const reportDate = new Date().toISOString().slice(0, 10);
    const ownerName = profile?.name || currentGym.owner || "Gym Owner";
    const location = profile?.location || "Not set";
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const contentStartY = addPdfHeader(doc, {
      title: "Meal Plans",
      subtitle: "Nutrition programs available for assignment to members",
      gymName: currentGym.name || "Gymora Gym",
      ownerName, location, generatedAt: reportDate, accent: [22, 163, 74]
    });
    const tableY = addPdfSectionTitle(doc, "Meal Plan Library", contentStartY + 4, [22, 163, 74], `${filteredMeals.length} plan(s) listed`);
    autoTable(doc, getPdfTableConfig(
      doc, [22, 163, 74], tableY,
      [["Name", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Goal", "Meals"]],
      filteredMeals.map((p) => [p.name, p.calories || "", p.protein || "", p.carbs || "", p.fat || "", p.goal || "", (p.meals || []).length])
    ));
    finalizePdf(doc, "meal-plans");
  }

  async function saveEquipment() {
    if (!equipmentForm.name || equipmentForm.qty === "" || !equipmentForm.status) {
      return;
    }

    if (equipmentModal === "edit") {
      await editEquipment(equipmentForm.id, equipmentForm);
    } else {
      await addEquipment({ gymId: user.gymId, ...equipmentForm });
    }

    setEquipmentModal(null);
    setEquipmentForm(emptyEquipmentForm);
  }

  async function saveSupplement() {
    if (!supplementForm.name || !supplementForm.sku || supplementForm.stockQty === "" || supplementForm.unitPrice === "") {
      return;
    }

    const payload = {
      name: supplementForm.name,
      sku: supplementForm.sku,
      brand: supplementForm.brand,
      category: supplementForm.category,
      imageUrl: supplementForm.imageUrl || "",
      stockQty: supplementForm.stockQty,
      unitPrice: supplementForm.unitPrice,
      buyingPrice: supplementForm.buyingPrice || 0,
      reorderLevel: supplementForm.reorderLevel,
      status: supplementForm.status,
      supplierId: supplementForm.supplierId || null,
      supplierName: supplementForm.supplierName || "",
      sqn: supplementForm.sqn || "",
      grn: supplementForm.grn || "",
      supplierPriceNote: supplementForm.supplierPriceNote || ""
    };

    if (supplementModal === "edit") {
      await editSupplement(supplementForm.id, payload);
      setSupplementSaveMsg("");
    } else {
      const result = await addSupplement({ gymId: user.gymId, ...payload });
      if (result?.merged) {
        setSupplementSaveMsg("Stock quantity updated — existing product topped up.");
      } else {
        setSupplementSaveMsg("");
      }
    }

    setSupplementModal(null);
    setSupplementForm(emptySupplementForm);
  }

  async function saveExpense() {
    if (!expenseForm.title || !expenseForm.category || expenseForm.amount === "" || !expenseForm.expenseDate) {
      return;
    }

    if (expenseModal === "edit") {
      await editExpense(expenseForm.id, expenseForm);
    } else {
      await addExpense({ gymId: user.gymId, ...expenseForm });
    }

    setExpenseModal(null);
    setExpenseForm(emptyExpenseForm);
  }

  async function saveAnnouncement() {
    if (!announcementForm.title || !announcementForm.body) {
      return;
    }

    if (announcementModal === "edit") {
      await editAnnouncement(announcementForm.id, announcementForm);
    } else {
      await addAnnouncement({ gymId: user.gymId, ...announcementForm });
    }

    setAnnouncementModal(null);
    setAnnouncementForm(emptyAnnouncementForm);
  }

  async function submitAttendanceCheckIn() {
    if (!attendanceMemberId) {
      return;
    }

    if (selectedAttendanceOpenSession) {
      await clockOutMember(selectedAttendanceOpenSession.id);
    } else {
      await checkInMember({ gymId: user.gymId, memberId: attendanceMemberId });
    }
    setAttendanceMemberId("");
    setAttendanceMemberQuery("");
  }

  function exportExpensesExcel() {
    const XLSX = window.__XLSX__;
    if (!XLSX) {
      const link = document.createElement("a");
      const rows = [["Date", "Type", "Title", "Category", "Amount", "Payment Method", "Status", "Vendor", "Reference"]];
      filteredExpenses.forEach((item) => {
        rows.push([item.expenseDate || "", item.type || "", item.title || "", item.category || "", item.amount || 0, item.paymentMethod || "", item.status || "", item.vendor || item.contactName || "", item.referenceNumber || ""]);
      });
      const csvContent = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      link.href = URL.createObjectURL(blob);
      link.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      return;
    }
    const header = ["Date", "Type", "Title", "Category", "Amount", "Payment Method", "Status", "Vendor", "Reference"];
    const wsData = [header];
    filteredExpenses.forEach((item) => {
      wsData.push([item.expenseDate || "", item.type || "", item.title || "", item.category || "", item.amount || 0, item.paymentMethod || "", item.status || "", item.vendor || item.contactName || "", item.referenceNumber || ""]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const dataRows = wsData.slice(1);
    ws["!cols"] = header.map((h, i) => {
      const longest = dataRows.reduce((max, row) => Math.max(max, String(row[i] ?? "").length), String(h ?? "").length);
      return { wch: Math.min(42, Math.max(10, longest + 2)) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Income & Expenses");
    XLSX.writeFile(wb, `income-expenses-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function logEquipmentService() {
    if (!equipmentServiceModal || !equipmentServiceForm.description) return;
    try {
      await apiFetch(`/api/owner/equipment/${equipmentServiceModal}/service`, {
        method: "PATCH",
        body: JSON.stringify({ gymId: user.gymId, ...equipmentServiceForm })
      });
      const updated = await apiFetch(`/api/dashboard`);
      if (updated?.data?.equipment) {
        const item = updated.data.equipment.find((e) => e.id === equipmentServiceModal || e._id === equipmentServiceModal);
        if (item) setEquipmentViewItem(item);
      }
      setEquipmentServiceModal(null);
      setEquipmentServiceForm({ type: "service", description: "", cost: "", technician: "" });
      await refresh();
    } catch { /* */ }
  }

  async function logEquipmentBreakage() {
    if (!equipmentBreakageModal || !equipmentBreakageForm.description) return;
    try {
      await apiFetch(`/api/owner/equipment/${equipmentBreakageModal}/breakage`, {
        method: "POST",
        body: JSON.stringify({ ...equipmentBreakageForm, reportedBy: equipmentBreakageForm.reportedBy || user?.name || "" })
      });
      setEquipmentBreakageModal(null);
      setEquipmentBreakageForm({ description: "", reportedBy: "" });
      await refresh();
    } catch { /* */ }
  }

  async function resolveEquipmentBreakage(equipmentId, breakageId) {
    try {
      await apiFetch(`/api/owner/equipment/${equipmentId}/breakage/${breakageId}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ resolutionNotes: "Resolved" })
      });
      await refresh();
    } catch { /* */ }
  }

  async function submitAttendanceImport() {
    if (!attendanceFile) {
      return;
    }

    await importAttendanceFile(user.gymId, attendanceFile);
    setAttendanceFile(null);
    setAttendanceImportModal(false);
  }

  function exportAttendanceExcel() {
    const reportDate = new Date().toISOString().slice(0, 10);
    const gymSlug = sanitizeFilePart(currentGym.name || "gym");
    const escapeCell = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rows = filteredAttendance.map((item) => `
      <tr>
        <td>${escapeCell(item.member)}</td>
        <td>${escapeCell(item.coachName)}</td>
        <td>${escapeCell(item.date)}</td>
        <td>${escapeCell(item.checkInAt ? new Date(item.checkInAt).toLocaleString() : item.time)}</td>
        <td>${escapeCell(item.checkOutAt ? new Date(item.checkOutAt).toLocaleString() : "Still inside")}</td>
        <td>${escapeCell(item.status)}</td>
      </tr>
    `).join("");

    const workbookMarkup = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Attendance</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        </head>
        <body>
          <table border="1">
            <tr><th colspan="6" style="font-size:18px;background:#eff6ff;">${escapeCell(currentGym.name || "Gymora Gym")} Attendance Report</th></tr>
            <tr><td colspan="6">Generated: ${escapeCell(reportDate)}</td></tr>
            <tr>
              <th>Member</th>
              <th>Coach</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
            </tr>
            ${rows}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([workbookMarkup], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${gymSlug}-attendance-${reportDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportAttendancePdf() {
    const reportDate = new Date().toISOString().slice(0, 10);
    const gymSlug = sanitizeFilePart(currentGym.name || "gym");
    const ownerName = profile?.name || currentGym.owner || "Gym Owner";
    const location = profile?.location || "Not set";
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const contentStartY = addPdfHeader(doc, {
      title: "Attendance Operations Report",
      subtitle: "Filtered member movement, coach coverage, and session status summary",
      gymName: currentGym.name || "Gymora Gym",
      ownerName,
      location,
      generatedAt: reportDate,
      accent: [71, 85, 105]
    });
    const nextY = addPdfSummaryCards(doc, [
      { label: "Visible Sessions", value: filteredAttendance.length },
      { label: "Checked In", value: filteredAttendance.filter((item) => item.status === "checked-in").length },
      { label: "Checked Out", value: filteredAttendance.filter((item) => item.status === "checked-out").length },
      { label: "Today", value: currentGym.stats.checkInsToday }
    ], contentStartY, [71, 85, 105]);
    const tableY = addPdfSectionTitle(doc, "Attendance Ledger", nextY + 16, [71, 85, 105], "Filtered attendance records from the owner dashboard.");
    autoTable(doc, getPdfTableConfig(
      doc,
      [71, 85, 105],
      tableY,
      [["Member", "Coach", "Date", "Check In", "Check Out", "Status"]],
      filteredAttendance.map((item) => [
        item.member,
        item.coachName,
        item.date,
        item.checkInAt ? new Date(item.checkInAt).toLocaleString() : item.time,
        item.checkOutAt ? new Date(item.checkOutAt).toLocaleString() : "Still inside",
        item.status
      ])
    ));
    finalizePdf(doc, `${gymSlug}-attendance-${reportDate}.pdf`);
  }

  // ── Payroll handlers ────────────────────────────────────────────────────────
  async function handleGeneratePayroll() {
    setPayrollGenerating(true); setPayrollMsg({ text: "", ok: true });
    try {
      const r = await runGeneratePayroll(payrollMonth);
      setPayrollMsg({ text: r?.message || "Payroll generated.", ok: true });
      await fetchPayrollData(payrollMonth);
    } catch (e) { setPayrollMsg({ text: e.message || "Failed to generate.", ok: false }); }
    finally { setPayrollGenerating(false); }
  }

  function openPayrollEdit(record) {
    setPayrollEditForm({
      baseSalary: record.baseSalary,
      hoursWorked: record.hoursWorked,
      overtimeHours: record.overtimeHours,
      overtimeRate: record.overtimeRate,
      bonuses: record.bonuses,
      bonusNote: record.bonusNote || "",
      advancesDeducted: record.advancesDeducted,
      otherDeductions: record.otherDeductions,
      deductionNote: record.deductionNote || "",
      notes: record.notes || ""
    });
    setPayrollEditModal({ record });
  }

  async function savePayrollEdit() {
    setPayrollEditSaving(true);
    try {
      await editPayroll(payrollEditModal.record._id || payrollEditModal.record.id, {
        baseSalary: Number(payrollEditForm.baseSalary) || 0,
        hoursWorked: Number(payrollEditForm.hoursWorked) || 0,
        overtimeHours: Number(payrollEditForm.overtimeHours) || 0,
        overtimeRate: Number(payrollEditForm.overtimeRate) || 0,
        bonuses: Number(payrollEditForm.bonuses) || 0,
        bonusNote: payrollEditForm.bonusNote,
        advancesDeducted: Number(payrollEditForm.advancesDeducted) || 0,
        otherDeductions: Number(payrollEditForm.otherDeductions) || 0,
        deductionNote: payrollEditForm.deductionNote,
        notes: payrollEditForm.notes
      });
      setPayrollEditModal(null);
      await fetchPayrollData(payrollMonth);
    } catch (e) { alert(e.message || "Save failed"); }
    finally { setPayrollEditSaving(false); }
  }

  async function handleApprovePayroll(id) {
    try { await runApprovePayroll(id); await fetchPayrollData(payrollMonth); } catch (e) { alert(e.message); }
  }

  async function handleMarkPaid() {
    setPayrollPaySaving(true);
    try {
      await runMarkPayrollPaid(payrollPayModal.record._id || payrollPayModal.record.id, payrollPayForm);
      setPayrollPayModal(null);
      await fetchPayrollData(payrollMonth);
    } catch (e) { alert(e.message || "Failed"); }
    finally { setPayrollPaySaving(false); }
  }

  async function handleDeletePayroll(id) {
    if (!window.confirm("Delete this payroll record?")) return;
    try { await runDeletePayroll(id); await fetchPayrollData(payrollMonth); } catch (e) { alert(e.message); }
  }

  async function openAdvModal(coach) {
    setPayrollAdvModal({ coach });
    setPayrollAdvances([]);
    setPayrollAdvLoading(true);
    setAdvFormMsg({ text: "", ok: true });
    setAdvForm({ amount: "", date: new Date().toISOString().slice(0, 10), reason: "", status: "approved", note: "" });
    try {
      const d = await getSalaryAdvances(coach.id || coach._id);
      setPayrollAdvances(d.advances || []);
    } catch (_) { setPayrollAdvances([]); }
    finally { setPayrollAdvLoading(false); }
  }

  async function saveAdvance() {
    if (!advForm.amount || !advForm.date) { setAdvFormMsg({ text: "Amount and date are required.", ok: false }); return; }
    setAdvFormSaving(true); setAdvFormMsg({ text: "", ok: true });
    try {
      await addSalaryAdvance(payrollAdvModal.coach.id || payrollAdvModal.coach._id, {
        amount: Number(advForm.amount), date: advForm.date, reason: advForm.reason, status: advForm.status, note: advForm.note
      });
      setAdvFormMsg({ text: "Advance recorded.", ok: true });
      setAdvForm({ amount: "", date: new Date().toISOString().slice(0, 10), reason: "", status: "approved", note: "" });
      const d = await getSalaryAdvances(payrollAdvModal.coach.id || payrollAdvModal.coach._id);
      setPayrollAdvances(d.advances || []);
    } catch (e) { setAdvFormMsg({ text: e.message || "Failed", ok: false }); }
    finally { setAdvFormSaving(false); }
  }

  async function removeAdvance(coachId, advId) {
    if (!window.confirm("Delete this advance record?")) return;
    try {
      await removeSalaryAdvance(coachId, advId);
      setPayrollAdvances((p) => p.filter((a) => String(a._id || a.id) !== String(advId)));
    } catch (e) { alert(e.message); }
  }

  async function approveAdvance(coachId, advance) {
    try {
      await editSalaryAdvance(coachId, advance._id || advance.id, { status: "approved" });
      setPayrollAdvances((p) => p.map((a) => (String(a._id || a.id) === String(advance._id || advance.id) ? { ...a, status: "approved" } : a)));
    } catch (e) { alert(e.message); }
  }

  function downloadSalarySlipPdf(record) {
    const accent = [37, 99, 235];
    const theme = getPdfTheme(accent);
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const slipCoach = coaches.find((c) => String(c.id || c._id) === String(record.coach));
    const contentStartY = addPdfHeader(doc, {
      title: `Salary Slip — ${record.month}`,
      subtitle: `Employee: ${record.coachName || "—"} | Status: ${String(record.status || "").toUpperCase()}`,
      gymName: currentGym?.name || "Gymora Gym",
      ownerName: profile?.name || currentGym?.owner || "Gym Owner",
      location: profile?.location || "Not set",
      generatedAt: new Date().toLocaleString(),
      accent
    });

    let y = addPdfSectionTitle(doc, "Employment Details", contentStartY, accent);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...theme.ink);
    doc.text(`ID: ${slipCoach?.coachCode || slipCoach?.employeeCode || "—"}`, 28, y + 6);
    doc.text(`Specialty: ${slipCoach?.specialty || "—"}`, 28, y + 20);
    const colX = doc.internal.pageSize.getWidth() / 2 + 10;
    doc.text(`Type: ${slipCoach?.employmentType || "—"}`, colX, y + 6);
    doc.text(`Shift: ${slipCoach?.shiftSchedule || "—"}`, colX, y + 20);
    doc.text(`Bank: ${slipCoach?.bankPaymentDetails || "—"}`, colX, y + 34);

    const tableY = y + 56;
    autoTable(doc, {
      ...getPdfTableConfig(doc, accent, tableY,
        [["Description", "Amount (LKR)"]],
        [
          ["Base Salary", Number(record.baseSalary || 0).toLocaleString()],
          [`Overtime (${record.overtimeHours || 0}h × LKR ${record.overtimeRate || 0}/h)`, Number((record.overtimeHours || 0) * (record.overtimeRate || 0)).toLocaleString()],
          [`Bonuses${record.bonusNote ? ` — ${record.bonusNote}` : ""}`, Number(record.bonuses || 0).toLocaleString()],
          ["GROSS PAY", Number(record.grossPay || 0).toLocaleString()],
          ["Advances Deducted", `(${Number(record.advancesDeducted || 0).toLocaleString()})`],
          [`Other Deductions${record.deductionNote ? ` — ${record.deductionNote}` : ""}`, `(${Number(record.otherDeductions || 0).toLocaleString()})`]
        ]),
      foot: [["NET PAY", `LKR ${Number(record.netPay || 0).toLocaleString()}`]],
      footStyles: { fontStyle: "bold", fillColor: [220, 252, 231], textColor: [22, 101, 52] }
    });

    if (record.status === "paid" && record.paidAt) {
      const finalY = doc.lastAutoTable?.finalY || tableY + 100;
      doc.setFontSize(9.5); doc.setFont("helvetica", "normal");
      doc.setTextColor(...theme.muted);
      doc.text(`Paid on: ${new Date(record.paidAt).toLocaleDateString()} via ${record.paymentMethod || "—"}`, 28, finalY + 22);
    }

    finalizePdf(doc, `salary-slip-${(record.coachName || "coach").toLowerCase().replace(/\s+/g, "-")}-${record.month}.pdf`);
  }

  function exportPayrollPdf(records) {
    const accent = [37, 99, 235];
    const theme = getPdfTheme(accent);
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const contentStartY = addPdfHeader(doc, {
      title: `Payroll Report — ${payrollMonth}`,
      subtitle: "Coach compensation, deductions, and net pay summary",
      gymName: currentGym?.name || "Gymora Gym",
      ownerName: profile?.name || currentGym?.owner || "Gym Owner",
      location: profile?.location || "Not set",
      generatedAt: new Date().toLocaleString(),
      accent
    });
    const tableY = addPdfSectionTitle(doc, "Payroll Ledger", contentStartY, accent, `Coaches: ${records.length}`);
    autoTable(doc, {
      ...getPdfTableConfig(doc, accent, tableY,
        [["Coach", "Base Salary", "OT", "Bonuses", "Gross", "Advances", "Other Ded.", "Net Pay", "Status"]],
        records.map((r) => [
          r.coachName, Number(r.baseSalary || 0).toLocaleString(),
          `${r.overtimeHours || 0}h @ ${r.overtimeRate || 0}`,
          Number(r.bonuses || 0).toLocaleString(), Number(r.grossPay || 0).toLocaleString(),
          Number(r.advancesDeducted || 0).toLocaleString(), Number(r.otherDeductions || 0).toLocaleString(),
          Number(r.netPay || 0).toLocaleString(), r.status
        ])),
      foot: [["TOTAL", "", "", "", "", "", "", records.reduce((s, r) => s + (r.netPay || 0), 0).toLocaleString(), ""]],
      footStyles: { fontStyle: "bold", fillColor: theme.panelStrong, textColor: theme.ink }
    });
    finalizePdf(doc, `payroll-${payrollMonth}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportPayrollExcel(records) {
    xlsxExport(
      ["Coach", "Month", "Base Salary", "Hours Worked", "OT Hours", "OT Rate", "Bonuses", "Advances Ded.", "Other Ded.", "Gross Pay", "Net Pay", "Status", "Payment Method", "Paid At"],
      records.map((r) => [
        r.coachName, r.month, r.baseSalary || 0, r.hoursWorked || 0, r.overtimeHours || 0, r.overtimeRate || 0,
        r.bonuses || 0, r.advancesDeducted || 0, r.otherDeductions || 0, r.grossPay || 0, r.netPay || 0,
        r.status, r.paymentMethod || "", r.paidAt ? new Date(r.paidAt).toLocaleDateString() : ""
      ]),
      "Payroll", `payroll-${payrollMonth}`
    );
  }

  // Owner billing — collect payment
  async function collectOwnerPayment() {
    if (!ownerPayModal) return;
    const amt = Number(ownerPayForm.amount);
    if (!amt || amt <= 0) { setOwnerPayMsg({ text: "Enter a valid amount.", ok: false }); return; }
    if (ownerPayForm.method === "cheque" && !ownerPayForm.chequeNumber.trim()) {
      setOwnerPayMsg({ text: "Enter the cheque number.", ok: false }); return;
    }
    if (ownerPayForm.method === "cheque" && !ownerPayForm.bankName.trim()) {
      setOwnerPayMsg({ text: "Enter the bank name.", ok: false }); return;
    }
    setOwnerPaySaving(true); setOwnerPayMsg({ text: "", ok: true });
    try {
      const member = ownerPayModal.member;
      const newPaid = Number(member.amountPaid || 0) + amt;
      const extraNote = ownerPayForm.method === "cheque"
        ? `Cheque #${ownerPayForm.chequeNumber} · ${ownerPayForm.bankName}`
        : ownerPayForm.method === "bank-transfer" || ownerPayForm.method === "online"
          ? ownerPayForm.referenceNumber ? `Ref: ${ownerPayForm.referenceNumber}` : ""
          : "";
      await editMemberSubscription(member.id, {
        amountPaid: newPaid,
        paymentMethod: ownerPayForm.method,
        note: ownerPayForm.note || extraNote || `Payment collected — LKR ${amt.toLocaleString()}`,
        chequeNumber: ownerPayForm.chequeNumber,
        bankName: ownerPayForm.bankName,
        referenceNumber: ownerPayForm.referenceNumber
      });
      setOwnerPayMsg({ text: `LKR ${amt.toLocaleString()} recorded for ${member.name}.`, ok: true });
      setOwnerPayForm({ amount: "", method: "cash", note: "", chequeNumber: "", bankName: "", referenceNumber: "" });
    } catch (e) { setOwnerPayMsg({ text: e.message || "Failed to record payment.", ok: false }); }
    finally { setOwnerPaySaving(false); }
  }

  // Owner billing — generate member invoice PDF
  function downloadMemberInvoicePdf(member) {
    const today = new Date().toISOString().slice(0, 10);
    const accent = [37, 99, 235];
    const theme = getPdfTheme(accent);
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const invNum = `INV-${(member.memberCode || member.id || "MB").toString().slice(-6).toUpperCase()}-${today.replace(/-/g, "")}`;
    let contentY = addPdfHeader(doc, {
      title: `Member Billing Invoice — ${invNum}`,
      subtitle: `Billed to ${member.name || "—"} | ID: ${member.memberCode || "—"} | Email: ${member.email || "—"} | Phone: ${member.phone || "—"}`,
      gymName: currentGym?.name || "Gymora Gym",
      ownerName: profile?.name || currentGym?.owner || "Gym Owner",
      location: profile?.location || "Not set",
      generatedAt: today,
      accent
    });

    contentY = addPdfSummaryCards(doc, [
      { label: "Plan", value: member.plan || "—" },
      { label: "Amount Due", value: `LKR ${Number(member.amountDue || 0).toLocaleString()}` },
      { label: "Amount Paid", value: `LKR ${Number(member.amountPaid || 0).toLocaleString()}` },
      { label: "Balance", value: `LKR ${Number(member.remainingBalance || 0).toLocaleString()}` }
    ], contentY, accent) + 22;

    let tableY = addPdfSectionTitle(doc, "Subscription Details", contentY, accent,
      `Started: ${member.planStartedAt ? new Date(member.planStartedAt).toLocaleDateString() : "—"} | Expires: ${member.planExpiresAt ? new Date(member.planExpiresAt).toLocaleDateString() : "—"} | Status: ${member.paymentStatus || "—"}`);
    autoTable(doc, getPdfTableConfig(doc, accent, tableY,
      [["Plan", "Duration", "Amount Due", "Amount Paid", "Balance", "Status"]],
      [[
        member.plan || "—",
        member.subscriptionDurationMonths ? `${member.subscriptionDurationMonths} month(s)` : "—",
        `LKR ${Number(member.amountDue || 0).toLocaleString()}`,
        `LKR ${Number(member.amountPaid || 0).toLocaleString()}`,
        `LKR ${Number(member.remainingBalance || 0).toLocaleString()}`,
        member.paymentStatus || "—"
      ]]));

    const hist = member.paymentHistory || [];
    if (hist.length > 0) {
      const finalY = (doc.lastAutoTable?.finalY || tableY) + 28;
      const histTableY = addPdfSectionTitle(doc, "Payment History", finalY, accent, "All recorded payments for this member.");
      autoTable(doc, {
        ...getPdfTableConfig(doc, accent, histTableY,
          [["Date", "Plan", "Method", "Amount (LKR)", "Note"]],
          hist.map((h) => [
            h.date ? new Date(h.date).toLocaleDateString() : "—",
            h.planName || "—",
            h.method || "—",
            Number(h.amount || 0).toLocaleString(),
            h.note || "—"
          ])),
        foot: [["", "", "Total Paid", hist.reduce((s, h) => s + Number(h.amount || 0), 0).toLocaleString(), ""]],
        footStyles: { fontStyle: "bold", fillColor: theme.panelStrong, textColor: theme.ink }
      });
    }

    finalizePdf(doc, `invoice-${(member.name || "member").toLowerCase().replace(/\s+/g, "-")}-${today}.pdf`);
  }

  // Owner billing — full member history PDF
  function downloadMemberHistoryPdf(member) {
    const hist = member.paymentHistory || [];
    if (hist.length === 0) { alert("No payment history for this member."); return; }
    const today = new Date().toISOString().slice(0, 10);
    const total = hist.reduce((s, h) => s + Number(h.amount || 0), 0);
    const accent = [37, 99, 235];
    const theme = getPdfTheme(accent);
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const contentStartY = addPdfHeader(doc, {
      title: "Member Payment History",
      subtitle: `${member.name || "—"} (${member.memberCode || member.id || "—"}) | Total Paid: LKR ${total.toLocaleString()}`,
      gymName: currentGym?.name || "Gymora Gym",
      ownerName: profile?.name || currentGym?.owner || "Gym Owner",
      location: profile?.location || "Not set",
      generatedAt: today,
      accent
    });
    const tableY = addPdfSectionTitle(doc, "Payment Ledger", contentStartY, accent, `Records: ${hist.length}`);
    autoTable(doc, {
      ...getPdfTableConfig(doc, accent, tableY,
        [["Date", "Plan", "Duration", "Method", "Amount (LKR)", "Note"]],
        hist.map((h) => [
          h.date ? new Date(h.date).toLocaleDateString() : "—",
          h.planName || "—",
          h.months ? `${h.months}mo` : "—",
          h.method || "—",
          Number(h.amount || 0).toLocaleString(),
          h.note || "—"
        ])),
      foot: [["", "", "", "Total", total.toLocaleString(), ""]],
      footStyles: { fontStyle: "bold", fillColor: theme.panelStrong, textColor: theme.ink }
    });
    finalizePdf(doc, `history-${(member.name || "member").toLowerCase().replace(/\s+/g, "-")}-${today}.pdf`);
  }

  // Owner billing — export all billing Excel
  function exportOwnerBillingExcel(records) {
    xlsxExport(
      ["Name", "Member ID", "Plan", "Expires", "Amount Due", "Amount Paid", "Balance", "Payment Status"],
      records.map((m) => [
        m.name || "", m.memberCode || m.id || "",
        m.plan || "", m.planExpiresAt ? new Date(m.planExpiresAt).toLocaleDateString() : "",
        m.amountDue || 0, m.amountPaid || 0, m.remainingBalance || 0, m.paymentStatus || ""
      ]),
      "Member Billing", "member-billing"
    );
  }

  // Owner billing — export all billing PDF
  function exportOwnerBillingPdf(records) {
    const accent = [37, 99, 235];
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const contentStartY = addPdfHeader(doc, {
      title: "Member Billing Report",
      subtitle: "Subscription dues, payments, and outstanding balances across members",
      gymName: currentGym?.name || "Gymora Gym",
      ownerName: profile?.name || currentGym?.owner || "Gym Owner",
      location: profile?.location || "Not set",
      generatedAt: new Date().toLocaleString(),
      accent
    });
    const tableY = addPdfSectionTitle(doc, "Member Billing Ledger", contentStartY, accent, `Records: ${records.length}`);
    autoTable(doc, getPdfTableConfig(doc, accent, tableY,
      [["Name", "ID", "Plan", "Expires", "Due (LKR)", "Paid (LKR)", "Balance (LKR)", "Status"]],
      records.map((m) => [
        m.name || "", m.memberCode || "",
        m.plan || "", m.planExpiresAt ? new Date(m.planExpiresAt).toLocaleDateString() : "—",
        Number(m.amountDue || 0).toLocaleString(),
        Number(m.amountPaid || 0).toLocaleString(),
        Number(m.remainingBalance || 0).toLocaleString(),
        m.paymentStatus || "—"
      ])));
    finalizePdf(doc, `member-billing-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportCoachAttPdf(records) {
    const reportDate = new Date().toISOString().slice(0, 10);
    const gymSlug = sanitizeFilePart(currentGym?.name || "gym");
    const accent = [71, 85, 105];
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const contentStartY = addPdfHeader(doc, {
      title: "Coach Attendance Report",
      subtitle: "Coach clock-in/out, break durations, and shift status summary",
      gymName: currentGym?.name || "Gymora Gym",
      ownerName: profile?.name || currentGym?.owner || "Gym Owner",
      location: profile?.location || "Not set",
      generatedAt: new Date().toLocaleString(),
      accent
    });
    const tableY = addPdfSectionTitle(doc, "Coach Attendance Ledger", contentStartY, accent, `Records: ${records.length}`);
    autoTable(doc, getPdfTableConfig(doc, accent, tableY,
      [["Coach", "Date", "Clock In", "Clock Out", "Break (min)", "Work Time", "Status"]],
      records.map((r) => [
        r.coachName || "—",
        r.date ? new Date(r.date).toLocaleDateString() : "—",
        r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
        r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Still In",
        r.breakMinutes || 0,
        r.totalWorkMinutes ? `${Math.floor(r.totalWorkMinutes / 60)}h ${r.totalWorkMinutes % 60}m` : "—",
        r.status || "—"
      ])));
    finalizePdf(doc, `${gymSlug}-coach-attendance-${reportDate}.pdf`);
  }

  function exportCoachAttExcel(records) {
    const reportDate = new Date().toISOString().slice(0, 10);
    const gymSlug = sanitizeFilePart(currentGym?.name || "gym");
    const XLSX = window.__XLSX__;
    if (!XLSX) { alert("Excel export not available. Please refresh and try again."); return; }
    const header = ["Coach", "Date", "Clock In", "Clock Out", "Break (min)", "Work Time", "Status"];
    const rows = records.map((r) => [
      r.coachName || "—",
      r.date ? new Date(r.date).toLocaleDateString() : "—",
      r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
      r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Still In",
      r.breakMinutes || 0,
      r.totalWorkMinutes ? `${Math.floor(r.totalWorkMinutes / 60)}h ${r.totalWorkMinutes % 60}m` : "—",
      r.status || "—"
    ]);
    const ws = XLSX.utils.aoa_to_sheet([
      [`${currentGym?.name || "Gym"} — Coach Attendance Report`],
      [`Generated: ${new Date().toLocaleString()} | Records: ${records.length}`],
      [],
      header,
      ...rows
    ]);
    ws["!cols"] = header.map((h, i) => {
      const longest = rows.reduce((max, row) => Math.max(max, String(row[i] ?? "").length), String(h ?? "").length);
      return { wch: Math.min(42, Math.max(10, longest + 2)) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coach Attendance");
    XLSX.writeFile(wb, `${gymSlug}-coach-attendance-${reportDate}.xlsx`);
  }

  async function submitSale() {
    setPosError("");
    const selectedPosMember = members.find((member) => member.id === posForm.memberId) || null;
    const resolvedMemberName = selectedPosMember?.name || posForm.memberName || "";
    const resolvedCustomerName = resolvedMemberName.trim() || "Walk-in";

    if (!posForm.supplementId) {
      setPosError("Please select a product before completing the sale.");
      return;
    }
    if (!posForm.qty || Number(posForm.qty) < 1) {
      setPosError("Quantity must be at least 1.");
      return;
    }

    try {
      const receipt = await addSale({
        gymId: user.gymId,
        customerName: resolvedCustomerName,
        memberId: posForm.memberId || undefined,
        memberName: resolvedMemberName,
        paymentMethod: posForm.paymentMethod,
        notes: posForm.notes,
        items: [{ supplementId: posForm.supplementId, qty: Number(posForm.qty) }]
      });
      setSaleReceipt(receipt);
      setPosForm({ memberId: "", memberName: "", memberQuery: "", paymentMethod: "cash", notes: "", supplementId: "", qty: 1 });
    } catch (err) {
      setPosError(err.message || "Failed to complete sale. Please try again.");
    }
  }

  async function submitReturn() {
    setReturnError("");
    if (!returnForm.saleId) { setReturnError("Please select the original sale."); return; }
    if (!returnForm.supplementId) { setReturnError("Please select the product being returned."); return; }
    if (!returnForm.qty || Number(returnForm.qty) < 1) { setReturnError("Return quantity must be at least 1."); return; }
    if (!returnForm.amount || Number(returnForm.amount) <= 0) { setReturnError("Please enter a valid refund amount."); return; }
    if (!returnForm.reason.trim()) { setReturnError("Please enter a reason for the return."); return; }

    try {
      await addReturn({
        gymId: user.gymId,
        saleId: returnForm.saleId,
        reason: returnForm.reason,
        amount: Number(returnForm.amount),
        items: [{ supplementId: returnForm.supplementId, qty: Number(returnForm.qty) }]
      });
      setReturnForm({ saleId: "", reason: "", amount: "", supplementId: "", qty: 1 });
    } catch (err) {
      setReturnError(err.message || "Failed to process return. Please try again.");
    }
  }

  function openProfileModal() {
    setProfileForm({
      name: profile?.name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      bio: profile?.bio || "",
      title: profile?.title || "",
      profileImageFile: null,
      address: profile?.address || "",
      city: profile?.city || "",
      country: profile?.country || "",
      dateOfBirth: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().slice(0, 10) : "",
      gender: profile?.gender || "",
      emergencyContactName: profile?.emergencyContactName || "",
      emergencyContactPhone: profile?.emergencyContactPhone || "",
      website: profile?.website || ""
    });
    setProfileModal(true);
  }

  async function saveProfile() {
    if (!profileForm.name || !profileForm.email) {
      return;
    }
    await editMyProfile(profileForm);
    setProfileModal(false);
  }

  async function saveSupplier() {
    setSupplierError("");
    if (!supplierForm.name) { setSupplierError("Supplier name is required."); return; }
    try {
      if (supplierModal === "edit") {
        await apiFetch(`/api/owner/suppliers/${supplierForm.id}`, { method: "PATCH", body: JSON.stringify(supplierForm) });
      } else {
        await apiFetch("/api/owner/suppliers", { method: "POST", body: JSON.stringify(supplierForm) });
      }
      setSupplierModal(null);
      await fetchSuppliers();
    } catch (e) { setSupplierError(e.message || "Failed to save supplier"); }
  }

  async function removeSupplier(id) {
    try {
      await apiFetch(`/api/owner/suppliers/${id}`, { method: "DELETE" });
      setSupplierList((prev) => prev.filter((s) => String(s._id) !== String(id)));
      if (supplierViewItem && String(supplierViewItem._id) === String(id)) setSupplierViewItem(null);
    } catch (_) {}
  }

  async function saveSupplierProduct() {
    setSupplierError("");
    if (!supplierViewItem) return;
    try {
      const pid = supplierProductForm.id;
      if (supplierProductModal === "edit" && pid) {
        await apiFetch(`/api/owner/suppliers/${supplierViewItem._id}/products/${pid}`, { method: "PATCH", body: JSON.stringify(supplierProductForm) });
      } else {
        await apiFetch(`/api/owner/suppliers/${supplierViewItem._id}/products`, { method: "POST", body: JSON.stringify(supplierProductForm) });
      }
      setSupplierProductModal(null);
      await fetchSuppliers();
      const updated = (await apiFetch(`/api/owner/suppliers`)).find((s) => String(s._id) === String(supplierViewItem._id));
      if (updated) setSupplierViewItem(updated);
    } catch (e) { setSupplierError(e.message || "Failed to save product"); }
  }

  async function removeSupplierProduct(supplierId, productId) {
    try {
      await apiFetch(`/api/owner/suppliers/${supplierId}/products/${productId}`, { method: "DELETE" });
      await fetchSuppliers();
      const updated = supplierList.find((s) => String(s._id) === String(supplierId));
      if (updated) setSupplierViewItem({ ...updated, products: (updated.products || []).filter((p) => String(p._id) !== String(productId)) });
    } catch (_) {}
  }

  function exportOwnerReport(reportType) {
    const reportDate = new Date().toISOString().slice(0, 10);
    const gymSlug = sanitizeFilePart(currentGym.name || "gym");
    const filenameBase = `${gymSlug}-${reportType}-${reportDate}`;
    const ownerName = profile?.name || currentGym.owner || "Gym Owner";
    const location = profile?.location || "Not set";
    const baseHeader = {
      gymName: currentGym.name || "Gymora Gym",
      ownerName,
      location,
      generatedAt: reportDate,
      accent: [71, 85, 105]
    };

    if (reportType === "members") {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const contentStartY = addPdfHeader(doc, {
        ...baseHeader,
        title: "Members Performance Report",
        subtitle: "Membership, coaching assignment, payment, and check-in overview"
      });
      let nextY = addPdfSummaryCards(doc, [
        { label: "Total Members", value: members.length },
        { label: "Active Members", value: activeMembersCount },
        { label: "Paid Members", value: financials.paidMembers },
        { label: "Outstanding Dues", value: formatCurrencyValue(financials.outstandingPayments) }
      ], contentStartY, [71, 85, 105]);
      nextY = addPdfSectionTitle(doc, "Member Register", nextY + 16, [71, 85, 105], "Operational snapshot of all current gym members.");
      autoTable(doc, getPdfTableConfig(
        doc,
        [71, 85, 105],
        nextY,
        [["Name", "Email", "Coach", "Plan", "Status", "Payment", "Paid", "Due", "Check-Ins", "Goal"]],
        members.map((member) => [
          member.name,
          member.email || "",
          member.coach,
          member.plan,
          member.status,
          member.paymentStatus,
          formatCurrencyValue(member.amountPaid),
          formatCurrencyValue(member.amountDue),
          member.checkIns,
          member.goal
        ])
      ));
      finalizePdf(doc, `${filenameBase}.pdf`);
      return;
    }

    if (reportType === "attendance") {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const contentStartY = addPdfHeader(doc, {
        ...baseHeader,
        title: "Attendance Operations Report",
        subtitle: "Member movement, coach coverage, and session status summary"
      });
      const nextY = addPdfSummaryCards(doc, [
        { label: "Sessions", value: attendance.length },
        { label: "Checked In", value: attendanceBreakdown[0].value },
        { label: "Checked Out", value: attendanceBreakdown[1].value },
        { label: "Today", value: currentGym.stats.checkInsToday }
      ], contentStartY, [71, 85, 105]);
      const tableY = addPdfSectionTitle(doc, "Attendance Ledger", nextY + 16, [71, 85, 105], "Check-in and check-out visibility for gym floor operations.");
      autoTable(doc, getPdfTableConfig(
        doc,
        [71, 85, 105],
        tableY,
        [["Member", "Coach", "Date", "Check In", "Check Out", "Status"]],
        attendance.map((item) => [
          item.member,
          item.coachName,
          item.date,
          item.checkInAt || item.time,
          item.checkOutAt || "",
          item.status
        ])
      ));
      finalizePdf(doc, `${filenameBase}.pdf`);
      return;
    }

    if (reportType === "finance") {
      const periodLabel = financePeriod === "all" ? "All Time" : financePeriod === "week" ? "This Week" : financePeriod === "month" ? "This Month" : financePeriod === "year" ? "This Year" : `${financeStart} to ${financeEnd}`;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const contentStartY = addPdfHeader(doc, {
        ...baseHeader,
        title: "Finance Summary Report",
        subtitle: `Period: ${periodLabel} · Cash flow indicators, sales, expenses, and payment health`
      });
      let nextY = addPdfSummaryCards(doc, [
        { label: "Total Revenue", value: formatCurrencyValue(totalRevenue) },
        { label: "Net Profit", value: formatCurrencyValue(netProfit) },
        { label: "POS Sales", value: formatCurrencyValue(fPosSalesTotal) },
        { label: "Outstanding", value: formatCurrencyValue(financials.outstandingPayments) }
      ], contentStartY, [71, 85, 105]);
      nextY = addPdfSectionTitle(doc, "Financial Scorecard", nextY + 16, [71, 85, 105], `Core business figures for the period: ${periodLabel}`);
      autoTable(doc, getPdfTableConfig(
        doc,
        [71, 85, 105],
        nextY,
        [["Metric", "Value"]],
        [
          ["Membership Collected", formatCurrencyValue(fMembershipCollected)],
          ["POS Sales Total", formatCurrencyValue(fPosSalesTotal)],
          ["Other Income", formatCurrencyValue(fOtherIncomeTotal)],
          ["Total Revenue", formatCurrencyValue(totalRevenue)],
          ["Operating Expenses", formatCurrencyValue(fExpenseTotal)],
          ["POS Returns", formatCurrencyValue(fReturnTotal)],
          ["Net Profit", formatCurrencyValue(netProfit)],
          ["Profit Margin", `${profitMarginPct}%`],
          ["Inventory Value", formatCurrencyValue(inventoryValue)],
          ["COGS (Period)", formatCurrencyValue(cogsSold)],
          ["Gross Margin", `${grossMarginPct}%`],
          ["Outstanding Payments", formatCurrencyValue(financials.outstandingPayments)],
          ["Paid Members", String(financials.paidMembers)],
          ["Non-Paid Members", String(financials.nonPaidMembers)]
        ]
      ));
      finalizePdf(doc, `${filenameBase}.pdf`);
      return;
    }

    if (reportType === "inventory") {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const contentStartY = addPdfHeader(doc, {
        ...baseHeader,
        title: "Inventory Control Report",
        subtitle: "Equipment condition and supplement stock valuation snapshot"
      });
      const nextY = addPdfSummaryCards(doc, [
        { label: "Equipment", value: equipment.length },
        { label: "Supplements", value: supplements.length },
        { label: "Low Stock", value: supplementBreakdown[1].value },
        { label: "Out of Stock", value: supplementBreakdown[2].value }
      ], contentStartY, [71, 85, 105]);
      const tableY = addPdfSectionTitle(doc, "Inventory Register", nextY + 16, [71, 85, 105], "Combined inventory view for equipment condition and supplement stock value.");
      autoTable(doc, getPdfTableConfig(
        doc,
        [71, 85, 105],
        tableY,
        [["Type", "Name", "Category", "Status", "Quantity / Stock", "Value / Price"]],
        [
          ...equipment.map((item) => ["Equipment", item.name, "", item.status, item.qty, ""]),
          ...supplements.map((item) => ["Supplement", item.name, item.category, item.status, item.stockQty, formatCurrencyValue(item.unitPrice)])
        ]
      ));
      finalizePdf(doc, `${filenameBase}.pdf`);
      return;
    }

    if (reportType === "coaches") {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const contentStartY = addPdfHeader(doc, {
        ...baseHeader,
        title: "Coach Register Report",
        subtitle: "Coach roster with specialties, member load, and status"
      });
      let nextY = addPdfSummaryCards(doc, [
        { label: "Total Coaches", value: coaches.length },
        { label: "Active Coaches", value: activeCoachesCount },
        { label: "Total Members Assigned", value: coaches.reduce((s, c) => s + Number(c.members || 0), 0) }
      ], contentStartY, [71, 85, 105]);
      nextY = addPdfSectionTitle(doc, "Coach Roster", nextY + 16, [71, 85, 105], "Complete listing of all coaches registered at this gym.");
      autoTable(doc, getPdfTableConfig(
        doc, [71, 85, 105], nextY,
        [["Name", "Coach ID", "Specialty", "Email", "Members", "Status"]],
        coaches.map((c) => [c.name, c.coachCode || "Pending", c.specialty || "General", c.email || "", String(c.members || 0), c.status])
      ));
      finalizePdf(doc, `${filenameBase}.pdf`);
      return;
    }

    if (reportType === "equipment") {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const contentStartY = addPdfHeader(doc, {
        ...baseHeader,
        title: "Equipment Status Report",
        subtitle: "Full inventory of gym equipment with condition, service, and breakage status"
      });
      let nextY = addPdfSummaryCards(doc, [
        { label: "Total Items", value: equipment.length },
        { label: "Good Condition", value: equipment.filter((e) => e.status === "good").length },
        { label: "In Maintenance", value: equipment.filter((e) => e.status === "maintenance").length },
        { label: "Replace Soon", value: equipment.filter((e) => e.status === "replace").length }
      ], contentStartY, [71, 85, 105]);
      nextY = addPdfSectionTitle(doc, "Equipment Register", nextY + 16, [71, 85, 105], "Condition and service status for all registered gym equipment.");
      autoTable(doc, getPdfTableConfig(
        doc, [71, 85, 105], nextY,
        [["Name", "Status", "Qty", "Location", "Vendor", "Serial No.", "Next Service"]],
        equipment.map((e) => [
          e.name, e.status, String(e.qty || 1),
          e.location || "", e.vendor || "", e.serialNumber || "",
          e.nextServiceDate ? new Date(e.nextServiceDate).toLocaleDateString() : "—"
        ])
      ));
      finalizePdf(doc, `${filenameBase}.pdf`);
      return;
    }

    if (reportType === "announcements") {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const contentStartY = addPdfHeader(doc, {
        ...baseHeader,
        title: "Announcements Log",
        subtitle: "All posted announcements with audience targeting and status"
      });
      let nextY = addPdfSummaryCards(doc, [
        { label: "Total", value: announcements.length },
        { label: "Pinned", value: announcements.filter((a) => a.pinned).length },
        { label: "Active", value: announcements.filter((a) => !a.expiresAt || new Date(a.expiresAt) > new Date()).length },
        { label: "Expired", value: announcements.filter((a) => a.expiresAt && new Date(a.expiresAt) <= new Date()).length }
      ], contentStartY, [71, 85, 105]);
      nextY = addPdfSectionTitle(doc, "Announcement Register", nextY + 16, [71, 85, 105], "All announcements created for members and coaches.");
      autoTable(doc, getPdfTableConfig(
        doc, [71, 85, 105], nextY,
        [["Title", "Audience", "Pinned", "Expires", "CTA"]],
        announcements.map((a) => [
          a.title || "",
          a.audience || "all",
          a.pinned ? "Yes" : "No",
          a.expiresAt ? new Date(a.expiresAt).toLocaleDateString() : "Never",
          a.ctaLabel || ""
        ])
      ));
      finalizePdf(doc, `${filenameBase}.pdf`);
      return;
    }

    if (reportType === "supplements") {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const contentStartY = addPdfHeader(doc, {
        ...baseHeader,
        title: "Supplement Inventory Report",
        subtitle: "Full supplement stock valuation, pricing, and supplier overview"
      });
      const stockValue = supplements.reduce((sum, s) => sum + (Number(s.stockQty || 0) * Number(s.unitPrice || 0)), 0);
      let nextY = addPdfSummaryCards(doc, [
        { label: "Total SKUs", value: supplements.length },
        { label: "Stock Value", value: `LKR ${stockValue.toLocaleString()}` },
        { label: "Low Stock", value: supplements.filter((s) => s.status === "low-stock").length },
        { label: "Out of Stock", value: supplements.filter((s) => s.status === "out-of-stock").length }
      ], contentStartY, [71, 85, 105]);
      nextY = addPdfSectionTitle(doc, "Supplement Register", nextY + 16, [71, 85, 105], "Current stock, pricing, and supplier data for all registered supplements.");
      autoTable(doc, getPdfTableConfig(
        doc, [71, 85, 105], nextY,
        [["Name", "SKU", "Brand", "Category", "Stock", "Sell Price", "Buy Price", "Status", "Supplier"]],
        supplements.map((s) => [
          s.name, s.sku || "", s.brand || "", s.category || "",
          String(s.stockQty || 0), `LKR ${Number(s.unitPrice || 0).toLocaleString()}`,
          `LKR ${Number(s.buyingPrice || 0).toLocaleString()}`, s.status, s.supplierName || ""
        ])
      ));
      finalizePdf(doc, `${filenameBase}.pdf`);
      return;
    }

    if (reportType === "overview") {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const contentStartY = addPdfHeader(doc, {
        ...baseHeader,
        title: "Executive Gym Report",
        subtitle: "Branded overview of member, finance, operations, and inventory health"
      });
      let nextY = addPdfSummaryCards(doc, [
        { label: "Total Members", value: members.length },
        { label: "Active Members", value: activeMembersCount },
        { label: "Monthly Revenue", value: formatCurrencyValue(financials.monthlyRevenue) },
        { label: "Net Revenue", value: formatCurrencyValue(financials.netRevenue) },
        { label: "Today Check-Ins", value: currentGym.stats.checkInsToday },
        { label: "Supplements", value: supplements.length }
      ], contentStartY, [71, 85, 105]);
      nextY = addPdfSectionTitle(doc, "Executive Summary", nextY + 16, [71, 85, 105], "High-level operating indicators for leadership review.");
      autoTable(doc, getPdfTableConfig(
        doc,
        [71, 85, 105],
        nextY,
        [["Overview Metric", "Value"]],
        [
          ["Paid Members", String(financials.paidMembers)],
          ["Non-Paid Members", String(financials.nonPaidMembers)],
          ["Outstanding Payments", formatCurrencyValue(financials.outstandingPayments)],
          ["POS Sales", formatCurrencyValue(financials.posSalesTotal)],
          ["Expenses", formatCurrencyValue(financials.expenseTotal)],
          ["Returns", formatCurrencyValue(financials.returnTotal)],
          ["Equipment Items", String(equipment.length)],
          ["Low Stock Alerts", String(supplementBreakdown[1].value + supplementBreakdown[2].value)]
        ]
      ));
      const revenueTableY = addPdfSectionTitle(doc, "Revenue History", doc.lastAutoTable.finalY + 18, [71, 85, 105], "Recorded monthly performance trend for the gym.");
      autoTable(doc, getPdfTableConfig(
        doc,
        [71, 85, 105],
        revenueTableY,
        [["Month", "Amount"]],
        revenueData.months.map((month, index) => [month, formatCurrencyValue(revenueData.values[index])])
      ));
      finalizePdf(doc, `${filenameBase}.pdf`);
    }
  }

  function exportSupplementsExcel() {
    const XLSX = window.__XLSX__;
    if (!XLSX) { alert("Excel export not available. Please refresh and try again."); return; }
    const header = ["Name", "SKU", "Brand", "Category", "Stock Qty", "Sell Price (LKR)", "Buy Price (LKR)", "Reorder Level", "Status", "Supplier Name", "SQN", "GRN"];
    const rows = filteredSupplements.map((s) => [
      s.name, s.sku || "", s.brand || "", s.category || "",
      s.stockQty, s.unitPrice, s.buyingPrice || 0, s.reorderLevel,
      s.status, s.supplierName || "", s.sqn || "", s.grn || ""
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplements");
    XLSX.writeFile(wb, `supplements-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function xlsxExport(header, rows, sheetName, filename) {
    const XLSX = window.__XLSX__;
    if (!XLSX) { alert("Excel export not available. Please refresh and try again."); return; }
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = header.map((h, i) => {
      const longest = rows.reduce((max, row) => Math.max(max, String(row[i] ?? "").length), String(h ?? "").length);
      return { wch: Math.min(42, Math.max(10, longest + 2)) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportActivityExcel() {
    xlsxExport(
      ["Time", "Coach", "Action", "Target Type", "Target Name", "Summary"],
      filteredActivityLogs.map((item) => [
        item.createdAt ? new Date(item.createdAt).toLocaleString() : "",
        item.actorName || "",
        item.action || "",
        item.targetType || "",
        item.targetName || "",
        item.summary || ""
      ]),
      "Coach Activity", "coach-activity"
    );
  }

  function exportCoachesExcel() {
    xlsxExport(
      ["Name", "Coach ID", "Specialty", "Email", "Members", "Status", "Employment Type", "Hire Date"],
      coaches.map((c) => [c.name, c.coachCode || "", c.specialty || "", c.email || "", c.members || 0, c.status, c.employmentType || "", c.hireDate || ""]),
      "Coaches", "coaches"
    );
  }

  function exportMembersExcel() {
    xlsxExport(
      ["Name", "Member ID", "Email", "Coach", "Plan", "Status", "Payment", "Paid (LKR)", "Due (LKR)", "Check-Ins", "Goal", "Join Date"],
      members.map((m) => [m.name, m.memberCode || "", m.email || "", m.coach || "", m.plan, m.status, m.paymentStatus, m.amountPaid || 0, m.amountDue || 0, m.checkIns || 0, m.goal || "", m.joinDate || ""]),
      "Members", "members"
    );
  }

  function exportFinanceExcel() {
    const XLSX = window.__XLSX__;
    if (!XLSX) { alert("Excel export not available. Please refresh and try again."); return; }
    const periodLabel = financePeriod === "all" ? "All Time" : financePeriod === "week" ? "This Week" : financePeriod === "month" ? "This Month" : financePeriod === "year" ? "This Year" : `${financeStart} to ${financeEnd}`;
    const wb = XLSX.utils.book_new();
    // Summary sheet
    const summaryWs = XLSX.utils.aoa_to_sheet([
      ["Period", periodLabel],
      [],
      ["Metric", "Value (LKR)"],
      ["Membership Collected", fMembershipCollected],
      ["POS Sales Total", fPosSalesTotal],
      ["Other Income", fOtherIncomeTotal],
      ["Total Revenue", totalRevenue],
      ["Operating Expenses", fExpenseTotal],
      ["POS Returns", fReturnTotal],
      ["Net Profit", netProfit],
      ["Profit Margin %", profitMarginPct],
      ["Inventory Value", inventoryValue],
      ["COGS (Period)", cogsSold],
      ["Gross Margin %", grossMarginPct],
      ["Outstanding Payments", financials.outstandingPayments || 0],
      ["Paid Members", financials.paidMembers || 0],
      ["Non-Paid Members", financials.nonPaidMembers || 0]
    ]);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
    // Sales sheet
    const salesWs = XLSX.utils.aoa_to_sheet([
      ["Date", "Customer", "Member", "Payment Method", "Items", "Subtotal", "Total", "Status"],
      ...financeFilteredSales.map(s => [
        s.soldAt ? new Date(s.soldAt).toLocaleDateString() : "",
        s.customerName || "", s.memberName || "", s.paymentMethod || "",
        (s.items || []).map(i => `${i.name || ""} x${i.qty}`).join(", "),
        s.subtotal || 0, s.total || 0, s.status || ""
      ])
    ]);
    XLSX.utils.book_append_sheet(wb, salesWs, "Sales");
    // Expenses sheet
    const expWs = XLSX.utils.aoa_to_sheet([
      ["Date", "Title", "Category", "Type", "Amount", "Payment Method", "Status", "Notes"],
      ...filteredExpenses.map(e => [
        e.expenseDate ? new Date(e.expenseDate).toLocaleDateString() : "",
        e.title || "", e.category || "", e.type || "", e.amount || 0, e.paymentMethod || "", e.status || "", e.notes || ""
      ])
    ]);
    XLSX.utils.book_append_sheet(wb, expWs, "Expenses");
    // Returns sheet
    const retWs = XLSX.utils.aoa_to_sheet([
      ["Date", "Customer", "Reason", "Items", "Amount"],
      ...financeFilteredReturns.map(r => [
        r.processedAt ? new Date(r.processedAt).toLocaleDateString() : "",
        r.customerName || "", r.reason || "",
        (r.items || []).map(i => `${i.name || ""} x${i.qty}`).join(", "),
        r.amount || 0
      ])
    ]);
    XLSX.utils.book_append_sheet(wb, retWs, "Returns");
    XLSX.writeFile(wb, `finance-${periodLabel.replace(/\s/g,"-")}-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function exportEquipmentExcel() {
    xlsxExport(
      ["Name", "Status", "Qty", "Location", "Vendor", "Serial No.", "Purchase Date", "Purchase Price (LKR)", "Next Service", "Warranty Expires"],
      equipment.map((e) => [e.name, e.status, e.qty || 1, e.location || "", e.vendor || "", e.serialNumber || "", e.purchaseDate || "", e.purchasePrice || "", e.nextServiceDate || "", e.warrantyExpiresAt || ""]),
      "Equipment", "equipment"
    );
  }

  function exportAnnouncementsExcel() {
    xlsxExport(
      ["Title", "Priority", "Audience", "Pinned", "Expires At", "CTA Label"],
      announcements.map((a) => [a.title || "", a.priority || "", a.audience || "all", a.pinned ? "Yes" : "No", a.expiresAt ? new Date(a.expiresAt).toLocaleDateString() : "Never", a.ctaLabel || ""]),
      "Announcements", "announcements"
    );
  }

  function exportPlansExcel() {
    xlsxExport(
      ["Name", "Duration (Months)", "Price (LKR)", "Features"],
      membershipPlans.map((p) => [p.name, p.durationMonths || 1, p.price || 0, Array.isArray(p.features) ? p.features.join(", ") : (p.features || "")]),
      "Plans", "membership-plans"
    );
  }

  function exportPlansPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    addPdfHeader(doc, { gymName: currentGym.name || "Gymora Gym", ownerName: profile?.name || "", location: "", generatedAt: new Date().toISOString().slice(0, 10), accent: [71, 85, 105], title: "Membership Plans", subtitle: "Active plans offered to gym members" });
    autoTable(doc, getPdfTableConfig(doc, [71, 85, 105], 140, [["Plan Name", "Duration", "Price (LKR)", "Features"]], membershipPlans.map((p) => [p.name, `${p.durationMonths || 1} month(s)`, `LKR ${Number(p.price || 0).toLocaleString()}`, Array.isArray(p.features) ? p.features.join(", ") : (p.features || "")])));
    finalizePdf(doc, `membership-plans-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportSuppliersExcel() {
    xlsxExport(
      ["Name", "Contact Name", "Phone", "Email", "Address", "Website", "Products Count"],
      supplierList.map((s) => [s.name || "", s.contactName || "", s.phone || "", s.email || "", s.address || "", s.website || "", (s.products || []).length]),
      "Suppliers", "suppliers"
    );
  }

  function exportSuppliersPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    addPdfHeader(doc, { gymName: currentGym.name || "Gymora Gym", ownerName: profile?.name || "", location: "", generatedAt: new Date().toISOString().slice(0, 10), accent: [71, 85, 105], title: "Supplier Register", subtitle: "All registered supplement suppliers" });
    autoTable(doc, getPdfTableConfig(doc, [71, 85, 105], 140, [["Name", "Contact", "Phone", "Email", "Address", "Products"]], supplierList.map((s) => [s.name || "", s.contactName || "", s.phone || "", s.email || "", s.address || "", (s.products || []).length])));
    finalizePdf(doc, `suppliers-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportSalesExcel() {
    xlsxExport(
      ["Date", "Member", "Supplement", "Qty", "Unit Price (LKR)", "Total (LKR)", "Payment Method"],
      sales.map((s) => [s.date ? new Date(s.date).toLocaleDateString() : "", s.memberName || "", s.supplementName || "", s.qty || 1, s.unitPrice || 0, s.total || 0, s.paymentMethod || ""]),
      "Sales", "pos-sales"
    );
  }

  function exportSalesPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    addPdfHeader(doc, { gymName: currentGym.name || "Gymora Gym", ownerName: profile?.name || "", location: "", generatedAt: new Date().toISOString().slice(0, 10), accent: [71, 85, 105], title: "POS Sales Report", subtitle: "Sales transactions from the gym store" });
    autoTable(doc, getPdfTableConfig(doc, [71, 85, 105], 140, [["Date", "Member", "Supplement", "Qty", "Unit Price", "Total", "Payment"]], sales.map((s) => [s.date ? new Date(s.date).toLocaleDateString() : "", s.memberName || "", s.supplementName || "", s.qty || 1, `LKR ${Number(s.unitPrice || 0).toLocaleString()}`, `LKR ${Number(s.total || 0).toLocaleString()}`, s.paymentMethod || ""])));
    finalizePdf(doc, `pos-sales-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportReturnsExcel() {
    xlsxExport(
      ["Date", "Member", "Supplement", "Qty", "Amount (LKR)", "Reason"],
      returns.map((r) => [r.date ? new Date(r.date).toLocaleDateString() : "", r.memberName || "", r.supplementName || "", r.qty || 1, r.amount || 0, r.reason || ""]),
      "Returns", "pos-returns"
    );
  }

  function exportReturnsPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    addPdfHeader(doc, { gymName: currentGym.name || "Gymora Gym", ownerName: profile?.name || "", location: "", generatedAt: new Date().toISOString().slice(0, 10), accent: [71, 85, 105], title: "Returns Report", subtitle: "Customer returns and refunds" });
    autoTable(doc, getPdfTableConfig(doc, [71, 85, 105], 140, [["Date", "Member", "Supplement", "Qty", "Amount (LKR)", "Reason"]], returns.map((r) => [r.date ? new Date(r.date).toLocaleDateString() : "", r.memberName || "", r.supplementName || "", r.qty || 1, `LKR ${Number(r.amount || 0).toLocaleString()}`, r.reason || ""])));
    finalizePdf(doc, `returns-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <DashboardShell
      isMobile={isMobile}
      accent="#2563eb"
      title={currentGym?.name || "Gymora"}
      logoUrl={currentGym?.logoUrl ? resolveImageUrl(currentGym.logoUrl) : "/gymora-logo.png"}
      subtitle="Gym Owner"
      navItems={[
        { id: "dashboard", label: "Dashboard", section: "Overview" },
        { id: "notifications", label: "Notifications", count: notificationState.unreadCount, section: "Overview", hiddenInNav: true },
        { id: "attendance", label: "Attendance", section: "People" },
        { id: "coaches", label: "Coaches", section: "People" },
        { id: "members", label: "Members", section: "People" },
        { id: "plans", label: "Membership Plans", section: "People" },
        { id: "workouts", label: "Workout Plans", section: "People" },
        { id: "meals", label: "Meal Plans", section: "People" },
        { id: "activity", label: "Coach Activity", section: "People" },
        { id: "finance", label: "Finance", section: "Operations" },
        { id: "owner-billing", label: "Billing", section: "Operations" },
        { id: "payroll", label: "Payroll", section: "Operations" },
        { id: "expenses", label: "Income & Expenses", section: "Operations" },
        { id: "owner-banks", label: "Bank Details", section: "Operations" },
        { id: "owner-bank-transactions", label: "Bank Transactions", section: "Operations" },
        { id: "equipment", label: "Equipment", section: "Operations" },
        { id: "pos", label: "POS", section: "Operations" },
        { id: "returns", label: "Returns", section: "Operations" },
        { id: "announcements", label: "Announcements", section: "Operations" },
        { id: "settings", label: "Settings", section: "Operations" },
        { id: "subscription", label: "Subscription", section: "Operations" },
        { id: "supplements", label: "Supplements", section: "Inventory" },
        { id: "suppliers", label: "Suppliers", section: "Inventory" }
      ]}
      page={page}
      setPage={setPage}
      sidebar={(
        <div style={{ marginTop: 14, padding: "12px", background: "#eff6ff", borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar initials={profile?.name?.slice(0, 2).toUpperCase() || "OW"} size={42} imageUrl={profile?.profileImageUrl || ""} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af" }}>{profile?.name || "Gym Owner"}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{currentGym.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{currentGym.stats.totalMembers} members | {currentGym.stats.coaches} coaches</div>
          </div>
        </div>
      )}
      topRight={(
        <div style={{ display: "flex", gap: 10 }}>
          <Btn small variant="ghost" onClick={logout}>→ Log out</Btn>
        </div>
      )}
    >
      {!hasGym && (
        <EmptyState
          title="No gym data yet"
          message="This owner account is active for login, but no gym has been assigned yet. Create a real gym from the Super Admin account or connect this owner to a gym record first."
        />
      )}

      {hasGym && (
        <>
          {page === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ ...responsiveGrid(isMobile, "repeat(6,1fr)", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Monthly Revenue" value={`LKR ${financials.monthlyRevenue.toLocaleString()}`} accent="#16a34a" />
                <StatCard label="Memberships" value={`LKR ${financials.membershipCollected.toLocaleString()}`} accent="#2563eb" />
                <StatCard label="Outstanding" value={`LKR ${financials.outstandingPayments.toLocaleString()}`} accent="#dc2626" />
                <StatCard label="Checked In Today" value={currentGym.stats.checkInsToday} accent="#2563eb" />
                <StatCard label="Active Members" value={currentGym.stats.activeMembers} accent="#f59e0b" />
                <StatCard label="Low Stock Alerts" value={supplementBreakdown[1].value + supplementBreakdown[2].value} accent="#7c3aed" />
              </div>
              <div style={{ ...responsiveGrid(isMobile, "1.6fr 1fr"), gap: 20 }}>
                <Card style={{ overflow: "hidden", padding: 0 }}>
                  <div style={{ padding: isMobile ? 18 : 24, background: "linear-gradient(135deg, #dbeafe, #ffffff 58%)", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center" }}>
                      <div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "rgba(37, 99, 235, 0.12)", color: "#1d4ed8", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          Performance Pulse
                        </div>
                        <div style={{ marginTop: 12, fontSize: isMobile ? 24 : 30, fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a" }}>{currentGym.name}</div>
                        <div style={{ marginTop: 8, fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
                          A denser operating view for membership health, attendance movement, and revenue momentum.
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
                        <MacroPill label="Net Revenue" value={`LKR ${financials.netRevenue.toLocaleString()}`} tone="#7c3aed" />
                        <MacroPill label="New This Month" value={currentGym.stats.newThisMonth} tone="#16a34a" />
                        <MacroPill label="Plans" value={membershipPlans.length} tone="#ea580c" />
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: isMobile ? 18 : 24 }}>
                    <div style={{ marginBottom: 12, fontSize: 13, color: "var(--muted)" }}>
                      Revenue history across tracked months
                    </div>
                    <MiniChart data={revenueData.values} labels={revenueData.months} color="#2563eb" height={120} />
                    <div style={{ marginTop: 14 }}>
                      <BarChart data={revenueData.values} labels={revenueData.months} color="#93c5fd" height={130} />
                    </div>
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Operations Radar" />
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "space-between" }}>
                    <RingStat value={paidCoveragePercent} max={100} color="#16a34a" label="Payments" />
                    <RingStat value={checkedInTodayPercent} max={100} color="#2563eb" label="Attendance" />
                    <RingStat value={stockHealthyPercent} max={100} color="#7c3aed" label="Inventory" />
                  </div>
                  <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Paid member coverage</span>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>{financials.paidMembers}/{members.length || 0}</span>
                      </div>
                      <ProgressBar value={paidCoveragePercent} color="#16a34a" height={8} />
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Today&apos;s attendance coverage</span>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>{currentGym.stats.checkInsToday}/{activeMembersCount || 0}</span>
                      </div>
                      <ProgressBar value={checkedInTodayPercent} color="#2563eb" height={8} />
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Healthy inventory rate</span>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>{supplementBreakdown[0].value}/{supplements.length || 0}</span>
                      </div>
                      <ProgressBar value={stockHealthyPercent} color="#7c3aed" height={8} />
                    </div>
                  </div>
                </Card>
              </div>

              {/* ── Attendance Trend + Member Status ── */}
              <div style={{ ...responsiveGrid(isMobile, "1.4fr 1fr"), gap: 20 }}>
                <Card>
                  <SectionHeader title="Attendance Trend — Last 14 Days" />
                  <MiniChart data={attendanceTrendValues} labels={attendanceTrendLabels} color="#2563eb" height={110} />
                  <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)"), gap: 10, marginTop: 14 }}>
                    <InfoTile label="Peak Day" value={String(Math.max(0, ...attendanceTrendValues))} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Avg / Day" value={(attendanceTrendValues.reduce((s, v) => s + v, 0) / 14).toFixed(1)} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Total (14d)" value={String(attendanceTrendValues.reduce((s, v) => s + v, 0))} tone="#7c3aed" soft="#f5f3ff" />
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Member Status" />
                  <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                    <DonutChart segments={memberStatusSegments} size={130} thickness={24} />
                    <div style={{ flex: 1, minWidth: 100, display: "flex", flexDirection: "column", gap: 10 }}>
                      {memberStatusSegments.map(seg => (
                        <div key={seg.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 9, height: 9, borderRadius: 2, background: seg.color, display: "inline-block", flexShrink: 0 }} />
                              {seg.label}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: seg.color }}>{seg.value}</span>
                          </div>
                          <ProgressBar value={members.length ? (seg.value / members.length) * 100 : 0} color={seg.color} height={6} />
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              <div style={{ ...responsiveGrid(isMobile, "1.2fr 1fr"), gap: 20 }}>
                <Card>
                  <SectionHeader title="Business Snapshot" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {businessMix.map((item) => (
                      <div key={item.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{item.label}</span>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>LKR {item.value.toLocaleString()}</span>
                        </div>
                        <ProgressBar value={(item.value / businessMixMax) * 100} color={item.color} height={8} />
                      </div>
                    ))}
                    <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 12, marginTop: 6 }}>
                      {paymentBreakdown.map((item) => (
                        <InfoTile key={item.label} label={item.label} value={`${item.value} members`} tone={item.color} soft={`${item.color}12`} />
                      ))}
                    </div>
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Membership Mix" />
                  <BarChart data={membershipMixValues} labels={membershipMixLabels} color="#2563eb" height={140} />
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    {(memberPlanCounts.length ? memberPlanCounts : [{ name: "No active plans", count: 0, value: 0, color: "#94a3b8" }]).map((plan) => (
                      <div key={plan.name}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{plan.name}</span>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>{plan.count} members</span>
                        </div>
                        <ProgressBar value={members.length ? (plan.count / members.length) * 100 : 0} color={plan.color || "#2563eb"} height={7} />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* ── Member Growth + Revenue vs Expenses + Equipment Status + Expense Breakdown ── */}
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 20 }}>
                <Card>
                  <SectionHeader title="Member Growth — Last 6 Months" />
                  <BarChart data={memberGrowthValues} labels={memberGrowthLabels} color="#16a34a" height={130} />
                  <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
                    <strong style={{ color: "var(--text)" }}>{memberGrowthValues.reduce((s, v) => s + v, 0)}</strong> new members joined in the last 6 months
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Revenue vs Expenses — Last 6 Months" />
                  <DualBarChart
                    dataA={revenueByMonthValues}
                    dataB={expenseByMonthValues}
                    labels={memberGrowthLabels}
                    colorA="#2563eb"
                    colorB="#f59e0b"
                    height={130}
                    labelA="Revenue"
                    labelB="Expenses"
                  />
                </Card>
              </div>
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 20 }}>
                <Card>
                  <SectionHeader title="Equipment Status" />
                  <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                    <DonutChart segments={equipmentStatusSegments} size={120} thickness={22} />
                    <div style={{ flex: 1, minWidth: 100, display: "flex", flexDirection: "column", gap: 10 }}>
                      {equipmentStatusSegments.map(seg => (
                        <div key={seg.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 9, height: 9, borderRadius: 2, background: seg.color, display: "inline-block", flexShrink: 0 }} />
                              {seg.label}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: seg.color }}>{seg.value}</span>
                          </div>
                          <ProgressBar value={equipment.length ? (seg.value / equipment.length) * 100 : 0} color={seg.color} height={6} />
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Top Expense Categories" />
                  {topExpenseCats.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>No expense data yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {topExpenseCats.map(([cat, amount]) => (
                        <div key={cat}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{cat}</span>
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>LKR {amount.toLocaleString()}</span>
                          </div>
                          <ProgressBar value={(amount / maxExpenseCat) * 100} color="#ea580c" height={7} />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))"), gap: 20 }}>
                <Card>
                  <SectionHeader title="Coach Load" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {coachLoad.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>No coaches added yet.</div>
                    ) : coachLoad.map((coach) => (
                      <div key={coach.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{coach.name}</span>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>{coach.members} members</span>
                        </div>
                        <ProgressBar value={(Number(coach.members || 0) / peakCoachMembers) * 100} color="#16a34a" height={7} />
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Inventory Health" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {supplementBreakdown.map((item) => (
                      <div key={item.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{item.label}</span>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>{item.value} items</span>
                        </div>
                        <ProgressBar value={supplements.length ? (item.value / supplements.length) * 100 : 0} color={item.color} height={7} />
                      </div>
                    ))}
                    <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 12, marginTop: 6 }}>
                      {attendanceBreakdown.map((item) => (
                        <InfoTile key={item.label} label={item.label} value={`${item.value} sessions`} tone={item.color} soft={`${item.color}12`} />
                      ))}
                    </div>
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Recent Alerts" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {recentAlerts.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>No active alerts right now.</div>
                    ) : recentAlerts.map((item) => (
                      <div key={item.id} style={{ padding: "12px 14px", borderRadius: 14, background: "#f8fafc", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{item.title}</div>
                          <Badge label={item.severity || "info"} type={item.severity || "info"} />
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{item.body}</div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Coach Activity" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {recentCoachActivity.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>Coach actions will appear here once they start working with members and plans.</div>
                    ) : recentCoachActivity.map((item) => (
                      <div key={item.id} style={{ padding: "12px 14px", borderRadius: 14, background: "#f8fafc", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{item.actorName}</div>
                          <Badge label={String(item.action || "update").replace(/-/g, " ")} type="info" />
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{item.summary}</div>
                        <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Top Members by Attendance" />
                  {topMembersByAttendance.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>No attendance data yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {topMembersByAttendance.map((m, i) => (
                        <div key={m.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, width: 18, height: 18, borderRadius: "50%", background: i === 0 ? "#f59e0b" : "#e2e8f0", color: i === 0 ? "#92400e" : "#64748b", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                              {m.name}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>{m.checkIns || 0} check-ins</span>
                          </div>
                          <ProgressBar value={(Number(m.checkIns || 0) / peakMemberCheckIns) * 100} color="#2563eb" height={6} />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                <Card>
                  <SectionHeader title="Plans Overview" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Workout Plans ({workoutPlans.length})</div>
                      {workoutLevelBreakdown.map(item => (
                        <div key={item.label} style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: "inline-block", flexShrink: 0 }} />
                              {item.label}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>{item.value}</span>
                          </div>
                          <ProgressBar value={workoutPlans.length ? (item.value / workoutPlans.length) * 100 : 0} color={item.color} height={5} />
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Meal Plans ({mealPlans.length})</div>
                      {mealGoalBreakdown.length === 0 ? (
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>No meal plans yet.</div>
                      ) : mealGoalBreakdown.map(item => (
                        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 8, background: "#f8fafc", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>{item.value} plan{item.value !== 1 ? "s" : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              {/* ── Expiring Members + Recent Sales ── */}
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 20 }}>
                <Card>
                  <SectionHeader title="Members Expiring — Next 30 Days" />
                  {expiringMembers.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>No members expiring in the next 30 days. Great retention!</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {expiringMembers.map(m => {
                        const daysLeft = Math.ceil((new Date(m.planExpiresAt) - todayDate) / 86400000);
                        return (
                          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12, background: daysLeft <= 7 ? "#fff5f5" : "#f8fafc", border: `1px solid ${daysLeft <= 7 ? "#fecaca" : "var(--border)"}` }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{m.name}</div>
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{m.plan || "No plan"} · {m.coach || "No coach"}</div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: daysLeft <= 7 ? "#dc2626" : "#f59e0b" }}>{daysLeft}d left</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(m.planExpiresAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
                <Card>
                  <SectionHeader title="Recent POS Sales" />
                  {recentSalesList.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>No sales recorded yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {recentSalesList.map((sale, i) => (
                        <div key={sale.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid var(--border)" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{sale.memberName || "Walk-in"}</div>
                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{sale.supplementName || (Array.isArray(sale.items) && sale.items.length > 0 ? `${sale.items.length} item(s)` : "Item")}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#16a34a" }}>LKR {Number(sale.total || 0).toLocaleString()}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{sale.soldAt ? new Date(sale.soldAt).toLocaleDateString() : ""}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {page === "activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Total Events" value={activityLogs.length} accent="#2563eb" />
                <StatCard label="Today's Events" value={activityTodayCount} accent="#16a34a" />
                <StatCard label="Coaches Tracked" value={new Set(activityLogs.map((item) => item.actorName).filter(Boolean)).size} accent="#7c3aed" />
                <StatCard label="Action Types" value={activityActionOptions.length} accent="#ea580c" />
              </div>
              <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))"), gap: 16 }}>
                <InfoTile label="Visible Events" value={String(filteredActivityLogs.length)} tone="#2563eb" soft="#eff6ff" />
                <InfoTile label="Most Active Coach" value={mostActiveCoach} tone="#16a34a" soft="#f0fdf4" />
                <InfoTile label="Most Common Action" value={mostCommonAction} tone="#7c3aed" soft="#f5f3ff" />
              </div>

              {coachActivityBreakdown.length > 0 && (
                <Card>
                  <SectionHeader title="Activity by Coach" subtitle="Event count per coach for the current filter" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {coachActivityBreakdown.map((c) => (
                      <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 140, fontSize: 13, fontWeight: 600, color: "var(--text)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                        <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 6, height: 10, overflow: "hidden" }}>
                          <div style={{ width: `${Math.round((c.count / maxCoachActivityCount) * 100)}%`, height: "100%", background: "#2563eb", borderRadius: 6, transition: "width 0.3s" }} />
                        </div>
                        <div style={{ width: 36, fontSize: 13, fontWeight: 700, color: "#2563eb", textAlign: "right", flexShrink: 0 }}>{c.count}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card style={{ padding: 0 }}>
                <div style={{ padding: "20px 20px 0" }}>
                  <SectionHeader title="Audit Feed" />
                  <Toolbar
                    search={activitySearch}
                    setSearch={setActivitySearch}
                    searchPlaceholder="Search coach, member, action, or summary"
                    filters={[
                      {
                        label: "Coach",
                        value: activityCoachFilter,
                        onChange: setActivityCoachFilter,
                        options: [
                          { value: "all", label: "All Coaches" },
                          ...coaches.map((coach) => ({ value: coach.name, label: coach.name }))
                        ]
                      },
                      {
                        label: "Action",
                        value: activityActionFilter,
                        onChange: setActivityActionFilter,
                        options: [
                          { value: "all", label: "All Actions" },
                          ...activityActionOptions.map((action) => ({ value: action, label: String(action).replace(/-/g, " ") }))
                        ]
                      },
                      {
                        label: "Period",
                        value: activityDateRange,
                        onChange: setActivityDateRange,
                        options: [
                          { value: "all", label: "All Time" },
                          { value: "today", label: "Today" },
                          { value: "7days", label: "Last 7 Days" },
                          { value: "30days", label: "Last 30 Days" }
                        ]
                      }
                    ]}
                    action={<SpreadsheetExportButton compact onClick={exportActivityExcel} label="Activity" />}
                  />
                </div>
                {pagedActivityLogs.visibleItems.length === 0 ? (
                  <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
                    No coach activity matches the current filters.
                  </div>
                ) : (
                  <Table
                    headers={["Time", "Coach", "Action", "Target Type", "Target", "Summary", ""]}
                    rows={pagedActivityLogs.visibleItems.map((item) => {
                      const action = String(item.action || "update");
                      const actionType = /create|add|check-in/.test(action) ? "success" : /delete|remove/.test(action) ? "inactive" : /reset|password/.test(action) ? "warning" : "info";
                      return [
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : ""}</div>
                        </div>,
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.actorName || "—"}</div>,
                        <Badge label={action.replace(/-/g, " ")} type={actionType} />,
                        <Badge label={item.targetType || "—"} type="default" />,
                        <span style={{ fontSize: 13, color: "var(--text)" }}>{item.targetName || "—"}</span>,
                        <span style={{ fontSize: 12, color: "var(--muted)", maxWidth: 260, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.summary}</span>,
                        <IconBtn title="View Details" onClick={() => setActivityDetail(item)}><IcoView /></IconBtn>
                      ];
                    })}
                  />
                )}
                <div style={{ padding: "12px 20px" }}>
                  <PaginationControls page={activityPage} totalPages={pagedActivityLogs.totalPages} onPageChange={setActivityPage} totalItems={filteredActivityLogs.length} label="events" />
                </div>
              </Card>
            </div>
          )}

          {page === "settings" && profile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ ...responsiveGrid(isMobile, "1.2fr 1fr"), gap: 20 }}>
                <ProfileHeroCard
                  title={profile.name}
                  subtitle={profile.title || "Gym Owner"}
                  badge={<Badge label={profile.plan || "Plan not set"} />}
                  accent="#2563eb"
                  soft="#eff6ff"
                  initials={profile?.name?.slice(0, 2).toUpperCase() || "OW"}
                  imageUrl={profile?.profileImageUrl || ""}
                  highlights={[
                    { label: "Members", value: currentGym.stats.totalMembers, tone: "#2563eb", soft: "#eff6ff" },
                    { label: "Coaches", value: currentGym.stats.coaches, tone: "#16a34a", soft: "#f0fdf4" },
                    { label: "Monthly Revenue", value: `LKR ${Number(currentGym.stats.monthlyRevenue || 0).toLocaleString()}`, tone: "#7c3aed", soft: "#f5f3ff" },
                    { label: "Alerts", value: notifications.length, tone: "#f59e0b", soft: "#fffbeb" }
                  ]}
                  action={(
                    <>
                      <Btn small variant="ghost" onClick={openProfileModal}>Edit Profile</Btn>
                    </>
                  )}
                >
                  <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 12 }}>
                    <InfoTile label="Email" value={profile.email} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Phone" value={profile.phone || "Not provided"} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Gym" value={profile.gymName || currentGym.name} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Location" value={profile.location || "Not set"} tone="#ea580c" soft="#fff7ed" />
                  </div>
                  <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Bio</div>
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7 }}>{profile.bio || "No bio added yet."}</div>
                  </div>
                </ProfileHeroCard>
                <ProfileSection title="Gym Snapshot" description="Performance indicators for the gym tied to this owner account.">
                  <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 14 }}>
                    <StatCard label="Members" value={currentGym.stats.totalMembers} accent="#2563eb" />
                    <StatCard label="Coaches" value={currentGym.stats.coaches} accent="#16a34a" />
                    <StatCard label="Alerts" value={notifications.length} accent="#f59e0b" />
                    <StatCard label="Supplements" value={supplements.length} accent="#7c3aed" />
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <DetailStack
                      items={[
                        { label: "Operational Focus", value: currentGym.name, helper: `${currentGym.stats.activeMembers} active members currently tied to this gym.` },
                        { label: "Revenue Health", value: `LKR ${financials.netRevenue.toLocaleString()}`, helper: "Net revenue combines membership collections, POS sales, expenses, and returns." },
                        { label: "Outstanding Balance", value: `LKR ${financials.outstandingPayments.toLocaleString()}`, helper: `${financials.nonPaidMembers} member accounts still require payment follow-up.` }
                      ]}
                    />
                  </div>
                </ProfileSection>
              </div>
            </div>
          )}

          {page === "notifications" && (
            notifications.length === 0 ? (
              <EmptyState title="No notifications yet" message="Attendance, expiring plans, missed payments, equipment service, and low-stock alerts will appear here." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: isMobile ? "100%" : 860 }}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Btn small variant="ghost" onClick={notificationState.markAllRead}>Mark All Read</Btn>
                </div>
                {pagedNotifications.visibleItems.map((item) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    isRead={notificationState.isRead(item.id)}
                    onMarkRead={() => notificationState.markRead(item.id)}
                  />
                ))}
                <PaginationControls page={pagedNotifications.page} totalPages={pagedNotifications.totalPages} onPageChange={setNotificationPage} totalItems={notifications.length} label="alerts" />
              </div>
            )
          )}

          {page === "attendance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Sub-tab row */}
              <div style={{ display: "flex", gap: 4, background: "var(--border)", borderRadius: 12, padding: 4, alignSelf: "flex-start" }}>
                {[["records","Attendance Records"],["leaves","Leave Management"]].map(([tab, label]) => (
                  <button key={tab} onClick={() => { setAttendanceSubTab(tab); if (tab === "leaves" && coachLeaves.length === 0 && !coachLeavesLoading) { setCoachLeavesLoading(true); apiFetch("/api/owner/coach-leaves").then(d => setCoachLeaves(Array.isArray(d) ? d : [])).catch(()=>{}).finally(()=>setCoachLeavesLoading(false)); } }}
                    style={{ padding: "7px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", background: attendanceSubTab === tab ? "var(--bg)" : "transparent", color: attendanceSubTab === tab ? "#2563eb" : "var(--muted)", boxShadow: attendanceSubTab === tab ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Mark Coach Attendance Modal ── */}
              {markCoachAttModal && (
                <Modal title="Mark Coach Attendance" onClose={() => { setMarkCoachAttModal(false); setMarkCoachAttError(""); }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <FormField label="Coach">
                      <Select value={markCoachAttForm.coachId} onChange={(e) => setMarkCoachAttForm((p) => ({ ...p, coachId: e.target.value }))}>
                        <option value="">Select a coach…</option>
                        {coaches.map((c) => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Date">
                      <Input type="date" value={markCoachAttForm.date} onChange={(e) => setMarkCoachAttForm((p) => ({ ...p, date: e.target.value }))} />
                    </FormField>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <FormField label="Clock In">
                        <Input type="time" value={markCoachAttForm.clockIn} onChange={(e) => setMarkCoachAttForm((p) => ({ ...p, clockIn: e.target.value }))} />
                      </FormField>
                      <FormField label="Clock Out (optional)">
                        <Input type="time" value={markCoachAttForm.clockOut} onChange={(e) => setMarkCoachAttForm((p) => ({ ...p, clockOut: e.target.value }))} />
                      </FormField>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <FormField label="Break Start (optional)">
                        <Input type="time" value={markCoachAttForm.breakStart} onChange={(e) => setMarkCoachAttForm((p) => ({ ...p, breakStart: e.target.value }))} />
                      </FormField>
                      <FormField label="Break End (optional)">
                        <Input type="time" value={markCoachAttForm.breakEnd} onChange={(e) => setMarkCoachAttForm((p) => ({ ...p, breakEnd: e.target.value }))} />
                      </FormField>
                    </div>
                    {markCoachAttError && <div style={{ fontSize: 13, color: "#dc2626" }}>{markCoachAttError}</div>}
                    <div style={{ display: "flex", gap: 10 }}>
                      <Btn onClick={saveMarkCoachAttendance} disabled={markCoachAttSaving}>{markCoachAttSaving ? "Saving…" : "Save Attendance"}</Btn>
                      <Btn variant="ghost" onClick={() => { setMarkCoachAttModal(false); setMarkCoachAttError(""); }}>Cancel</Btn>
                    </div>
                  </div>
                </Modal>
              )}

              {attendanceSubTab === "leaves" && (() => {
                const leaveTypeColors = { sick: "#dc2626", vacation: "#2563eb", personal: "#7c3aed", unpaid: "#f59e0b", emergency: "#ea580c" };
                const leaveTypeBg = { sick: "#fef2f2", vacation: "#eff6ff", personal: "#f5f3ff", unpaid: "#fffbeb", emergency: "#fff7ed" };
                const leaveStatusColors = { pending: "#f59e0b", approved: "#16a34a", rejected: "#dc2626" };
                const now = new Date();
                const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
                const filteredLeaves = coachLeaves.filter(l => {
                  if (leaveCoachFilter !== "all" && l.coach !== leaveCoachFilter && l.coachName !== leaveCoachFilter) return false;
                  if (leaveStatusFilter !== "all" && l.status !== leaveStatusFilter) return false;
                  if (leaveMonthFilter) {
                    const lm = (l.startDate||"").slice(0,7);
                    if (lm !== leaveMonthFilter) return false;
                  }
                  return true;
                });
                const pagedLeaves = paginateItems(filteredLeaves, leavePage);
                const pendingCount = coachLeaves.filter(l => l.status === "pending").length;
                const approvedCount = coachLeaves.filter(l => l.status === "approved").length;
                const sickThisMonth = coachLeaves.filter(l => l.leaveType === "sick" && (l.startDate||"").slice(0,7) === thisMonth).reduce((s,l) => s + (l.totalDays||1), 0);

                async function handleLeaveAction(id, status, ownerNotes = "") {
                  try {
                    await apiFetch(`/api/owner/coach-leaves/${id}`, { method: "PATCH", body: JSON.stringify({ status, ownerNotes }) });
                    setCoachLeaves(prev => prev.map(l => String(l._id) === String(id) ? { ...l, status, ownerNotes } : l));
                  } catch {}
                }

                async function handleDeleteLeave(id) {
                  try {
                    await apiFetch(`/api/owner/coach-leaves/${id}`, { method: "DELETE" });
                    setCoachLeaves(prev => prev.filter(l => String(l._id) !== String(id)));
                  } catch {}
                }

                async function saveLeave() {
                  if (!leaveForm.coachId || !leaveForm.leaveType || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) { setLeaveFormError("All fields marked * are required."); return; }
                  setLeaveFormSaving(true); setLeaveFormError("");
                  try {
                    const coach = coaches.find(c => String(c.id || c._id) === leaveForm.coachId);
                    const res = await apiFetch("/api/owner/coach-leaves", { method: "POST", body: JSON.stringify({ ...leaveForm, coachName: coach?.name || "" }) });
                    setCoachLeaves(prev => [{ ...leaveForm, _id: res.id, coachName: coach?.name || "", status: "approved", totalDays: Math.max(1, Math.round((new Date(leaveForm.endDate) - new Date(leaveForm.startDate)) / 86400000) + 1) }, ...prev]);
                    setLeaveModal(null);
                  } catch (e) { setLeaveFormError(e.message || "Failed to save."); }
                  finally { setLeaveFormSaving(false); }
                }

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)","repeat(2,1fr)"), gap: 14 }}>
                      <StatCard label="Total Requests" value={coachLeaves.length} accent="#2563eb" />
                      <StatCard label="Pending Approval" value={pendingCount} accent="#f59e0b" />
                      <StatCard label="Approved" value={approvedCount} accent="#16a34a" />
                      <StatCard label="Sick Days This Month" value={sickThisMonth} accent="#dc2626" />
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Select value={leaveCoachFilter} onChange={e => setLeaveCoachFilter(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
                          <option value="all">All Coaches</option>
                          {coaches.map(c => <option key={c.id||c._id} value={c.name}>{c.name}</option>)}
                        </Select>
                        <Select value={leaveStatusFilter} onChange={e => setLeaveStatusFilter(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </Select>
                        <input type="month" value={leaveMonthFilter} onChange={e => setLeaveMonthFilter(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
                      </div>
                      <Btn small onClick={() => { setLeaveForm({ coachId: "", leaveType: "sick", startDate: "", endDate: "", reason: "", ownerNotes: "" }); setLeaveFormError(""); setLeaveModal("create"); }}>+ Add Leave</Btn>
                    </div>
                    {coachLeavesLoading ? (
                      <div style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Loading leave records…</div>
                    ) : filteredLeaves.length === 0 ? (
                      <EmptyState title="No leave records" message="Coach leave requests will appear here. Add one manually or wait for coaches to submit requests." />
                    ) : (
                      <>
                        <Card style={{ padding: 0 }}>
                          <Table
                            headers={["Coach", "Type", "Start", "End", "Days", "Reason", "Status", "Actions"]}
                            rows={pagedLeaves.visibleItems.map(l => [
                              <span style={{ fontWeight: 700 }}>{l.coachName}</span>,
                              <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: leaveTypeBg[l.leaveType] || "#f1f5f9", color: leaveTypeColors[l.leaveType] || "#64748b" }}>{(l.leaveType||"").charAt(0).toUpperCase()+(l.leaveType||"").slice(1)}</span>,
                              l.startDate ? new Date(l.startDate).toLocaleDateString() : "—",
                              l.endDate ? new Date(l.endDate).toLocaleDateString() : "—",
                              <span style={{ fontWeight: 700 }}>{l.totalDays || 1}</span>,
                              <span style={{ fontSize: 12, maxWidth: 160, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.reason}</span>,
                              <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: l.status === "approved" ? "#f0fdf4" : l.status === "rejected" ? "#fef2f2" : "#fffbeb", color: leaveStatusColors[l.status] || "#64748b" }}>{(l.status||"").charAt(0).toUpperCase()+(l.status||"").slice(1)}</span>,
                              <div style={{ display: "flex", gap: 4 }}>
                                {l.status === "pending" && <>
                                  <Btn small onClick={() => handleLeaveAction(l._id, "approved")}>Approve</Btn>
                                  <Btn small variant="ghost" onClick={() => handleLeaveAction(l._id, "rejected")}>Reject</Btn>
                                </>}
                                <IconBtn title="Delete" danger onClick={() => handleDeleteLeave(l._id)}><IcoTrash /></IconBtn>
                              </div>
                            ])}
                          />
                        </Card>
                        <PaginationControls page={pagedLeaves.page} totalPages={pagedLeaves.totalPages} onPageChange={setLeavePage} totalItems={filteredLeaves.length} label="leave records" />
                      </>
                    )}
                  </div>
                );
              })()}

              {attendanceSubTab === "records" && <>
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Open Sessions" value={checkedInSessions.length} accent="#2563eb" />
                <StatCard label="Closed Sessions" value={checkedOutSessions.length} accent="#16a34a" />
                <StatCard label="Today's Check-ins" value={currentGym.stats.checkInsToday} accent="#7c3aed" />
                <StatCard label="Total Records" value={attendance.length} accent="#ea580c" />
              </div>

              {/* Date filter pills */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {["today", "week", "month", "custom"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setAttendanceDateFilter(f)}
                    style={{ padding: "6px 16px", borderRadius: 20, border: attendanceDateFilter === f ? "none" : "1px solid var(--border)", background: attendanceDateFilter === f ? "#2563eb" : "transparent", color: attendanceDateFilter === f ? "#fff" : "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    {f === "today" ? "Today" : f === "week" ? "This Week" : f === "month" ? "This Month" : "Custom Range"}
                  </button>
                ))}
                {attendanceDateFilter === "custom" && (
                  <>
                    <input type="date" value={attendanceDateFrom} onChange={(e) => setAttendanceDateFrom(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }} />
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>to</span>
                    <input type="date" value={attendanceDateTo} onChange={(e) => setAttendanceDateTo(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }} />
                  </>
                )}
                {attendanceLiveLoading && <span style={{ fontSize: 12, color: "var(--muted)" }}>Loading…</span>}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "2px solid var(--border)" }}>
                {["members", "coaches"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAttendanceTab(tab)}
                    style={{ padding: "10px 20px", background: "none", border: "none", borderBottom: attendanceTab === tab ? "2px solid #2563eb" : "2px solid transparent", marginBottom: -2, fontWeight: 700, fontSize: 14, color: attendanceTab === tab ? "#2563eb" : "var(--muted)", cursor: "pointer" }}
                  >
                    {tab === "members" ? "👥 Member Attendance" : "🏋️ Coach Attendance"}
                  </button>
                ))}
              </div>

              {attendanceTab === "members" && (
                <>
                  <AttendanceMemberLookupCard
                    query={attendanceMemberQuery}
                    onQueryChange={setAttendanceMemberQuery}
                    members={members}
                    selectedMemberId={attendanceMemberId}
                    onSelect={setAttendanceMemberId}
                    attendance={attendance}
                    onSubmit={submitAttendanceCheckIn}
                  />
                  <Toolbar
                    search={attendanceSearch}
                    setSearch={setAttendanceSearch}
                    searchPlaceholder="Search by member name, coach, or session"
                    filters={[
                      {
                        label: "Status",
                        value: attendanceStatus,
                        onChange: setAttendanceStatus,
                        options: [
                          { value: "all", label: "All Statuses" },
                          { value: "checked-in", label: "Checked In" },
                          { value: "checked-out", label: "Checked Out" }
                        ]
                      }
                    ]}
                    action={(
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <ExportButtonGroup>
                          <SpreadsheetExportButton compact onClick={exportAttendanceExcel} label="Attendance" />
                          <ReportExportButton compact onClick={exportAttendancePdf} label="Attendance" />
                        </ExportButtonGroup>
                        <Btn small variant="ghost" onClick={() => setAttendanceImportModal(true)}>&#x2B06; Import Excel</Btn>
                      </div>
                    )}
                  />
                  <div style={{ ...responsiveGrid(isMobile, "1.1fr 0.9fr"), gap: 16 }}>
                    <Card style={{ padding: 0 }}>
                      <Table
                        headers={["Member", "Coach", "Session #", "Check In", "Check Out", "Break", "Status", "Actions"]}
                        rows={(attendanceLiveRecords || pagedAttendance.visibleItems).filter((item) => {
                          const q = attendanceSearch.toLowerCase();
                          if (q && !item.member?.toLowerCase().includes(q) && !item.coachName?.toLowerCase().includes(q)) return false;
                          if (attendanceStatus !== "all" && item.status !== attendanceStatus) return false;
                          return true;
                        }).map((item) => [
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar initials={(item.member || "MB").slice(0, 2).toUpperCase()} size={30} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{item.member}</div>
                            </div>
                          </div>,
                          <span style={{ fontSize: 12 }}>{item.coachName}</span>,
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>#{item.sessionNumber || 1}</span>,
                          <span style={{ fontSize: 12 }}>{item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : item.time}</span>,
                          <span style={{ fontSize: 12 }}>{item.checkOutAt ? new Date(item.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : <span style={{ color: "#16a34a" }}>Still inside</span>}</span>,
                          item.breakStart ? (
                            <span style={{ fontSize: 11, background: "#fef9c3", color: "#a16207", padding: "2px 8px", borderRadius: 8 }}>
                              {item.breakEnd ? `Break: ${new Date(item.breakStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(item.breakEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "On Break"}
                            </span>
                          ) : <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span>,
                          <Badge label={item.status} type={item.status} />,
                          item.status === "checked-in"
                            ? (
                              <div style={{ display: "flex", gap: 4 }}>
                                <IconBtn title="Clock Out" onClick={() => clockOutMember(item.id)}><IcoClock /></IconBtn>
                                {(!item.breakStart || item.breakEnd)
                                  ? <IconBtn title="Start Break" onClick={() => memberStartBreak(item.id)}><IcoCoffee /></IconBtn>
                                  : <IconBtn title="End Break" onClick={() => memberEndBreak(item.id)}><IcoCheck /></IconBtn>
                                }
                              </div>
                            )
                            : <span style={{ fontSize: 12, color: "var(--muted)" }}>Closed</span>
                        ])}
                      />
                    </Card>
                    <Card>
                      <SectionHeader title="Live Floor Snapshot" />
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {checkedInSessions.length === 0 ? (
                          <div style={{ fontSize: 13, color: "var(--muted)" }}>No members are currently checked in.</div>
                        ) : checkedInSessions.slice(0, 8).map((item) => (
                          <div key={item.id} style={{ padding: "12px 14px", borderRadius: 14, background: "#f8fafc", border: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{item.member}</div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <Badge label={item.status} type={item.status} />
                                {item.sessionNumber > 1 && <span style={{ fontSize: 11, background: "#ede9fe", color: "#7c3aed", padding: "2px 6px", borderRadius: 6 }}>Session #{item.sessionNumber}</span>}
                              </div>
                            </div>
                            <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>Coach: {item.coachName || "Unassigned"}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>Started: {item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString() : item.time}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                  <PaginationControls page={pagedAttendance.page} totalPages={pagedAttendance.totalPages} onPageChange={setAttendancePage} totalItems={filteredAttendance.length} label="sessions" />
                </>
              )}

              {attendanceTab === "coaches" && (() => {
                const allCoachRecs = coachAttendanceLiveRecords || [];
                const filteredCoachAtt = allCoachRecs.filter((item) => {
                  const q = coachAttSearch.toLowerCase();
                  if (q && !(item.coachName || "").toLowerCase().includes(q)) return false;
                  if (coachAttStatus !== "all" && item.status !== coachAttStatus) return false;
                  return true;
                });
                const pagedCoachAtt = paginateItems(filteredCoachAtt, coachAttPage);
                const clockedInNow = allCoachRecs.filter((r) => r.status === "clocked-in");
                const onBreakNow = allCoachRecs.filter((r) => r.status === "on-break");
                const clockedOutCount = allCoachRecs.filter((r) => r.status === "clocked-out").length;
                const totalWorkMin = allCoachRecs.reduce((s, r) => s + (r.totalWorkMinutes || 0), 0);
                // Per-coach summary (for the current period)
                const coachSummaryMap = {};
                allCoachRecs.forEach((r) => {
                  if (!coachSummaryMap[r.coachName]) coachSummaryMap[r.coachName] = { days: 0, totalMin: 0, breakMin: 0 };
                  if (r.status === "clocked-out") coachSummaryMap[r.coachName].days++;
                  coachSummaryMap[r.coachName].totalMin += r.totalWorkMinutes || 0;
                  coachSummaryMap[r.coachName].breakMin += r.breakMinutes || 0;
                });
                const coachSummaryList = Object.entries(coachSummaryMap)
                  .map(([name, v]) => ({ name, ...v }))
                  .sort((a, b) => b.totalMin - a.totalMin);
                return (
                  <>
                    {/* KPI row */}
                    <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                      <StatCard label="Total Records" value={allCoachRecs.length} accent="#2563eb" />
                      <StatCard label="Clocked In Now" value={clockedInNow.length} accent="#16a34a" />
                      <StatCard label="On Break Now" value={onBreakNow.length} accent="#f59e0b" />
                      <StatCard label="Total Work Hours" value={`${Math.floor(totalWorkMin / 60)}h ${totalWorkMin % 60}m`} accent="#7c3aed" />
                    </div>

                    {/* Toolbar */}
                    <Toolbar
                      search={coachAttSearch}
                      setSearch={setCoachAttSearch}
                      searchPlaceholder="Search by coach name…"
                      filters={[
                        {
                          label: "Status",
                          value: coachAttStatus,
                          onChange: setCoachAttStatus,
                          options: [
                            { value: "all", label: "All Statuses" },
                            { value: "clocked-in", label: "Clocked In" },
                            { value: "on-break", label: "On Break" },
                            { value: "clocked-out", label: "Clocked Out" }
                          ]
                        }
                      ]}
                      action={(
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Btn small onClick={openMarkCoachAttendance}>+ Mark Attendance</Btn>
                          <ExportButtonGroup>
                            <SpreadsheetExportButton compact onClick={() => exportCoachAttExcel(filteredCoachAtt)} label="Coach Att." />
                            <ReportExportButton compact onClick={() => exportCoachAttPdf(filteredCoachAtt)} label="Coach Att." />
                          </ExportButtonGroup>
                        </div>
                      )}
                    />

                    <div style={{ ...responsiveGrid(isMobile, "1.2fr 0.8fr"), gap: 16 }}>
                      {/* Main records table */}
                      <Card style={{ padding: 0 }}>
                        {filteredCoachAtt.length === 0 ? (
                          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>No coach attendance records for this period.</div>
                        ) : (
                          <Table
                            headers={["Coach", "Date", "Clock In", "Clock Out", "Break", "Work Time", "Status"]}
                            rows={pagedCoachAtt.visibleItems.map((item) => [
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Avatar initials={(item.coachName || "CO").slice(0, 2).toUpperCase()} size={30} />
                                <span style={{ fontWeight: 700, fontSize: 13 }}>{item.coachName}</span>
                              </div>,
                              <span style={{ fontSize: 12 }}>{item.date ? new Date(item.date).toLocaleDateString() : "—"}</span>,
                              <span style={{ fontSize: 12 }}>{item.clockIn ? new Date(item.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>,
                              <span style={{ fontSize: 12 }}>{item.clockOut ? new Date(item.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : <span style={{ color: "#16a34a", fontWeight: 600 }}>Still In</span>}</span>,
                              <span style={{ fontSize: 12 }}>
                                {item.breakStart
                                  ? item.breakEnd
                                    ? <span style={{ background: "#fef9c3", color: "#a16207", padding: "2px 8px", borderRadius: 8 }}>{item.breakMinutes || 0} min</span>
                                    : <span style={{ color: "#a16207", fontWeight: 600 }}>On break</span>
                                  : <span style={{ color: "var(--muted)" }}>—</span>}
                              </span>,
                              <span style={{ fontSize: 12, fontWeight: 600, color: item.totalWorkMinutes >= 480 ? "#16a34a" : item.totalWorkMinutes > 0 ? "#2563eb" : "var(--muted)" }}>
                                {item.totalWorkMinutes ? `${Math.floor(item.totalWorkMinutes / 60)}h ${item.totalWorkMinutes % 60}m` : "—"}
                              </span>,
                              <Badge
                                label={item.status === "clocked-out" ? "checked-out" : item.status === "clocked-in" ? "checked-in" : item.status}
                                type={item.status === "clocked-out" ? "checked-out" : "checked-in"}
                              />
                            ])}
                          />
                        )}
                        <PaginationControls page={pagedCoachAtt.page} totalPages={pagedCoachAtt.totalPages} onPageChange={setCoachAttPage} totalItems={filteredCoachAtt.length} label="records" />
                      </Card>

                      {/* Right panel: live floor + per-coach summary */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Live status */}
                        <Card>
                          <SectionHeader title="Live Coach Floor" />
                          {clockedInNow.length === 0 && onBreakNow.length === 0 ? (
                            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>No coaches currently on the floor.</div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                              {[...clockedInNow, ...onBreakNow].map((item, i) => (
                                <div key={i} style={{ padding: "10px 12px", borderRadius: 12, background: "#f8fafc", border: "1px solid var(--border)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontWeight: 700, fontSize: 13 }}>{item.coachName}</span>
                                    <Badge
                                      label={item.status === "clocked-in" ? "checked-in" : "on-break"}
                                      type={item.status === "clocked-in" ? "checked-in" : "warning"}
                                    />
                                  </div>
                                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                                    Clocked in: {item.clockIn ? new Date(item.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                                  </div>
                                  {item.status === "on-break" && item.breakStart && (
                                    <div style={{ fontSize: 12, color: "#a16207", marginTop: 2 }}>
                                      Break since: {new Date(item.breakStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>

                        {/* Per-coach summary */}
                        {coachSummaryList.length > 0 && (
                          <Card>
                            <SectionHeader title="Coach Summary (Period)" />
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                              {coachSummaryList.map((c) => (
                                <div key={c.name} style={{ padding: "8px 10px", borderRadius: 10, background: "#f8fafc", border: "1px solid var(--border)" }}>
                                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                                  <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 12, color: "#2563eb" }}>{c.days} days</span>
                                    <span style={{ fontSize: 12, color: "#16a34a" }}>{Math.floor(c.totalMin / 60)}h {c.totalMin % 60}m worked</span>
                                    {c.breakMin > 0 && <span style={{ fontSize: 12, color: "#a16207" }}>{c.breakMin}m break</span>}
                                  </div>
                                  <ProgressBar value={c.days > 0 ? Math.min(100, (c.totalMin / (c.days * 480)) * 100) : 0} color="#2563eb" height={4} />
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
              </>}

              {/* Leave Add Modal */}
              {leaveModal === "create" && (
                <Modal title="Add Coach Leave" onClose={() => setLeaveModal(null)} width={520}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                    <FormField label="Coach *">
                      <Select value={leaveForm.coachId} onChange={e => setLeaveForm(p => ({ ...p, coachId: e.target.value }))}>
                        <option value="">Select coach</option>
                        {coaches.map(c => <option key={c.id||c._id} value={c.id||c._id}>{c.name}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Leave Type *">
                      <Select value={leaveForm.leaveType} onChange={e => setLeaveForm(p => ({ ...p, leaveType: e.target.value }))}>
                        <option value="sick">Sick Leave</option>
                        <option value="vacation">Vacation</option>
                        <option value="personal">Personal</option>
                        <option value="unpaid">Unpaid Leave</option>
                        <option value="emergency">Emergency</option>
                      </Select>
                    </FormField>
                    <FormField label="Start Date *"><Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(p => ({ ...p, startDate: e.target.value }))} /></FormField>
                    <FormField label="End Date *"><Input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm(p => ({ ...p, endDate: e.target.value }))} /></FormField>
                  </div>
                  {leaveForm.startDate && leaveForm.endDate && <div style={{ fontSize: 12, color: "#2563eb", marginBottom: 4 }}>{Math.max(1, Math.round((new Date(leaveForm.endDate) - new Date(leaveForm.startDate)) / 86400000) + 1)} day(s)</div>}
                  <FormField label="Reason *"><Input value={leaveForm.reason} onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Medical appointment" /></FormField>
                  <FormField label="Owner Notes"><Input value={leaveForm.ownerNotes} onChange={e => setLeaveForm(p => ({ ...p, ownerNotes: e.target.value }))} placeholder="Optional notes" /></FormField>
                  {leaveFormError && <div style={{ fontSize: 12, color: "#dc2626" }}>{leaveFormError}</div>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn onClick={async () => {
                      if (!leaveForm.coachId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) { setLeaveFormError("Coach, dates, and reason are required."); return; }
                      setLeaveFormSaving(true); setLeaveFormError("");
                      try {
                        const coach = coaches.find(c => String(c.id||c._id) === leaveForm.coachId);
                        const res = await apiFetch("/api/owner/coach-leaves", { method: "POST", body: JSON.stringify({ ...leaveForm, coachName: coach?.name || "" }) });
                        const totalDays = Math.max(1, Math.round((new Date(leaveForm.endDate) - new Date(leaveForm.startDate)) / 86400000) + 1);
                        setCoachLeaves(prev => [{ ...leaveForm, _id: res.id, coachName: coach?.name || "", status: "approved", totalDays }, ...prev]);
                        setLeaveModal(null);
                      } catch (e) { setLeaveFormError(e.message || "Failed to save."); }
                      finally { setLeaveFormSaving(false); }
                    }} disabled={leaveFormSaving}>{leaveFormSaving ? "Saving…" : "Add Leave"}</Btn>
                    <Btn variant="ghost" onClick={() => setLeaveModal(null)}>Cancel</Btn>
                  </div>
                </Modal>
              )}
            </div>
          )}

          {page === "coaches" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Toolbar
                search={coachSearch}
                setSearch={setCoachSearch}
                searchPlaceholder="Search coaches by name, coach ID, employee code, specialty, or email"
                filters={[
                  {
                    label: "Status",
                    value: coachStatus,
                    onChange: setCoachStatus,
                    options: [
                      { value: "all", label: "All Statuses" },
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" }
                    ]
                  },
                  {
                    label: "Sort",
                    value: coachSort,
                    onChange: setCoachSort,
                    options: [
                      { value: "name-asc", label: "Name A–Z" },
                      { value: "name-desc", label: "Name Z–A" },
                      { value: "members-desc", label: "Members High–Low" },
                      { value: "members-asc", label: "Members Low–High" },
                      { value: "hire-desc", label: "Hire Date Newest" },
                      { value: "hire-asc", label: "Hire Date Oldest" }
                    ]
                  }
                ]}
                action={(
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ExportButtonGroup>
                      <SpreadsheetExportButton compact onClick={exportCoachesExcel} label="Coaches" />
                      <ReportExportButton compact onClick={() => exportOwnerReport("coaches")} label="Coaches" />
                    </ExportButtonGroup>
                    <Btn small onClick={() => openCoachModal("create")}>+ Add Coach</Btn>
                  </div>
                )}
              />
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Total Coaches" value={coaches.length} accent="#2563eb" />
                <StatCard label="Active Coaches" value={activeCoachesCount} accent="#16a34a" />
                <StatCard label="Assigned Members" value={coaches.reduce((sum, coach) => sum + Number(coach.members || 0), 0)} accent="#7c3aed" />
              </div>
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <InfoTile label="Inactive Coaches" value={String(coaches.filter((coach) => coach.status === "inactive").length)} tone="#dc2626" soft="#fef2f2" />
                <InfoTile label="Visible Rows" value={String(sortedCoaches.length)} tone="#2563eb" soft="#eff6ff" />
                <InfoTile label="Top Load" value={String(Math.max(0, ...coaches.map((coach) => Number(coach.members || 0))))} tone="#7c3aed" soft="#f5f3ff" />
              </div>
              <Card style={{ padding: 0 }}>
                <Table
                  headers={["Coach", "Coach ID", "Specialty", "Phone", "Members", "Status", "Actions"]}
                  rows={pagedCoaches.visibleItems.map((coach) => [
                    <span style={{ fontWeight: 600 }}>{coach.name}</span>,
                    coach.coachCode || "Pending",
                    coach.specialty || "General coaching",
                    coach.phone || coach.contactPhone || "—",
                    String(coach.members || 0),
                    <Badge label={coach.status} type={coach.status} />,
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <IconBtn title="View" onClick={() => { setOwnerCoachPopup(coach); setOwnerPopupTab("dashboard"); }}><IcoView /></IconBtn>
                      <IconBtn title="Edit" onClick={() => openCoachModal("edit", coach)}><IcoEdit /></IconBtn>
                      <IconBtn title="Reset Password" onClick={() => handleCoachPasswordReset(coach.id)}><IcoKey /></IconBtn>
                      <IconBtn title="Remove" danger onClick={() => removeCoach(coach.id)}><IcoTrash /></IconBtn>
                    </div>
                  ])}
                />
              </Card>
              <PaginationControls page={pagedCoaches.page} totalPages={pagedCoaches.totalPages} onPageChange={setCoachPage} totalItems={sortedCoaches.length} label="coaches" />
            </div>
          )}

          {page === "members" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {pendingMemberRequests.length > 0 && (
                <Card>
                  <SectionHeader title="Pending Registration Requests" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pendingMemberRequests.map((request) => (
                      <div key={request.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{request.name}</div>
                          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{request.email}</div>
                          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Goal: {request.goal || "Not provided"}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Requested on {request.requestedAt}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <IconBtn title="Approve" onClick={() => approveMemberRequest(request.id)}><IcoCheck /></IconBtn>
                          <IconBtn title="Reject" danger onClick={() => rejectMemberRequest(request.id)}><IcoX /></IconBtn>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              <Toolbar
                search={memberSearch}
                setSearch={setMemberSearch}
                searchPlaceholder="Search members by name, member ID, email, coach, goal, plan, or diet plan"
                filters={[
                  {
                    label: "Status",
                    value: memberStatus,
                    onChange: setMemberStatus,
                    options: [
                      { value: "all", label: "All Statuses" },
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" }
                    ]
                  },
                  {
                    label: "Plan",
                    value: memberPlanFilter,
                    onChange: setMemberPlanFilter,
                    options: [{ value: "all", label: "All Plans" }, ...membershipPlans.map((plan) => ({ value: plan.name, label: plan.name }))]
                  },
                  {
                    label: "Payment",
                    value: memberPaymentFilter,
                    onChange: setMemberPaymentFilter,
                    options: [
                      { value: "all", label: "All Payments" },
                      { value: "paid", label: "Paid" },
                      { value: "partial", label: "Partial" },
                      { value: "unpaid", label: "Unpaid" }
                    ]
                  }
                ]}
                action={(
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ExportButtonGroup>
                      <SpreadsheetExportButton compact onClick={exportMembersExcel} label="Members" />
                      <ReportExportButton compact onClick={() => exportOwnerReport("members")} label="Members" />
                    </ExportButtonGroup>
                    <Btn small onClick={() => openMemberModal("create")}>+ Add Member</Btn>
                  </div>
                )}
              />
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Total Members" value={members.length} accent="#2563eb" />
                <StatCard label="Active Members" value={activeMembersCount} accent="#16a34a" />
                <StatCard label="Paid Members" value={financials.paidMembers} accent="#0f766e" />
                <StatCard label="Pending Balance" value={`LKR ${members.filter((member) => member.paymentStatus !== "paid").reduce((sum, member) => sum + Number(member.remainingBalance || 0), 0).toLocaleString()}`} accent="#f59e0b" />
              </div>
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <InfoTile label="Inactive Members" value={String(members.filter((member) => member.status === "inactive").length)} tone="#dc2626" soft="#fef2f2" />
                <InfoTile label="Visible Rows" value={String(filteredMembers.length)} tone="#2563eb" soft="#eff6ff" />
                <InfoTile label="Paid Coverage" value={`${paidCoveragePercent}%`} tone="#16a34a" soft="#f0fdf4" />
                <InfoTile label="Partial / Unpaid" value={String(members.filter((member) => member.paymentStatus === "partial" || member.paymentStatus === "unpaid").length)} tone="#7c3aed" soft="#f5f3ff" />
              </div>
              <Card style={{ padding: 0 }}>
                <Table
                  headers={["Member", "Member ID", "Coach", "Plan", "Payment", "Remaining", "Status", "Actions"]}
                  rows={pagedMembers.visibleItems.map((member) => [
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{member.name}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{member.phone || member.contactPhone || "—"}</span>
                    </div>,
                    member.memberCode || "Pending",
                    member.coach || "Unassigned",
                    member.plan || "No plan",
                    <Badge label={member.paymentStatus || "unpaid"} type={member.paymentStatus || "unpaid"} />,
                    `LKR ${Number(member.remainingBalance || 0).toLocaleString()}`,
                    <Badge label={member.status} type={member.status} />,
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <IconBtn title="View" onClick={() => { setOwnerMemberPopup(member); setOwnerPopupTab("dashboard"); }}><IcoView /></IconBtn>
                      <IconBtn title="Assign Workout" onClick={() => openAssignWorkoutModal(member)}><IcoAssign /></IconBtn>
                      <IconBtn title="Assign Meal" onClick={() => openAssignMealModal(member)}><IcoTag /></IconBtn>
                      <IconBtn title="Edit" onClick={() => openMemberModal("edit", member)}><IcoEdit /></IconBtn>
                      <IconBtn title="Reset Password" onClick={() => handleMemberPasswordReset(member.id)}><IcoKey /></IconBtn>
                      <IconBtn title="Remove" danger onClick={() => removeMember(member.id)}><IcoTrash /></IconBtn>
                    </div>
                  ])}
                />
              </Card>
              <PaginationControls page={pagedMembers.page} totalPages={pagedMembers.totalPages} onPageChange={setMemberPage} totalItems={filteredMembers.length} label="members" />
            </div>
          )}

          {page === "plans" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Toolbar search={planSearch} setSearch={setPlanSearch} searchPlaceholder="Search membership plans" action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><ExportButtonGroup><SpreadsheetExportButton compact onClick={exportPlansExcel} label="Plans" /><ReportExportButton compact onClick={exportPlansPdf} label="Plans" /></ExportButtonGroup><Btn small onClick={() => openPlanModal("create")}>+ Add Plan</Btn></div>} />

              {/* Summary tiles */}
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 14 }}>
                <StatCard label="Total Plans" value={membershipPlans.length} accent="#2563eb" />
                <StatCard label="Total Subscribers" value={members.length} accent="#16a34a" />
                <StatCard label="Most Popular" value={mostPopularPlanName || "—"} accent="#7c3aed" />
                <StatCard label="Best Value / Day" value={bestValuePlanName || "—"} accent="#f59e0b" />
              </div>

              {/* ── Assign / Change Member Plan ── */}
              {membershipPlans.length > 0 && (() => {
                const q = assignPlanQuery.trim().toLowerCase();
                const suggestions = q.length >= 1
                  ? members.filter((m) =>
                      (m.name || "").toLowerCase().includes(q) ||
                      (m.memberCode || "").toLowerCase().includes(q) ||
                      (m.email || "").toLowerCase().includes(q)
                    ).slice(0, 8)
                  : [];
                const selectedMember = members.find((m) => String(m.id) === String(assignPlanSelectedId));
                return (
                  <Card style={{ borderLeft: "4px solid #2563eb" }}>
                    <SectionHeader title="Assign / Change Member Plan" />
                    <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
                      Search a member by name, member ID, or email — then pick a plan to assign.
                    </div>
                    <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 16 }}>
                      {/* Member search */}
                      <FormField label="Search Member">
                        <div style={{ position: "relative" }}>
                          <Input
                            placeholder="Name, member ID, or email…"
                            value={assignPlanQuery}
                            onChange={(e) => { setAssignPlanQuery(e.target.value); setAssignPlanSelectedId(""); setAssignPlanMsg({ text: "", ok: true }); }}
                          />
                          {suggestions.length > 0 && !assignPlanSelectedId && (
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,0.12)", overflow: "hidden", marginTop: 2 }}>
                              {suggestions.map((m) => (
                                <div
                                  key={m.id}
                                  onClick={() => { setAssignPlanSelectedId(m.id); setAssignPlanQuery(m.name); setAssignPlanName(m.plan || ""); setAssignPlanMsg({ text: "", ok: true }); }}
                                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = ""}
                                >
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.memberCode || m.email || ""}</div>
                                  </div>
                                  <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 999, background: "#eff6ff", color: "#2563eb", fontWeight: 600 }}>{m.plan || "No Plan"}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {selectedMember && (
                          <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", gap: 12, alignItems: "center" }}>
                            <Avatar initials={(selectedMember.name || "MB").slice(0, 2).toUpperCase()} size={32} imageUrl={selectedMember.profileImageUrl || ""} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedMember.name}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{selectedMember.memberCode || ""} · {selectedMember.email || ""}</div>
                              <div style={{ fontSize: 11, marginTop: 2 }}>
                                Current plan: <span style={{ fontWeight: 700, color: "#2563eb" }}>{selectedMember.plan || "None"}</span>
                                {selectedMember.planExpiresAt && (
                                  <span style={{ color: "var(--muted)", marginLeft: 8 }}>expires {new Date(selectedMember.planExpiresAt).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </FormField>

                      {/* Plan selector */}
                      <FormField label="New Plan">
                        <Select
                          value={assignPlanName}
                          onChange={(e) => setAssignPlanName(e.target.value)}
                          disabled={!assignPlanSelectedId}
                        >
                          <option value="">— Select a plan —</option>
                          {membershipPlans.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} — LKR {Number(p.price).toLocaleString()} / {p.durationMonths}mo
                            </option>
                          ))}
                        </Select>
                        {assignPlanName && assignPlanSelectedId && (
                          <div style={{ marginTop: 8 }}>
                            {(() => {
                              const plan = membershipPlans.find((p) => p.name === assignPlanName);
                              if (!plan) return null;
                              return (
                                <div style={{ padding: "8px 12px", borderRadius: 9, background: `${plan.color}10`, border: `1px solid ${plan.color}30`, fontSize: 12 }}>
                                  <span style={{ fontWeight: 700, color: plan.color }}>{plan.name}</span>
                                  <span style={{ color: "var(--muted)", marginLeft: 8 }}>LKR {plan.price.toLocaleString()} · {plan.durationMonths} month{plan.durationMonths > 1 ? "s" : ""}</span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </FormField>
                    </div>

                    {assignPlanMsg.text && (
                      <div style={{ fontSize: 13, color: assignPlanMsg.ok ? "#16a34a" : "#dc2626", marginTop: 10 }}>{assignPlanMsg.text}</div>
                    )}

                    <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
                      <Btn
                        onClick={assignPlanToMember}
                        disabled={assignPlanSaving || !assignPlanSelectedId || !assignPlanName || (selectedMember && selectedMember.plan === assignPlanName)}
                      >
                        {assignPlanSaving ? "Saving…" : "Assign Plan"}
                      </Btn>
                      {selectedMember && selectedMember.plan === assignPlanName && assignPlanName && (
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>Member is already on this plan.</span>
                      )}
                      {(assignPlanSelectedId || assignPlanQuery) && (
                        <Btn variant="ghost" onClick={() => { setAssignPlanQuery(""); setAssignPlanSelectedId(""); setAssignPlanName(""); setAssignPlanMsg({ text: "", ok: true }); }}>Clear</Btn>
                      )}
                    </div>
                  </Card>
                );
              })()}

              {filteredPlans.length === 0 ? (
                <EmptyState title="No membership plans yet" message="Create your first 1-month, 3-month, or 12-month membership plan to manage subscriptions." />
              ) : (
                <>
                  <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)"), gap: 22 }}>
                    {pagedPlans.visibleItems.map((plan) => {
                      const subscribers = planMemberCounts.get(plan.name) || 0;
                      const collected = planRevenue.get(plan.name) || 0;
                      const pricePerDay = Math.round(plan.price / (plan.durationMonths * 30));
                      const isPopular = plan.name === mostPopularPlanName;
                      const isBestValue = plan.name === bestValuePlanName;
                      const totalSubscribers = members.length || 1;
                      const durationLabel = plan.durationMonths === 1 ? "Monthly" : plan.durationMonths === 3 ? "Quarterly" : plan.durationMonths === 12 ? "Annual" : `${plan.durationMonths} Months`;
                      return (
                        <div key={plan.id} style={{ borderRadius: 18, overflow: "hidden", border: `1.5px solid ${plan.color}30`, boxShadow: `0 4px 24px ${plan.color}14`, position: "relative", background: "var(--surface)", display: "flex", flexDirection: "column" }}>
                          {/* Top badge strip */}
                          {(isPopular || isBestValue) && (
                            <div style={{ background: plan.color, color: "#fff", textAlign: "center", padding: "5px 0", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                              {isPopular ? "★ Most Popular" : "✦ Best Value"}
                            </div>
                          )}

                          {/* Header */}
                          <div style={{ background: `linear-gradient(145deg, ${plan.color}16 0%, ${plan.color}06 100%)`, padding: "22px 24px 18px", borderBottom: `1px solid ${plan.color}18` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, background: `${plan.color}20`, color: plan.color, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                {durationLabel}
                              </div>
                              <IconBtn title="Edit Plan" onClick={() => openPlanModal("edit", plan)}><IcoEdit /></IconBtn>
                            </div>
                            <div style={{ marginTop: 14, fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>{plan.name}</div>
                            <div style={{ marginTop: 10, display: "flex", alignItems: "flex-end", gap: 8 }}>
                              <span style={{ fontSize: 38, fontWeight: 900, color: plan.color, letterSpacing: "-0.04em", lineHeight: 1 }}>LKR {plan.price.toLocaleString()}</span>
                            </div>
                            <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 12, color: "#64748b" }}>{plan.durationMonths} month{plan.durationMonths > 1 ? "s" : ""}</span>
                              <span style={{ fontSize: 12, color: "#94a3b8" }}>·</span>
                              <span style={{ fontSize: 12, color: "#64748b" }}>LKR {pricePerDay.toLocaleString()} / day</span>
                            </div>
                          </div>

                          {/* Features */}
                          <div style={{ padding: "18px 24px", flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>What's included</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                              {plan.features.map((feature) => (
                                <div key={feature} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: `${plan.color}18`, color: plan.color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 900 }}>✓</span>
                                  <span style={{ fontSize: 13, color: "#374151" }}>{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Stats bar */}
                          <div style={{ padding: "14px 24px", borderTop: `1px solid ${plan.color}14`, background: `${plan.color}06` }}>
                            <div style={{ display: "flex", gap: 0 }}>
                              <div style={{ flex: 1, textAlign: "center", paddingRight: 16, borderRight: "1px solid #e2e8f0" }}>
                                <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{subscribers}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Subscribers</div>
                              </div>
                              <div style={{ flex: 1, textAlign: "center", paddingLeft: 16 }}>
                                <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>LKR {collected.toLocaleString()}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Collected</div>
                              </div>
                            </div>
                            {members.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Plan share</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: plan.color }}>{Math.round((subscribers / totalSubscribers) * 100)}%</span>
                                </div>
                                <ProgressBar value={(subscribers / totalSubscribers) * 100} color={plan.color} height={5} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <PaginationControls page={pagedPlans.page} totalPages={pagedPlans.totalPages} onPageChange={setPlanPage} totalItems={filteredPlans.length} label="plans" />
                </>
              )}
            </div>
          )}

          {page === "workouts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Toolbar
                search={workoutSearch}
                setSearch={setWorkoutSearch}
                searchPlaceholder="Search workout plans"
                filters={[
                  {
                    label: "Level",
                    value: workoutLevel,
                    onChange: setWorkoutLevel,
                    options: [
                      { value: "all", label: "All Levels" },
                      { value: "Beginner", label: "Beginner" },
                      { value: "Intermediate", label: "Intermediate" },
                      { value: "Advanced", label: "Advanced" }
                    ]
                  }
                ]}
                action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Btn small onClick={() => openWorkoutModal("create")}>+ Add Workout Plan</Btn><ExportButtonGroup><SpreadsheetExportButton compact onClick={exportWorkoutsExcel} label="Workouts" /><ReportExportButton compact onClick={exportWorkoutsPdf} label="Workouts" /></ExportButtonGroup></div>}
              />
              {filteredWorkouts.length === 0 ? (
                <EmptyState title="No workout plans yet" message="Create workout plans here so coaches can assign and manage real training programs." />
              ) : (
                <>
                  <div style={{ ...responsiveGrid(isMobile, "repeat(2,1fr)"), gap: 16 }}>
                    {pagedWorkouts.visibleItems.map((plan) => (
                      <WorkoutPlanCard
                        key={plan.id}
                        plan={plan}
                        onAssign={() => openAssignWorkoutModal(null, plan.id)}
                        onEdit={() => openWorkoutModal("edit", plan)}
                        onDelete={() => deleteWorkout(plan.id)}
                      />
                    ))}
                  </div>
                  <PaginationControls page={pagedWorkouts.page} totalPages={pagedWorkouts.totalPages} onPageChange={setWorkoutPage} totalItems={filteredWorkouts.length} label="plans" />
                </>
              )}
            </div>
          )}

          {page === "meals" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Toolbar search={mealSearch} setSearch={setMealSearch} searchPlaceholder="Search meal plans" action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Btn small onClick={() => openMealModal("create")}>+ Add Meal Plan</Btn><ExportButtonGroup><SpreadsheetExportButton compact onClick={exportMealsExcel} label="Meals" /><ReportExportButton compact onClick={exportMealsPdf} label="Meals" /></ExportButtonGroup></div>} />
              {filteredMeals.length === 0 ? (
                <EmptyState title="No meal plans yet" message="Create meal plans here so nutrition data can be added and shown with real records." />
              ) : (
                <>
                  <div style={{ ...responsiveGrid(isMobile, "repeat(2,1fr)"), gap: 16 }}>
                    {pagedMeals.visibleItems.map((plan) => (
                      <MealPlanCard
                        key={plan.id}
                        plan={plan}
                        onAssign={() => openAssignMealModal(null, plan.id)}
                        onEdit={() => openMealModal("edit", plan)}
                        onDelete={() => deleteMeal(plan.id)}
                      />
                    ))}
                  </div>
                  <PaginationControls page={pagedMeals.page} totalPages={pagedMeals.totalPages} onPageChange={setMealPage} totalItems={filteredMeals.length} label="plans" />
                </>
              )}
            </div>
          )}

          {page === "finance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Period Filter */}
              <Card style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>Period:</span>
                  {[["all","All Time"],["week","This Week"],["month","This Month"],["year","This Year"],["custom","Custom"]].map(([val, label]) => (
                    <button key={val} onClick={() => setFinancePeriod(val)} style={{ padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: financePeriod === val ? "#2563eb" : "var(--border)", background: financePeriod === val ? "#2563eb" : "transparent", color: financePeriod === val ? "#fff" : "var(--text)", transition: "all 0.15s" }}>{label}</button>
                  ))}
                  {financePeriod === "custom" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <input type="date" value={financeStart} onChange={e => setFinanceStart(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>to</span>
                      <input type="date" value={financeEnd} onChange={e => setFinanceEnd(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
                    </div>
                  )}
                  {financePeriod !== "all" && (
                    <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginLeft: 4 }}>
                      {financePeriod === "custom" && financeStart && financeEnd ? `${financeStart} → ${financeEnd}` : financePeriod === "week" ? "Mon–Sun" : financePeriod === "month" ? new Date().toLocaleString("default",{month:"long",year:"numeric"}) : new Date().getFullYear()}
                    </span>
                  )}
                </div>
              </Card>

              {/* KPI Row */}
              <div style={{ ...responsiveGrid(isMobile, "repeat(6,1fr)", "repeat(2,1fr)"), gap: 14 }}>
                <StatCard label="Total Revenue" value={`LKR ${totalRevenue.toLocaleString()}`} accent="#16a34a" />
                <StatCard label="Total Expenses" value={`LKR ${totalExpensesAndReturns.toLocaleString()}`} accent="#dc2626" />
                <StatCard label="Net Profit" value={`LKR ${netProfit.toLocaleString()}`} accent={netProfit >= 0 ? "#2563eb" : "#dc2626"} />
                <StatCard label="Profit Margin" value={`${profitMarginPct}%`} accent={profitMarginPct >= 20 ? "#16a34a" : profitMarginPct >= 0 ? "#f59e0b" : "#dc2626"} />
                <StatCard label="Outstanding" value={`LKR ${financials.outstandingPayments.toLocaleString()}`} accent="#f59e0b" />
                <StatCard label="Paid Members" value={`${financials.paidMembers} / ${members.length}`} accent="#0891b2" />
              </div>

              {/* Revenue vs Expenses Chart + Revenue Breakdown Donut */}
              <div style={{ ...responsiveGrid(isMobile, "2fr 1fr"), gap: 16 }}>
                <Card>
                  <SectionHeader title="Revenue vs Expenses" action={<Badge label="Last 6 months" />} />
                  <DualBarChart
                    dataA={revenueByMonthValues}
                    dataB={expenseByMonthValues}
                    labels={memberGrowthLabels}
                    colorA="#2563eb"
                    colorB="#f59e0b"
                    labelA="Revenue"
                    labelB="Expenses"
                    height={140}
                  />
                  <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563eb", display: "inline-block" }} />Revenue
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />Expenses
                    </div>
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Revenue Mix" />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <DonutChart segments={revenueBreakdownSegments} size={130} thickness={22} />
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                      {revenueBreakdownSegments.map((seg) => (
                        <div key={seg.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, display: "inline-block", flexShrink: 0 }} />
                            <span style={{ color: "var(--muted)" }}>{seg.label}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: "var(--text)" }}>LKR {seg.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Profit & Loss Statement */}
              <Card>
                <SectionHeader title="Profit & Loss Summary" action={<ReportExportButton compact onClick={() => exportOwnerReport("finance")} label="Export PDF" />} />
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 0 }}>
                  <div style={{ borderRight: isMobile ? "none" : "1px solid var(--border)", paddingRight: isMobile ? 0 : 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Income</div>
                    {[
                      { label: "Membership Fees Collected", value: fMembershipCollected, color: "#16a34a" },
                      { label: "POS Sales", value: fPosSalesTotal, color: "#2563eb" },
                      { label: "Other / Manual Income", value: fOtherIncomeTotal, color: "#0891b2" },
                    ].map((row) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>{row.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>+ LKR {row.value.toLocaleString()}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "2px solid var(--border)" }}>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>Total Revenue</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>LKR {totalRevenue.toLocaleString()}</span>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Deductions</div>
                    {[
                      { label: "Operating Expenses", value: fExpenseTotal, color: "#dc2626" },
                      { label: "POS Returns", value: fReturnTotal, color: "#f59e0b" },
                    ].map((row) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>{row.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>− LKR {row.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ paddingLeft: isMobile ? 0 : 24, marginTop: isMobile ? 20 : 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
                    <div style={{ background: netProfit >= 0 ? "#f0fdf4" : "#fef2f2", borderRadius: 14, padding: "18px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Net Profit</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: netProfit >= 0 ? "#16a34a" : "#dc2626" }}>LKR {netProfit.toLocaleString()}</div>
                    </div>
                    <div style={{ background: "#eff6ff", borderRadius: 14, padding: "14px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Profit Margin</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: profitMarginPct >= 20 ? "#2563eb" : profitMarginPct >= 0 ? "#f59e0b" : "#dc2626" }}>{profitMarginPct}%</div>
                    </div>
                    <div style={{ background: "#f5f3ff", borderRadius: 14, padding: "14px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Outstanding</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#7c3aed" }}>LKR {financials.outstandingPayments.toLocaleString()}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1, background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>POS Net</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>LKR {posNetRevenue.toLocaleString()}</div>
                      </div>
                      <div style={{ flex: 1, background: "#fff7ed", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" }}>Return Rate</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b" }}>{posReturnRate}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Inventory & COGS Panel */}
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)", "repeat(2,1fr)"), gap: 14 }}>
                <StatCard label="Inventory Value" value={`LKR ${inventoryValue.toLocaleString()}`} accent="#7c3aed" sub="Current stock cost" />
                <StatCard label="COGS (Period)" value={`LKR ${cogsSold.toLocaleString()}`} accent="#ef4444" sub="Cost of goods sold" />
                <StatCard label="Units Sold" value={unitsSold.toLocaleString()} accent="#0891b2" sub="In selected period" />
                <StatCard label="Gross Margin" value={`${grossMarginPct}%`} accent={grossMarginPct >= 40 ? "#16a34a" : grossMarginPct >= 20 ? "#f59e0b" : "#dc2626"} sub="POS margin after COGS" />
              </div>

              {/* Expense Breakdown + Payment Methods */}
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 16 }}>
                <Card>
                  <SectionHeader title="Top Expense Categories" />
                  {fTopExpenseCats.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>No expense data recorded yet</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {fTopExpenseCats.map(([cat, val], i) => {
                        const maxCat = fTopExpenseCats[0]?.[1] || 1;
                        return (
                        <div key={cat}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>{cat}</span>
                            <span style={{ color: "var(--muted)" }}>LKR {val.toLocaleString()}</span>
                          </div>
                          <div style={{ height: 7, borderRadius: 99, background: "var(--border)" }}>
                            <div style={{ height: 7, borderRadius: 99, width: `${Math.round((val / maxCat) * 100)}%`, background: expenseCategorySegments[i]?.color || "#94a3b8", transition: "width 0.5s" }} />
                          </div>
                        </div>
                        );
                      })}
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                        <span>Total Expenses</span>
                        <span style={{ fontWeight: 700, color: "var(--text)" }}>LKR {fExpenseTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </Card>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <SectionHeader title="Payment Methods Used" />
                    <Select value={financeMethodFilter} onChange={(e) => setFinanceMethodFilter(e.target.value)} style={{ maxWidth: 150 }}>
                      <option value="all">All Methods</option>
                      {[...paymentMethodMap.keys()].sort().map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </Select>
                  </div>
                  {paymentMethodBreakdown.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>No payment data {financeMethodFilter !== "all" ? `for "${financeMethodFilter}"` : "available"}</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {paymentMethodBreakdown.map(([method, count]) => {
                        const color = methodColors[method] || "#94a3b8";
                        return (
                          <div key={method}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{method}</span>
                              </div>
                              <span style={{ color: "var(--muted)" }}>{count} transactions</span>
                            </div>
                            <div style={{ height: 7, borderRadius: 99, background: "var(--border)" }}>
                              <div style={{ height: 7, borderRadius: 99, width: `${Math.round((count / maxPaymentMethod) * 100)}%`, background: color, transition: "width 0.5s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* Outstanding Payments + Recent Transactions */}
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 16 }}>
                <Card>
                  <SectionHeader title="Outstanding Payments" action={<Badge label={`${unpaidMembers.length} members`} type={unpaidMembers.length > 0 ? "warning" : "active"} />} />
                  {unpaidMembers.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#16a34a", textAlign: "center", padding: "20px 0", fontWeight: 600 }}>All members are up to date</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {unpaidMembers.map((m) => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.plan || "No plan"} · {m.planExpiresAt ? `Expires ${m.planExpiresAt}` : "No expiry"}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>LKR {Number(m.remainingBalance || 0).toLocaleString()}</div>
                            <Badge label={m.paymentStatus || "unpaid"} type={m.paymentStatus === "partial" ? "warning" : "danger"} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                <Card>
                  <SectionHeader title="Recent Transactions" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {recentExpenses.length === 0 && recentSalesForFinance.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>No recent transactions</div>
                    ) : (
                      [...recentExpenses.map(e => ({ type: e.type === "income" ? "income" : "expense", label: e.title, sub: e.category, amount: e.amount, date: e.expenseDate, isPos: false })),
                       ...recentSalesForFinance.map(s => ({ type: "pos", label: s.memberName || s.customerName || "Walk-in", sub: "POS Sale", amount: s.total, date: s.soldAt, isPos: true }))]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .slice(0, 8)
                        .map((tx, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 30, height: 30, borderRadius: "50%", background: tx.type === "income" ? "#f0fdf4" : tx.type === "pos" ? "#eff6ff" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                                {tx.type === "income" ? "↑" : tx.type === "pos" ? "🛍" : "↓"}
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700 }}>{tx.label}</div>
                                <div style={{ fontSize: 11, color: "var(--muted)" }}>{tx.sub} · {tx.date}</div>
                              </div>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: tx.type === "expense" ? "#dc2626" : "#16a34a" }}>
                              {tx.type === "expense" ? "−" : "+"}LKR {Number(tx.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Revenue History */}
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>Monthly Revenue History</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{revenueData.months.length} recorded periods</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ background: "#eff6ff", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em" }}>Peak</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1d4ed8" }}>LKR {Math.max(0, ...(revenueData.values || [])).toLocaleString()}</div>
                    </div>
                    <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#15803d" }}>LKR {revenueData.values?.length ? Math.round(revenueData.values.reduce((s, v) => s + v, 0) / revenueData.values.length).toLocaleString() : 0}</div>
                    </div>
                    <div style={{ background: "#f5f3ff", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em" }}>Latest</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#6d28d9" }}>LKR {(revenueData.values?.[revenueData.values.length - 1] || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <BarChart data={revenueData.values} labels={revenueData.months} color="#2563eb" height={130} />
              </Card>

              {/* Report Exports */}
              <div style={{ borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
                <div style={{ background: "linear-gradient(135deg,#1d4ed8 0%,#2563eb 60%,#3b82f6 100%)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Export Reports</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Generate branded PDFs and Excel files from live data</div>
                  </div>
                  <ReportExportButton onClick={() => exportOwnerReport("overview")} label="Executive Overview PDF" />
                </div>
                <div style={{ background: "var(--card)", ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 0 }}>
                  {[
                    { title: "Finance Report", desc: "Revenue, expenses, dues, POS & returns", actions: [{ label: "XLSX", fn: exportFinanceExcel, isXlsx: true }, { label: "PDF", fn: () => exportOwnerReport("finance"), isXlsx: false }] },
                    { title: "Members Report", desc: "Plan, payment status, coach & check-in data", actions: [{ label: "PDF", fn: () => exportOwnerReport("members"), isXlsx: false }] },
                    { title: "Expenses Ledger", desc: "All income and expense entries", actions: [{ label: "XLSX", fn: exportExpensesExcel, isXlsx: true }] },
                    { title: "Inventory Report", desc: "Equipment status & supplement stock levels", actions: [{ label: "PDF", fn: () => exportOwnerReport("inventory"), isXlsx: false }] },
                  ].map((rpt, i, arr) => (
                    <div key={rpt.title} style={{ padding: "16px 20px", borderRight: isMobile ? "none" : i < arr.length - 1 ? "1px solid var(--border)" : "none", borderBottom: isMobile && i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{rpt.title}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, lineHeight: 1.5 }}>{rpt.desc}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {rpt.actions.map(a => a.isXlsx
                          ? <SpreadsheetExportButton key={a.label} compact onClick={a.fn} label={a.label} />
                          : <ReportExportButton key={a.label} compact onClick={a.fn} label={a.label} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {page === "owner-billing" && (() => {
            const today = new Date().toISOString().slice(0, 10);
            const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
            const in30Days = new Date(Date.now() + 30 * 86400000);

            // Filtered billing list
            const billingMembers = members.filter((m) => {
              if (ownerBillingStatusFilter !== "all" && m.paymentStatus !== ownerBillingStatusFilter) return false;
              if (ownerBillingPlanFilter !== "all" && m.plan !== ownerBillingPlanFilter) return false;
              if (ownerBillingMethodFilter !== "all") {
                const lastMethod = ((m.paymentHistory || []).slice(-1)[0] || {}).method || "";
                if (lastMethod !== ownerBillingMethodFilter) return false;
              }
              const q = ownerBillingSearch.toLowerCase();
              if (q && ![m.name, m.memberCode, m.email, m.plan].some((v) => (v || "").toLowerCase().includes(q))) return false;
              return true;
            });
            const pagedBilling = paginateItems(billingMembers, ownerBillingPage);

            // KPI derivations
            const totalDue = members.reduce((s, m) => s + Number(m.amountDue || 0), 0);
            const totalCollected = members.reduce((s, m) => s + Number(m.amountPaid || 0), 0);
            const totalOutstanding = members.reduce((s, m) => s + Number(m.remainingBalance || 0), 0);
            const paidCount = members.filter((m) => m.paymentStatus === "paid").length;
            const unpaidCount = members.filter((m) => m.paymentStatus === "unpaid").length;
            const partialCount = members.filter((m) => m.paymentStatus === "partial").length;
            const expiringIn7 = members.filter((m) => m.planExpiresAt && m.planExpiresAt >= today && m.planExpiresAt <= in7Days);
            const expiringIn30 = members.filter((m) => {
              if (!m.planExpiresAt) return false;
              const d = new Date(m.planExpiresAt);
              return d >= new Date(today) && d <= in30Days;
            }).sort((a, b) => new Date(a.planExpiresAt) - new Date(b.planExpiresAt));
            const expiredMembers = members.filter((m) => m.planExpiresAt && m.planExpiresAt < today && m.status !== "inactive");

            // Monthly revenue from revenueData
            const last6months = Array.from({ length: 6 }, (_, i) => {
              const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i);
              return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("default", { month: "short" }) };
            });
            const revByMonthValues = last6months.map((mo) => { const idx = (revenueData.months || []).indexOf(mo.label); return idx >= 0 ? (revenueData.values || [])[idx] || 0 : 0; });
            const revByMonthLabels = last6months.map((mo) => mo.label);

            // Payment method breakdown from all member payment histories
            const methodMap = {};
            members.forEach((m) => (m.paymentHistory || []).forEach((h) => {
              const meth = h.method || "cash";
              if (!methodMap[meth]) methodMap[meth] = { count: 0, total: 0 };
              methodMap[meth].count++;
              methodMap[meth].total += Number(h.amount || 0);
            }));
            const methodList = Object.entries(methodMap).sort((a, b) => b[1].total - a[1].total);
            const methodColors = { cash: "#16a34a", card: "#2563eb", "bank-transfer": "#0891b2", cheque: "#7c3aed", online: "#f59e0b", other: "#94a3b8" };
            const methodBg = { cash: "#dcfce7", card: "#dbeafe", "bank-transfer": "#e0f2fe", cheque: "#f3e8ff", online: "#fef9c3", other: "#f1f5f9" };

            // Per-plan revenue breakdown
            const planRevBreakdown = membershipPlans.map((plan) => {
              const planMembers = members.filter((m) => m.plan === plan.name);
              return {
                plan,
                count: planMembers.length,
                collected: planMembers.reduce((s, m) => s + Number(m.amountPaid || 0), 0),
                outstanding: planMembers.reduce((s, m) => s + Number(m.remainingBalance || 0), 0),
                paid: planMembers.filter((m) => m.paymentStatus === "paid").length,
              };
            }).sort((a, b) => b.collected - a.collected);

            // All payment history entries
            const allPayHistory = members.flatMap((m) =>
              (m.paymentHistory || []).map((h) => ({ ...h, memberName: m.name, memberCode: m.memberCode, memberPlan: m.plan }))
            ).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            const filteredHistory = ownerBillingHistorySearch
              ? allPayHistory.filter((h) => [h.memberName, h.memberCode, h.planName, h.method, h.note].some((v) => (v || "").toLowerCase().includes(ownerBillingHistorySearch.toLowerCase())))
              : allPayHistory;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* ── Collect Payment Modal ── */}
                {ownerPayModal && (
                  <Modal title={`Collect Payment — ${ownerPayModal.member.name}`} onClose={() => { setOwnerPayModal(null); setOwnerPayMsg({ text: "", ok: true }); }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 13 }}>
                        <div style={{ fontWeight: 700 }}>{ownerPayModal.member.name} <span style={{ fontWeight: 400, color: "var(--muted)" }}>· {ownerPayModal.member.memberCode}</span></div>
                        <div style={{ marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
                          <span>Plan: <b>{ownerPayModal.member.plan || "—"}</b></span>
                          <span>Due: <b style={{ color: "#dc2626" }}>LKR {Number(ownerPayModal.member.amountDue || 0).toLocaleString()}</b></span>
                          <span>Paid: <b style={{ color: "#16a34a" }}>LKR {Number(ownerPayModal.member.amountPaid || 0).toLocaleString()}</b></span>
                          <span>Balance: <b style={{ color: "#f59e0b" }}>LKR {Number(ownerPayModal.member.remainingBalance || 0).toLocaleString()}</b></span>
                        </div>
                      </div>
                      <FormField label="Amount (LKR)">
                        <Input type="number" min="1" value={ownerPayForm.amount}
                          onChange={(e) => setOwnerPayForm((p) => ({ ...p, amount: e.target.value }))}
                          placeholder={`Outstanding: LKR ${Number(ownerPayModal.member.remainingBalance || 0).toLocaleString()}`} />
                      </FormField>
                      <FormField label="Payment Method">
                        <Select value={ownerPayForm.method} onChange={(e) => setOwnerPayForm((p) => ({ ...p, method: e.target.value, chequeNumber: "", bankName: "", referenceNumber: "" }))}>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bank-transfer">Bank Transfer</option>
                          <option value="cheque">Cheque</option>
                          <option value="online">Online</option>
                          <option value="other">Other</option>
                        </Select>
                      </FormField>
                      {ownerPayForm.method === "cheque" && (
                        <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f5f3ff", border: "1px solid #ddd6fe", display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed" }}>Cheque Details</div>
                          <FormField label="Cheque Number *">
                            <Input value={ownerPayForm.chequeNumber} onChange={(e) => setOwnerPayForm((p) => ({ ...p, chequeNumber: e.target.value }))} placeholder="e.g. 001234" />
                          </FormField>
                          <FormField label="Bank Name *">
                            <Input value={ownerPayForm.bankName} onChange={(e) => setOwnerPayForm((p) => ({ ...p, bankName: e.target.value }))} placeholder="e.g. Commercial Bank" />
                          </FormField>
                        </div>
                      )}
                      {(ownerPayForm.method === "bank-transfer" || ownerPayForm.method === "online") && (
                        <div style={{ padding: "12px 14px", borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>{ownerPayForm.method === "online" ? "Online Payment Details" : "Bank Transfer Details"}</div>
                          <FormField label="Reference / Transaction ID">
                            <Input value={ownerPayForm.referenceNumber} onChange={(e) => setOwnerPayForm((p) => ({ ...p, referenceNumber: e.target.value }))} placeholder="e.g. TXN-8842001" />
                          </FormField>
                        </div>
                      )}
                      <FormField label="Note (optional)">
                        <Input value={ownerPayForm.note} onChange={(e) => setOwnerPayForm((p) => ({ ...p, note: e.target.value }))} placeholder="e.g. Paid at counter" />
                      </FormField>
                      {ownerPayMsg.text && <div style={{ fontSize: 13, color: ownerPayMsg.ok ? "#16a34a" : "#dc2626" }}>{ownerPayMsg.text}</div>}
                      <div style={{ display: "flex", gap: 10 }}>
                        <Btn onClick={collectOwnerPayment} disabled={ownerPaySaving || !ownerPayForm.amount}>{ownerPaySaving ? "Saving…" : "Record Payment"}</Btn>
                        <Btn variant="ghost" onClick={() => { setOwnerPayModal(null); setOwnerPayMsg({ text: "", ok: true }); setOwnerPayForm({ amount: "", method: "cash", note: "", chequeNumber: "", bankName: "", referenceNumber: "" }); }}>Cancel</Btn>
                      </div>
                    </div>
                  </Modal>
                )}

                {/* ── KPI row 1 ── */}
                <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)", "repeat(2,1fr)"), gap: 16 }}>
                  <StatCard label="Total Collected" value={`LKR ${totalCollected.toLocaleString()}`} accent="#16a34a" />
                  <StatCard label="Total Outstanding" value={`LKR ${totalOutstanding.toLocaleString()}`} accent="#dc2626" />
                  <StatCard label="Total Billed" value={`LKR ${totalDue.toLocaleString()}`} accent="#2563eb" />
                  <StatCard label="Collection Rate" value={totalDue > 0 ? `${Math.round((totalCollected / totalDue) * 100)}%` : "—"} accent="#7c3aed" />
                </div>
                {/* ── KPI row 2 ── */}
                <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)", "repeat(2,1fr)"), gap: 16 }}>
                  <StatCard label="Paid Members" value={paidCount} accent="#16a34a" />
                  <StatCard label="Partial Payment" value={partialCount} accent="#f59e0b" />
                  <StatCard label="Unpaid Members" value={unpaidCount} accent="#dc2626" />
                  <StatCard label="Expiring in 7 Days" value={expiringIn7.length} accent="#ea580c" />
                </div>

                {/* ── Revenue trend + Payment status ── */}
                <div style={{ ...responsiveGrid(isMobile, "1.6fr 1fr"), gap: 20 }}>
                  <Card>
                    <SectionHeader title="Monthly Revenue Trend (6 Months)" />
                    <div style={{ marginTop: 10 }}>
                      <BarChart data={revByMonthValues} labels={revByMonthLabels} color="#2563eb" height={120} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
                      <span>Peak: LKR {Math.max(...revByMonthValues).toLocaleString()}</span>
                      <span>6-Month Total: LKR {revByMonthValues.reduce((s, v) => s + v, 0).toLocaleString()}</span>
                    </div>
                  </Card>
                  <Card>
                    <SectionHeader title="Payment Status" />
                    <div style={{ display: "flex", justifyContent: "space-around", padding: "12px 0 8px" }}>
                      <RingStat value={paidCount} max={Math.max(members.length, 1)} color="#16a34a" label="Paid" size={80} />
                      <RingStat value={partialCount} max={Math.max(members.length, 1)} color="#f59e0b" label="Partial" size={80} />
                      <RingStat value={unpaidCount} max={Math.max(members.length, 1)} color="#dc2626" label="Unpaid" size={80} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                      {[["Paid", paidCount, "#16a34a"], ["Partial", partialCount, "#f59e0b"], ["Unpaid", unpaidCount, "#dc2626"]].map(([label, val, color]) => (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 12 }}>{label}</span>
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>{val} members</span>
                          </div>
                          <ProgressBar value={members.length ? (val / members.length) * 100 : 0} color={color} height={5} />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* ── Payment Method Breakdown + Plan Revenue ── */}
                <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 20 }}>
                  <Card>
                    <SectionHeader title="Payment Method Breakdown" />
                    {methodList.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--muted)", padding: "16px 0" }}>No payment records yet.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                        {methodList.map(([method, { count, total }]) => (
                          <div key={method}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                              <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: methodBg[method] || "#f1f5f9", color: methodColors[method] || "#64748b" }}>
                                {method === "bank-transfer" ? "Bank Transfer" : method.charAt(0).toUpperCase() + method.slice(1)}
                              </span>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>{count}× · LKR {total.toLocaleString()}</span>
                            </div>
                            <ProgressBar value={totalCollected ? (total / totalCollected) * 100 : 0} color={methodColors[method] || "#64748b"} height={5} />
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                  <Card>
                    <SectionHeader title="Revenue by Membership Plan" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                      {planRevBreakdown.length === 0 ? (
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>No plan data.</div>
                      ) : planRevBreakdown.map(({ plan, count, collected, outstanding, paid }) => (
                        <div key={plan.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: plan.color }}>{plan.name}</span>
                              <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{count} members · {paid} paid</span>
                            </div>
                            <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>LKR {collected.toLocaleString()}</span>
                          </div>
                          {outstanding > 0 && <div style={{ fontSize: 11, color: "#dc2626", marginBottom: 3 }}>Outstanding: LKR {outstanding.toLocaleString()}</div>}
                          <ProgressBar value={totalCollected ? (collected / totalCollected) * 100 : 0} color={plan.color || "#2563eb"} height={6} />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* ── Expiring memberships ── */}
                {expiringIn30.length > 0 && (
                  <Card style={{ borderLeft: "4px solid #f59e0b" }}>
                    <SectionHeader title="Memberships Expiring in 30 Days" />
                    <Table
                      headers={["Member", "Plan", "Expires", "Days Left", "Paid", "Balance", "Status", "Actions"]}
                      rows={expiringIn30.map((m) => {
                        const daysLeft = Math.ceil((new Date(m.planExpiresAt) - new Date(today)) / 86400000);
                        return [
                          <div><div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{m.memberCode}</div></div>,
                          <span style={{ fontSize: 12 }}>{m.plan || "—"}</span>,
                          <span style={{ fontSize: 12, color: daysLeft <= 7 ? "#dc2626" : "#f59e0b", fontWeight: 600 }}>{new Date(m.planExpiresAt).toLocaleDateString()}</span>,
                          <span style={{ fontSize: 12, fontWeight: 700, color: daysLeft <= 7 ? "#dc2626" : "#ea580c" }}>{daysLeft}d</span>,
                          <span style={{ fontSize: 12, color: "#16a34a" }}>LKR {Number(m.amountPaid || 0).toLocaleString()}</span>,
                          <span style={{ fontSize: 12, color: Number(m.remainingBalance || 0) > 0 ? "#dc2626" : "var(--muted)" }}>LKR {Number(m.remainingBalance || 0).toLocaleString()}</span>,
                          <Badge label={m.paymentStatus} type={m.paymentStatus} />,
                          <div style={{ display: "flex", gap: 6 }}>
                            <Btn small variant="ghost" onClick={() => { setOwnerPayModal({ member: m }); setOwnerPayForm({ amount: String(m.remainingBalance || ""), method: "cash", note: "" }); setOwnerPayMsg({ text: "", ok: true }); }}>Collect</Btn>
                            <Btn small variant="ghost" onClick={() => downloadMemberInvoicePdf(m)}>↓ Invoice</Btn>
                          </div>
                        ];
                      })}
                    />
                  </Card>
                )}

                {/* ── Expired memberships ── */}
                {expiredMembers.length > 0 && (
                  <Card style={{ borderLeft: "4px solid #dc2626" }}>
                    <SectionHeader title="Expired Memberships" />
                    <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 10 }}>{expiredMembers.length} member(s) have expired plans.</div>
                    <Table
                      headers={["Member", "Plan", "Expired On", "Paid", "Balance", "Status", "Actions"]}
                      rows={expiredMembers.sort((a, b) => new Date(b.planExpiresAt) - new Date(a.planExpiresAt)).slice(0, 10).map((m) => [
                        <div><div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{m.memberCode}</div></div>,
                        m.plan || "—",
                        <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 12 }}>{new Date(m.planExpiresAt).toLocaleDateString()}</span>,
                        `LKR ${Number(m.amountPaid || 0).toLocaleString()}`,
                        <span style={{ color: Number(m.remainingBalance || 0) > 0 ? "#dc2626" : "var(--muted)" }}>LKR {Number(m.remainingBalance || 0).toLocaleString()}</span>,
                        <Badge label={m.paymentStatus} type={m.paymentStatus} />,
                        <Btn small variant="ghost" onClick={() => downloadMemberInvoicePdf(m)}>↓ Invoice</Btn>
                      ])}
                    />
                  </Card>
                )}

                {/* ── Main member billing table ── */}
                <Card>
                  <Toolbar
                    search={ownerBillingSearch}
                    setSearch={setOwnerBillingSearch}
                    searchPlaceholder="Search by name, member ID, or email…"
                    filters={[
                      {
                        label: "Payment Status",
                        value: ownerBillingStatusFilter,
                        onChange: setOwnerBillingStatusFilter,
                        options: [
                          { value: "all", label: "All Statuses" },
                          { value: "paid", label: "Paid" },
                          { value: "partial", label: "Partial" },
                          { value: "unpaid", label: "Unpaid" }
                        ]
                      },
                      {
                        label: "Plan",
                        value: ownerBillingPlanFilter,
                        onChange: setOwnerBillingPlanFilter,
                        options: [
                          { value: "all", label: "All Plans" },
                          ...membershipPlans.map((p) => ({ value: p.name, label: p.name }))
                        ]
                      },
                      {
                        label: "Payment Method",
                        value: ownerBillingMethodFilter,
                        onChange: setOwnerBillingMethodFilter,
                        options: [
                          { value: "all", label: "All Methods" },
                          { value: "cash", label: "Cash" },
                          { value: "card", label: "Card" },
                          { value: "cheque", label: "Cheque" },
                          { value: "bank-transfer", label: "Bank Transfer" },
                          { value: "online", label: "Online" },
                          { value: "other", label: "Other" }
                        ]
                      }
                    ]}
                    action={(
                      <ExportButtonGroup>
                        <SpreadsheetExportButton compact onClick={() => exportOwnerBillingExcel(billingMembers)} label="Billing" />
                        <ReportExportButton compact onClick={() => exportOwnerBillingPdf(billingMembers)} label="Billing" />
                      </ExportButtonGroup>
                    )}
                  />
                  {billingMembers.length === 0 ? (
                    <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>No members match the current filters.</div>
                  ) : (
                    <Table
                      headers={["Member", "Plan", "Expires", "Amount Due", "Amount Paid", "Balance", "Pay. Status", "Method", "Last Payment", "Actions"]}
                      rows={pagedBilling.visibleItems.map((m) => {
                        const lastPay = (m.paymentHistory || []).slice(-1)[0];
                        const lastMethod = lastPay?.method || "";
                        const methodLabel = lastMethod === "bank-transfer" ? "Bank Transfer" : lastMethod ? lastMethod.charAt(0).toUpperCase() + lastMethod.slice(1) : "—";
                        return [
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar initials={(m.name || "MB").slice(0, 2).toUpperCase()} size={30} imageUrl={m.profileImageUrl || ""} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.memberCode || m.email || ""}</div>
                            </div>
                          </div>,
                          <span style={{ fontSize: 12 }}>{m.plan || "—"}</span>,
                          m.planExpiresAt
                            ? <span style={{ fontSize: 12, color: m.planExpiresAt < today ? "#dc2626" : "#16a34a", fontWeight: 600 }}>{new Date(m.planExpiresAt).toLocaleDateString()}</span>
                            : <span style={{ fontSize: 11, color: "var(--muted)" }}>—</span>,
                          <span style={{ fontSize: 12 }}>LKR {Number(m.amountDue || 0).toLocaleString()}</span>,
                          <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>LKR {Number(m.amountPaid || 0).toLocaleString()}</span>,
                          <span style={{ fontSize: 12, color: Number(m.remainingBalance || 0) > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>LKR {Number(m.remainingBalance || 0).toLocaleString()}</span>,
                          <Badge label={m.paymentStatus} type={m.paymentStatus} />,
                          lastMethod
                            ? <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: methodBg[lastMethod] || "#f1f5f9", color: methodColors[lastMethod] || "#64748b", display: "inline-block" }}>
                                  {methodLabel}
                                </span>
                                {lastMethod === "cheque" && lastPay.chequeNumber && (
                                  <div style={{ fontSize: 10, color: "var(--muted)" }}>#{lastPay.chequeNumber}{lastPay.bankName ? ` · ${lastPay.bankName}` : ""}</div>
                                )}
                                {(lastMethod === "bank-transfer" || lastMethod === "online") && lastPay.referenceNumber && (
                                  <div style={{ fontSize: 10, color: "var(--muted)" }}>Ref: {lastPay.referenceNumber}</div>
                                )}
                              </div>
                            : <span style={{ fontSize: 11, color: "var(--muted)" }}>—</span>,
                          lastPay
                            ? <div>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{lastPay.date ? new Date(lastPay.date).toLocaleDateString() : "—"}</div>
                                <div style={{ fontSize: 11, color: "#16a34a" }}>LKR {Number(lastPay.amount || 0).toLocaleString()}</div>
                                {lastPay.note && <div style={{ fontSize: 10, color: "var(--muted)", maxWidth: 120 }}>{lastPay.note}</div>}
                              </div>
                            : <span style={{ fontSize: 11, color: "var(--muted)" }}>No history</span>,
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <Btn small variant="ghost" onClick={() => { setOwnerPayModal({ member: m }); setOwnerPayForm({ amount: String(m.remainingBalance || ""), method: "cash", note: "", chequeNumber: "", bankName: "", referenceNumber: "" }); setOwnerPayMsg({ text: "", ok: true }); }}>Collect</Btn>
                            <Btn small variant="ghost" onClick={() => downloadMemberInvoicePdf(m)}>↓ Invoice</Btn>
                            <Btn small variant="ghost" onClick={() => downloadMemberHistoryPdf(m)}>↓ History</Btn>
                          </div>
                        ];
                      })}
                    />
                  )}
                  <PaginationControls page={pagedBilling.page} totalPages={pagedBilling.totalPages} onPageChange={setOwnerBillingPage} totalItems={billingMembers.length} label="members" />
                </Card>

                {/* ── Full Payment History ── */}
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                    <div>
                      <SectionHeader title="Full Payment History" />
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{filteredHistory.length} records · LKR {filteredHistory.reduce((s, h) => s + Number(h.amount || 0), 0).toLocaleString()} total</div>
                    </div>
                    <Input placeholder="Search member, plan, method…" value={ownerBillingHistorySearch} onChange={(e) => setOwnerBillingHistorySearch(e.target.value)} style={{ maxWidth: 240 }} />
                  </div>
                  {filteredHistory.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)", padding: "20px 0", textAlign: "center" }}>No payment records found.</div>
                  ) : (
                    <Table
                      headers={["Date", "Member", "Member ID", "Plan", "Duration", "Method", "Details", "Amount", "Note"]}
                      rows={filteredHistory.slice(0, 100).map((h) => [
                        h.date ? new Date(h.date).toLocaleDateString() : "—",
                        h.memberName || "—",
                        h.memberCode || "—",
                        h.planName || "—",
                        h.months ? `${h.months}mo` : "—",
                        <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: methodBg[h.method] || "#f1f5f9", color: methodColors[h.method] || "#64748b" }}>
                          {h.method === "bank-transfer" ? "Bank Transfer" : (h.method || "cash").charAt(0).toUpperCase() + (h.method || "cash").slice(1)}
                        </span>,
                        h.method === "cheque"
                          ? <div style={{ fontSize: 11 }}>
                              {h.chequeNumber ? <div style={{ fontWeight: 600, color: "#4c1d95" }}>#{h.chequeNumber}</div> : null}
                              {h.bankName ? <div style={{ color: "var(--muted)" }}>{h.bankName}</div> : null}
                              {!h.chequeNumber && !h.bankName ? <span style={{ color: "var(--muted)" }}>—</span> : null}
                            </div>
                          : (h.method === "bank-transfer" || h.method === "online") && h.referenceNumber
                            ? <div style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>Ref: {h.referenceNumber}</div>
                            : <span style={{ fontSize: 11, color: "var(--muted)" }}>—</span>,
                        <span style={{ fontWeight: 600, color: "#16a34a" }}>LKR {Number(h.amount || 0).toLocaleString()}</span>,
                        h.note || "—"
                      ])}
                    />
                  )}
                </Card>
              </div>
            );
          })()}

          {page === "payroll" && (() => {
            const filtered = payrollRecords
              .filter((r) => payrollStatusFilter === "all" || r.status === payrollStatusFilter)
              .filter((r) => !payrollSearch || (r.coachName || "").toLowerCase().includes(payrollSearch.toLowerCase()));
            const paged = paginateItems(filtered, payrollPage);

            const totalGross   = payrollRecords.reduce((s, r) => s + (r.grossPay || 0), 0);
            const totalNet     = payrollRecords.reduce((s, r) => s + (r.netPay || 0), 0);
            const totalPaid    = payrollRecords.filter((r) => r.status === "paid").reduce((s, r) => s + (r.netPay || 0), 0);
            const totalPending = payrollRecords.filter((r) => r.status !== "paid").reduce((s, r) => s + (r.netPay || 0), 0);
            const paidCount    = payrollRecords.filter((r) => r.status === "paid").length;
            const draftCount   = payrollRecords.filter((r) => r.status === "draft").length;
            const approvedCount = payrollRecords.filter((r) => r.status === "approved").length;
            const monthLabel   = new Date(`${payrollMonth}-01`).toLocaleString("default", { month: "long", year: "numeric" });
            const activeCoachCount = coaches.filter((c) => c.status === "active").length;
            const allCovered = payrollRecords.length >= activeCoachCount && activeCoachCount > 0;

            const statusColor  = { draft: "#f59e0b", approved: "#2563eb", paid: "#16a34a" };
            const statusBg     = { draft: "#fffbeb", approved: "#eff6ff", paid: "#f0fdf4" };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* ── Edit Payroll Modal ── */}
                {payrollEditModal && (
                  <Modal title={`Edit Payroll — ${payrollEditModal.record.coachName}`} onClose={() => setPayrollEditModal(null)}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 12 }}>
                        <FormField label="Base Salary (LKR)"><Input type="number" min="0" value={payrollEditForm.baseSalary} onChange={(e) => setPayrollEditForm((p) => ({ ...p, baseSalary: e.target.value }))} /></FormField>
                        <FormField label="Hours Worked"><Input type="number" min="0" step="0.5" value={payrollEditForm.hoursWorked} onChange={(e) => setPayrollEditForm((p) => ({ ...p, hoursWorked: e.target.value }))} /></FormField>
                        <FormField label="Overtime Hours"><Input type="number" min="0" step="0.5" value={payrollEditForm.overtimeHours} onChange={(e) => setPayrollEditForm((p) => ({ ...p, overtimeHours: e.target.value }))} /></FormField>
                        <FormField label="OT Rate (LKR/hr)"><Input type="number" min="0" value={payrollEditForm.overtimeRate} onChange={(e) => setPayrollEditForm((p) => ({ ...p, overtimeRate: e.target.value }))} /></FormField>
                        <FormField label="Bonuses (LKR)"><Input type="number" min="0" value={payrollEditForm.bonuses} onChange={(e) => setPayrollEditForm((p) => ({ ...p, bonuses: e.target.value }))} /></FormField>
                        <FormField label="Bonus Note"><Input value={payrollEditForm.bonusNote} onChange={(e) => setPayrollEditForm((p) => ({ ...p, bonusNote: e.target.value }))} placeholder="e.g. Performance bonus" /></FormField>
                        <FormField label="Advances Deducted (LKR)"><Input type="number" min="0" value={payrollEditForm.advancesDeducted} onChange={(e) => setPayrollEditForm((p) => ({ ...p, advancesDeducted: e.target.value }))} /></FormField>
                        <FormField label="Other Deductions (LKR)"><Input type="number" min="0" value={payrollEditForm.otherDeductions} onChange={(e) => setPayrollEditForm((p) => ({ ...p, otherDeductions: e.target.value }))} /></FormField>
                      </div>
                      <FormField label="Deduction Note"><Input value={payrollEditForm.deductionNote} onChange={(e) => setPayrollEditForm((p) => ({ ...p, deductionNote: e.target.value }))} placeholder="e.g. Late deduction" /></FormField>
                      <FormField label="Notes"><Input value={payrollEditForm.notes} onChange={(e) => setPayrollEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Internal notes" /></FormField>
                      <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 13 }}>
                        <div>Gross: <b>LKR {(Number(payrollEditForm.baseSalary || 0) + Number(payrollEditForm.overtimeHours || 0) * Number(payrollEditForm.overtimeRate || 0) + Number(payrollEditForm.bonuses || 0)).toLocaleString()}</b></div>
                        <div style={{ marginTop: 4 }}>Net: <b style={{ color: "#16a34a" }}>LKR {Math.max(0, Number(payrollEditForm.baseSalary || 0) + Number(payrollEditForm.overtimeHours || 0) * Number(payrollEditForm.overtimeRate || 0) + Number(payrollEditForm.bonuses || 0) - Number(payrollEditForm.advancesDeducted || 0) - Number(payrollEditForm.otherDeductions || 0)).toLocaleString()}</b></div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <Btn onClick={savePayrollEdit} disabled={payrollEditSaving}>{payrollEditSaving ? "Saving…" : "Save Changes"}</Btn>
                        <Btn variant="ghost" onClick={() => setPayrollEditModal(null)}>Cancel</Btn>
                      </div>
                    </div>
                  </Modal>
                )}

                {/* ── Mark Paid Modal ── */}
                {payrollPayModal && (
                  <Modal title={`Mark as Paid — ${payrollPayModal.record.coachName}`} onClose={() => setPayrollPayModal(null)}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 13 }}>
                        Net Pay: <b style={{ color: "#16a34a", fontSize: 16 }}>LKR {Number(payrollPayModal.record.netPay || 0).toLocaleString()}</b>
                      </div>
                      <FormField label="Payment Method">
                        <Select value={payrollPayForm.paymentMethod} onChange={(e) => setPayrollPayForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
                          <option value="bank-transfer">Bank Transfer</option>
                          <option value="cash">Cash</option>
                          <option value="cheque">Cheque</option>
                          <option value="card">Card</option>
                          <option value="online">Online</option>
                        </Select>
                      </FormField>
                      <FormField label="Notes (optional)"><Input value={payrollPayForm.notes} onChange={(e) => setPayrollPayForm((p) => ({ ...p, notes: e.target.value }))} placeholder="e.g. Paid via SDB bank" /></FormField>
                      <div style={{ display: "flex", gap: 10 }}>
                        <Btn onClick={handleMarkPaid} disabled={payrollPaySaving}>{payrollPaySaving ? "Saving…" : "Confirm Payment"}</Btn>
                        <Btn variant="ghost" onClick={() => setPayrollPayModal(null)}>Cancel</Btn>
                      </div>
                    </div>
                  </Modal>
                )}

                {/* ── Salary Advance Modal ── */}
                {payrollAdvModal && (
                  <Modal title={`Salary Advances — ${payrollAdvModal.coach.name}`} onClose={() => setPayrollAdvModal(null)}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 12 }}>
                        <FormField label="Amount (LKR)"><Input type="number" min="1" value={advForm.amount} onChange={(e) => setAdvForm((p) => ({ ...p, amount: e.target.value }))} /></FormField>
                        <FormField label="Date"><Input type="date" value={advForm.date} onChange={(e) => setAdvForm((p) => ({ ...p, date: e.target.value }))} /></FormField>
                        <FormField label="Reason"><Input value={advForm.reason} onChange={(e) => setAdvForm((p) => ({ ...p, reason: e.target.value }))} placeholder="e.g. Medical emergency" /></FormField>
                        <FormField label="Status">
                          <Select value={advForm.status} onChange={(e) => setAdvForm((p) => ({ ...p, status: e.target.value }))}>
                            <option value="approved">Approved</option>
                            <option value="pending">Pending</option>
                            <option value="deducted">Deducted</option>
                          </Select>
                        </FormField>
                      </div>
                      <FormField label="Note"><Input value={advForm.note} onChange={(e) => setAdvForm((p) => ({ ...p, note: e.target.value }))} placeholder="Additional notes" /></FormField>
                      {advFormMsg.text && <div style={{ fontSize: 13, color: advFormMsg.ok ? "#16a34a" : "#dc2626" }}>{advFormMsg.text}</div>}
                      <div style={{ display: "flex", gap: 10 }}>
                        <Btn onClick={saveAdvance} disabled={advFormSaving}>{advFormSaving ? "Saving…" : "Add Advance"}</Btn>
                      </div>
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Advance History</div>
                        {payrollAdvLoading ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Loading…</div>
                          : payrollAdvances.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>No advances recorded.</div>
                          : payrollAdvances.map((a) => (
                            <div key={a._id || a.id} style={{ padding: "8px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid var(--border)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>LKR {Number(a.amount || 0).toLocaleString()} <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: a.status === "deducted" ? "#f3e8ff" : a.status === "approved" ? "#dbeafe" : "#fef9c3", color: a.status === "deducted" ? "#7c3aed" : a.status === "approved" ? "#1d4ed8" : "#92400e" }}>{a.status}</span></div>
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{a.date ? new Date(a.date).toLocaleDateString() : "—"} · {a.reason || "—"}</div>
                                {a.note && <div style={{ fontSize: 11, color: "var(--muted)" }}>{a.note}</div>}
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                {a.status === "pending" && (
                                  <Btn small variant="primary" onClick={() => approveAdvance(payrollAdvModal.coach.id || payrollAdvModal.coach._id, a)}>Approve</Btn>
                                )}
                                <IconBtn danger title="Delete" onClick={() => removeAdvance(payrollAdvModal.coach.id || payrollAdvModal.coach._id, a._id || a.id)}><IcoTrash /></IconBtn>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </Modal>
                )}

                {/* ── Header: month selector + generate button ── */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Input type="month" value={payrollMonth} onChange={(e) => setPayrollMonth(e.target.value)} style={{ maxWidth: 180 }} />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{monthLabel} Payroll</span>
                    {payrollLoading && <span style={{ fontSize: 12, color: "var(--muted)" }}>Loading…</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ExportButtonGroup>
                      <SpreadsheetExportButton compact onClick={() => exportPayrollExcel(filtered)} label="Payroll" />
                      <ReportExportButton compact onClick={() => exportPayrollPdf(filtered)} label="Payroll" />
                    </ExportButtonGroup>
                        {!allCovered && (
                      <Btn small variant="ghost" onClick={handleGeneratePayroll} disabled={payrollGenerating}>
                        {payrollGenerating ? "Generating…" : "Add Missing Coaches"}
                      </Btn>
                    )}
                  </div>
                </div>
                {payrollMsg.text && <div style={{ fontSize: 13, color: payrollMsg.ok ? "#16a34a" : "#dc2626" }}>{payrollMsg.text}</div>}

                {/* ── KPI row ── */}
                <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)", "repeat(2,1fr)"), gap: 16 }}>
                  <StatCard label="Total Gross Pay" value={`LKR ${totalGross.toLocaleString()}`} accent="#2563eb" />
                  <StatCard label="Total Net Pay" value={`LKR ${totalNet.toLocaleString()}`} accent="#16a34a" />
                  <StatCard label="Paid" value={`LKR ${totalPaid.toLocaleString()}`} accent="#0f766e" />
                  <StatCard label="Pending Payment" value={`LKR ${totalPending.toLocaleString()}`} accent="#f59e0b" />
                </div>
                <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)"), gap: 16 }}>
                  <StatCard label="Coaches" value={payrollRecords.length} accent="#2563eb" />
                  <StatCard label="Draft" value={draftCount} accent="#f59e0b" />
                  <StatCard label="Approved" value={approvedCount} accent="#7c3aed" />
                </div>

                {/* ── Coach summary cards ── */}
                {payrollRecords.length > 0 && (
                  <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)", "1fr"), gap: 16 }}>
                    {payrollRecords.map((r) => {
                      const coachObj = coaches.find((c) => String(c.id || c._id) === String(r.coach));
                      return (
                        <div key={r._id || r.id} style={{ borderRadius: 16, border: `1.5px solid ${statusColor[r.status] || "#e2e8f0"}30`, background: "var(--surface)", overflow: "hidden", boxShadow: "0 2px 10px rgba(15,23,42,0.06)" }}>
                          <div style={{ background: statusBg[r.status] || "#f8fafc", padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Avatar initials={(r.coachName || "CO").slice(0, 2).toUpperCase()} size={36} imageUrl={coachObj?.avatar || ""} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.coachName}</div>
                                <div style={{ fontSize: 11, color: "var(--muted)" }}>{coachObj?.specialty || ""} · {coachObj?.employmentType || ""}</div>
                              </div>
                            </div>
                            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: statusBg[r.status], color: statusColor[r.status] }}>{r.status}</span>
                          </div>
                          <div style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Base Salary</span>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>LKR {Number(r.baseSalary || 0).toLocaleString()}</span>
                            </div>
                            {(r.overtimeHours > 0) && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Overtime ({r.overtimeHours}h)</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#2563eb" }}>+ LKR {Number((r.overtimeHours || 0) * (r.overtimeRate || 0)).toLocaleString()}</span>
                            </div>}
                            {(r.bonuses > 0) && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Bonuses</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>+ LKR {Number(r.bonuses || 0).toLocaleString()}</span>
                            </div>}
                            {(r.advancesDeducted > 0) && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Advances</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>- LKR {Number(r.advancesDeducted || 0).toLocaleString()}</span>
                            </div>}
                            {(r.otherDeductions > 0) && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Deductions</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>- LKR {Number(r.otherDeductions || 0).toLocaleString()}</span>
                            </div>}
                            <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 13, fontWeight: 700 }}>Net Pay</span>
                              <span style={{ fontSize: 15, fontWeight: 900, color: "#16a34a" }}>LKR {Number(r.netPay || 0).toLocaleString()}</span>
                            </div>
                            <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                              {r.hoursWorked > 0 && `${r.hoursWorked}h worked · `}
                              {r.status === "paid" && r.paidAt ? `Paid ${new Date(r.paidAt).toLocaleDateString()} via ${r.paymentMethod || "—"}` : ""}
                            </div>
                          </div>
                          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <Btn small variant="ghost" onClick={() => openPayrollEdit(r)}>Edit</Btn>
                            {r.status === "draft" && <Btn small variant="ghost" onClick={() => handleApprovePayroll(r._id || r.id)}>Approve</Btn>}
                            {r.status !== "paid" && <Btn small onClick={() => { setPayrollPayModal({ record: r }); setPayrollPayForm({ paymentMethod: "bank-transfer", notes: "" }); }}>Pay</Btn>}
                            <Btn small variant="ghost" onClick={() => downloadSalarySlipPdf(r)}>↓ Slip</Btn>
                            <Btn small variant="ghost" onClick={() => openAdvModal(coaches.find((c) => String(c.id || c._id) === String(r.coach)) || { id: r.coach, _id: r.coach, name: r.coachName })}>Advances</Btn>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Empty state ── */}
                {payrollLoading && (
                  <Card>
                    <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
                      Loading payroll for {monthLabel}…
                    </div>
                  </Card>
                )}

                {/* ── Full payroll table ── */}
                {payrollRecords.length > 0 && (
                  <Card>
                    <Toolbar
                      search={payrollSearch}
                      setSearch={setPayrollSearch}
                      searchPlaceholder="Search by coach name…"
                      filters={[{
                        label: "Status",
                        value: payrollStatusFilter,
                        onChange: setPayrollStatusFilter,
                        options: [
                          { value: "all", label: "All Statuses" },
                          { value: "draft", label: "Draft" },
                          { value: "approved", label: "Approved" },
                          { value: "paid", label: "Paid" }
                        ]
                      }]}
                    />
                    {filtered.length === 0 ? (
                      <div style={{ padding: "20px 0", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>No records match filters.</div>
                    ) : (
                      <Table
                        headers={["Coach", "Base Salary", "Hours", "OT", "Bonuses", "Advances", "Other Ded.", "Gross", "Net Pay", "Status", "Actions"]}
                        rows={paged.visibleItems.map((r) => [
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar initials={(r.coachName || "CO").slice(0, 2).toUpperCase()} size={28} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{r.coachName}</div>
                              {r.notes && <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.notes}</div>}
                            </div>
                          </div>,
                          `LKR ${Number(r.baseSalary || 0).toLocaleString()}`,
                          <span style={{ fontSize: 12 }}>{r.hoursWorked || 0}h</span>,
                          r.overtimeHours > 0 ? <span style={{ fontSize: 12, color: "#2563eb" }}>{r.overtimeHours}h @ {r.overtimeRate}</span> : "—",
                          r.bonuses > 0 ? <span style={{ fontSize: 12, color: "#16a34a" }}>LKR {Number(r.bonuses).toLocaleString()}</span> : "—",
                          r.advancesDeducted > 0 ? <span style={{ fontSize: 12, color: "#dc2626" }}>LKR {Number(r.advancesDeducted).toLocaleString()}</span> : "—",
                          r.otherDeductions > 0 ? <span style={{ fontSize: 12, color: "#dc2626" }}>LKR {Number(r.otherDeductions).toLocaleString()}</span> : "—",
                          <span style={{ fontWeight: 600 }}>LKR {Number(r.grossPay || 0).toLocaleString()}</span>,
                          <span style={{ fontWeight: 700, color: "#16a34a", fontSize: 13 }}>LKR {Number(r.netPay || 0).toLocaleString()}</span>,
                          <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: statusBg[r.status], color: statusColor[r.status] }}>{r.status}</span>,
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <Btn small variant="ghost" onClick={() => openPayrollEdit(r)}>Edit</Btn>
                            {r.status === "draft" && <Btn small variant="ghost" onClick={() => handleApprovePayroll(r._id || r.id)}>Approve</Btn>}
                            {r.status !== "paid" && <Btn small onClick={() => { setPayrollPayModal({ record: r }); setPayrollPayForm({ paymentMethod: "bank-transfer", notes: "" }); }}>Pay</Btn>}
                            <Btn small variant="ghost" onClick={() => downloadSalarySlipPdf(r)}>↓ Slip</Btn>
                            <IconBtn danger title="Delete" onClick={() => handleDeletePayroll(r._id || r.id)}><IcoTrash /></IconBtn>
                          </div>
                        ])}
                      />
                    )}
                    <PaginationControls page={paged.page} totalPages={paged.totalPages} onPageChange={setPayrollPage} totalItems={filtered.length} label="records" />
                  </Card>
                )}

                {/* ── Advances quick-add for each coach (no modal) ── */}
                <Card>
                  <SectionHeader title="Coach Salary Advances" />
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>Click "Advances" on any coach card above, or select a coach below to manage their advances.</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {coaches.filter((c) => c.status === "active").map((c) => (
                      <Btn key={c.id || c._id} small variant="ghost" onClick={() => openAdvModal(c)}>{c.name} — Advances</Btn>
                    ))}
                  </div>
                </Card>
              </div>
            );
          })()}

          {page === "expenses" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Toolbar
                search={expenseSearch}
                setSearch={setExpenseSearch}
                searchPlaceholder="Search income and expenses by title, category, contact, reference, or notes"
                filters={[
                  {
                    label: "Type",
                    value: expenseType,
                    onChange: setExpenseType,
                    options: [
                      { value: "all", label: "All Entries" },
                      { value: "income", label: "Income" },
                      { value: "expense", label: "Expenses" }
                    ]
                  },
                  {
                    label: "Status",
                    value: expenseStatus,
                    onChange: setExpenseStatus,
                    options: [
                      { value: "all", label: "All Statuses" },
                      { value: "paid", label: "Paid" },
                      { value: "pending", label: "Pending" }
                    ]
                  },
                ]}
                action={(
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <SearchableCategoryFilter
                      value={expenseCategoryFilter}
                      onChange={setExpenseCategoryFilter}
                      options={expenseCategoryOptions}
                    />
                    <ExportButtonGroup>
                      <SpreadsheetExportButton compact onClick={exportExpensesExcel} label="Export Excel" />
                      <ReportExportButton compact onClick={() => exportOwnerReport("finance")} label="Export PDF" />
                    </ExportButtonGroup>
                    <Btn small onClick={() => openExpenseModal("create")}>+ Add Entry</Btn>
                  </div>
                )}
              />
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Income Rows" value={manualIncomeEntries.length} accent="#0f766e" />
                <StatCard label="Expense Rows" value={expenseEntries.length} accent="#f59e0b" />
                <StatCard label="Manual Income" value={`LKR ${Number(financials.otherIncomeTotal || 0).toLocaleString()}`} accent="#16a34a" />
                <StatCard label="Net Ledger" value={`LKR ${Number((financials.otherIncomeTotal || 0) - financials.expenseTotal).toLocaleString()}`} accent="#7c3aed" />
              </div>
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <InfoTile label="Income Paid" value={`LKR ${incomePaidTotal.toLocaleString()}`} tone="#16a34a" soft="#f0fdf4" />
                <InfoTile label="Income Pending" value={`LKR ${incomePendingTotal.toLocaleString()}`} tone="#0891b2" soft="#ecfeff" />
                <InfoTile label="Expense Paid" value={`LKR ${expensePaidTotal.toLocaleString()}`} tone="#ea580c" soft="#fff7ed" />
                <InfoTile label="Expense Pending" value={`LKR ${expensePendingTotal.toLocaleString()}`} tone="#dc2626" soft="#fef2f2" />
              </div>
              <Card style={{ padding: 0 }}>
                <Table
                  headers={["Type", "Entry", "Category", "Contact", "Method", "Reference", "Date", "Amount", "Status", "Actions"]}
                  rows={pagedExpenses.visibleItems.map((item) => [
                    <Badge label={item.type || "expense"} type={item.type === "income" ? "active" : "warning"} />,
                    item.title,
                    item.category,
                    item.contactName || item.vendor || "N/A",
                    item.paymentMethod || "N/A",
                    item.referenceNumber || "N/A",
                    item.expenseDate,
                    `LKR ${item.amount.toLocaleString()}`,
                    <Badge label={item.status} type={item.status} />,
                    <IconBtn title="Edit" onClick={() => openExpenseModal("edit", item)}><IcoEdit /></IconBtn>
                  ])}
                />
              </Card>
              <PaginationControls page={pagedExpenses.page} totalPages={pagedExpenses.totalPages} onPageChange={setExpensePage} totalItems={filteredExpenses.length} label="ledger entries" />
            </div>
          )}

          {page === "owner-banks" && (() => {
            const ownerBankAccountStats = ownerBankDetails.map((d) => {
              const bankTx = ownerBankTxList.filter((t) => t.bankName === d.bankName);
              const income = bankTx.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount || 0), 0);
              const expense = bankTx.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount || 0), 0);
              return { ...d, income, expense };
            });
            const ownerSortedBankAccounts = [...ownerBankAccountStats].sort((a, b) => {
              if (ownerBankAccountSort === "balance-desc") return Number(b.currentBalance || 0) - Number(a.currentBalance || 0);
              if (ownerBankAccountSort === "balance-asc")  return Number(a.currentBalance || 0) - Number(b.currentBalance || 0);
              if (ownerBankAccountSort === "income-desc")  return b.income - a.income;
              return (a.bankName || "").localeCompare(b.bankName || "");
            });
            return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))"), gap: 14 }}>
                <StatCard label="Bank Accounts" value={ownerBankDetails.length} accent="#2563eb" />
                <StatCard label="Total Balance" value={`LKR ${ownerBankDetails.reduce((s, d) => s + Number(d.currentBalance || 0), 0).toLocaleString()}`} accent="#16a34a" />
                <StatCard label="Default Account" value={(ownerBankDetails.find((d) => d.isDefault) || {}).bankName || "—"} accent="#7c3aed" />
              </div>
              <BankAccountsPanel
                accounts={ownerSortedBankAccounts}
                sortValue={ownerBankAccountSort}
                onSortChange={setOwnerBankAccountSort}
                onSelect={(d) => { setOwnerBankTxBankFilter(d.bankName); setOwnerBankTxPage(1); setPage("owner-bank-transactions"); }}
                isMobile={isMobile}
              />
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                  <SectionHeader title="Gym Bank Accounts" />
                  <Btn small onClick={openCreateOwnerBank}>+ Add Account</Btn>
                </div>
                {ownerBankLoading ? <div style={{ fontSize: 14, color: "var(--muted)" }}>Loading…</div> : ownerBankDetails.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>No bank accounts added yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {ownerBankDetails.map((d) => (
                      <div key={d._id || d.id} style={{ padding: "14px 16px", borderRadius: 14, background: "#f8fafc", border: `1px solid ${d.isDefault ? "#2563eb" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{d.bankName} {d.isDefault ? <Badge label="Default" /> : null}</div>
                          <div style={{ fontSize: 13, color: "#334155" }}>{d.accountName} · {d.accountNumber}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>Branch: {d.branchCode || "—"} · SWIFT: {d.swiftCode || "—"} · {d.currency || "LKR"}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Opening: LKR {Number(d.openingBalance || 0).toLocaleString()} · Current: <span style={{ fontWeight: 700, color: "#16a34a" }}>LKR {Number(d.currentBalance || 0).toLocaleString()}</span></div>
                          {d.notes && <div style={{ fontSize: 12, color: "var(--muted)" }}>{d.notes}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <IconBtn title="Edit" onClick={() => openEditOwnerBank(d)}><IcoEdit /></IconBtn>
                          <IconBtn title="Delete" danger onClick={() => removeOwnerBankDetail(d._id || d.id)}><IcoTrash /></IconBtn>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
            );
          })()}

          {page === "owner-bank-transactions" && (() => {
            const ownerFiltered = ownerBankTxList.filter((t) =>
              (ownerBankTxTypeFilter === "all" || t.type === ownerBankTxTypeFilter) &&
              (ownerBankTxStatusFilter === "all" || t.status === ownerBankTxStatusFilter) &&
              (ownerBankTxBankFilter === "all" || t.bankName === ownerBankTxBankFilter) &&
              (!ownerBankTxSearch || [t.description, t.bankName, t.referenceNumber, t.category, t.accountNumber].some((v) => (v || "").toLowerCase().includes(ownerBankTxSearch.toLowerCase())))
            );
            const ownerSorted = [...ownerFiltered].sort((a, b) => {
              if (ownerBankTxSort === "date-desc") return new Date(b.transactionDate || 0) - new Date(a.transactionDate || 0);
              if (ownerBankTxSort === "date-asc")  return new Date(a.transactionDate || 0) - new Date(b.transactionDate || 0);
              if (ownerBankTxSort === "amount-desc") return Number(b.amount || 0) - Number(a.amount || 0);
              if (ownerBankTxSort === "amount-asc")  return Number(a.amount || 0) - Number(b.amount || 0);
              return 0;
            });
            const totalCredit = ownerFiltered.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount || 0), 0);
            const totalDebit  = ownerFiltered.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount || 0), 0);
            const netBalance  = totalCredit - totalDebit;
            const ownerPaged  = paginateItems(ownerSorted, ownerBankTxPage);

            const txStatusStyle = (s) => ({
              completed: { bg: "#dcfce7", color: "#166534" },
              pending:   { bg: "#fef9c3", color: "#92400e" },
              failed:    { bg: "#fee2e2", color: "#991b1b" },
              reversed:  { bg: "#f1f5f9", color: "#475569" }
            }[s] || { bg: "#f1f5f9", color: "#475569" });

            const METHOD_COLORS = { cash: "#16a34a", card: "#2563eb", "bank-transfer": "#0891b2", cheque: "#7c3aed", manual: "#64748b", online: "#f59e0b", other: "#94a3b8" };
            const METHOD_BG = { cash: "#dcfce7", card: "#dbeafe", "bank-transfer": "#e0f2fe", cheque: "#f3e8ff", manual: "#f1f5f9", online: "#fef9c3", other: "#f1f5f9" };
            const MethodBadge = ({ method }) => {
              const m = (method || "manual").toLowerCase();
              const label = m === "bank-transfer" ? "Bank Transfer" : m.charAt(0).toUpperCase() + m.slice(1);
              return <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: METHOD_BG[m] || "#f1f5f9", color: METHOD_COLORS[m] || "#64748b", whiteSpace: "nowrap" }}>{label}</span>;
            };

            const ownerUniqueBanks = [...new Set(ownerBankTxList.map((t) => t.bankName).filter(Boolean))].sort();
            const ownerBankAccountStats = ownerBankDetails.map((d) => {
              const bankTx = ownerBankTxList.filter((t) => t.bankName === d.bankName);
              const income = bankTx.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount || 0), 0);
              const expense = bankTx.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount || 0), 0);
              return { ...d, income, expense };
            });
            const ownerSortedBankAccounts = [...ownerBankAccountStats].sort((a, b) => {
              if (ownerBankAccountSort === "balance-desc") return Number(b.currentBalance || 0) - Number(a.currentBalance || 0);
              if (ownerBankAccountSort === "balance-asc")  return Number(a.currentBalance || 0) - Number(b.currentBalance || 0);
              if (ownerBankAccountSort === "income-desc")  return b.income - a.income;
              return (a.bankName || "").localeCompare(b.bankName || "");
            });

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* ── Summary cards ── */}
                <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))"), gap: 14 }}>
                  <StatCard label="Total Entries" value={ownerFiltered.length} accent="#2563eb" />
                  <StatCard label="Total Credits" value={`LKR ${totalCredit.toLocaleString()}`} accent="#16a34a" />
                  <StatCard label="Total Debits" value={`LKR ${totalDebit.toLocaleString()}`} accent="#dc2626" />
                  <StatCard label="Net Balance" value={`${netBalance >= 0 ? "+" : ""}LKR ${Math.abs(netBalance).toLocaleString()}`} accent={netBalance >= 0 ? "#16a34a" : "#dc2626"} />
                </div>

                {/* ── Bank accounts overview ── */}
                <BankAccountsPanel
                  accounts={ownerSortedBankAccounts}
                  sortValue={ownerBankAccountSort}
                  onSortChange={setOwnerBankAccountSort}
                  onSelect={(d, isActive) => { setOwnerBankTxBankFilter(isActive ? "all" : d.bankName); setOwnerBankTxPage(1); }}
                  activeBank={ownerBankTxBankFilter}
                  isMobile={isMobile}
                />

                {/* ── Filters + actions toolbar ── */}
                <Card style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <Input
                      placeholder="Search description, bank, reference…"
                      value={ownerBankTxSearch}
                      onChange={(e) => { setOwnerBankTxSearch(e.target.value); setOwnerBankTxPage(1); }}
                      style={{ minWidth: 220, flex: 1 }}
                    />
                    <Select value={ownerBankTxTypeFilter} onChange={(e) => { setOwnerBankTxTypeFilter(e.target.value); setOwnerBankTxPage(1); }} style={{ width: 130 }}>
                      <option value="all">All Types</option>
                      <option value="credit">Credit</option>
                      <option value="debit">Debit</option>
                    </Select>
                    <Select value={ownerBankTxStatusFilter} onChange={(e) => { setOwnerBankTxStatusFilter(e.target.value); setOwnerBankTxPage(1); }} style={{ width: 145 }}>
                      <option value="all">All Statuses</option>
                      {["completed", "pending", "failed", "reversed"].map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </Select>
                    <Select value={ownerBankTxBankFilter} onChange={(e) => { setOwnerBankTxBankFilter(e.target.value); setOwnerBankTxPage(1); }} style={{ width: 190 }}>
                      <option value="all">All Banks</option>
                      {ownerUniqueBanks.map((b) => <option key={b} value={b}>{b}</option>)}
                    </Select>
                    <Select value={ownerBankTxSort} onChange={(e) => { setOwnerBankTxSort(e.target.value); setOwnerBankTxPage(1); }} style={{ width: 175 }}>
                      <option value="date-desc">Date: Newest First</option>
                      <option value="date-asc">Date: Oldest First</option>
                      <option value="amount-desc">Amount: High to Low</option>
                      <option value="amount-asc">Amount: Low to High</option>
                    </Select>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      <Btn small onClick={openCreateOwnerBankTx}><IcoPlus /> Record Transaction</Btn>
                    </div>
                  </div>
                  {(ownerBankTxSearch || ownerBankTxTypeFilter !== "all" || ownerBankTxStatusFilter !== "all" || ownerBankTxBankFilter !== "all") && (
                    <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{ownerFiltered.length} result{ownerFiltered.length !== 1 ? "s" : ""}</span>
                      <button onClick={() => { setOwnerBankTxSearch(""); setOwnerBankTxTypeFilter("all"); setOwnerBankTxStatusFilter("all"); setOwnerBankTxBankFilter("all"); setOwnerBankTxPage(1); }} style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Clear filters</button>
                    </div>
                  )}
                </Card>

                {/* ── Transaction list ── */}
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  {ownerBankLoading ? (
                    <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", padding: "40px 0" }}>Loading…</div>
                  ) : ownerPaged.visibleItems.length === 0 ? (
                    <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", padding: "48px 0" }}>No transactions match your filters.</div>
                  ) : (
                    <div>
                      {/* Table header */}
                      {!isMobile && (
                        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 160px 140px 130px 140px 80px", gap: 0, padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          <span>Date</span>
                          <span>Transaction</span>
                          <span>Bank / Account</span>
                          <span>Method / Ref</span>
                          <span style={{ textAlign: "right" }}>Amount</span>
                          <span style={{ textAlign: "center" }}>Status</span>
                          <span style={{ textAlign: "center" }}>Actions</span>
                        </div>
                      )}
                      {ownerPaged.visibleItems.map((t, idx) => {
                        const isCredit = t.type === "credit";
                        const st = txStatusStyle(t.status);
                        const dateStr = t.transactionDate ? t.transactionDate.slice(0, 10) : "—";
                        const [yyyy, mm, dd] = dateStr.split("-");
                        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                        const prettyDate = yyyy && mm && dd ? `${dd} ${months[parseInt(mm,10)-1]} ${yyyy}` : dateStr;

                        if (isMobile) {
                          return (
                            <div key={t._id || t.id || idx} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", borderBottom: idx < ownerPaged.visibleItems.length - 1 ? "1px solid var(--border)" : "none", background: idx % 2 === 0 ? "var(--surface)" : "#fafbfc" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{prettyDate}</div>
                                  <span style={{ display: "inline-block", marginTop: 4, padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: isCredit ? "#dcfce7" : "#fee2e2", color: isCredit ? "#166534" : "#991b1b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    {isCredit ? "↑ Credit" : "↓ Debit"}
                                  </span>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 15, fontWeight: 800, color: isCredit ? "#16a34a" : "#dc2626", letterSpacing: "-0.02em" }}>
                                    {isCredit ? "+" : "−"}LKR {Number(t.amount || 0).toLocaleString()}
                                  </div>
                                  <span style={{ display: "inline-block", marginTop: 4, padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>
                                    {(t.status || "").charAt(0).toUpperCase() + (t.status || "").slice(1)}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{t.description || "—"}</div>
                                <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                                  {t.category && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontWeight: 600 }}>{t.category}</span>}
                                  {t.notes && <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>{t.notes}</span>}
                                </div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                <div>
                                  {t.bankName ? (
                                    <>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{t.bankName}</div>
                                      {t.accountNumber && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, fontFamily: "monospace" }}>A/C {t.accountNumber}</div>}
                                    </>
                                  ) : <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span>}
                                </div>
                                <div>
                                  <MethodBadge method={t.paymentMethod} />
                                  {t.referenceNumber && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontFamily: "monospace" }}>{t.referenceNumber}</div>}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                <IconBtn title="Edit" onClick={() => openEditOwnerBankTx(t)}><IcoEdit /></IconBtn>
                                <IconBtn title="Delete" danger onClick={() => removeOwnerBankTx(t._id || t.id)}><IcoTrash /></IconBtn>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={t._id || t.id || idx} style={{ display: "grid", gridTemplateColumns: "110px 1fr 160px 140px 130px 140px 80px", gap: 0, padding: "14px 20px", borderBottom: idx < ownerPaged.visibleItems.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center", background: idx % 2 === 0 ? "var(--surface)" : "#fafbfc" }}>
                            {/* Date */}
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{prettyDate}</div>
                              <span style={{ display: "inline-block", marginTop: 4, padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: isCredit ? "#dcfce7" : "#fee2e2", color: isCredit ? "#166534" : "#991b1b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                {isCredit ? "↑ Credit" : "↓ Debit"}
                              </span>
                            </div>
                            {/* Description + meta */}
                            <div style={{ paddingRight: 12, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.description || "—"}</div>
                              <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                                {t.category && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontWeight: 600 }}>{t.category}</span>}
                                {t.notes && <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{t.notes}</span>}
                              </div>
                            </div>
                            {/* Bank / Account */}
                            <div>
                              {t.bankName ? (
                                <>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{t.bankName}</div>
                                  {t.accountNumber && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, fontFamily: "monospace" }}>A/C {t.accountNumber}</div>}
                                </>
                              ) : <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span>}
                            </div>
                            {/* Method / Reference */}
                            <div>
                              <MethodBadge method={t.paymentMethod} />
                              {t.referenceNumber && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontFamily: "monospace" }}>{t.referenceNumber}</div>}
                            </div>
                            {/* Amount */}
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 15, fontWeight: 800, color: isCredit ? "#16a34a" : "#dc2626", letterSpacing: "-0.02em" }}>
                                {isCredit ? "+" : "−"}LKR {Number(t.amount || 0).toLocaleString()}
                              </div>
                            </div>
                            {/* Status */}
                            <div style={{ textAlign: "center" }}>
                              <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, display: "inline-block" }}>
                                {(t.status || "").charAt(0).toUpperCase() + (t.status || "").slice(1)}
                              </span>
                            </div>
                            {/* Actions */}
                            <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                              <IconBtn title="Edit" onClick={() => openEditOwnerBankTx(t)}><IcoEdit /></IconBtn>
                              <IconBtn title="Delete" danger onClick={() => removeOwnerBankTx(t._id || t.id)}><IcoTrash /></IconBtn>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "#f8fafc" }}>
                    <PaginationControls page={ownerPaged.page} totalPages={ownerPaged.totalPages} onPageChange={setOwnerBankTxPage} totalItems={ownerSorted.length} label="transactions" />
                  </div>
                </Card>
              </div>
            );
          })()}

          {page === "equipment" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Toolbar
                search={equipmentSearch}
                setSearch={setEquipmentSearch}
                searchPlaceholder="Search by name, location, vendor, or serial number"
                filters={[
                  {
                    label: "Status",
                    value: equipmentStatus,
                    onChange: setEquipmentStatus,
                    options: [
                      { value: "all", label: "All Statuses" },
                      { value: "good", label: "Good" },
                      { value: "maintenance", label: "Maintenance" },
                      { value: "replace", label: "Replace" }
                    ]
                  },
                  {
                    label: "Sort",
                    value: equipmentSort,
                    onChange: setEquipmentSort,
                    options: [
                      { value: "name-asc", label: "Name A–Z" },
                      { value: "name-desc", label: "Name Z–A" },
                      { value: "service-asc", label: "Service Due Soonest" },
                      { value: "service-desc", label: "Service Due Latest" },
                      { value: "status", label: "Status (Worst First)" },
                      { value: "breakages-desc", label: "Most Open Breakages" },
                      { value: "value-desc", label: "Highest Value" },
                      { value: "purchase-desc", label: "Newest Purchase" }
                    ]
                  }
                ]}
                action={(
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ExportButtonGroup>
                      <SpreadsheetExportButton compact onClick={exportEquipmentExcel} label="Equipment" />
                      <ReportExportButton compact onClick={() => exportOwnerReport("equipment")} label="Equipment" />
                    </ExportButtonGroup>
                    <Btn small onClick={() => openEquipmentModal("create")}>+ Add Equipment</Btn>
                  </div>
                )}
              />
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Total Items" value={equipment.length} accent="#2563eb" />
                <StatCard label="Needs Attention" value={equipmentNeedingAttention.length} accent="#dc2626" />
                <StatCard label="Service Due (7d)" value={equipmentDueSoon.length} accent="#f59e0b" />
                <StatCard label="Open Breakages" value={equipmentOpenBreakages} accent="#ea580c" />
              </div>
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <InfoTile label="Good" value={String(equipment.filter((item) => item.status === "good").length)} tone="#16a34a" soft="#f0fdf4" />
                <InfoTile label="Maintenance" value={String(equipment.filter((item) => item.status === "maintenance").length)} tone="#ea580c" soft="#fff7ed" />
                <InfoTile label="Replace" value={String(equipment.filter((item) => item.status === "replace").length)} tone="#dc2626" soft="#fef2f2" />
                <InfoTile label="Warranty Expiring (30d)" value={String(equipmentWarrantyExpiring.length)} tone="#7c3aed" soft="#f5f3ff" />
              </div>
              <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))"), gap: 16 }}>
                <InfoTile label="Total Purchase Value" value={`LKR ${equipmentTotalPurchaseValue.toLocaleString()}`} tone="#2563eb" soft="#eff6ff" />
                <InfoTile label="Total Service Cost" value={`LKR ${equipmentTotalServiceCost.toLocaleString()}`} tone="#ea580c" soft="#fff7ed" />
                <InfoTile label="Visible Items" value={String(sortedEquipment.length)} tone="#64748b" soft="#f8fafc" />
              </div>
              <Card style={{ padding: 0 }}>
                <Table
                  headers={["Equipment", "Location", "Qty", "Purchase Info", "Status", "Service Dates", "Breakages", "Actions"]}
                  rows={pagedEquipment.visibleItems.map((item) => {
                    const openBreakages = (item.breakageHistory || []).filter((b) => !b.resolvedAt).length;
                    const totalBreakages = (item.breakageHistory || []).length;
                    const totalSvcCost = (item.serviceHistory || []).reduce((s, h) => s + Number(h.cost || 0), 0);
                    const svcCount = (item.serviceHistory || []).length;
                    const nextSvcDate = item.nextServiceDate ? new Date(item.nextServiceDate) : null;
                    const nextSvcOverdue = nextSvcDate && nextSvcDate < new Date();
                    const nextSvcSoon = nextSvcDate && !nextSvcOverdue && nextSvcDate <= new Date(Date.now() + 30 * 86400000);
                    const warrantyDate = item.warrantyExpiresAt ? new Date(item.warrantyExpiresAt) : null;
                    const warrantyExpired = warrantyDate && warrantyDate < new Date();
                    const warrantyExpiringSoon = warrantyDate && !warrantyExpired && warrantyDate <= new Date(Date.now() + 30 * 86400000);
                    return [
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                        {item.serialNumber && <div style={{ fontSize: 11, color: "var(--muted)" }}>S/N: {item.serialNumber}</div>}
                        {item.vendor && <div style={{ fontSize: 11, color: "#64748b" }}>{item.vendor}</div>}
                      </div>,
                      <div>
                        <div style={{ fontSize: 13 }}>{item.location || "—"}</div>
                      </div>,
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{item.qty ?? 0}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>units</div>
                      </div>,
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.purchasePrice ? `LKR ${Number(item.purchasePrice).toLocaleString()}` : "—"}</div>
                        {item.purchaseDate && <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.purchaseDate}</div>}
                        {warrantyDate && (
                          <div style={{ fontSize: 11, marginTop: 2, color: warrantyExpired ? "#dc2626" : warrantyExpiringSoon ? "#d97706" : "#16a34a", fontWeight: 600 }}>
                            {warrantyExpired ? "Warranty expired" : warrantyExpiringSoon ? `Warranty exp. ${item.warrantyExpiresAt}` : `Warranty: ${item.warrantyExpiresAt}`}
                          </div>
                        )}
                      </div>,
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <Badge label={item.status} type={item.status} />
                        {totalSvcCost > 0 && <div style={{ fontSize: 11, color: "#ea580c" }}>LKR {totalSvcCost.toLocaleString()} svc cost</div>}
                      </div>,
                      <div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Last: {item.lastService || "—"}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: nextSvcOverdue ? "#dc2626" : nextSvcSoon ? "#d97706" : "var(--text)" }}>
                          {nextSvcOverdue ? "⚠ Overdue" : nextSvcSoon ? "⏰ " : ""}{item.nextServiceDate || "—"}
                        </div>
                        {svcCount > 0 && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{svcCount} service{svcCount !== 1 ? "s" : ""} logged</div>}
                      </div>,
                      <div>
                        {openBreakages > 0
                          ? <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 13 }}>{openBreakages} open</span>
                          : <span style={{ color: "#16a34a", fontSize: 12 }}>None open</span>}
                        {totalBreakages > 0 && <div style={{ fontSize: 11, color: "var(--muted)" }}>{totalBreakages} total</div>}
                      </div>,
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <IconBtn title="View Details" onClick={() => { setEquipmentViewItem(item); setEquipmentViewTab("overview"); }}><IcoView /></IconBtn>
                        <IconBtn title="Edit" onClick={() => openEquipmentModal("edit", item)}><IcoEdit /></IconBtn>
                        <IconBtn title="Log Service" onClick={() => { setEquipmentServiceModal(item.id || item._id); setEquipmentServiceForm({ type: "service", description: "", cost: "", technician: "" }); }}><IcoWrench /></IconBtn>
                        <IconBtn title="Report Breakage" danger onClick={() => { setEquipmentBreakageModal(item.id || item._id); setEquipmentBreakageForm({ description: "", reportedBy: "" }); }}><IcoAlert /></IconBtn>
                      </div>
                    ];
                  })}
                />
              </Card>
              <PaginationControls page={pagedEquipment.page} totalPages={pagedEquipment.totalPages} onPageChange={setEquipmentPage} totalItems={sortedEquipment.length} label="items" />
            </div>
          )}

          {page === "supplements" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {supplementSaveMsg && (
                <div style={{ padding: "10px 16px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>✓ {supplementSaveMsg}</span>
                  <button onClick={() => setSupplementSaveMsg("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#166534" }}>×</button>
                </div>
              )}
              <Toolbar
                search={supplementSearch}
                setSearch={setSupplementSearch}
                searchPlaceholder="Search supplement inventory"
                filters={[
                  {
                    label: "Category",
                    value: supplementCategory,
                    onChange: setSupplementCategory,
                    options: [{ value: "all", label: "All Categories" }, ...SUPPLEMENT_CATEGORIES.map((c) => ({ value: c, label: c }))]
                  },
                  {
                    label: "Stock",
                    value: supplementStatus,
                    onChange: setSupplementStatus,
                    options: [
                      { value: "all", label: "All Stock" },
                      { value: "in-stock", label: "In Stock" },
                      { value: "low-stock", label: "Low Stock" },
                      { value: "out-of-stock", label: "Out of Stock" }
                    ]
                  }
                ]}
                action={(
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ReportExportButton compact onClick={() => exportOwnerReport("supplements")} label="Supplements" />
                    <Btn small onClick={exportSupplementsExcel} style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac" }}>📊 Excel</Btn>
                    <Btn small onClick={() => openSupplementModal("create")}>&#x2B; Add Supplement</Btn>
                  </div>
                )}
              />
              <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)"), gap: 16 }}>
                {pagedSupplements.visibleItems.map((item) => (
                  <Card key={item._id || item.id} style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", borderBottom: "1px solid #bfdbfe", padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                        {(item.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#1e3a5f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{item.brand || "No brand"} · {item.sku}</div>
                      </div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Category</span><span style={{ fontWeight: 600 }}>{item.category}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Stock</span><span style={{ fontWeight: 600 }}>{item.stockQty} units</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Sell Price</span><span style={{ fontWeight: 600 }}>LKR {Number(item.unitPrice || 0).toLocaleString()}</span></div>
                        {item.buyingPrice > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Buy Price</span><span style={{ fontWeight: 600 }}>LKR {Number(item.buyingPrice || 0).toLocaleString()}</span></div>}
                        {item.supplierName && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Supplier</span><span style={{ fontWeight: 600, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.supplierName}</span></div>}
                      </div>
                      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Badge label={item.status} type={item.status} />
                        <IconBtn title="Edit" onClick={() => openSupplementModal("edit", item)}><IcoEdit /></IconBtn>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <PaginationControls page={pagedSupplements.page} totalPages={pagedSupplements.totalPages} onPageChange={setSupplementPage} totalItems={filteredSupplements.length} label="supplements" />
            </div>
          )}

          {page === "suppliers" && (() => {
            const totalInventoryValue = supplierList.reduce((sv, sup) => sv + (sup.products || []).reduce((pv, p) => {
              const supp = supplements.find(s => String(s.id || s._id) === String(p.supplementId));
              return pv + (supp ? Number(supp.buyingPrice || 0) * Number(supp.stockQty || 0) : 0);
            }, 0), 0);
            const supplierOutstandingBalance = (s) => (s.restockLog || []).reduce((sum, r) => (
              r.paymentType === "credit" ? sum + Math.max(0, Number(r.totalCost || 0) - Number(r.amountPaid || 0)) : sum
            ), 0);
            const filteredSupList = supplierList.filter(s => {
              if (supplierActiveFilter === "active" && !s.isActive) return false;
              if (supplierActiveFilter === "inactive" && s.isActive) return false;
              const outstanding = supplierOutstandingBalance(s);
              if (supplierPaymentStatusFilter === "outstanding" && outstanding <= 0) return false;
              if (supplierPaymentStatusFilter === "clear" && outstanding > 0) return false;
              return !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()) || (s.email || "").toLowerCase().includes(supplierSearch.toLowerCase());
            });
            const totalSupplierCreditOutstanding = supplierList.reduce((sum, s) => sum + supplierOutstandingBalance(s), 0);
            return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ ...responsiveGrid(isMobile, "repeat(5,minmax(0,1fr))","repeat(2,1fr)"), gap: 16 }}>
                <StatCard label="Total Suppliers" value={supplierList.length} accent="#2563eb" />
                <StatCard label="Active Suppliers" value={supplierList.filter(s => s.isActive !== false).length} accent="#16a34a" />
                <StatCard label="Products Linked" value={supplierList.reduce((s, sup) => s + (sup.products?.length || 0), 0)} accent="#7c3aed" />
                <StatCard label="Inventory Value" value={`LKR ${totalInventoryValue.toLocaleString()}`} accent="#f59e0b" sub="From linked suppliers" />
                <StatCard label="Outstanding Credit" value={`LKR ${totalSupplierCreditOutstanding.toLocaleString()}`} accent="#dc2626" sub="Owed to suppliers on credit" />
              </div>
              <Toolbar
                search={supplierSearch}
                setSearch={setSupplierSearch}
                searchPlaceholder="Search suppliers by name, email"
                filters={[
                  { label: "Status", value: supplierActiveFilter, onChange: setSupplierActiveFilter, options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
                  { label: "Credit", value: supplierPaymentStatusFilter, onChange: setSupplierPaymentStatusFilter, options: [{ value: "all", label: "All" }, { value: "outstanding", label: "Has Outstanding Credit" }, { value: "clear", label: "No Outstanding Credit" }] }
                ]}
                action={(
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ExportButtonGroup>
                      <SpreadsheetExportButton compact onClick={exportSuppliersExcel} label="Suppliers" />
                      <ReportExportButton compact onClick={exportSuppliersPdf} label="Suppliers" />
                    </ExportButtonGroup>
                    <Btn small onClick={() => { setSupplierForm({ id: "", name: "", contactName: "", phone: "", email: "", address: "", website: "", notes: "", paymentTerms: "", isActive: true, rating: "", ratingNotes: "" }); setSupplierError(""); setSupplierModal("create"); }}>+ Add Supplier</Btn>
                  </div>
                )}
              />
              {supplierLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading suppliers…</div>
              ) : (
                <Card style={{ padding: 0 }}>
                  <Table
                    headers={["Name", "Contact", "Phone", "Email", "Rating", "Products", "Inv. Value", "Status", "Actions"]}
                    rows={filteredSupList.map((sup) => {
                      const supInvValue = (sup.products || []).reduce((pv, p) => {
                        const s = supplements.find(s2 => String(s2.id || s2._id) === String(p.supplementId));
                        return pv + (s ? Number(s.buyingPrice || 0) * Number(s.stockQty || 0) : 0);
                      }, 0);
                      return [
                        <span style={{ fontWeight: 700 }}>{sup.name}{sup.paymentTerms ? <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 6 }}>{sup.paymentTerms}</span> : null}</span>,
                        sup.contactName || "—",
                        sup.phone ? <a href={`tel:${sup.phone}`} style={{ color: "#2563eb", textDecoration: "none", fontSize: 12 }}>{sup.phone}</a> : "—",
                        sup.email ? <a href={`mailto:${sup.email}`} style={{ color: "#2563eb", textDecoration: "none", fontSize: 12 }}>{sup.email}</a> : "—",
                        sup.rating ? <span style={{ fontSize: 13 }}>{"★".repeat(sup.rating)}{"☆".repeat(5 - sup.rating)}</span> : <span style={{ color: "var(--muted)", fontSize: 11 }}>—</span>,
                        <span style={{ fontWeight: 600 }}>{(sup.products || []).length}</span>,
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b" }}>LKR {supInvValue.toLocaleString()}</span>,
                        <Badge label={sup.isActive !== false ? "active" : "inactive"} type={sup.isActive !== false ? "active" : "suspended"} />,
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <IconBtn title="View / Restock" onClick={() => setSupplierViewItem(sup)}><IcoView /></IconBtn>
                          <IconBtn title="Edit" onClick={() => { setSupplierForm({ id: sup._id, name: sup.name, contactName: sup.contactName || "", phone: sup.phone || "", email: sup.email || "", address: sup.address || "", website: sup.website || "", notes: sup.notes || "", paymentTerms: sup.paymentTerms || "", isActive: sup.isActive !== false, rating: sup.rating || "", ratingNotes: sup.ratingNotes || "" }); setSupplierError(""); setSupplierModal("edit"); }}><IcoEdit /></IconBtn>
                          {sup.email && <IconBtn title="Email Supplier" onClick={() => window.open(`mailto:${sup.email}`)}><span style={{ fontSize: 12 }}>✉</span></IconBtn>}
                          <IconBtn title="Remove" danger onClick={() => removeSupplier(sup._id)}><IcoTrash /></IconBtn>
                        </div>
                      ];
                    })}
                  />
                </Card>
              )}
            </div>
            );
          })()}

          {page === "pos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Top toolbar */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {sales.length} total sales &bull; {salesToday.length} today
                </div>
                <ExportButtonGroup>
                  <SpreadsheetExportButton compact onClick={exportSalesExcel} label="Sales" />
                  <ReportExportButton compact onClick={exportSalesPdf} label="Sales" />
                </ExportButtonGroup>
              </div>
              {/* Stat cards — 6 wide */}
              <div style={{ ...responsiveGrid(isMobile, "repeat(6,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 14 }}>
                <StatCard label="Total Sales" value={sales.length} accent="#2563eb" />
                <StatCard label="Today's Sales" value={salesToday.length} accent="#0891b2" />
                <StatCard label="Today's Revenue" value={`LKR ${salesTodayValue.toLocaleString()}`} accent="#16a34a" />
                <StatCard label="Total Revenue" value={`LKR ${salesTotalValue.toLocaleString()}`} accent="#059669" />
                <StatCard label="Avg. Sale" value={`LKR ${avgSaleValue.toLocaleString()}`} accent="#7c3aed" />
                <StatCard label="Net POS" value={`LKR ${Math.max(0, salesTotalValue - returnsTotalValue).toLocaleString()}`} accent="#d97706" />
              </div>
              {/* Top products strip */}
              {topProducts.length > 0 && (
                <Card>
                  <SectionHeader title="Top Selling Products" />
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {topProducts.map((p, i) => (
                      <div key={p.name} style={{ flex: "1 1 140px", padding: "10px 14px", borderRadius: 12, background: i === 0 ? "#eff6ff" : "#f8fafc", border: `1px solid ${i === 0 ? "#bfdbfe" : "var(--border)"}` }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? "#1d4ed8" : "var(--text)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {i === 0 ? "🏆 " : `${i + 1}. `}{p.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.qty} units &bull; LKR {p.revenue.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {/* Main two-column layout */}
              <div style={{ ...responsiveGrid(isMobile, "0.95fr 1.35fr"), gap: 20 }}>
                {/* POS Terminal form */}
                <Card>
                  <SectionHeader title="POS Terminal" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <FormField label="Customer / Member (optional — leave blank for walk-in)">
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          value={posForm.memberQuery}
                          onChange={(e) => {
                            const value = e.target.value;
                            const match = members.find((m) => m.name.toLowerCase() === value.toLowerCase() || m.email?.toLowerCase() === value.toLowerCase() || m.memberCode?.toLowerCase() === value.toLowerCase());
                            setPosForm((prev) => ({ ...prev, memberQuery: value, memberName: value, memberId: match ? match.id : "" }));
                          }}
                          placeholder="Type member name, email, or code — or leave blank for walk-in"
                          style={{ width: "100%", fontSize: 13, padding: "8px 12px", border: `1px solid ${posForm.memberId ? "#16a34a" : "var(--border)"}`, borderRadius: 8, outline: "none", background: "var(--bg)", boxSizing: "border-box" }}
                        />
                        {posForm.memberQuery && !posForm.memberId && (() => {
                          const q = posForm.memberQuery.toLowerCase();
                          const suggestions = members.filter((m) => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.memberCode?.toLowerCase().includes(q)).slice(0, 5);
                          return suggestions.length > 0 ? (
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 50, overflow: "hidden" }}>
                              {suggestions.map((m) => (
                                <div key={m.id} onClick={() => setPosForm((prev) => ({ ...prev, memberQuery: m.name, memberName: m.name, memberId: m.id }))}
                                  style={{ padding: "9px 13px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
                                  <span style={{ fontWeight: 600 }}>{m.name}</span>
                                  <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 11 }}>{m.plan} • {m.memberCode || m.email || ""}</span>
                                </div>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                      {posForm.memberId && <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>Member linked — receipt email will be sent if configured</div>}
                    </FormField>

                    {/* Member purchase history */}
                    {posForm.memberId && (() => {
                      const memberSales = sales.filter(s => s.memberId === posForm.memberId || s.memberName === posForm.memberName).slice(0, 8);
                      if (memberSales.length === 0) return null;
                      return (
                        <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f0f9ff", border: "1px solid #bae6fd", maxHeight: 180, overflowY: "auto" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Purchase History ({memberSales.length} records)</div>
                          {memberSales.map((s, i) => (
                            <div key={s.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < memberSales.length - 1 ? "1px solid #e0f2fe" : "none" }}>
                              <div style={{ fontSize: 11, color: "#0c4a6e" }}>
                                <span style={{ fontWeight: 600 }}>{(s.items || []).map(it => it.name).join(", ") || s.supplementName || "Item"}</span>
                                <span style={{ color: "#64748b", marginLeft: 6 }}>{s.soldAt ? new Date(s.soldAt).toLocaleDateString() : ""}</span>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#0369a1" }}>LKR {Number(s.total || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <FormField label="Product">
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          value={posProductSearch || (selectedPosSupplement ? selectedPosSupplement.name : "")}
                          onFocus={() => { setPosProductOpen(true); if (posForm.supplementId) { setPosProductSearch(""); } }}
                          onBlur={() => { setTimeout(() => setPosProductOpen(false), 150); }}
                          onChange={(e) => { setPosProductSearch(e.target.value); setPosProductOpen(true); if (!e.target.value) setPosForm(p => ({ ...p, supplementId: "" })); }}
                          placeholder="Search product name, SKU, or brand…"
                          style={{ width: "100%", fontSize: 13, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, outline: "none", background: "var(--bg)", color: "var(--text)", boxSizing: "border-box", borderColor: posForm.supplementId ? "#16a34a" : "var(--border)" }}
                          autoComplete="off"
                        />
                        {posProductOpen && (() => {
                          const q = posProductSearch.toLowerCase();
                          const suggestions = (q
                            ? supplements.filter(s => s.name.toLowerCase().includes(q) || (s.sku || "").toLowerCase().includes(q) || (s.brand || "").toLowerCase().includes(q))
                            : supplements
                          ).slice(0, q ? 7 : 50);
                          return suggestions.length > 0 ? (
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 50, overflow: "hidden" }}>
                              {suggestions.map(s => (
                                <div key={s.id} onClick={() => { setPosForm(p => ({ ...p, supplementId: s.id })); setPosProductSearch(""); setPosProductOpen(false); }}
                                  style={{ padding: "9px 13px", fontSize: 13, cursor: s.status === "out-of-stock" ? "not-allowed" : "pointer", opacity: s.status === "out-of-stock" ? 0.5 : 1, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                  onMouseLeave={e => e.currentTarget.style.background = "var(--bg)"}>
                                  <div>
                                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                                    <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 11 }}>{s.brand || ""} · {s.sku}</span>
                                  </div>
                                  <div style={{ textAlign: "right", fontSize: 11 }}>
                                    <div style={{ fontWeight: 700, color: "#2563eb" }}>LKR {Number(s.unitPrice || 0).toLocaleString()}</div>
                                    <div style={{ color: s.status === "out-of-stock" ? "#dc2626" : s.status === "low-stock" ? "#f59e0b" : "#16a34a" }}>{s.stockQty} left</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 13px", fontSize: 12, color: "var(--muted)", zIndex: 50 }}>No products found</div>;
                        })()}
                      </div>
                    </FormField>
                    {selectedPosSupplement && (
                      <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{selectedPosSupplement.name}</div>
                          <Badge label={selectedPosSupplement.status} type={selectedPosSupplement.status} />
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                          SKU: {selectedPosSupplement.sku || "—"} &bull; Brand: {selectedPosSupplement.brand || "—"} &bull; {selectedPosSupplement.category || "General"}
                        </div>
                        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                          <div style={{ fontSize: 12 }}><span style={{ color: "#64748b" }}>Unit Price: </span><strong>LKR {Number(selectedPosSupplement.unitPrice || 0).toLocaleString()}</strong></div>
                          <div style={{ fontSize: 12 }}><span style={{ color: "#64748b" }}>In Stock: </span><strong style={{ color: selectedPosSupplement.stockQty <= 5 ? "#dc2626" : "#16a34a" }}>{selectedPosSupplement.stockQty ?? "—"}</strong></div>
                        </div>
                      </div>
                    )}
                    <FormField label="Quantity">
                      <Input type="number" min="1" value={posForm.qty} onChange={(e) => setPosForm((prev) => ({ ...prev, qty: e.target.value }))} />
                    </FormField>
                    <FormField label="Payment Method">
                      <Select value={posForm.paymentMethod} onChange={(e) => setPosForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="bank-transfer">Bank Transfer</option>
                      </Select>
                    </FormField>
                    <FormField label="Notes (optional)">
                      <Input value={posForm.notes} onChange={(e) => setPosForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Any notes about this sale" />
                    </FormField>
                    {selectedPosSupplement && (
                      <div style={{ padding: "14px 16px", borderRadius: 14, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <div style={{ fontSize: 11, color: "#166534", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Sale Receipt Preview</div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#166534", marginBottom: 4 }}>
                          <span>{selectedPosSupplement.name}</span>
                          <span>× {posForm.qty || 1}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#166534", marginBottom: 4 }}>
                          <span>Unit Price</span>
                          <span>LKR {Number(selectedPosSupplement.unitPrice || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ borderTop: "1px solid #bbf7d0", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#14532d" }}>Total</span>
                          <span style={{ fontSize: 16, fontWeight: 800, color: "#14532d" }}>
                            LKR {(Number(selectedPosSupplement.unitPrice || 0) * Number(posForm.qty || 1)).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#166534", marginTop: 6 }}>
                          Payment: {posForm.paymentMethod} {posForm.memberQuery ? `• Customer: ${posForm.memberQuery}` : "• Walk-in customer"}
                        </div>
                      </div>
                    )}
                    {posError && (
                      <div style={{ fontSize: 12, color: "#dc2626", padding: "10px 13px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca" }}>{posError}</div>
                    )}
                    <div style={{ paddingTop: 4 }}>
                      <Btn onClick={submitSale}>Complete Sale</Btn>
                    </div>
                  </div>
                </Card>
                {/* Sales activity with search/filter */}
                <Card>
                  <SectionHeader title="Sales Activity" />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    <input
                      type="text"
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      placeholder="Search by customer or product..."
                      style={{ flex: 1, minWidth: 140, fontSize: 13, padding: "7px 12px", border: "1px solid var(--border)", borderRadius: 8, outline: "none", background: "var(--bg)" }}
                    />
                    <Select value={salesPaymentFilter} onChange={(e) => setSalesPaymentFilter(e.target.value)} style={{ fontSize: 12, padding: "7px 10px" }}>
                      <option value="all">All Methods</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank-transfer">Bank Transfer</option>
                    </Select>
                    <Select value={salesDateFilter} onChange={(e) => setSalesDateFilter(e.target.value)} style={{ fontSize: 12, padding: "7px 10px" }}>
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </Select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredSales.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--muted)", padding: "16px 0" }}>
                        {sales.length === 0 ? "No POS sales recorded yet." : "No sales match your filters."}
                      </div>
                    ) : filteredSales.map((sale) => (
                      <div key={sale.id} style={{ padding: "13px 15px", borderRadius: 14, background: "#f8fafc", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{sale.memberName || sale.customerName || "Walk-in customer"}</div>
                            {sale.supplementName && (
                              <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, marginTop: 2 }}>{sale.supplementName}</div>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>LKR {Number(sale.total || 0).toLocaleString()}</div>
                            {sale.status && <Badge label={sale.status} type={sale.status} />}
                          </div>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#eff6ff", color: "#1d4ed8" }}>{sale.paymentMethod || "cash"}</span>
                          {sale.qty && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#f5f3ff", color: "#7c3aed" }}>Qty: {sale.qty}</span>}
                          {sale.unitPrice && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#f0fdf4", color: "#15803d" }}>Unit: LKR {Number(sale.unitPrice).toLocaleString()}</span>}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {sale.soldAt ? new Date(sale.soldAt).toLocaleString() : "—"}
                          </div>
                          {sale.notes && <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>"{sale.notes}"</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredSales.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                      Showing {filteredSales.length} of {sales.length} sales &bull; Total: LKR {filteredSales.reduce((s, x) => s + Number(x.total || 0), 0).toLocaleString()}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {page === "returns" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Top toolbar */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {returns.length} total returns &bull; Return rate: <span style={{ color: returnRate > 10 ? "#dc2626" : "#16a34a", fontWeight: 700 }}>{returnRate}%</span>
                </div>
                <ExportButtonGroup>
                  <SpreadsheetExportButton compact onClick={exportReturnsExcel} label="Returns" />
                  <ReportExportButton compact onClick={exportReturnsPdf} label="Returns" />
                </ExportButtonGroup>
              </div>
              {/* Stat cards */}
              <div style={{ ...responsiveGrid(isMobile, "repeat(5,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 14 }}>
                <StatCard label="Total Returns" value={returns.length} accent="#dc2626" />
                <StatCard label="Returned Value" value={`LKR ${returnsTotalValue.toLocaleString()}`} accent="#f59e0b" />
                <StatCard label="Avg. Return" value={`LKR ${avgReturnValue.toLocaleString()}`} accent="#d97706" />
                <StatCard label="Return Rate" value={`${returnRate}%`} accent={returnRate > 10 ? "#dc2626" : "#16a34a"} />
                <StatCard label="Net POS Revenue" value={`LKR ${Math.max(0, salesTotalValue - returnsTotalValue).toLocaleString()}`} accent="#16a34a" />
              </div>
              {/* Main two-column layout */}
              <div style={{ ...responsiveGrid(isMobile, "0.95fr 1.35fr"), gap: 20 }}>
                {/* Return form */}
                <Card>
                  <SectionHeader title="Process Return" />
                  {sales.length === 0 && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 13, color: "#92400e", marginBottom: 8 }}>
                      No sales recorded yet. Make a sale from the POS section before processing a return.
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <FormField label="Original Sale (search by customer name, product, or date)">
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          value={returnSaleSearch || (returnForm.saleId ? (() => { const s = sales.find(s2 => String(s2.id) === returnForm.saleId); return s ? `${s.memberName || s.customerName || "Walk-in"} — ${(s.items||[]).map(i=>i.name).join(", ")||s.supplementName||"Product"} — LKR ${Number(s.total||0).toLocaleString()}` : ""; })() : "")}
                          onFocus={() => { setReturnSaleOpen(true); if (returnForm.saleId) setReturnSaleSearch(""); }}
                          onBlur={() => { setTimeout(() => setReturnSaleOpen(false), 150); }}
                          onChange={(e) => { setReturnSaleSearch(e.target.value); setReturnSaleOpen(true); if (!e.target.value) { setReturnForm(p => ({ ...p, saleId: "", supplementId: "", qty: 1, amount: "" })); } }}
                          placeholder="Search by customer name, product, or date…"
                          style={{ width: "100%", fontSize: 13, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, outline: "none", background: "var(--bg)", color: "var(--text)", boxSizing: "border-box", borderColor: returnForm.saleId ? "#16a34a" : "var(--border)" }}
                          autoComplete="off"
                        />
                        {returnSaleOpen && (() => {
                          const q = returnSaleSearch.toLowerCase();
                          const suggestions = (q
                            ? sales.filter(s =>
                              (s.memberName || s.customerName || "").toLowerCase().includes(q) ||
                              (s.items || []).some(i => (i.name || "").toLowerCase().includes(q)) ||
                              (s.supplementName || "").toLowerCase().includes(q) ||
                              (s.soldAt || "").includes(q)
                            )
                            : sales
                          ).slice(0, q ? 8 : 50);
                          return suggestions.length > 0 ? (
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 50, overflow: "hidden" }}>
                              {suggestions.map(s => (
                                <div key={s.id} onClick={() => { setReturnForm(p => ({ ...p, saleId: s.id, supplementId: "", qty: 1, amount: "" })); setReturnSaleSearch(""); setReturnSaleOpen(false); }}
                                  style={{ padding: "9px 13px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                  onMouseLeave={e => e.currentTarget.style.background = "var(--bg)"}>
                                  <div style={{ fontWeight: 600 }}>{s.memberName || s.customerName || "Walk-in"}</div>
                                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{(s.items||[]).map(i=>i.name).join(", ")||s.supplementName||"Product"} · LKR {Number(s.total||0).toLocaleString()} · {s.soldAt ? new Date(s.soldAt).toLocaleDateString() : "—"}</div>
                                </div>
                              ))}
                            </div>
                          ) : <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 13px", fontSize: 12, color: "var(--muted)", zIndex: 50 }}>No sales found</div>;
                        })()}
                      </div>
                    </FormField>
                    {/* Show selected sale details */}
                    {returnForm.saleId && (() => {
                      const selectedSale = sales.find((s) => String(s.id) === String(returnForm.saleId));
                      return selectedSale ? (
                        <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a" }}>
                          <div style={{ fontSize: 11, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Original Sale Details</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#78350f" }}>{selectedSale.memberName || selectedSale.customerName || "Walk-in"}</div>
                          <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>
                            {selectedSale.supplementName || "—"} &bull; Qty: {selectedSale.qty || 1} &bull; LKR {Number(selectedSale.total || 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 11, color: "#a16207", marginTop: 4 }}>
                            Method: {selectedSale.paymentMethod || "—"} &bull; {selectedSale.soldAt ? new Date(selectedSale.soldAt).toLocaleString() : "—"}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    {returnForm.saleId && (() => {
                      const selectedSale = sales.find((s) => String(s.id) === String(returnForm.saleId));
                      const items = selectedSale?.items || [];
                      if (items.length === 0) return null;
                      return (
                        <FormField label="Product Being Returned">
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                            {items.map((item, idx) => {
                              const isSelected = String(returnForm.supplementId) === String(item.supplement || item.supplementId);
                              const autoQty = Number(item.qty || 1);
                              const autoAmt = Number(item.unitPrice || 0) * autoQty;
                              return (
                                <button key={idx} onClick={() => setReturnForm(p => ({ ...p, supplementId: String(item.supplement || item.supplementId), qty: autoQty, amount: String(autoAmt) }))}
                                  style={{ padding: "8px 14px", borderRadius: 10, border: `2px solid ${isSelected ? "#2563eb" : "var(--border)"}`, background: isSelected ? "#eff6ff" : "var(--bg)", cursor: "pointer", fontSize: 12, fontWeight: isSelected ? 700 : 400, color: isSelected ? "#1d4ed8" : "var(--text)", textAlign: "left", transition: "all 0.15s" }}>
                                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Qty: {item.qty || 1} · LKR {Number(item.unitPrice || 0).toLocaleString()}</div>
                                </button>
                              );
                            })}
                          </div>
                        </FormField>
                      );
                    })()}
                    <FormField label="Quantity Returned">
                      <Input type="number" min="1" value={returnForm.qty} onChange={(e) => setReturnForm((prev) => ({ ...prev, qty: e.target.value }))} />
                    </FormField>
                    <FormField label="Refund Amount (LKR)">
                      <Input type="number" min="0" value={returnForm.amount} onChange={(e) => setReturnForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="Enter refund amount" />
                    </FormField>
                    <FormField label="Return Reason">
                      <Input value={returnForm.reason} onChange={(e) => setReturnForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Defective, wrong item, customer changed mind…" />
                    </FormField>
                    {returnForm.amount && (
                      <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
                        <div style={{ fontSize: 11, color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Return Summary</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#dc2626" }}>Refund: LKR {Number(returnForm.amount || 0).toLocaleString()}</div>
                        {returnForm.reason && <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>Reason: {returnForm.reason}</div>}
                      </div>
                    )}
                    {returnError && (
                      <div style={{ fontSize: 12, color: "#dc2626", padding: "10px 13px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca" }}>{returnError}</div>
                    )}
                    <div style={{ paddingTop: 4 }}>
                      <Btn onClick={submitReturn}>Process Return</Btn>
                    </div>
                  </div>
                </Card>
                {/* Returns list with search/filter */}
                <Card>
                  <SectionHeader title="Return Records" />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    <input
                      type="text"
                      value={returnsSearch}
                      onChange={(e) => setReturnsSearch(e.target.value)}
                      placeholder="Search by customer, product, or reason..."
                      style={{ flex: 1, minWidth: 140, fontSize: 13, padding: "7px 12px", border: "1px solid var(--border)", borderRadius: 8, outline: "none", background: "var(--bg)" }}
                    />
                    <Select value={returnsDateFilter} onChange={(e) => setReturnsDateFilter(e.target.value)} style={{ fontSize: 12, padding: "7px 10px" }}>
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </Select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredReturns.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--muted)", padding: "16px 0" }}>
                        {returns.length === 0 ? "No returns have been processed yet." : "No returns match your filters."}
                      </div>
                    ) : filteredReturns.map((item) => (
                      <div key={item.id} style={{ padding: "13px 15px", borderRadius: 14, background: "#fff7ed", border: "1px solid #fed7aa" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#9a3412" }}>{item.customerName || item.memberName || "Unknown customer"}</div>
                            {item.supplementName && (
                              <div style={{ fontSize: 12, color: "#c2410c", fontWeight: 600, marginTop: 2 }}>{item.supplementName}</div>
                            )}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#dc2626" }}>LKR {Number(item.amount || 0).toLocaleString()}</div>
                            {item.qty && <div style={{ fontSize: 11, color: "#9a3412", marginTop: 2 }}>Qty: {item.qty}</div>}
                          </div>
                        </div>
                        {item.reason && (
                          <div style={{ marginTop: 8, fontSize: 12, color: "#7c2d12", background: "#fef3c7", padding: "5px 10px", borderRadius: 6, lineHeight: 1.5 }}>
                            Reason: {item.reason}
                          </div>
                        )}
                        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ fontSize: 11, color: "#92400e" }}>
                            Processed: {item.processedAt ? new Date(item.processedAt).toLocaleString() : "—"}
                          </div>
                          {item.saleId && (
                            <div style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#fde68a", color: "#92400e" }}>
                              Sale #{item.saleId}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredReturns.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                      Showing {filteredReturns.length} of {returns.length} returns &bull; Total refunded: LKR {filteredReturns.reduce((s, x) => s + Number(x.amount || 0), 0).toLocaleString()}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {page === "announcements" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Toolbar
                search={announcementSearch}
                setSearch={setAnnouncementSearch}
                searchPlaceholder="Search announcements by title or body"
                filters={[
                  {
                    label: "Priority",
                    value: announcementPriority,
                    onChange: setAnnouncementPriority,
                    options: [
                      { value: "all", label: "All Priorities" },
                      { value: "info", label: "Info" },
                      { value: "warning", label: "Warning" },
                      { value: "success", label: "Success" }
                    ]
                  }
                ]}
                action={(
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ExportButtonGroup>
                      <SpreadsheetExportButton compact onClick={exportAnnouncementsExcel} label="Announcements" />
                      <ReportExportButton compact onClick={() => exportOwnerReport("announcements")} label="Announcements" />
                    </ExportButtonGroup>
                    <Btn small onClick={() => openAnnouncementModal("create")}>🔔 New Announcement</Btn>
                  </div>
                )}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
                {pagedAnnouncements.visibleItems.map((announcement) => (
                  <Card key={announcement.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                          {announcement.pinned && <span style={{ fontSize: 11, background: "#fef9c3", color: "#a16207", padding: "2px 8px", borderRadius: 6 }}>&#x1F4CC; Pinned</span>}
                          <Badge label={announcement.priority} type={announcement.priority} />
                          {announcement.audience && announcement.audience !== "all" && (
                            <span style={{ fontSize: 11, background: "#ede9fe", color: "#7c3aed", padding: "2px 8px", borderRadius: 6 }}>
                              {announcement.audience === "members" ? "Members Only" : announcement.audience === "coaches" ? "Coaches Only" : "Specific People"}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{announcement.title}</div>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{announcement.body}</div>
                        {announcement.ctaLabel && (
                          <div style={{ marginTop: 8 }}>
                            <span style={{ fontSize: 12, background: "#2563eb", color: "#fff", padding: "4px 12px", borderRadius: 8 }}>{announcement.ctaLabel}</span>
                          </div>
                        )}
                        {announcement.expiresAt && (
                          <div style={{ fontSize: 11, color: "#dc2626", marginTop: 6 }}>Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</div>
                        )}
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{announcement.date}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <IconBtn title="Edit" onClick={() => openAnnouncementModal("edit", announcement)}><IcoEdit /></IconBtn>
                        <IconBtn title="Delete" danger onClick={() => removeAnnouncement(announcement.id)}><IcoTrash /></IconBtn>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <PaginationControls page={pagedAnnouncements.page} totalPages={pagedAnnouncements.totalPages} onPageChange={setAnnouncementPage} totalItems={filteredAnnouncements.length} label="announcements" />
            </div>
          )}

          {page === "subscription" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
              <SectionHeader title="Subscription" subtitle="Manage your gym's subscription plan and renew online via PayHere." />

              {/* Current status card */}
              <Card>
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 20, alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Plan</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>{profile?.plan || "No plan assigned"}</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <Badge
                        label={profile?.subscriptionStatus || "unknown"}
                        type={
                          profile?.subscriptionStatus === "active" ? "success" :
                          profile?.subscriptionStatus === "trial" ? "info" :
                          profile?.subscriptionStatus === "suspended" ? "danger" : "warning"
                        }
                      />
                      {profile?.subscriptionEndsAt && (
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>
                          Expires {new Date(profile.subscriptionEndsAt).toLocaleDateString("en-LK", { year: "numeric", month: "long", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: isMobile ? "left" : "right" }}>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Gym</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{currentGym?.name}</div>
                  </div>
                </div>
              </Card>

              {/* Plan picker */}
              {availableSubscriptionPlans.length > 0 ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Choose a Plan</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
                    {availableSubscriptionPlans.map((plan) => {
                      const isCurrent = plan.id === profile?.subscriptionPlanId;
                      const isSelected = selectedPlan?.id === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => !isCurrent && setSelectedPlan(isSelected ? null : plan)}
                          style={{
                            background: "var(--card-bg, #fff)",
                            border: isSelected ? "2px solid #2563eb" : isCurrent ? "2px solid #16a34a" : "2px solid var(--border, #e5e7eb)",
                            borderRadius: 14,
                            padding: "18px 16px",
                            cursor: isCurrent ? "default" : "pointer",
                            position: "relative",
                            transition: "border-color 0.15s, box-shadow 0.15s",
                            boxShadow: isSelected ? "0 0 0 3px rgba(37,99,235,0.12)" : "none"
                          }}
                        >
                          {isCurrent && (
                            <span style={{ position: "absolute", top: 12, right: 12, background: "#16a34a", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" }}>Current</span>
                          )}
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{plan.name}</div>
                          <div style={{ marginBottom: 6 }}>
                            <span style={{ fontSize: 24, fontWeight: 800, color: "#2563eb" }}>LKR {Number(plan.price).toLocaleString()}</span>
                            <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>/ {plan.billingCycle}</span>
                          </div>
                          {plan.description && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{plan.description}</div>}
                          {Array.isArray(plan.features) && plan.features.length > 0 && (
                            <ul style={{ margin: "8px 0 0", padding: "0 0 0 16px", fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>
                              {plan.features.map((f, i) => <li key={i}>{f}</li>)}
                            </ul>
                          )}
                          {!isCurrent && (
                            <div style={{ marginTop: 14 }}>
                              <Btn small variant={isSelected ? "primary" : "outline"} onClick={(e) => { e.stopPropagation(); setSelectedPlan(isSelected ? null : plan); }}>
                                {isSelected ? "✓ Selected" : "Select"}
                              </Btn>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
                    {paySuccess && (
                      <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                        Payment successful! Your subscription has been updated.
                      </div>
                    )}
                    {payError && (
                      <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626" }}>
                        {payError}
                      </div>
                    )}
                    <Btn disabled={!selectedPlan || payLoading} onClick={handlePayherePay}>
                      {payLoading ? "Processing..." : selectedPlan ? `Pay LKR ${Number(selectedPlan.price).toLocaleString()} via PayHere` : "Select a plan to pay"}
                    </Btn>
                    {selectedPlan && (
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        Selected: <strong>{selectedPlan.name}</strong> ({selectedPlan.billingCycle}) — LKR {Number(selectedPlan.price).toLocaleString()}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState title="No plans available" message="No subscription plans have been configured yet. Contact the super admin to set up plans." />
              )}
            </div>
          )}

          {coachModal && (
            <Modal title={coachModal === "edit" ? "Edit Coach" : "Add Coach"} onClose={() => setCoachModal(null)} width={980}>
              <ModalSectionBlock title="Coach Identity" description="Core personal and contact details for the coach account." accent="#2563eb">
                <ModalFormGrid isMobile={isMobile}>
                  <FormField label="Full Name"><Input value={coachForm.name} onChange={(e) => setCoachForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
                  <FormField label="Email"><Input type="email" value={coachForm.email} onChange={(e) => setCoachForm((prev) => ({ ...prev, email: e.target.value }))} /></FormField>
                  <FormField label="Employee Code"><Input value={coachForm.employeeCode} onChange={(e) => setCoachForm((prev) => ({ ...prev, employeeCode: e.target.value }))} /></FormField>
                  <FormField label="Specialty"><Input value={coachForm.specialty} onChange={(e) => setCoachForm((prev) => ({ ...prev, specialty: e.target.value }))} /></FormField>
                  <FormField label="Date Of Birth"><Input type="date" value={coachForm.dateOfBirth} onChange={(e) => setCoachForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))} /></FormField>
                  <FormField label="Gender"><Input value={coachForm.gender} onChange={(e) => setCoachForm((prev) => ({ ...prev, gender: e.target.value }))} /></FormField>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <FormField label="Address"><TextArea rows={2} value={coachForm.address} onChange={(e) => setCoachForm((prev) => ({ ...prev, address: e.target.value }))} /></FormField>
                  </div>
                  <FormField label="NIC / National ID"><Input value={coachForm.nationalId} onChange={(e) => setCoachForm((prev) => ({ ...prev, nationalId: e.target.value }))} /></FormField>
                  <FormField label="Emergency Contact"><Input value={coachForm.emergencyContact} onChange={(e) => setCoachForm((prev) => ({ ...prev, emergencyContact: e.target.value }))} /></FormField>
                </ModalFormGrid>
              </ModalSectionBlock>

              <ModalSectionBlock title="Employment & Scheduling" description="Shift, capacity, and employment details used operationally." accent="#16a34a">
                <ModalFormGrid isMobile={isMobile}>
                  <FormField label="Hire Date"><Input type="date" value={coachForm.hireDate} onChange={(e) => setCoachForm((prev) => ({ ...prev, hireDate: e.target.value }))} /></FormField>
                  <FormField label="Employment Type"><Input value={coachForm.employmentType} onChange={(e) => setCoachForm((prev) => ({ ...prev, employmentType: e.target.value }))} placeholder="Full-time / Part-time" /></FormField>
                  <FormField label="Base Salary (LKR / month)"><Input type="number" min="0" value={coachForm.baseSalary || ""} onChange={(e) => setCoachForm((prev) => ({ ...prev, baseSalary: e.target.value }))} placeholder="e.g. 85000" /></FormField>
                  <FormField label="Salary / Commission Model"><Input value={coachForm.salaryModel} onChange={(e) => setCoachForm((prev) => ({ ...prev, salaryModel: e.target.value }))} placeholder="e.g. Fixed + PT commission" /></FormField>
                  <FormField label="Shift Schedule"><Input value={coachForm.shiftSchedule} onChange={(e) => setCoachForm((prev) => ({ ...prev, shiftSchedule: e.target.value }))} /></FormField>
                  <FormField label="Available Hours"><Input value={coachForm.availableHours} onChange={(e) => setCoachForm((prev) => ({ ...prev, availableHours: e.target.value }))} /></FormField>
                  <FormField label="Max Client Capacity"><Input type="number" min="0" value={coachForm.maxClientCapacity} onChange={(e) => setCoachForm((prev) => ({ ...prev, maxClientCapacity: e.target.value }))} /></FormField>
                  <FormField label="Years Of Experience"><Input type="number" min="0" value={coachForm.yearsOfExperience} onChange={(e) => setCoachForm((prev) => ({ ...prev, yearsOfExperience: e.target.value }))} /></FormField>
                  {coachModal === "edit" ? (
                    <>
                      <FormField label="Status"><Select value={coachForm.status} onChange={(e) => setCoachForm((prev) => ({ ...prev, status: e.target.value }))}><option value="active">active</option><option value="inactive">inactive</option></Select></FormField>
                      <FormField label="Members"><Input type="number" min="0" value={coachForm.members} onChange={(e) => setCoachForm((prev) => ({ ...prev, members: e.target.value }))} /></FormField>
                    </>
                  ) : null}
                </ModalFormGrid>
              </ModalSectionBlock>

              <ModalSectionBlock title="Credentials & Notes" description="Certifications, specialization areas, and back-office notes." accent="#7c3aed">
                <ModalFormGrid isMobile={isMobile}>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <FormField label="Specializations"><TextArea rows={2} value={coachForm.specializations} onChange={(e) => setCoachForm((prev) => ({ ...prev, specializations: e.target.value }))} placeholder="Comma separated" /></FormField>
                  </div>
                  <FormField label="Languages Spoken"><Input value={coachForm.languages} onChange={(e) => setCoachForm((prev) => ({ ...prev, languages: e.target.value }))} placeholder="Comma separated" /></FormField>
                  <FormField label="Certification Expiry Dates"><Input value={coachForm.certificationExpiryDates} onChange={(e) => setCoachForm((prev) => ({ ...prev, certificationExpiryDates: e.target.value }))} placeholder="Comma separated dates" /></FormField>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <FormField label="Certifications"><TextArea rows={2} value={coachForm.certifications} onChange={(e) => setCoachForm((prev) => ({ ...prev, certifications: e.target.value }))} /></FormField>
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <FormField label="Performance Notes"><TextArea rows={3} value={coachForm.performanceNotes} onChange={(e) => setCoachForm((prev) => ({ ...prev, performanceNotes: e.target.value }))} /></FormField>
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <FormField label="Bank / Payment Details"><TextArea rows={2} value={coachForm.bankPaymentDetails} onChange={(e) => setCoachForm((prev) => ({ ...prev, bankPaymentDetails: e.target.value }))} /></FormField>
                  </div>
                </ModalFormGrid>
              </ModalSectionBlock>

              {coachModal === "create" && <div style={{ fontSize: 12, color: "var(--muted)", padding: "12px 14px", borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", lineHeight: 1.6 }}>A temporary password will be generated automatically and must be changed on first login.</div>}
              {ownerFormError ? <div style={{ fontSize: 12, color: "#dc2626", padding: "12px 14px", borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca" }}>{ownerFormError}</div> : null}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "14px 0 2px", position: "sticky", bottom: 0, background: "linear-gradient(180deg, rgba(248,250,252,0), rgba(248,250,252,0.98) 24%)" }}>
                <Btn variant="ghost" onClick={() => setCoachModal(null)}>Cancel</Btn>
                <Btn onClick={saveCoach}>&#x2713; {coachModal === "edit" ? "Save Changes" : "Add Coach"}</Btn>
              </div>
            </Modal>
          )}

          {memberModal && (
            <Modal title={memberModal === "edit" ? "Edit Member" : "Add Member"} onClose={() => setMemberModal(null)} width={1080}>
              <ModalSectionBlock title="Profile Basics" description="Identity, coach assignment, and basic personal details." accent="#2563eb">
                <ModalFormGrid isMobile={isMobile}>
                  <FormField label="Full Name"><Input value={memberForm.name} onChange={(e) => setMemberForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
                  <FormField label="Email"><Input type="email" value={memberForm.email} onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))} /></FormField>
                  <FormField label="Date Of Birth"><Input type="date" value={memberForm.dateOfBirth} onChange={(e) => setMemberForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))} /></FormField>
                  <FormField label="Gender"><Input value={memberForm.gender} onChange={(e) => setMemberForm((prev) => ({ ...prev, gender: e.target.value }))} /></FormField>
                  <FormField label="Coach">
                    <Select value={memberForm.coach} onChange={(e) => setMemberForm((prev) => ({ ...prev, coach: e.target.value }))}>
                      <option value="">Select a coach</option>
                      {coaches.map((coach) => <option key={coach.id} value={coach.name}>{coach.name}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Fitness Level"><Input value={memberForm.fitnessLevel} onChange={(e) => setMemberForm((prev) => ({ ...prev, fitnessLevel: e.target.value }))} placeholder="Beginner / Intermediate / Advanced" /></FormField>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <FormField label="Address"><TextArea rows={2} value={memberForm.address} onChange={(e) => setMemberForm((prev) => ({ ...prev, address: e.target.value }))} /></FormField>
                  </div>
                </ModalFormGrid>
              </ModalSectionBlock>

              {memberModal === "create" && coaches.length === 0 ? (
                <div style={{ fontSize: 12, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "12px 14px", lineHeight: 1.6 }}>
                  Add at least one coach before creating a member so the member can be assigned properly.
                </div>
              ) : null}
              {memberModal === "create" ? (
                <div style={{ fontSize: 12, color: "var(--muted)", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "12px 14px", lineHeight: 1.6 }}>
                  The gym owner creates the member account here and assigns the coach now. A temporary password will be generated automatically, and the member must change it on first login.
                </div>
              ) : null}

              <ModalSectionBlock title="Membership & Billing" description="Plan, payment, and operational membership settings." accent="#16a34a">
                <ModalFormGrid isMobile={isMobile}>
                  <FormField label="Plan">
                    <Select value={memberForm.plan} onChange={(e) => handleMemberPlanChange(e.target.value)}>
                      {membershipPlans.length === 0 ? <option value="Basic">Basic</option> : membershipPlans.map((plan) => <option key={plan.id} value={plan.name}>{plan.name}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Goal"><Input value={memberForm.goal} onChange={(e) => setMemberForm((prev) => ({ ...prev, goal: e.target.value }))} /></FormField>
                  <FormField label="Subscription Duration (months)"><Input type="number" min="1" value={memberForm.subscriptionDurationMonths} readOnly /></FormField>
                  <FormField label="Payment Status"><Select value={memberForm.paymentStatus} disabled><option value="paid">paid</option><option value="partial">partial</option><option value="unpaid">unpaid</option></Select></FormField>
                  <FormField label="Amount Paid"><Input type="number" min="0" value={memberForm.amountPaid} onChange={(e) => handleMemberAmountPaidChange(e.target.value)} /></FormField>
                  <FormField label="Subscription Fee"><Input type="number" min="0" value={memberForm.amountDue} readOnly /></FormField>
                  <FormField label="Payment Method"><Input value={memberForm.paymentMethod} onChange={(e) => setMemberForm((prev) => ({ ...prev, paymentMethod: e.target.value }))} /></FormField>
                  <FormField label="Preferred Workout Time"><Input value={memberForm.preferredWorkoutTime} onChange={(e) => setMemberForm((prev) => ({ ...prev, preferredWorkoutTime: e.target.value }))} /></FormField>
                  <FormField label="Join Source"><Input value={memberForm.joinSource} onChange={(e) => setMemberForm((prev) => ({ ...prev, joinSource: e.target.value }))} /></FormField>
                  <FormField label="Renewal Reminder Preference"><Input value={memberForm.renewalReminderPreference} onChange={(e) => setMemberForm((prev) => ({ ...prev, renewalReminderPreference: e.target.value }))} /></FormField>
                  <FormField label="Assigned Locker"><Input value={memberForm.assignedLocker} onChange={(e) => setMemberForm((prev) => ({ ...prev, assignedLocker: e.target.value }))} /></FormField>
                  <FormField label="Member Tag"><Input value={memberForm.memberTag} onChange={(e) => setMemberForm((prev) => ({ ...prev, memberTag: e.target.value }))} /></FormField>
                  <FormField label="Barcode"><Input value={memberForm.barcode} onChange={(e) => setMemberForm((prev) => ({ ...prev, barcode: e.target.value }))} /></FormField>
                  <FormField label="Diet Plan"><Input value={memberForm.dietPlanName} onChange={(e) => setMemberForm((prev) => ({ ...prev, dietPlanName: e.target.value }))} placeholder="e.g. Cutting 2200kcal" /></FormField>
                  <FormField label="Goal Target Date"><Input type="date" value={memberForm.goalTargetDate} onChange={(e) => setMemberForm((prev) => ({ ...prev, goalTargetDate: e.target.value }))} /></FormField>
                  <FormField label="Membership Freeze Status"><Input value={memberForm.membershipFreezeStatus} onChange={(e) => setMemberForm((prev) => ({ ...prev, membershipFreezeStatus: e.target.value }))} /></FormField>
                  {memberModal === "edit" ? (
                    <>
                      <FormField label="Status"><Select value={memberForm.status} onChange={(e) => setMemberForm((prev) => ({ ...prev, status: e.target.value }))}><option value="active">active</option><option value="inactive">inactive</option></Select></FormField>
                      <FormField label="Progress"><Input type="number" min="0" max="100" value={memberForm.progress} onChange={(e) => setMemberForm((prev) => ({ ...prev, progress: e.target.value }))} /></FormField>
                      <FormField label="Check-ins"><Input type="number" min="0" value={memberForm.checkIns} onChange={(e) => setMemberForm((prev) => ({ ...prev, checkIns: e.target.value }))} /></FormField>
                    </>
                  ) : null}
                </ModalFormGrid>
                <div style={{ marginTop: 14, fontSize: 12, color: "#64748b" }}>
                  Remaining balance: {formatCurrencyValue(calculateRemainingBalance(memberForm.amountPaid, memberForm.amountDue))}
                </div>
              </ModalSectionBlock>

              <ModalSectionBlock title="Body Metrics" description="Measurements and body-composition targets for tracking progress." accent="#7c3aed">
                <ModalFormGrid isMobile={isMobile}>
                  <FormField label="Height (cm)"><Input type="number" value={memberForm.heightCm} onChange={(e) => setMemberForm((prev) => ({ ...prev, heightCm: e.target.value }))} /></FormField>
                  <FormField label="Current Weight (kg)"><Input type="number" value={memberForm.currentWeightKg} onChange={(e) => setMemberForm((prev) => ({ ...prev, currentWeightKg: e.target.value }))} /></FormField>
                  <FormField label="Target Weight (kg)"><Input type="number" value={memberForm.targetWeightKg} onChange={(e) => setMemberForm((prev) => ({ ...prev, targetWeightKg: e.target.value }))} /></FormField>
                  <FormField label="Target Body Fat (%)"><Input type="number" value={memberForm.targetBodyFat} onChange={(e) => setMemberForm((prev) => ({ ...prev, targetBodyFat: e.target.value }))} /></FormField>
                  <FormField label="Body Fat (%)"><Input type="number" value={memberForm.bodyFatPercentage} onChange={(e) => setMemberForm((prev) => ({ ...prev, bodyFatPercentage: e.target.value }))} /></FormField>
                  <FormField label="BMI"><Input type="number" value={memberForm.bmi} onChange={(e) => setMemberForm((prev) => ({ ...prev, bmi: e.target.value }))} /></FormField>
                  <FormField label="Waist To Hip Ratio"><Input type="number" value={memberForm.waistToHipRatio} onChange={(e) => setMemberForm((prev) => ({ ...prev, waistToHipRatio: e.target.value }))} /></FormField>
                  <FormField label="Chest (cm)"><Input type="number" value={memberForm.chestCm} onChange={(e) => setMemberForm((prev) => ({ ...prev, chestCm: e.target.value }))} /></FormField>
                  <FormField label="Waist (cm)"><Input type="number" value={memberForm.waistCm} onChange={(e) => setMemberForm((prev) => ({ ...prev, waistCm: e.target.value }))} /></FormField>
                  <FormField label="Arms (cm)"><Input type="number" value={memberForm.armsCm} onChange={(e) => setMemberForm((prev) => ({ ...prev, armsCm: e.target.value }))} /></FormField>
                  <FormField label="Thighs (cm)"><Input type="number" value={memberForm.thighsCm} onChange={(e) => setMemberForm((prev) => ({ ...prev, thighsCm: e.target.value }))} /></FormField>
                </ModalFormGrid>
              </ModalSectionBlock>

              <ModalSectionBlock title="Health & Notes" description="Emergency details, medical notes, and internal follow-up." accent="#ea580c">
                <ModalFormGrid isMobile={isMobile}>
                  <FormField label="Emergency Contact"><Input value={memberForm.emergencyContact} onChange={(e) => setMemberForm((prev) => ({ ...prev, emergencyContact: e.target.value }))} /></FormField>
                  <FormField label="Emergency Contact Relationship"><Input value={memberForm.emergencyContactRelationship} onChange={(e) => setMemberForm((prev) => ({ ...prev, emergencyContactRelationship: e.target.value }))} /></FormField>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <FormField label="Medical Conditions / Injury Notes"><TextArea rows={3} value={memberForm.medicalNotes} onChange={(e) => setMemberForm((prev) => ({ ...prev, medicalNotes: e.target.value }))} /></FormField>
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <FormField label="Attendance Notes"><TextArea rows={3} value={memberForm.attendanceNotes} onChange={(e) => setMemberForm((prev) => ({ ...prev, attendanceNotes: e.target.value }))} /></FormField>
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <FormField label="Supplement Usage"><TextArea rows={2} value={memberForm.supplementUsage} onChange={(e) => setMemberForm((prev) => ({ ...prev, supplementUsage: e.target.value }))} /></FormField>
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <FormField label="Progress Photos"><TextArea rows={2} value={memberForm.progressPhotos} onChange={(e) => setMemberForm((prev) => ({ ...prev, progressPhotos: e.target.value }))} placeholder="Comma separated" /></FormField>
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <FormField label="Personal Notes"><TextArea rows={3} value={memberForm.personalNotes} onChange={(e) => setMemberForm((prev) => ({ ...prev, personalNotes: e.target.value }))} /></FormField>
                  </div>
                </ModalFormGrid>
              </ModalSectionBlock>

              {ownerFormError ? <div style={{ fontSize: 12, color: "#dc2626", padding: "12px 14px", borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca" }}>{ownerFormError}</div> : null}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "14px 0 2px", position: "sticky", bottom: 0, background: "linear-gradient(180deg, rgba(248,250,252,0), rgba(248,250,252,0.98) 24%)" }}>
                <Btn variant="ghost" onClick={() => setMemberModal(null)}>Cancel</Btn>
                <Btn onClick={saveMember}>&#x2713; {memberModal === "edit" ? "Save Changes" : "Add Member"}</Btn>
              </div>
            </Modal>
          )}

          {announcementModal && (
            <Modal title={announcementModal === "edit" ? "Edit Announcement" : "New Announcement / Notification"} onClose={() => setAnnouncementModal(null)} width={680}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <FormField label="Title" style={{ gridColumn: "1 / -1" }}><Input value={announcementForm.title} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))} /></FormField>
                <FormField label="Body / Message" style={{ gridColumn: "1 / -1" }}><TextArea rows={3} value={announcementForm.body} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, body: e.target.value }))} /></FormField>
                <FormField label="Priority">
                  <Select value={announcementForm.priority} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, priority: e.target.value }))}>
                    <option value="info">ℹ Info</option>
                    <option value="warning">⚠ Warning</option>
                    <option value="success">✅ Success</option>
                  </Select>
                </FormField>
                <FormField label="Send To (Audience)">
                  <Select value={announcementForm.audience} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, audience: e.target.value }))}>
                    <option value="all">Everyone</option>
                    <option value="members">Members Only</option>
                    <option value="coaches">Coaches Only</option>
                    <option value="specific">Specific People</option>
                  </Select>
                </FormField>
                <FormField label="Expires At (optional)"><Input type="date" value={announcementForm.expiresAt} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, expiresAt: e.target.value }))} /></FormField>
                <FormField label="Pin to Top">
                  <Select value={announcementForm.pinned ? "yes" : "no"} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, pinned: e.target.value === "yes" }))}>
                    <option value="no">No</option>
                    <option value="yes">Yes – Pin to Top</option>
                  </Select>
                </FormField>
                <FormField label="CTA Button Label"><Input value={announcementForm.ctaLabel} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, ctaLabel: e.target.value }))} placeholder="e.g. Learn More" /></FormField>
                <FormField label="CTA Button URL"><Input value={announcementForm.ctaUrl} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, ctaUrl: e.target.value }))} placeholder="https://..." /></FormField>
                <FormField label="Banner Image URL" style={{ gridColumn: "1 / -1" }}><Input value={announcementForm.imageUrl} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, imageUrl: e.target.value }))} placeholder="https://... (optional)" /></FormField>
              </div>
              {announcementForm.audience === "specific" && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Select Members (hold Ctrl/Cmd to select multiple)</div>
                  <select
                    multiple
                    value={announcementForm.targetMemberIds}
                    onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, targetMemberIds: Array.from(e.target.selectedOptions, (o) => o.value) }))}
                    style={{ width: "100%", height: 120, borderRadius: 8, border: "1px solid var(--border)", padding: 8, fontSize: 13 }}
                  >
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.memberCode || "pending"})</option>)}
                  </select>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, marginTop: 12 }}>Select Coaches</div>
                  <select
                    multiple
                    value={announcementForm.targetCoachIds}
                    onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, targetCoachIds: Array.from(e.target.selectedOptions, (o) => o.value) }))}
                    style={{ width: "100%", height: 100, borderRadius: 8, border: "1px solid var(--border)", padding: 8, fontSize: 13 }}
                  >
                    {coaches.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.coachCode || "pending"})</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Btn onClick={saveAnnouncement}>&#x1F514; {announcementModal === "edit" ? "Save Changes" : "Post Announcement"}</Btn>
                <Btn variant="ghost" onClick={() => setAnnouncementModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {planModal && (
            <Modal title={planModal === "edit" ? "Edit Membership Plan" : "Add Membership Plan"} onClose={() => setPlanModal(null)} width={700}>
              <FormField label="Plan Name">
                <Input value={planForm.name} onChange={(e) => setPlanForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Premium Monthly" />
              </FormField>
              <FormField label="Description">
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this plan..."
                  rows={2}
                  style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", padding: "8px 12px", fontSize: 14, resize: "vertical", fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", boxSizing: "border-box" }}
                />
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <FormField label="Duration (Months)">
                  <Input type="number" min="1" value={planForm.durationMonths} onChange={(e) => setPlanForm((prev) => ({ ...prev, durationMonths: e.target.value }))} />
                </FormField>
                <FormField label="Price (LKR)">
                  <Input type="number" min="0" value={planForm.price} onChange={(e) => setPlanForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="0" />
                </FormField>
                <FormField label="Setup Fee (LKR)">
                  <Input type="number" min="0" value={planForm.setupFee} onChange={(e) => setPlanForm((prev) => ({ ...prev, setupFee: e.target.value }))} placeholder="0" />
                </FormField>
                <FormField label="Renewal Discount (%)">
                  <Input type="number" min="0" max="100" value={planForm.discountPercent} onChange={(e) => setPlanForm((prev) => ({ ...prev, discountPercent: e.target.value }))} placeholder="0" />
                </FormField>
                <FormField label="Trial Days">
                  <Input type="number" min="0" value={planForm.trialDays} onChange={(e) => setPlanForm((prev) => ({ ...prev, trialDays: e.target.value }))} placeholder="0" />
                </FormField>
                <FormField label="Max Members (0 = unlimited)">
                  <Input type="number" min="0" value={planForm.maxMembers} onChange={(e) => setPlanForm((prev) => ({ ...prev, maxMembers: e.target.value }))} placeholder="0" />
                </FormField>
                <FormField label="Access Hours">
                  <Input value={planForm.accessHours} onChange={(e) => setPlanForm((prev) => ({ ...prev, accessHours: e.target.value }))} placeholder="e.g. 6:00 AM – 10:00 PM" />
                </FormField>
                <FormField label="Coach Sessions / Week">
                  <Input type="number" min="0" value={planForm.sessionsPerWeek} onChange={(e) => setPlanForm((prev) => ({ ...prev, sessionsPerWeek: e.target.value }))} placeholder="0" />
                </FormField>
                <FormField label="Accent Color">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="color" value={planForm.color || "#2563eb"} onChange={(e) => setPlanForm((prev) => ({ ...prev, color: e.target.value }))} style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", padding: 2, background: "var(--bg)" }} />
                    <Input value={planForm.color || "#2563eb"} onChange={(e) => setPlanForm((prev) => ({ ...prev, color: e.target.value }))} placeholder="#2563eb" />
                  </div>
                </FormField>
                <FormField label="Status">
                  <Select value={planForm.isActive ? "active" : "inactive"} onChange={(e) => setPlanForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </FormField>
              </div>
              <FormField label="Features (comma separated)">
                <Input value={planForm.features} onChange={(e) => setPlanForm((prev) => ({ ...prev, features: e.target.value }))} placeholder="e.g. Unlimited Access, Locker Room, Pool" />
              </FormField>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <Btn onClick={savePlan}>&#x2713; {planModal === "edit" ? "Save Changes" : "Create Plan"}</Btn>
                <Btn variant="ghost" onClick={() => setPlanModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {workoutModal && (
            <Modal title={workoutModal === "edit" ? "Edit Workout Plan" : "Add Workout Plan"} onClose={() => setWorkoutModal(null)} width={680}>
              <FormField label="Plan Name"><Input value={workoutForm.name} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
              <FormField label="Level">
                <Select value={workoutForm.level} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, level: e.target.value }))}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </Select>
              </FormField>
              <FormField label="Duration"><Input value={workoutForm.duration} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, duration: e.target.value }))} placeholder="e.g. 8 weeks" /></FormField>
              <FormField label="Days"><Input type="number" value={workoutForm.days} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, days: e.target.value }))} /></FormField>
              <FormField label="Category"><Input value={workoutForm.category} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, category: e.target.value }))} /></FormField>
              <FormField label="Description (optional)"><Input value={workoutForm.description} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, description: e.target.value }))} /></FormField>
              <FormField label="Exercises">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(workoutForm.exercises || []).map((ex, idx) => (
                    <div key={idx} style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Exercise {idx + 1}</div>
                        <Btn small danger onClick={() => setWorkoutForm((prev) => ({ ...prev, exercises: prev.exercises.filter((_, i) => i !== idx) }))}>Remove</Btn>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr", gap: 8 }}>
                        <Input placeholder="Exercise name" value={ex.name} onChange={(e) => setWorkoutForm((prev) => { const exs = [...prev.exercises]; exs[idx] = { ...exs[idx], name: e.target.value }; return { ...prev, exercises: exs }; })} />
                        <Input placeholder="Sets" type="number" value={ex.sets} onChange={(e) => setWorkoutForm((prev) => { const exs = [...prev.exercises]; exs[idx] = { ...exs[idx], sets: e.target.value }; return { ...prev, exercises: exs }; })} />
                        <Input placeholder="Reps e.g. 10" value={ex.reps} onChange={(e) => setWorkoutForm((prev) => { const exs = [...prev.exercises]; exs[idx] = { ...exs[idx], reps: e.target.value }; return { ...prev, exercises: exs }; })} />
                        <Input placeholder="Rest e.g. 60s" value={ex.rest} onChange={(e) => setWorkoutForm((prev) => { const exs = [...prev.exercises]; exs[idx] = { ...exs[idx], rest: e.target.value }; return { ...prev, exercises: exs }; })} />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Input placeholder="Day label (e.g. Day 1, Monday)" value={ex.day} onChange={(e) => setWorkoutForm((prev) => { const exs = [...prev.exercises]; exs[idx] = { ...exs[idx], day: e.target.value }; return { ...prev, exercises: exs }; })} />
                      </div>
                    </div>
                  ))}
                  <Btn small variant="ghost" onClick={() => setWorkoutForm((prev) => ({ ...prev, exercises: [...(prev.exercises || []), { day: "", name: "", sets: "", reps: "", rest: "", notes: "" }] }))}>+ Add Exercise</Btn>
                </div>
              </FormField>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveWorkout}>&#x2713; {workoutModal === "edit" ? "Save Changes" : "Create Workout Plan"}</Btn>
                <Btn variant="ghost" onClick={() => setWorkoutModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {assignWorkoutModal && (
            <Modal title="Assign Workout Plan" onClose={() => setAssignWorkoutModal(false)}>
              <FormField label="Member">
                <Select value={assignWorkoutForm.memberId} onChange={(e) => setAssignWorkoutForm((prev) => ({ ...prev, memberId: e.target.value }))}>
                  <option value="">Select member</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Workout Plan">
                <Select value={assignWorkoutForm.workoutPlanId} onChange={(e) => setAssignWorkoutForm((prev) => ({ ...prev, workoutPlanId: e.target.value }))}>
                  <option value="">Select workout plan</option>
                  {workoutPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </Select>
              </FormField>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveAssignedWorkoutPlan}>&#x2713; Assign Workout Plan</Btn>
                <Btn variant="ghost" onClick={() => setAssignWorkoutModal(false)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {mealModal && (
            <Modal title={mealModal === "edit" ? "Edit Meal Plan" : "Add Meal Plan"} onClose={() => setMealModal(null)}>
              <FormField label="Plan Name"><Input value={mealForm.name} onChange={(e) => setMealForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
              <FormField label="Goal"><Input value={mealForm.goal} onChange={(e) => setMealForm((prev) => ({ ...prev, goal: e.target.value }))} /></FormField>
              <FormField label="Calories"><Input type="number" value={mealForm.calories} onChange={(e) => setMealForm((prev) => ({ ...prev, calories: e.target.value }))} /></FormField>
              <FormField label="Protein"><Input type="number" value={mealForm.protein} onChange={(e) => setMealForm((prev) => ({ ...prev, protein: e.target.value }))} /></FormField>
              <FormField label="Carbs"><Input type="number" value={mealForm.carbs} onChange={(e) => setMealForm((prev) => ({ ...prev, carbs: e.target.value }))} /></FormField>
              <FormField label="Fat"><Input type="number" value={mealForm.fat} onChange={(e) => setMealForm((prev) => ({ ...prev, fat: e.target.value }))} /></FormField>
              <FormField label="Meals">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {mealForm.meals.map((meal, index) => (
                    <div key={index} style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Meal {index + 1}</div>
                        {mealForm.meals.length > 1 ? (
                          <Btn small danger onClick={() => setMealForm((prev) => ({ ...prev, meals: prev.meals.filter((_, mealIndex) => mealIndex !== index) }))}>Remove</Btn>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <Input
                          value={meal.time}
                          onChange={(e) => setMealForm((prev) => ({ ...prev, meals: prev.meals.map((item, mealIndex) => mealIndex === index ? { ...item, time: e.target.value } : item) }))}
                          placeholder="Time, e.g. 7:30 AM"
                        />
                        <Input
                          value={meal.name}
                          onChange={(e) => setMealForm((prev) => ({ ...prev, meals: prev.meals.map((item, mealIndex) => mealIndex === index ? { ...item, name: e.target.value } : item) }))}
                          placeholder="Meal name, e.g. Breakfast"
                        />
                        <Input
                          value={meal.foods}
                          onChange={(e) => setMealForm((prev) => ({ ...prev, meals: prev.meals.map((item, mealIndex) => mealIndex === index ? { ...item, foods: e.target.value } : item) }))}
                          placeholder="Foods, comma separated"
                        />
                      </div>
                    </div>
                  ))}
                  <Btn small variant="ghost" onClick={() => setMealForm((prev) => ({ ...prev, meals: [...prev.meals, { time: "", name: "", foods: "" }] }))}>+ Add Meal</Btn>
                </div>
              </FormField>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveMeal}>&#x2713; {mealModal === "edit" ? "Save Changes" : "Create Meal Plan"}</Btn>
                <Btn variant="ghost" onClick={() => setMealModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {assignMealModal && (
            <Modal title="Assign Meal Plan" onClose={() => setAssignMealModal(false)}>
              <FormField label="Member">
                <Select value={assignMealForm.memberId} onChange={(e) => setAssignMealForm((prev) => ({ ...prev, memberId: e.target.value }))}>
                  <option value="">Select member</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Meal Plan">
                <Select value={assignMealForm.mealPlanId} onChange={(e) => setAssignMealForm((prev) => ({ ...prev, mealPlanId: e.target.value }))}>
                  <option value="">Select meal plan</option>
                  {mealPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </Select>
              </FormField>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveAssignedMealPlan}>&#x2713; Assign Meal Plan</Btn>
                <Btn variant="ghost" onClick={() => setAssignMealModal(false)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {equipmentModal && (
            <Modal title={equipmentModal === "edit" ? "Edit Equipment" : "Add Equipment"} onClose={() => setEquipmentModal(null)} width={720}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <FormField label="Equipment Name"><Input value={equipmentForm.name} onChange={(e) => setEquipmentForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
                <FormField label="Quantity"><Input type="number" value={equipmentForm.qty} onChange={(e) => setEquipmentForm((prev) => ({ ...prev, qty: e.target.value }))} /></FormField>
                <FormField label="Status"><Select value={equipmentForm.status} onChange={(e) => setEquipmentForm((prev) => ({ ...prev, status: e.target.value }))}><option value="good">Good</option><option value="maintenance">Maintenance</option><option value="replace">Replace</option></Select></FormField>
                <FormField label="Location / Room"><Input value={equipmentForm.location} onChange={(e) => setEquipmentForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="e.g. Weight Room" /></FormField>
                <FormField label="Vendor / Brand"><Input value={equipmentForm.vendor} onChange={(e) => setEquipmentForm((prev) => ({ ...prev, vendor: e.target.value }))} /></FormField>
                <FormField label="Serial Number"><Input value={equipmentForm.serialNumber} onChange={(e) => setEquipmentForm((prev) => ({ ...prev, serialNumber: e.target.value }))} /></FormField>
                <FormField label="Purchase Date"><Input type="date" value={equipmentForm.purchaseDate} onChange={(e) => setEquipmentForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} /></FormField>
                <FormField label="Purchase Price (LKR)"><Input type="number" min="0" value={equipmentForm.purchasePrice} onChange={(e) => setEquipmentForm((prev) => ({ ...prev, purchasePrice: e.target.value }))} /></FormField>
                <FormField label="Next Service Date"><Input type="date" value={equipmentForm.nextServiceDate} onChange={(e) => setEquipmentForm((prev) => ({ ...prev, nextServiceDate: e.target.value }))} /></FormField>
                <FormField label="Warranty Expires"><Input type="date" value={equipmentForm.warrantyExpiresAt} onChange={(e) => setEquipmentForm((prev) => ({ ...prev, warrantyExpiresAt: e.target.value }))} /></FormField>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <Btn onClick={saveEquipment}>&#x2713; {equipmentModal === "edit" ? "Save Changes" : "Add Equipment"}</Btn>
                <Btn variant="ghost" onClick={() => setEquipmentModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {supplementModal && (
            <Modal title={supplementModal === "edit" ? "Edit Supplement" : "Add Supplement"} onClose={() => setSupplementModal(null)} width={680}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                <FormField label="Name *"><Input value={supplementForm.name} onChange={(e) => setSupplementForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
                <FormField label="SKU *"><Input value={supplementForm.sku} onChange={(e) => setSupplementForm((prev) => ({ ...prev, sku: e.target.value }))} placeholder="e.g. PRO-100" /></FormField>
                <FormField label="Brand"><Input value={supplementForm.brand} onChange={(e) => setSupplementForm((prev) => ({ ...prev, brand: e.target.value }))} /></FormField>
                <FormField label="Category">
                  <Select value={supplementForm.category} onChange={(e) => setSupplementForm((prev) => ({ ...prev, category: e.target.value }))}>
                    {SUPPLEMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </FormField>
              </div>
              <FormField label="Image URL"><Input value={supplementForm.imageUrl} onChange={(e) => setSupplementForm((prev) => ({ ...prev, imageUrl: e.target.value }))} placeholder="https://..." /></FormField>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                <FormField label="Stock Qty *"><Input type="number" min="0" value={supplementForm.stockQty} onChange={(e) => setSupplementForm((prev) => ({ ...prev, stockQty: e.target.value }))} /></FormField>
                <FormField label="Reorder Level"><Input type="number" min="0" value={supplementForm.reorderLevel} onChange={(e) => setSupplementForm((prev) => ({ ...prev, reorderLevel: e.target.value }))} /></FormField>
                <FormField label="Selling Price (LKR) *"><Input type="number" min="0" value={supplementForm.unitPrice} onChange={(e) => setSupplementForm((prev) => ({ ...prev, unitPrice: e.target.value }))} /></FormField>
                <FormField label="Buying Price (LKR)"><Input type="number" min="0" value={supplementForm.buyingPrice} onChange={(e) => setSupplementForm((prev) => ({ ...prev, buyingPrice: e.target.value }))} /></FormField>
                <FormField label="Supplier">
                  <Select value={supplementForm.supplierId} onChange={(e) => {
                    const sel = supplierList.find(s => String(s._id) === e.target.value);
                    setSupplementForm(prev => ({ ...prev, supplierId: e.target.value, supplierName: sel ? sel.name : "" }));
                  }}>
                    <option value="">No supplier selected</option>
                    {supplierList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </Select>
                  {supplementForm.supplierId && (() => { const sel = supplierList.find(s => String(s._id) === supplementForm.supplierId); return sel ? <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{sel.contactName || ""}{sel.phone ? ` · ${sel.phone}` : ""}</div> : null; })()}
                </FormField>
                <FormField label="Status">
                  <Select value={supplementForm.status} onChange={(e) => setSupplementForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="in-stock">In Stock</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </Select>
                </FormField>
                <FormField label="SQN (Stock Quote No.)"><Input value={supplementForm.sqn} onChange={(e) => setSupplementForm((prev) => ({ ...prev, sqn: e.target.value }))} /></FormField>
                <FormField label="GRN (Goods Receipt No.)"><Input value={supplementForm.grn} onChange={(e) => setSupplementForm((prev) => ({ ...prev, grn: e.target.value }))} /></FormField>
              </div>
              <FormField label="Supplier Price Note"><TextArea rows={2} value={supplementForm.supplierPriceNote} onChange={(e) => setSupplementForm((prev) => ({ ...prev, supplierPriceNote: e.target.value }))} placeholder="e.g. Supplier increased price 10% from Jan 2025" /></FormField>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveSupplement}>&#x2713; {supplementModal === "edit" ? "Save Changes" : "Add Supplement"}</Btn>
                <Btn variant="ghost" onClick={() => setSupplementModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {supplierModal && (
            <Modal title={supplierModal === "edit" ? "Edit Supplier" : "Add Supplier"} onClose={() => setSupplierModal(null)} width={620}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                <FormField label="Supplier Name *"><Input value={supplierForm.name} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} /></FormField>
                <FormField label="Contact Person"><Input value={supplierForm.contactName} onChange={(e) => setSupplierForm((p) => ({ ...p, contactName: e.target.value }))} /></FormField>
                <FormField label="Phone"><Input value={supplierForm.phone} onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))} /></FormField>
                <FormField label="Email"><Input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))} /></FormField>
                <FormField label="Website"><Input value={supplierForm.website} onChange={(e) => setSupplierForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://..." /></FormField>
                <FormField label="Payment Terms"><Input value={supplierForm.paymentTerms} onChange={(e) => setSupplierForm((p) => ({ ...p, paymentTerms: e.target.value }))} placeholder="e.g. Net 30, COD" /></FormField>
                <FormField label="Rating (1–5)">
                  <Select value={supplierForm.rating} onChange={(e) => setSupplierForm((p) => ({ ...p, rating: e.target.value }))}>
                    <option value="">Not rated</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{"★".repeat(n)} ({n}/5)</option>)}
                  </Select>
                </FormField>
                <FormField label="Active">
                  <Select value={String(supplierForm.isActive)} onChange={(e) => setSupplierForm((p) => ({ ...p, isActive: e.target.value === "true" }))}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Select>
                </FormField>
              </div>
              <FormField label="Address"><Input value={supplierForm.address} onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))} /></FormField>
              {supplierForm.rating && <FormField label="Rating Notes"><Input value={supplierForm.ratingNotes} onChange={(e) => setSupplierForm((p) => ({ ...p, ratingNotes: e.target.value }))} placeholder="e.g. Excellent delivery, consistent quality" /></FormField>}
              <FormField label="Notes"><TextArea rows={2} value={supplierForm.notes} onChange={(e) => setSupplierForm((p) => ({ ...p, notes: e.target.value }))} /></FormField>
              {supplierError && <div style={{ fontSize: 12, color: "#dc2626" }}>{supplierError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveSupplier}>&#x2713; {supplierModal === "edit" ? "Save Changes" : "Add Supplier"}</Btn>
                <Btn variant="ghost" onClick={() => setSupplierModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {supplierViewItem && (
            <Modal title={`Supplier: ${supplierViewItem.name}`} onClose={() => setSupplierViewItem(null)} width={800}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                {supplierViewItem.contactName && <div><span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Contact</span><div style={{ fontWeight: 600, fontSize: 13 }}>{supplierViewItem.contactName}</div></div>}
                {supplierViewItem.phone && <div><span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Phone</span><div style={{ fontWeight: 600, fontSize: 13 }}>{supplierViewItem.phone}</div></div>}
                {supplierViewItem.email && <div><span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Email</span><div style={{ fontWeight: 600, fontSize: 13 }}>{supplierViewItem.email}</div></div>}
                {supplierViewItem.paymentTerms && <div><span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Payment Terms</span><div style={{ fontWeight: 600, fontSize: 13 }}>{supplierViewItem.paymentTerms}</div></div>}
                {supplierViewItem.rating && <div><span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Rating</span><div style={{ fontSize: 16 }}>{"★".repeat(supplierViewItem.rating)}{"☆".repeat(5 - supplierViewItem.rating)}</div></div>}
                {supplierViewItem.address && <div style={{ gridColumn: "span 2" }}><span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Address</span><div style={{ fontWeight: 600, fontSize: 13 }}>{supplierViewItem.address}</div></div>}
                {supplierViewItem.ratingNotes && <div style={{ gridColumn: "span 3" }}><span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Rating Notes</span><div style={{ fontSize: 13, color: "var(--muted)" }}>{supplierViewItem.ratingNotes}</div></div>}
                {supplierViewItem.notes && <div style={{ gridColumn: "span 3" }}><span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Notes</span><div style={{ fontSize: 13, color: "var(--muted)" }}>{supplierViewItem.notes}</div></div>}
              </div>
              {/* Linked Products */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Linked Products ({(supplierViewItem.products || []).length})</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small variant="ghost" onClick={() => {
                    const XLSX = window.__XLSX__;
                    if (!XLSX) return;
                    const wb = XLSX.utils.book_new();
                    const ws = XLSX.utils.aoa_to_sheet([
                      ["Supplement", "SKU", "Stock Qty", "Buying Price", "Selling Price", "Stock Value", "Supplier Price", "Status"],
                      ...(supplierViewItem.products || []).map(p => {
                        const s = supplements.find(s2 => String(s2.id || s2._id) === String(p.supplementId));
                        return [p.supplementName || "—", s?.sku || "—", s?.stockQty || 0, s?.buyingPrice || 0, s?.unitPrice || 0, (s?.buyingPrice || 0) * (s?.stockQty || 0), p.supplierPrice || 0, s?.status || "—"];
                      })
                    ]);
                    XLSX.utils.book_append_sheet(wb, ws, "Products");
                    XLSX.writeFile(wb, `${supplierViewItem.name.replace(/\s/g,"-")}-products-${new Date().toISOString().slice(0,10)}.xlsx`);
                  }}>↓ Export Products</Btn>
                  <Btn small onClick={() => { setSupplierProductForm({ id: "", supplementId: "", supplementName: "", supplierPrice: "", notes: "" }); setSupplierError(""); setSupplierProductModal("add"); }}>&#x2B; Add Product</Btn>
                </div>
              </div>
              {(supplierViewItem.products || []).length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>No products linked yet.</div>
              ) : (
                <Table
                  headers={["Supplement", "SKU", "Stock", "Buy Price", "Sell Price", "Stock Value", "Supplier Price", "Status", "Actions"]}
                  rows={(supplierViewItem.products || []).map((p) => {
                    const s = supplements.find(s2 => String(s2.id || s2._id) === String(p.supplementId));
                    return [
                      <span style={{ fontWeight: 600 }}>{p.supplementName || s?.name || "—"}</span>,
                      s?.sku || "—",
                      <span style={{ color: (s?.stockQty || 0) <= (s?.reorderLevel || 0) ? "#dc2626" : "#16a34a", fontWeight: 600 }}>{s?.stockQty ?? "—"}</span>,
                      s ? `LKR ${Number(s.buyingPrice || 0).toLocaleString()}` : "—",
                      s ? `LKR ${Number(s.unitPrice || 0).toLocaleString()}` : "—",
                      s ? <span style={{ fontWeight: 600, color: "#f59e0b" }}>LKR {(Number(s.buyingPrice || 0) * Number(s.stockQty || 0)).toLocaleString()}</span> : "—",
                      `LKR ${Number(p.supplierPrice || 0).toLocaleString()}`,
                      s ? <Badge label={s.status} type={s.status} /> : "—",
                      <div style={{ display: "flex", gap: 6 }}>
                        <IconBtn title="Edit" onClick={() => { setSupplierProductForm({ id: p._id, supplementId: String(p.supplementId || ""), supplementName: p.supplementName || "", supplierPrice: String(p.supplierPrice || ""), notes: p.notes || "" }); setSupplierError(""); setSupplierProductModal("edit"); }}><IcoEdit /></IconBtn>
                        <IconBtn title="Remove" danger onClick={() => removeSupplierProduct(supplierViewItem._id, p._id)}><IcoTrash /></IconBtn>
                      </div>
                    ];
                  })}
                />
              )}
              {/* Restock Log */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Restock Log ({(supplierViewItem.restockLog || []).length})</div>
                <Btn small onClick={() => { setSupplierRestockForm({ supplementName: "", supplementId: "", qty: "", unitCost: "", orderedAt: new Date().toISOString().slice(0,10), status: "ordered", invoiceNumber: "", notes: "", paymentType: "cash", dueDate: "", paymentMethod: "cash", bankDetail: "" }); setSupplierRestockError(""); setSupplierRestockModal(supplierViewItem._id); }}>+ Add Restock</Btn>
              </div>
              {(supplierViewItem.restockLog || []).length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>No restock records yet.</div>
              ) : (
                <Table
                  headers={["Product", "Qty", "Unit Cost", "Total", "Ordered", "Invoice", "Status", "Payment", "Balance Due", ""]}
                  rows={[...(supplierViewItem.restockLog || [])].reverse().slice(0, 20).map(r => {
                    const balanceDue = Number(r.totalCost || 0) - Number(r.amountPaid || 0);
                    return [
                      r.supplementName || "—",
                      r.qty,
                      `LKR ${Number(r.unitCost || 0).toLocaleString()}`,
                      <span style={{ fontWeight: 600, color: "#f59e0b" }}>LKR {Number(r.totalCost || 0).toLocaleString()}</span>,
                      r.orderedAt ? new Date(r.orderedAt).toLocaleDateString() : "—",
                      r.invoiceNumber || "—",
                      <Badge label={r.status} type={r.status === "received" ? "active" : r.status === "cancelled" ? "suspended" : "trial"} />,
                      <Badge label={r.paymentType === "credit" ? (r.paymentStatus || "unpaid") : "paid"} type={r.paymentType === "credit" ? (r.paymentStatus || "unpaid") : "paid"} />,
                      r.paymentType === "credit" && balanceDue > 0
                        ? <span style={{ fontWeight: 600, color: "#dc2626" }}>LKR {balanceDue.toLocaleString()}{r.dueDate ? ` (due ${new Date(r.dueDate).toLocaleDateString()})` : ""}</span>
                        : "—",
                      r.paymentType === "credit" && balanceDue > 0
                        ? <Btn small variant="primary" onClick={() => { setRestockPaymentForm({ amount: String(balanceDue), method: "cash", bankDetail: "", paidAt: new Date().toISOString().slice(0,10), reference: "", notes: "" }); setRestockPaymentError(""); setRestockPaymentModal({ supplierId: supplierViewItem._id, recordId: r._id, balanceDue, totalCost: r.totalCost }); }}>Record Payment</Btn>
                        : null
                    ];
                  })}
                />
              )}
              {supplierError && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>{supplierError}</div>}
            </Modal>
          )}

          {supplierProductModal && supplierViewItem && (
            <Modal title={supplierProductModal === "edit" ? "Edit Product" : "Add Product to Supplier"} onClose={() => setSupplierProductModal(null)} width={520}>
              <FormField label="Supplement">
                <Select value={supplierProductForm.supplementId} onChange={(e) => {
                  const sel = supplements.find((s) => String(s._id || s.id) === e.target.value);
                  setSupplierProductForm((p) => ({ ...p, supplementId: e.target.value, supplementName: sel?.name || p.supplementName }));
                }}>
                  <option value="">Select supplement</option>
                  {supplements.map((s) => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Supplement Name (if not in list)"><Input value={supplierProductForm.supplementName} onChange={(e) => setSupplierProductForm((p) => ({ ...p, supplementName: e.target.value }))} /></FormField>
              <FormField label="Supplier Price (LKR)"><Input type="number" min="0" value={supplierProductForm.supplierPrice} onChange={(e) => setSupplierProductForm((p) => ({ ...p, supplierPrice: e.target.value }))} /></FormField>
              <FormField label="Notes"><TextArea rows={2} value={supplierProductForm.notes} onChange={(e) => setSupplierProductForm((p) => ({ ...p, notes: e.target.value }))} /></FormField>
              {supplierError && <div style={{ fontSize: 12, color: "#dc2626" }}>{supplierError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveSupplierProduct}>&#x2713; {supplierProductModal === "edit" ? "Save Changes" : "Add Product"}</Btn>
                <Btn variant="ghost" onClick={() => setSupplierProductModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {supplierRestockModal && (
            <Modal title="Add Restock Record" onClose={() => setSupplierRestockModal(null)} width={520}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                <FormField label="Product Name *">
                  <Select value={supplierRestockForm.supplementId} onChange={(e) => {
                    const sel = supplements.find(s => String(s.id || s._id) === e.target.value);
                    setSupplierRestockForm(p => ({ ...p, supplementId: e.target.value, supplementName: sel?.name || p.supplementName, unitCost: sel ? String(sel.buyingPrice || "") : p.unitCost }));
                  }}>
                    <option value="">Select supplement</option>
                    {supplements.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Qty *"><Input type="number" min="1" value={supplierRestockForm.qty} onChange={(e) => setSupplierRestockForm(p => ({ ...p, qty: e.target.value }))} /></FormField>
                <FormField label="Unit Cost (LKR) *"><Input type="number" min="0" value={supplierRestockForm.unitCost} onChange={(e) => setSupplierRestockForm(p => ({ ...p, unitCost: e.target.value }))} /></FormField>
                <FormField label="Total Cost"><Input readOnly value={supplierRestockForm.qty && supplierRestockForm.unitCost ? `LKR ${(Number(supplierRestockForm.qty) * Number(supplierRestockForm.unitCost)).toLocaleString()}` : ""} /></FormField>
                <FormField label="Ordered At"><Input type="date" value={supplierRestockForm.orderedAt} onChange={(e) => setSupplierRestockForm(p => ({ ...p, orderedAt: e.target.value }))} /></FormField>
                <FormField label="Status">
                  <Select value={supplierRestockForm.status} onChange={(e) => setSupplierRestockForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="ordered">Ordered</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </FormField>
                <FormField label="Invoice Number"><Input value={supplierRestockForm.invoiceNumber} onChange={(e) => setSupplierRestockForm(p => ({ ...p, invoiceNumber: e.target.value }))} placeholder="INV-12345" /></FormField>
                <FormField label="Payment *">
                  <Select value={supplierRestockForm.paymentType} onChange={(e) => setSupplierRestockForm(p => ({ ...p, paymentType: e.target.value }))}>
                    <option value="cash">Pay Now</option>
                    <option value="credit">Buy on Credit</option>
                  </Select>
                </FormField>
                {supplierRestockForm.paymentType === "credit" ? (
                  <FormField label="Due Date"><Input type="date" value={supplierRestockForm.dueDate} onChange={(e) => setSupplierRestockForm(p => ({ ...p, dueDate: e.target.value }))} /></FormField>
                ) : (
                  <FormField label="Payment Method">
                    <Select value={supplierRestockForm.paymentMethod} onChange={(e) => setSupplierRestockForm(p => ({ ...p, paymentMethod: e.target.value, ...(e.target.value !== "bank-transfer" ? { bankDetail: "" } : {}) }))}>
                      {["cash", "card", "bank-transfer", "cheque", "other"].map((m) => <option key={m} value={m}>{m === "bank-transfer" ? "Bank Transfer" : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                    </Select>
                  </FormField>
                )}
                {supplierRestockForm.paymentType !== "credit" && supplierRestockForm.paymentMethod === "bank-transfer" && (
                  <FormField label="Bank Account">
                    <BankPicker banks={ownerBankDetails} value={supplierRestockForm.bankDetail} onChange={(id) => setSupplierRestockForm(p => ({ ...p, bankDetail: id }))} />
                  </FormField>
                )}
              </div>
              <FormField label="Notes"><Input value={supplierRestockForm.notes} onChange={(e) => setSupplierRestockForm(p => ({ ...p, notes: e.target.value }))} /></FormField>
              {supplierRestockError && <div style={{ fontSize: 12, color: "#dc2626" }}>{supplierRestockError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={async () => {
                  if (!supplierRestockForm.supplementId || !supplierRestockForm.qty || !supplierRestockForm.unitCost) { setSupplierRestockError("Product, qty, and unit cost are required."); return; }
                  try {
                    const selSupp = supplements.find(s => String(s.id || s._id) === supplierRestockForm.supplementId);
                    await apiFetch(`/api/owner/suppliers/${supplierRestockModal}/restock`, { method: "POST", body: JSON.stringify({ ...supplierRestockForm, supplementName: selSupp?.name || supplierRestockForm.supplementName }) });
                    await fetchSuppliers();
                    const updated = supplierList.find(s => String(s._id) === String(supplierRestockModal));
                    if (updated) setSupplierViewItem(updated);
                    setSupplierRestockModal(null);
                  } catch (e) { setSupplierRestockError(e.message || "Failed to save restock record."); }
                }}>Add Record</Btn>
                <Btn variant="ghost" onClick={() => setSupplierRestockModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {restockPaymentModal && (
            <Modal title="Record Restock Payment" onClose={() => setRestockPaymentModal(null)} width={460}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
                Outstanding balance: <strong style={{ color: "#dc2626" }}>LKR {Number(restockPaymentModal.balanceDue || 0).toLocaleString()}</strong> of LKR {Number(restockPaymentModal.totalCost || 0).toLocaleString()}
              </div>
              <FormField label="Amount (LKR) *"><Input type="number" min="0" max={restockPaymentModal.balanceDue} value={restockPaymentForm.amount} onChange={(e) => setRestockPaymentForm(p => ({ ...p, amount: e.target.value }))} /></FormField>
              <FormField label="Paid On"><Input type="date" value={restockPaymentForm.paidAt} onChange={(e) => setRestockPaymentForm(p => ({ ...p, paidAt: e.target.value }))} /></FormField>
              <FormField label="Payment Method">
                <Select value={restockPaymentForm.method} onChange={(e) => setRestockPaymentForm(p => ({ ...p, method: e.target.value, ...(e.target.value !== "bank-transfer" ? { bankDetail: "" } : {}) }))}>
                  {["cash", "card", "bank-transfer", "cheque", "other"].map((m) => <option key={m} value={m}>{m === "bank-transfer" ? "Bank Transfer" : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </Select>
              </FormField>
              {restockPaymentForm.method === "bank-transfer" && (
                <FormField label="Bank Account">
                  <BankPicker banks={ownerBankDetails} value={restockPaymentForm.bankDetail} onChange={(id) => setRestockPaymentForm(p => ({ ...p, bankDetail: id }))} />
                </FormField>
              )}
              <FormField label="Reference"><Input value={restockPaymentForm.reference} onChange={(e) => setRestockPaymentForm(p => ({ ...p, reference: e.target.value }))} placeholder="Receipt / transaction ref" /></FormField>
              <FormField label="Notes"><Input value={restockPaymentForm.notes} onChange={(e) => setRestockPaymentForm(p => ({ ...p, notes: e.target.value }))} /></FormField>
              {restockPaymentError && <div style={{ fontSize: 12, color: "#dc2626" }}>{restockPaymentError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={async () => {
                  const amountNum = Number(restockPaymentForm.amount);
                  if (!amountNum || amountNum <= 0) { setRestockPaymentError("Enter a valid payment amount."); return; }
                  if (amountNum > Number(restockPaymentModal.balanceDue || 0) + 0.01) { setRestockPaymentError("Amount exceeds the outstanding balance."); return; }
                  try {
                    await apiFetch(`/api/owner/suppliers/${restockPaymentModal.supplierId}/restock/${restockPaymentModal.recordId}/payments`, { method: "POST", body: JSON.stringify(restockPaymentForm) });
                    await fetchSuppliers();
                    const updated = supplierList.find(s => String(s._id) === String(restockPaymentModal.supplierId));
                    if (updated) setSupplierViewItem(updated);
                    setRestockPaymentModal(null);
                  } catch (e) { setRestockPaymentError(e.message || "Failed to record payment."); }
                }}>Record Payment</Btn>
                <Btn variant="ghost" onClick={() => setRestockPaymentModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {expenseModal && (
            <Modal title={expenseModal === "edit" ? "Edit Ledger Entry" : "Add Ledger Entry"} onClose={() => setExpenseModal(null)}>
              <FormField label="Type">
                <Select value={expenseForm.type} onChange={(e) => {
                  const nextType = e.target.value;
                  const nextCategory = getExpenseCategories(nextType, expenses)[0] || (nextType === "income" ? "Other Income" : "Other Expense");
                  setExpenseForm((prev) => ({ ...prev, type: nextType, category: nextCategory }));
                }}>
                  <option value="expense">expense</option>
                  <option value="income">income</option>
                </Select>
              </FormField>
              <FormField label="Source Type"><Input value={expenseForm.sourceType} onChange={(e) => setExpenseForm((prev) => ({ ...prev, sourceType: e.target.value }))} placeholder="manual / corporate / PT / event" /></FormField>
              <FormField label="Title"><Input value={expenseForm.title} onChange={(e) => setExpenseForm((prev) => ({ ...prev, title: e.target.value }))} /></FormField>
              <FormField label="Category">
                <Select value={expenseForm.category} onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}>
                  {getExpenseCategories(expenseForm.type, expenses).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label={expenseForm.type === "income" ? "Company / Source" : "Vendor / Supplier"}><Input value={expenseForm.vendor} onChange={(e) => setExpenseForm((prev) => ({ ...prev, vendor: e.target.value }))} /></FormField>
              <FormField label="Contact Name"><Input value={expenseForm.contactName} onChange={(e) => setExpenseForm((prev) => ({ ...prev, contactName: e.target.value }))} /></FormField>
              <FormField label="Payment Method">
                <Select value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm((prev) => ({ ...prev, paymentMethod: e.target.value, ...(e.target.value !== "bank-transfer" ? { bankDetail: "" } : {}) }))}>
                  {["cash", "card", "bank-transfer", "cheque", "credit", "other"].map((m) => <option key={m} value={m}>{m === "bank-transfer" ? "Bank Transfer" : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </Select>
              </FormField>
              {expenseForm.paymentMethod === "bank-transfer" && (
                <FormField label="Bank Account">
                  <BankPicker banks={ownerBankDetails} value={expenseForm.bankDetail} onChange={(id) => setExpenseForm((prev) => ({ ...prev, bankDetail: id }))} />
                </FormField>
              )}
              <FormField label="Reference Number"><Input value={expenseForm.referenceNumber} onChange={(e) => setExpenseForm((prev) => ({ ...prev, referenceNumber: e.target.value }))} /></FormField>
              <FormField label={expenseForm.type === "income" ? "Received / Due Date" : "Expense Date"}><Input type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm((prev) => ({ ...prev, expenseDate: e.target.value }))} /></FormField>
              <FormField label="Amount"><Input type="number" min="0" value={expenseForm.amount} onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))} /></FormField>
              <FormField label="Status"><Select value={expenseForm.status} onChange={(e) => setExpenseForm((prev) => ({ ...prev, status: e.target.value }))}><option value="paid">paid</option><option value="pending">pending</option></Select></FormField>
              <FormField label="Notes"><Input value={expenseForm.notes} onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))} /></FormField>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveExpense}>&#x2713; {expenseModal === "edit" ? "Save Changes" : "Add Entry"}</Btn>
                <Btn variant="ghost" onClick={() => setExpenseModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {ownerBankModal && (
            <Modal title={ownerBankModal === "edit" ? "Edit Bank Account" : "Add Bank Account"} onClose={() => setOwnerBankModal(null)} width={640}>
              <div style={{ fontFamily: "'Poppins', sans-serif" }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
                  <FormField label="Bank Name *"><Input value={ownerBankForm.bankName} onChange={(e) => setOwnerBankForm((p) => ({ ...p, bankName: e.target.value }))} /></FormField>
                  <FormField label="Account Name *"><Input value={ownerBankForm.accountName} onChange={(e) => setOwnerBankForm((p) => ({ ...p, accountName: e.target.value }))} /></FormField>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
                  <FormField label="Account Number *"><Input value={ownerBankForm.accountNumber} onChange={(e) => setOwnerBankForm((p) => ({ ...p, accountNumber: e.target.value }))} /></FormField>
                  <FormField label="Opening Balance (LKR)"><Input type="number" value={ownerBankForm.openingBalance} onChange={(e) => setOwnerBankForm((p) => ({ ...p, openingBalance: e.target.value }))} /></FormField>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
                  <FormField label="Branch Code"><Input value={ownerBankForm.branchCode} onChange={(e) => setOwnerBankForm((p) => ({ ...p, branchCode: e.target.value }))} /></FormField>
                  <FormField label="SWIFT Code"><Input value={ownerBankForm.swiftCode} onChange={(e) => setOwnerBankForm((p) => ({ ...p, swiftCode: e.target.value }))} /></FormField>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px", alignItems: "center" }}>
                  <FormField label="Currency"><Input value={ownerBankForm.currency} onChange={(e) => setOwnerBankForm((p) => ({ ...p, currency: e.target.value }))} /></FormField>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 22 }}>
                    <input type="checkbox" checked={ownerBankForm.isDefault} onChange={(e) => setOwnerBankForm((p) => ({ ...p, isDefault: e.target.checked }))} />
                    Set as default account
                  </label>
                </div>
                <FormField label="Notes"><TextArea rows={2} value={ownerBankForm.notes} onChange={(e) => setOwnerBankForm((p) => ({ ...p, notes: e.target.value }))} /></FormField>
                {ownerBankError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>{ownerBankError}</div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn onClick={saveOwnerBank}>&#x2713; {ownerBankModal === "edit" ? "Save Changes" : "Add Account"}</Btn>
                  <Btn variant="ghost" onClick={() => setOwnerBankModal(null)}>Cancel</Btn>
                </div>
              </div>
            </Modal>
          )}

          {ownerBankTxModal && (
            <Modal title={ownerBankTxModal === "edit" ? "Edit Transaction" : "Record Bank Transaction"} onClose={() => setOwnerBankTxModal(null)} width={720}>
              <div style={{ fontFamily: "'Poppins', sans-serif" }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
                  <FormField label="Type *">
                    <Select value={ownerBankTxForm.type} onChange={(e) => setOwnerBankTxForm((p) => ({ ...p, type: e.target.value }))}>
                      <option value="credit">Credit (Money In)</option>
                      <option value="debit">Debit (Money Out)</option>
                    </Select>
                  </FormField>
                  <FormField label="Amount (LKR) *">
                    <Input type="number" value={ownerBankTxForm.amount} onChange={(e) => setOwnerBankTxForm((p) => ({ ...p, amount: e.target.value }))} />
                  </FormField>
                </div>
                <FormField label="Description *">
                  <Input value={ownerBankTxForm.description} onChange={(e) => setOwnerBankTxForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Member subscription payment" />
                </FormField>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
                  <FormField label="Category">
                    <Input value={ownerBankTxForm.category} onChange={(e) => setOwnerBankTxForm((p) => ({ ...p, category: e.target.value }))} placeholder="e.g. Membership, Salary" />
                  </FormField>
                  <FormField label="Transaction Date *">
                    <Input type="date" value={ownerBankTxForm.transactionDate} onChange={(e) => setOwnerBankTxForm((p) => ({ ...p, transactionDate: e.target.value }))} />
                  </FormField>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
                  <FormField label="Payment Method">
                    <Select value={ownerBankTxForm.paymentMethod} onChange={(e) => setOwnerBankTxForm((p) => ({ ...p, paymentMethod: e.target.value, ...(e.target.value !== "bank-transfer" ? { bankDetail: "" } : {}) }))}>
                      {["cash", "bank-transfer", "cheque", "card", "other"].map((m) => <option key={m} value={m}>{m === "bank-transfer" ? "Bank Transfer" : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                    </Select>
                  </FormField>
                  {ownerBankTxForm.paymentMethod === "bank-transfer" ? (
                    <FormField label="Bank Account">
                      <BankPicker
                        banks={ownerBankDetails}
                        value={ownerBankTxForm.bankDetail}
                        onChange={(id) => {
                          const b = ownerBankDetails.find((x) => String(x._id || x.id) === String(id));
                          setOwnerBankTxForm((p) => ({ ...p, bankDetail: id, bankName: b ? b.bankName : "", accountNumber: b ? b.accountNumber : "" }));
                        }}
                      />
                    </FormField>
                  ) : (
                    <FormField label="Status">
                      <Select value={ownerBankTxForm.status} onChange={(e) => setOwnerBankTxForm((p) => ({ ...p, status: e.target.value }))}>
                        {["completed", "pending", "failed", "reversed"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </Select>
                    </FormField>
                  )}
                </div>
                {ownerBankTxForm.paymentMethod === "bank-transfer" && (
                  <FormField label="Status">
                    <Select value={ownerBankTxForm.status} onChange={(e) => setOwnerBankTxForm((p) => ({ ...p, status: e.target.value }))}>
                      {["completed", "pending", "failed", "reversed"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </Select>
                  </FormField>
                )}
                <FormField label="Reference Number">
                  <Input value={ownerBankTxForm.referenceNumber} onChange={(e) => setOwnerBankTxForm((p) => ({ ...p, referenceNumber: e.target.value }))} placeholder="Optional" />
                </FormField>
                <FormField label="Notes">
                  <TextArea rows={2} value={ownerBankTxForm.notes} onChange={(e) => setOwnerBankTxForm((p) => ({ ...p, notes: e.target.value }))} />
                </FormField>
                {ownerBankTxError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>{ownerBankTxError}</div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn onClick={saveOwnerBankTx}>&#x2713; {ownerBankTxModal === "edit" ? "Save Changes" : "Record Transaction"}</Btn>
                  <Btn variant="ghost" onClick={() => setOwnerBankTxModal(null)}>Cancel</Btn>
                </div>
              </div>
            </Modal>
          )}

          {profileModal && (
            <Modal title="Edit Owner Profile" onClose={() => setProfileModal(false)} width={680}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Personal Info</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                <FormField label="Full Name *"><Input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
                <FormField label="Email *"><Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} /></FormField>
                <FormField label="Phone"><Input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} /></FormField>
                <FormField label="Title / Role"><Input value={profileForm.title} onChange={(e) => setProfileForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="e.g. Managing Director" /></FormField>
                <FormField label="Date of Birth"><Input type="date" value={profileForm.dateOfBirth} onChange={(e) => setProfileForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))} /></FormField>
                <FormField label="Gender">
                  <Select value={profileForm.gender} onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: e.target.value }))}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </Select>
                </FormField>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em", margin: "14px 0 6px" }}>Location & Online</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                <FormField label="Address"><Input value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} /></FormField>
                <FormField label="City"><Input value={profileForm.city} onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))} /></FormField>
                <FormField label="Country"><Input value={profileForm.country} onChange={(e) => setProfileForm((prev) => ({ ...prev, country: e.target.value }))} /></FormField>
                <FormField label="Website"><Input value={profileForm.website} onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://..." /></FormField>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em", margin: "14px 0 6px" }}>Emergency Contact</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                <FormField label="Emergency Contact Name"><Input value={profileForm.emergencyContactName} onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))} /></FormField>
                <FormField label="Emergency Contact Phone"><Input value={profileForm.emergencyContactPhone} onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))} /></FormField>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em", margin: "14px 0 6px" }}>About</div>
              <FormField label="Bio"><TextArea rows={3} value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} /></FormField>
              <ProfilePhotoField
                file={profileForm.profileImageFile}
                onChange={(file) => setProfileForm((prev) => ({ ...prev, profileImageFile: file }))}
                currentImageUrl={profile?.profileImageUrl || ""}
                initials={profile?.name?.slice(0, 2).toUpperCase() || "OW"}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveProfile}>&#x2713; Save Profile</Btn>
                <Btn variant="ghost" onClick={() => setProfileModal(false)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          <SaleReceiptModal receipt={saleReceipt} gymName={currentGym?.name} onClose={() => setSaleReceipt(null)} />

          {ownerMemberPopup && (() => {
            const mAttn = attendance.filter((a) => a.memberName === ownerMemberPopup.name || a.memberId === ownerMemberPopup.id);
            const portalTabs = [
              { key: "dashboard", label: "Dashboard", icon: "🏠" },
              { key: "messages", label: "Messages", icon: "💬" },
              { key: "workout", label: "My Workout", icon: "💪" },
              { key: "workout-history", label: "Workout History", icon: "📋" },
              { key: "meal", label: "My Meal Plan", icon: "🥗" },
              { key: "stats", label: "My Stats", icon: "📊" },
              { key: "payments", label: "Payment History", icon: "💳" },
              { key: "checkin", label: "Check-in", icon: "📅" },
            ];
            return (
              <Modal title={ownerMemberPopup.name} onClose={() => { setOwnerMemberPopup(null); setOwnerPopupTab("dashboard"); }} width={980} subtitle={`Member · ${ownerMemberPopup.memberCode || "No ID"}`}>
                {/* Underline tab nav */}
                <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", marginBottom: 24, overflowX: "auto", gap: 0, flexShrink: 0 }}>
                  {portalTabs.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setOwnerPopupTab(key)}
                      style={{
                        padding: "10px 16px", border: "none", background: "transparent",
                        borderBottom: ownerPopupTab === key ? "2px solid #2563eb" : "2px solid transparent",
                        marginBottom: -2, cursor: "pointer", fontSize: 13,
                        fontWeight: ownerPopupTab === key ? 700 : 500,
                        color: ownerPopupTab === key ? "#2563eb" : "#64748b",
                        display: "inline-flex", alignItems: "center", gap: 6,
                        whiteSpace: "nowrap", flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 15 }}>{icon}</span>{label}
                    </button>
                  ))}
                </div>

                {ownerPopupTab === "dashboard" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Hero */}
                    <div style={{ borderRadius: 16, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", padding: "24px 28px", display: "flex", alignItems: "center", gap: 20 }}>
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "3px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                        {(ownerMemberPopup.name || "MB").slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{ownerMemberPopup.name}</div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>{ownerMemberPopup.email}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          {ownerMemberPopup.plan && <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: 11, fontWeight: 700, border: "1px solid rgba(255,255,255,0.25)" }}>{ownerMemberPopup.plan}</span>}
                          {ownerMemberPopup.paymentStatus && <span style={{ padding: "3px 10px", borderRadius: 999, background: ownerMemberPopup.paymentStatus === "paid" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)", color: "#fff", fontSize: 11, fontWeight: 700, border: "1px solid rgba(255,255,255,0.2)" }}>{ownerMemberPopup.paymentStatus}</span>}
                          {ownerMemberPopup.goal && <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 600, border: "1px solid rgba(255,255,255,0.2)" }}>{ownerMemberPopup.goal}</span>}
                        </div>
                      </div>
                    </div>
                    {/* Quick stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
                      {[
                        { label: "Check-ins", value: String(mAttn.length), color: "#2563eb", bg: "#eff6ff" },
                        { label: "Current Weight", value: ownerMemberPopup.currentWeightKg ? `${ownerMemberPopup.currentWeightKg} kg` : "—", color: "#ea580c", bg: "#fff7ed" },
                        { label: "BMI", value: ownerMemberPopup.bmi ? String(ownerMemberPopup.bmi) : "—", color: "#0891b2", bg: "#ecfeff" },
                        { label: "Plan Expires", value: ownerMemberPopup.planExpiresAt || "—", color: "#7c3aed", bg: "#f5f3ff" },
                        { label: "Fitness Level", value: ownerMemberPopup.fitnessLevel || "—", color: "#16a34a", bg: "#f0fdf4" },
                        { label: "Coach", value: ownerMemberPopup.coach || "Unassigned", color: "#f59e0b", bg: "#fffbeb" },
                      ].map(({ label, value, color, bg }) => (
                        <div key={label} style={{ padding: "14px 16px", borderRadius: 12, background: bg, border: `1px solid ${color}22` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Contact & identity */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Contact & Identity</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                        <InfoTile label="Phone" value={ownerMemberPopup.phone || "—"} tone="#16a34a" soft="#f0fdf4" />
                        <InfoTile label="Gender" value={ownerMemberPopup.gender || "—"} tone="#ea580c" soft="#fff7ed" />
                        <InfoTile label="Date of Birth" value={ownerMemberPopup.dateOfBirth || "—"} tone="#f59e0b" soft="#fffbeb" />
                        <InfoTile label="Member ID" value={ownerMemberPopup.memberCode || "—"} tone="#0891b2" soft="#ecfeff" />
                        <InfoTile label="Join Source" value={ownerMemberPopup.joinSource || "—"} tone="#7c3aed" soft="#f5f3ff" />
                        <InfoTile label="Member Tag" value={ownerMemberPopup.memberTag || "—"} tone="#2563eb" soft="#eff6ff" />
                        <InfoTile label="Barcode" value={ownerMemberPopup.barcode || "—"} tone="#ea580c" soft="#fff7ed" />
                        <InfoTile label="Assigned Locker" value={ownerMemberPopup.assignedLocker || "—"} tone="#0891b2" soft="#ecfeff" />
                        <InfoTile label="Emergency Contact" value={ownerMemberPopup.emergencyContact || "—"} tone="#dc2626" soft="#fef2f2" />
                      </div>
                    </div>
                    {/* Notes */}
                    {(ownerMemberPopup.address || ownerMemberPopup.medicalNotes || ownerMemberPopup.personalNotes) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Notes & Address</div>
                        {ownerMemberPopup.address && <div style={{ padding: "12px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Address</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerMemberPopup.address}</div></div>}
                        {ownerMemberPopup.medicalNotes && <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}><div style={{ fontSize: 11, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>⚠ Medical Notes</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerMemberPopup.medicalNotes}</div></div>}
                        {ownerMemberPopup.personalNotes && <div style={{ padding: "12px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Personal Notes</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerMemberPopup.personalNotes}</div></div>}
                      </div>
                    )}
                  </div>
                )}

                {ownerPopupTab === "messages" && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 40 }}>💬</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Messages not available in owner view</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 380 }}>Full message history between this member and their coach is visible inside the member's portal.</div>
                  </div>
                )}

                {ownerPopupTab === "workout" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {ownerMemberPopup.assignedWorkoutPlanName ? (() => {
                      const plan = workoutPlans.find((p) => p.name === ownerMemberPopup.assignedWorkoutPlanName || p.id === ownerMemberPopup.assignedWorkoutPlanId);
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div style={{ borderRadius: 16, background: "linear-gradient(135deg, #1e3a5f, #2563eb)", padding: "20px 24px" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Assigned Workout Plan</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>💪 {ownerMemberPopup.assignedWorkoutPlanName}</div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
                            {plan?.level && <InfoTile label="Level" value={plan.level} tone="#2563eb" soft="#eff6ff" />}
                            {plan?.category && <InfoTile label="Category" value={plan.category} tone="#16a34a" soft="#f0fdf4" />}
                            {plan?.duration && <InfoTile label="Duration" value={`${plan.duration} weeks`} tone="#f59e0b" soft="#fffbeb" />}
                            <InfoTile label="Goal Target Date" value={ownerMemberPopup.goalTargetDate || "—"} tone="#7c3aed" soft="#f5f3ff" />
                            <InfoTile label="Membership Freeze" value={ownerMemberPopup.membershipFreezeStatus || "Active"} tone="#0891b2" soft="#ecfeff" />
                          </div>
                        </div>
                      );
                    })() : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 24px", textAlign: "center" }}>
                        <div style={{ fontSize: 40 }}>💪</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No workout plan assigned</div>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>This member has not been assigned a workout plan yet.</div>
                      </div>
                    )}
                  </div>
                )}

                {ownerPopupTab === "workout-history" && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 40 }}>📋</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Workout history</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 360 }}>Workout session logs are recorded in the member's portal.</div>
                  </div>
                )}

                {ownerPopupTab === "meal" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {(ownerMemberPopup.assignedMealPlanName || ownerMemberPopup.dietPlanName) ? (() => {
                      const planName = ownerMemberPopup.assignedMealPlanName || ownerMemberPopup.dietPlanName;
                      const plan = mealPlans.find((p) => p.name === planName || p.id === ownerMemberPopup.assignedMealPlanId);
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div style={{ borderRadius: 16, background: "linear-gradient(135deg, #14532d, #16a34a)", padding: "20px 24px" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Assigned Meal Plan</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>🥗 {planName}</div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
                            {plan?.goal && <InfoTile label="Goal" value={plan.goal} tone="#16a34a" soft="#f0fdf4" />}
                            {plan?.calories && <InfoTile label="Daily Calories" value={`${plan.calories} kcal`} tone="#f59e0b" soft="#fffbeb" />}
                            {plan?.protein && <InfoTile label="Protein" value={`${plan.protein}g`} tone="#2563eb" soft="#eff6ff" />}
                            {plan?.carbs && <InfoTile label="Carbs" value={`${plan.carbs}g`} tone="#ea580c" soft="#fff7ed" />}
                            {plan?.fat && <InfoTile label="Fat" value={`${plan.fat}g`} tone="#7c3aed" soft="#f5f3ff" />}
                          </div>
                        </div>
                      );
                    })() : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 24px", textAlign: "center" }}>
                        <div style={{ fontSize: 40 }}>🥗</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No meal plan assigned</div>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>This member has not been assigned a meal plan yet.</div>
                      </div>
                    )}
                  </div>
                )}

                {ownerPopupTab === "stats" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Body Vitals</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                        <InfoTile label="Height" value={ownerMemberPopup.heightCm ? `${ownerMemberPopup.heightCm} cm` : "—"} tone="#ea580c" soft="#fff7ed" />
                        <InfoTile label="Current Weight" value={ownerMemberPopup.currentWeightKg ? `${ownerMemberPopup.currentWeightKg} kg` : "—"} tone="#dc2626" soft="#fef2f2" />
                        <InfoTile label="Target Weight" value={ownerMemberPopup.targetWeightKg ? `${ownerMemberPopup.targetWeightKg} kg` : "—"} tone="#16a34a" soft="#f0fdf4" />
                        <InfoTile label="BMI" value={ownerMemberPopup.bmi ? String(ownerMemberPopup.bmi) : "—"} tone="#0891b2" soft="#ecfeff" />
                        <InfoTile label="Body Fat %" value={ownerMemberPopup.bodyFatPercentage ? `${ownerMemberPopup.bodyFatPercentage}%` : "—"} tone="#7c3aed" soft="#f5f3ff" />
                        <InfoTile label="Target Body Fat" value={ownerMemberPopup.targetBodyFat ? `${ownerMemberPopup.targetBodyFat}%` : "—"} tone="#16a34a" soft="#f0fdf4" />
                        <InfoTile label="Waist-to-Hip Ratio" value={ownerMemberPopup.waistToHipRatio ? String(ownerMemberPopup.waistToHipRatio) : "—"} tone="#ea580c" soft="#fff7ed" />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Fitness Profile</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                        <InfoTile label="Fitness Level" value={ownerMemberPopup.fitnessLevel || "—"} tone="#2563eb" soft="#eff6ff" />
                        <InfoTile label="Goal" value={ownerMemberPopup.goal || "—"} tone="#7c3aed" soft="#f5f3ff" />
                        <InfoTile label="Preferred Workout Time" value={ownerMemberPopup.preferredWorkoutTime || "—"} tone="#f59e0b" soft="#fffbeb" />
                        <InfoTile label="Supplement Usage" value={ownerMemberPopup.supplementUsage || "—"} tone="#7c3aed" soft="#f5f3ff" />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Body Measurements</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                        <InfoTile label="Chest" value={ownerMemberPopup.bodyMeasurements?.chestCm ? `${ownerMemberPopup.bodyMeasurements.chestCm} cm` : "—"} tone="#0891b2" soft="#ecfeff" />
                        <InfoTile label="Waist" value={ownerMemberPopup.bodyMeasurements?.waistCm ? `${ownerMemberPopup.bodyMeasurements.waistCm} cm` : "—"} tone="#0891b2" soft="#ecfeff" />
                        <InfoTile label="Arms" value={ownerMemberPopup.bodyMeasurements?.armsCm ? `${ownerMemberPopup.bodyMeasurements.armsCm} cm` : "—"} tone="#0891b2" soft="#ecfeff" />
                        <InfoTile label="Thighs" value={ownerMemberPopup.bodyMeasurements?.thighsCm ? `${ownerMemberPopup.bodyMeasurements.thighsCm} cm` : "—"} tone="#0891b2" soft="#ecfeff" />
                      </div>
                    </div>
                  </div>
                )}

                {ownerPopupTab === "payments" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
                      {[
                        { label: "Amount Paid", value: ownerMemberPopup.amountPaid != null ? `LKR ${Number(ownerMemberPopup.amountPaid).toLocaleString()}` : "—", color: "#16a34a", bg: "#f0fdf4" },
                        { label: "Amount Due", value: ownerMemberPopup.amountDue != null ? `LKR ${Number(ownerMemberPopup.amountDue).toLocaleString()}` : "—", color: "#dc2626", bg: "#fef2f2" },
                        { label: "Remaining Balance", value: ownerMemberPopup.remainingBalance != null ? `LKR ${Number(ownerMemberPopup.remainingBalance).toLocaleString()}` : "—", color: "#ea580c", bg: "#fff7ed" },
                        { label: "Payment Status", value: ownerMemberPopup.paymentStatus || "—", color: ownerMemberPopup.paymentStatus === "paid" ? "#16a34a" : "#dc2626", bg: ownerMemberPopup.paymentStatus === "paid" ? "#f0fdf4" : "#fef2f2" },
                      ].map(({ label, value, color, bg }) => (
                        <div key={label} style={{ padding: "16px 18px", borderRadius: 14, background: bg, border: `1px solid ${color}22` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                      <InfoTile label="Plan" value={ownerMemberPopup.plan || "—"} tone="#f59e0b" soft="#fffbeb" />
                      <InfoTile label="Duration" value={ownerMemberPopup.subscriptionDurationMonths ? `${ownerMemberPopup.subscriptionDurationMonths} months` : "—"} tone="#2563eb" soft="#eff6ff" />
                      <InfoTile label="Expires" value={ownerMemberPopup.planExpiresAt || "—"} tone="#7c3aed" soft="#f5f3ff" />
                      <InfoTile label="Payment Method" value={ownerMemberPopup.paymentMethod || "—"} tone="#0891b2" soft="#ecfeff" />
                    </div>
                    {Array.isArray(ownerMemberPopup.paymentHistory) && ownerMemberPopup.paymentHistory.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Transaction History</div>
                        <Table
                          headers={["Date", "Plan", "Duration", "Method", "Amount"]}
                          rows={ownerMemberPopup.paymentHistory.map((p) => [
                            p.date ? new Date(p.date).toLocaleDateString() : "—",
                            p.planName || "—",
                            p.months ? `${p.months} mo` : "—",
                            p.method || "—",
                            `LKR ${Number(p.amount || 0).toLocaleString()}`
                          ])}
                        />
                      </div>
                    )}
                  </div>
                )}

                {ownerPopupTab === "checkin" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {mAttn.length === 0
                      ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 24px", textAlign: "center" }}>
                          <div style={{ fontSize: 40 }}>📅</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No attendance records</div>
                          <div style={{ fontSize: 13, color: "var(--muted)" }}>No check-in history found for this member.</div>
                        </div>
                      )
                      : mAttn.slice(0, 20).map((a) => {
                          const inTime = a.checkInAt ? new Date(a.checkInAt) : null;
                          const outTime = a.checkOutAt ? new Date(a.checkOutAt) : null;
                          const durMin = inTime && outTime ? Math.round((outTime - inTime) / 60000) : null;
                          return (
                            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📅</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{a.date || (inTime ? inTime.toLocaleDateString() : "—")}</div>
                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                                  In: {inTime ? inTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                                  {" · "}
                                  Out: {outTime ? outTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Still in"}
                                  {durMin && ` · ${durMin} min`}
                                </div>
                              </div>
                              <Badge label={a.status} type={a.status} />
                            </div>
                          );
                        })
                    }
                  </div>
                )}
              </Modal>
            );
          })()}

          {ownerCoachPopup && (() => {
            const coachMembersList = members.filter((m) => m.coach === ownerCoachPopup.name);
            const coachPlans = workoutPlans.filter((p) => p.coachId === ownerCoachPopup.id || p.createdBy === ownerCoachPopup.name || p.coachName === ownerCoachPopup.name);
            const coachMeals = mealPlans.filter((p) => p.coachId === ownerCoachPopup.id || p.createdBy === ownerCoachPopup.name || p.coachName === ownerCoachPopup.name);
            const coachAttn = attendance.filter((a) => a.coachName === ownerCoachPopup.name);
            const coachTabs = [
              { key: "dashboard", label: "Dashboard", icon: "🏠" },
              { key: "members", label: "My Members", icon: "👥" },
              { key: "workouts", label: "Workout Plans", icon: "💪" },
              { key: "meals", label: "Meal Plans", icon: "🥗" },
              { key: "attendance", label: "Attendance", icon: "📅" },
              { key: "messages", label: "Messages", icon: "💬" },
            ];
            return (
              <Modal title={ownerCoachPopup.name} onClose={() => { setOwnerCoachPopup(null); setOwnerPopupTab("dashboard"); }} width={980} subtitle={`Coach · ${ownerCoachPopup.specialty || ownerCoachPopup.coachCode || "No specialty"}`}>
                {/* Underline tab nav */}
                <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", marginBottom: 24, overflowX: "auto", gap: 0, flexShrink: 0 }}>
                  {coachTabs.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setOwnerPopupTab(key)}
                      style={{
                        padding: "10px 16px", border: "none", background: "transparent",
                        borderBottom: ownerPopupTab === key ? "2px solid #2563eb" : "2px solid transparent",
                        marginBottom: -2, cursor: "pointer", fontSize: 13,
                        fontWeight: ownerPopupTab === key ? 700 : 500,
                        color: ownerPopupTab === key ? "#2563eb" : "#64748b",
                        display: "inline-flex", alignItems: "center", gap: 6,
                        whiteSpace: "nowrap", flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 15 }}>{icon}</span>{label}
                    </button>
                  ))}
                </div>

                {ownerPopupTab === "dashboard" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Hero */}
                    <div style={{ borderRadius: 16, background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", padding: "24px 28px", display: "flex", alignItems: "center", gap: 20 }}>
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "3px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                        {(ownerCoachPopup.name || "CH").slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{ownerCoachPopup.name}</div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{ownerCoachPopup.specialty || "General Coaching"} · {ownerCoachPopup.email}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          {ownerCoachPopup.coachCode && <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 11, fontWeight: 700, border: "1px solid rgba(255,255,255,0.22)" }}>{ownerCoachPopup.coachCode}</span>}
                          {ownerCoachPopup.employmentType && <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(99,102,241,0.35)", color: "#c7d2fe", fontSize: 11, fontWeight: 700, border: "1px solid rgba(99,102,241,0.3)" }}>{ownerCoachPopup.employmentType}</span>}
                          {ownerCoachPopup.shiftSchedule && <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, border: "1px solid rgba(255,255,255,0.18)" }}>{ownerCoachPopup.shiftSchedule}</span>}
                        </div>
                      </div>
                    </div>
                    {/* Quick stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
                      {[
                        { label: "Members", value: String(coachMembersList.length), color: "#2563eb", bg: "#eff6ff" },
                        { label: "Experience", value: ownerCoachPopup.yearsOfExperience != null ? `${ownerCoachPopup.yearsOfExperience} yrs` : "—", color: "#16a34a", bg: "#f0fdf4" },
                        { label: "Max Clients", value: ownerCoachPopup.maxClientCapacity != null ? String(ownerCoachPopup.maxClientCapacity) : "—", color: "#7c3aed", bg: "#f5f3ff" },
                        { label: "Available Hours", value: ownerCoachPopup.availableHours || "—", color: "#f59e0b", bg: "#fffbeb" },
                        { label: "Hire Date", value: ownerCoachPopup.hireDate || "—", color: "#0891b2", bg: "#ecfeff" },
                        { label: "Salary Model", value: ownerCoachPopup.salaryModel || "—", color: "#ea580c", bg: "#fff7ed" },
                      ].map(({ label, value, color, bg }) => (
                        <div key={label} style={{ padding: "14px 16px", borderRadius: 12, background: bg, border: `1px solid ${color}22` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Details */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Personal Details</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                        <InfoTile label="Email" value={ownerCoachPopup.email || "—"} tone="#7c3aed" soft="#f5f3ff" />
                        <InfoTile label="Gender" value={ownerCoachPopup.gender || "—"} tone="#ea580c" soft="#fff7ed" />
                        <InfoTile label="Date of Birth" value={ownerCoachPopup.dateOfBirth || "—"} tone="#f59e0b" soft="#fffbeb" />
                        <InfoTile label="Employee Code" value={ownerCoachPopup.employeeCode || "—"} tone="#0891b2" soft="#ecfeff" />
                        <InfoTile label="Emergency Contact" value={ownerCoachPopup.emergencyContact || "—"} tone="#dc2626" soft="#fef2f2" />
                      </div>
                    </div>
                    {(ownerCoachPopup.address || ownerCoachPopup.certifications || ownerCoachPopup.bankPaymentDetails || ownerCoachPopup.performanceNotes) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Notes & Credentials</div>
                        {ownerCoachPopup.address && <div style={{ padding: "12px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Address</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerCoachPopup.address}</div></div>}
                        {ownerCoachPopup.certifications && <div style={{ padding: "12px 16px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}><div style={{ fontSize: 11, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>✓ Certifications</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerCoachPopup.certifications}</div></div>}
                        {ownerCoachPopup.bankPaymentDetails && <div style={{ padding: "12px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Bank / Payment Details</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerCoachPopup.bankPaymentDetails}</div></div>}
                        {ownerCoachPopup.performanceNotes && <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a" }}><div style={{ fontSize: 11, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Performance Notes</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerCoachPopup.performanceNotes}</div></div>}
                      </div>
                    )}
                  </div>
                )}

                {ownerPopupTab === "members" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {coachMembersList.length === 0
                      ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 24px", textAlign: "center" }}>
                          <div style={{ fontSize: 40 }}>👥</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No members assigned</div>
                          <div style={{ fontSize: 13, color: "var(--muted)" }}>This coach has no members assigned yet.</div>
                        </div>
                      ) : (
                        <Table
                          headers={["Member", "Plan", "Payment", "Expires", "Goal"]}
                          rows={coachMembersList.map((m) => [
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#2563eb", flexShrink: 0 }}>{(m.name || "MB").slice(0, 2).toUpperCase()}</div>
                              <span style={{ fontWeight: 600 }}>{m.name}</span>
                            </div>,
                            m.plan || "—",
                            <Badge label={m.paymentStatus || "unpaid"} type={m.paymentStatus || "unpaid"} />,
                            m.planExpiresAt || "—",
                            m.goal || "—"
                          ])}
                        />
                      )
                    }
                  </div>
                )}

                {ownerPopupTab === "workouts" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {coachPlans.length === 0
                      ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 24px", textAlign: "center" }}>
                          <div style={{ fontSize: 40 }}>💪</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No workout plans</div>
                          <div style={{ fontSize: 13, color: "var(--muted)" }}>No workout plans found associated with this coach.</div>
                        </div>
                      ) : (
                        <Table
                          headers={["Plan Name", "Level", "Category", "Duration"]}
                          rows={coachPlans.map((p) => [p.name || "—", p.level || "—", p.category || "—", p.duration ? `${p.duration} weeks` : "—"])}
                        />
                      )
                    }
                  </div>
                )}

                {ownerPopupTab === "meals" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {coachMeals.length === 0
                      ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 24px", textAlign: "center" }}>
                          <div style={{ fontSize: 40 }}>🥗</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No meal plans</div>
                          <div style={{ fontSize: 13, color: "var(--muted)" }}>No meal plans found associated with this coach.</div>
                        </div>
                      ) : (
                        <Table
                          headers={["Plan Name", "Goal", "Calories", "Protein"]}
                          rows={coachMeals.map((p) => [p.name || "—", p.goal || "—", p.calories ? `${p.calories} kcal` : "—", p.protein ? `${p.protein}g` : "—"])}
                        />
                      )
                    }
                  </div>
                )}

                {ownerPopupTab === "attendance" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {coachAttn.length === 0
                      ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 24px", textAlign: "center" }}>
                          <div style={{ fontSize: 40 }}>📅</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No attendance records</div>
                          <div style={{ fontSize: 13, color: "var(--muted)" }}>No member attendance records logged by this coach.</div>
                        </div>
                      ) : coachAttn.slice(0, 20).map((a) => (
                        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👤</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{a.memberName || "Member"}</div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{a.date || new Date(a.checkInAt || "").toLocaleDateString()}</div>
                          </div>
                          <Badge label={a.status} type={a.status} />
                        </div>
                      ))
                    }
                  </div>
                )}

                {ownerPopupTab === "messages" && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 40 }}>💬</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Messages not available in owner view</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 380 }}>Full message history between this coach and their members is visible inside the coach's portal.</div>
                  </div>
                )}
              </Modal>
            );
          })()}

          {activityDetail && (
            <Modal title="Coach Activity Details" subtitle="Inspect the exact coach action, its target, and the before/after snapshot captured by the server." onClose={() => setActivityDetail(null)} width={720}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 12 }}>
                  <InfoTile label="Coach" value={activityDetail.actorName} tone="#2563eb" soft="#eff6ff" />
                  <InfoTile label="Action" value={String(activityDetail.action || "update").replace(/-/g, " ")} tone="#16a34a" soft="#f0fdf4" />
                  <InfoTile label="Target" value={`${activityDetail.targetType}${activityDetail.targetName ? `: ${activityDetail.targetName}` : ""}`} tone="#7c3aed" soft="#f5f3ff" />
                  <InfoTile label="Time" value={activityDetail.createdAt ? new Date(activityDetail.createdAt).toLocaleString() : "Unknown"} tone="#ea580c" soft="#fff7ed" />
                </div>

                <Card style={{ padding: 16, background: "#f8fafc" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Summary</div>
                  <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7 }}>{activityDetail.summary}</div>
                </Card>

                <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                  <Card style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Before</div>
                    <AuditFieldList snapshot={activityDetail.before} emptyText="No previous snapshot" />
                  </Card>
                  <Card style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>After</div>
                    <AuditFieldList snapshot={activityDetail.after} emptyText="No resulting snapshot" />
                  </Card>
                </div>

                <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                  <Card style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Changed Fields</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {activityDetail.changedFields?.length ? activityDetail.changedFields.map((field) => (
                        <Badge key={field} label={field} type="default" />
                      )) : <div style={{ fontSize: 13, color: "var(--muted)" }}>No field diff captured for this event.</div>}
                    </div>
                  </Card>
                  <Card style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Metadata</div>
                    <AuditFieldList snapshot={activityDetail.metadata} emptyText="No extra metadata" />
                  </Card>
                </div>
              </div>
            </Modal>
          )}
          <TemporaryCredentialModal details={credentialNotice} onClose={() => setCredentialNotice(null)} />

          {/* Member View Modal */}
          {memberViewModal && (
            <Modal title={`Member Profile — ${memberViewModal.name}`} onClose={() => setMemberViewModal(null)} width={800}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>Personal Information</div>
                  {[["Member ID", memberViewModal.memberCode || "Pending"], ["Full Name", memberViewModal.name], ["Email", memberViewModal.email || "—"], ["Date of Birth", memberViewModal.dateOfBirth || "—"], ["Gender", memberViewModal.gender || "—"], ["Address", memberViewModal.address || "—"], ["Phone / Emergency", memberViewModal.emergencyContact || "—"], ["Emergency Relation", memberViewModal.emergencyContactRelationship || "—"]].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>{label}</span>
                      <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>Membership & Payment</div>
                  {[["Status", memberViewModal.status], ["Plan", memberViewModal.plan || "—"], ["Coach", memberViewModal.coach || "—"], ["Joined", memberViewModal.joinedAt || "—"], ["Plan Expires", memberViewModal.planExpiresAt || "—"], ["Payment Status", memberViewModal.paymentStatus || "—"], ["Amount Paid", memberViewModal.amountPaid ? `LKR ${Number(memberViewModal.amountPaid).toLocaleString()}` : "—"], ["Remaining", memberViewModal.remainingBalance ? `LKR ${Number(memberViewModal.remainingBalance).toLocaleString()}` : "—"], ["Check-Ins", String(memberViewModal.checkIns || 0)], ["Goal", memberViewModal.goal || "—"]].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>{label}</span>
                      <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>Body & Fitness</div>
                  {[["Height", memberViewModal.heightCm ? `${memberViewModal.heightCm} cm` : "—"], ["Current Weight", memberViewModal.currentWeightKg ? `${memberViewModal.currentWeightKg} kg` : "—"], ["Target Weight", memberViewModal.targetWeightKg ? `${memberViewModal.targetWeightKg} kg` : "—"], ["BMI", memberViewModal.bmi || "—"], ["Body Fat %", memberViewModal.bodyFatPercentage ? `${memberViewModal.bodyFatPercentage}%` : "—"], ["Fitness Level", memberViewModal.fitnessLevel || "—"], ["Preferred Time", memberViewModal.preferredWorkoutTime || "—"]].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>Other Details</div>
                  {[["Locker", memberViewModal.assignedLocker || "—"], ["Barcode", memberViewModal.barcode || "—"], ["Member Tag", memberViewModal.memberTag || "—"], ["Diet Plan", memberViewModal.dietPlanName || "—"], ["Supplement Usage", memberViewModal.supplementUsage || "—"], ["Medical Notes", memberViewModal.medicalNotes || "—"], ["Personal Notes", memberViewModal.personalNotes || "—"]].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>{label}</span>
                      <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Btn onClick={() => { setMemberViewModal(null); openMemberModal("edit", memberViewModal); }}>&#x270E; Edit Member</Btn>
                <Btn variant="ghost" onClick={() => setMemberViewModal(null)}>Close</Btn>
              </div>
            </Modal>
          )}

          {/* Coach View Modal */}
          {coachViewModal && (
            <Modal title={`Coach Profile — ${coachViewModal.name}`} onClose={() => setCoachViewModal(null)} width={800}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>Personal Information</div>
                  {[["Coach ID", coachViewModal.coachCode || "Pending"], ["Full Name", coachViewModal.name], ["Email", coachViewModal.email || "—"], ["Date of Birth", coachViewModal.dateOfBirth || "—"], ["Gender", coachViewModal.gender || "—"], ["Address", coachViewModal.address || "—"], ["National ID", coachViewModal.nationalId || "—"], ["Emergency Contact", coachViewModal.emergencyContact || "—"]].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>{label}</span>
                      <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>Employment & Performance</div>
                  {[["Status", coachViewModal.status], ["Specialty", coachViewModal.specialty || "—"], ["Rating", coachViewModal.rating ? `${coachViewModal.rating}/5` : "—"], ["Members Assigned", String(coachViewModal.members || 0)], ["Hire Date", coachViewModal.hireDate || "—"], ["Employment Type", coachViewModal.employmentType || "—"], ["Salary Model", coachViewModal.salaryModel || "—"], ["Shift Schedule", coachViewModal.shiftSchedule || "—"], ["Max Capacity", coachViewModal.maxClientCapacity ? String(coachViewModal.maxClientCapacity) : "—"], ["Experience (yrs)", coachViewModal.yearsOfExperience ? String(coachViewModal.yearsOfExperience) : "—"]].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>{label}</span>
                      <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>Skills & Certifications</div>
                  {[["Certifications", coachViewModal.certifications || "—"], ["Specializations", Array.isArray(coachViewModal.specializations) ? coachViewModal.specializations.join(", ") : (coachViewModal.specializations || "—")], ["Languages", Array.isArray(coachViewModal.languages) ? coachViewModal.languages.join(", ") : (coachViewModal.languages || "—")], ["Available Hours", coachViewModal.availableHours || "—"], ["Performance Notes", coachViewModal.performanceNotes || "—"]].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)", minWidth: 160 }}>{label}</span>
                      <span style={{ fontWeight: 600, textAlign: "right", flex: 1 }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Btn onClick={() => { setCoachViewModal(null); openCoachModal("edit", coachViewModal); }}>&#x270E; Edit Coach</Btn>
                <Btn variant="ghost" onClick={() => setCoachViewModal(null)}>Close</Btn>
              </div>
            </Modal>
          )}

          {/* Equipment View Modal */}
          {equipmentViewItem && (() => {
            const eviSvcCost = (equipmentViewItem.serviceHistory || []).reduce((s, h) => s + Number(h.cost || 0), 0);
            const eviOpenBreakages = (equipmentViewItem.breakageHistory || []).filter((b) => !b.resolvedAt).length;
            const eviTotalBreakages = (equipmentViewItem.breakageHistory || []).length;
            const eviTotalValue = Number(equipmentViewItem.purchasePrice || 0) * Number(equipmentViewItem.qty || 1);
            const eviWarrantyDate = equipmentViewItem.warrantyExpiresAt ? new Date(equipmentViewItem.warrantyExpiresAt) : null;
            const eviWarrantyExpired = eviWarrantyDate && eviWarrantyDate < new Date();
            const eviWarrantySoon = eviWarrantyDate && !eviWarrantyExpired && eviWarrantyDate <= new Date(Date.now() + 30 * 86400000);
            const eviNextSvcDate = equipmentViewItem.nextServiceDate ? new Date(equipmentViewItem.nextServiceDate) : null;
            const eviNextSvcOverdue = eviNextSvcDate && eviNextSvcDate < new Date();
            return (
              <Modal title={`Equipment — ${equipmentViewItem.name}`} subtitle={equipmentViewItem.vendor ? `Vendor: ${equipmentViewItem.vendor}` : undefined} onClose={() => setEquipmentViewItem(null)} width={780}>
                <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 16 }}>
                  {["overview", "financials", "service-history", "breakage-log"].map((tab) => (
                    <button key={tab} onClick={() => setEquipmentViewTab(tab)} style={{ padding: "8px 14px", background: "none", border: "none", borderBottom: equipmentViewTab === tab ? "2px solid #2563eb" : "2px solid transparent", marginBottom: -2, fontWeight: 700, fontSize: 12, color: equipmentViewTab === tab ? "#2563eb" : "var(--muted)", cursor: "pointer", whiteSpace: "nowrap" }}>
                      {tab === "overview" ? "Overview" : tab === "financials" ? "Financials" : tab === "service-history" ? "Service History" : "Breakage Log"}
                    </button>
                  ))}
                </div>

                {equipmentViewTab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 12 }}>
                      <InfoTile label="Status" value={equipmentViewItem.status} tone={equipmentViewItem.status === "good" ? "#16a34a" : equipmentViewItem.status === "maintenance" ? "#ea580c" : "#dc2626"} soft={equipmentViewItem.status === "good" ? "#f0fdf4" : equipmentViewItem.status === "maintenance" ? "#fff7ed" : "#fef2f2"} />
                      <InfoTile label="Quantity" value={String(equipmentViewItem.qty ?? 0)} tone="#2563eb" soft="#eff6ff" />
                      <InfoTile label="Open Breakages" value={String(eviOpenBreakages)} tone={eviOpenBreakages > 0 ? "#dc2626" : "#16a34a"} soft={eviOpenBreakages > 0 ? "#fef2f2" : "#f0fdf4"} />
                      <InfoTile label="Services Logged" value={String((equipmentViewItem.serviceHistory || []).length)} tone="#7c3aed" soft="#f5f3ff" />
                    </div>
                    <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 12 }}>
                      <InfoTile label="Location" value={equipmentViewItem.location || "—"} tone="#2563eb" soft="#eff6ff" />
                      <InfoTile label="Serial Number" value={equipmentViewItem.serialNumber || "—"} tone="#64748b" soft="#f8fafc" />
                      <InfoTile label="Last Serviced" value={equipmentViewItem.lastService || "—"} tone="#16a34a" soft="#f0fdf4" />
                      <InfoTile label="Next Service" value={equipmentViewItem.nextServiceDate || "—"} tone={eviNextSvcOverdue ? "#dc2626" : "#f59e0b"} soft={eviNextSvcOverdue ? "#fef2f2" : "#fffbeb"} />
                    </div>
                    {eviWarrantyDate && (
                      <div style={{ padding: "12px 16px", borderRadius: 12, background: eviWarrantyExpired ? "#fef2f2" : eviWarrantySoon ? "#fffbeb" : "#f0fdf4", border: `1px solid ${eviWarrantyExpired ? "#fecaca" : eviWarrantySoon ? "#fde68a" : "#bbf7d0"}` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: eviWarrantyExpired ? "#dc2626" : eviWarrantySoon ? "#d97706" : "#16a34a", marginBottom: 4 }}>
                          {eviWarrantyExpired ? "Warranty Expired" : eviWarrantySoon ? "Warranty Expiring Soon" : "Under Warranty"}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text)" }}>Expires: {equipmentViewItem.warrantyExpiresAt}</div>
                      </div>
                    )}
                    {eviNextSvcOverdue && (
                      <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>Service Overdue</div>
                        <div style={{ fontSize: 13, color: "var(--text)", marginTop: 4 }}>Was due: {equipmentViewItem.nextServiceDate}</div>
                      </div>
                    )}
                  </div>
                )}

                {equipmentViewTab === "financials" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 12 }}>
                      <InfoTile label="Unit Purchase Price" value={equipmentViewItem.purchasePrice ? `LKR ${Number(equipmentViewItem.purchasePrice).toLocaleString()}` : "—"} tone="#2563eb" soft="#eff6ff" />
                      <InfoTile label="Total Asset Value" value={eviTotalValue > 0 ? `LKR ${eviTotalValue.toLocaleString()}` : "—"} tone="#7c3aed" soft="#f5f3ff" />
                      <InfoTile label="Purchase Date" value={equipmentViewItem.purchaseDate || "—"} tone="#16a34a" soft="#f0fdf4" />
                      <InfoTile label="Total Service Cost" value={eviSvcCost > 0 ? `LKR ${eviSvcCost.toLocaleString()}` : "LKR 0"} tone="#ea580c" soft="#fff7ed" />
                    </div>
                    {eviTotalValue > 0 && eviSvcCost > 0 && (
                      <div style={{ padding: "14px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Cost of Ownership</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#1e3a5f" }}>LKR {(eviTotalValue + eviSvcCost).toLocaleString()}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Asset value + all service costs combined</div>
                      </div>
                    )}
                    {(equipmentViewItem.serviceHistory || []).length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Service Cost Breakdown</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {[...(equipmentViewItem.serviceHistory || [])].filter((h) => h.cost > 0).sort((a, b) => Number(b.cost) - Number(a.cost)).map((h, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "#f1f5f9", fontSize: 13 }}>
                              <span style={{ color: "var(--text)", textTransform: "capitalize" }}>{h.type} — {h.date ? new Date(h.date).toLocaleDateString() : "—"}</span>
                              <span style={{ fontWeight: 700, color: "#ea580c" }}>LKR {Number(h.cost).toLocaleString()}</span>
                            </div>
                          ))}
                          {!(equipmentViewItem.serviceHistory || []).some((h) => h.cost > 0) && (
                            <div style={{ fontSize: 13, color: "var(--muted)" }}>No service costs recorded yet.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {equipmentViewTab === "service-history" && (
                  <div>
                    {(equipmentViewItem.serviceHistory || []).length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--muted)", padding: "32px 0", textAlign: "center" }}>No service records yet.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))"), gap: 10, marginBottom: 8 }}>
                          <InfoTile label="Total Services" value={String((equipmentViewItem.serviceHistory || []).length)} tone="#2563eb" soft="#eff6ff" />
                          <InfoTile label="Total Cost" value={eviSvcCost > 0 ? `LKR ${eviSvcCost.toLocaleString()}` : "LKR 0"} tone="#ea580c" soft="#fff7ed" />
                          <InfoTile label="Last Entry" value={(equipmentViewItem.serviceHistory || []).length > 0 ? new Date([...(equipmentViewItem.serviceHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date).toLocaleDateString() : "—"} tone="#16a34a" soft="#f0fdf4" />
                        </div>
                        {[...(equipmentViewItem.serviceHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry, i) => (
                          <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <Badge label={entry.type} type={entry.type === "repair" ? "inactive" : entry.type === "inspection" ? "info" : "success"} />
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{entry.date ? new Date(entry.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}</span>
                              </div>
                              {entry.cost > 0 && <span style={{ fontSize: 13, fontWeight: 800, color: "#ea580c" }}>LKR {Number(entry.cost).toLocaleString()}</span>}
                            </div>
                            {entry.description && <div style={{ fontSize: 13, color: "var(--text)", marginTop: 8, lineHeight: 1.5 }}>{entry.description}</div>}
                            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
                              {entry.technician && <span>Technician: <strong style={{ color: "var(--text)" }}>{entry.technician}</strong></span>}
                              {entry.linkedExpenseId && <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ Expense linked</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {equipmentViewTab === "breakage-log" && (
                  <div>
                    {(equipmentViewItem.breakageHistory || []).length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--muted)", padding: "32px 0", textAlign: "center" }}>No breakage records.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))"), gap: 10, marginBottom: 8 }}>
                          <InfoTile label="Total Breakages" value={String(eviTotalBreakages)} tone="#dc2626" soft="#fef2f2" />
                          <InfoTile label="Open" value={String(eviOpenBreakages)} tone={eviOpenBreakages > 0 ? "#dc2626" : "#16a34a"} soft={eviOpenBreakages > 0 ? "#fef2f2" : "#f0fdf4"} />
                          <InfoTile label="Resolved" value={String(eviTotalBreakages - eviOpenBreakages)} tone="#16a34a" soft="#f0fdf4" />
                        </div>
                        {[...(equipmentViewItem.breakageHistory || [])].sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt)).map((entry, i) => (
                          <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: entry.resolvedAt ? "#f0fdf4" : "#fff7ed", border: `1px solid ${entry.resolvedAt ? "#bbf7d0" : "#fed7aa"}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <Badge label={entry.resolvedAt ? "Resolved" : "Open"} type={entry.resolvedAt ? "success" : "warning"} />
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Reported: {entry.reportedAt ? new Date(entry.reportedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}</span>
                            </div>
                            {entry.description && <div style={{ fontSize: 13, color: "var(--text)", marginTop: 8, lineHeight: 1.5 }}>{entry.description}</div>}
                            {entry.reportedBy && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Reported by: <strong style={{ color: "var(--text)" }}>{entry.reportedBy}</strong></div>}
                            {entry.resolvedAt && (
                              <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "#dcfce7", fontSize: 12 }}>
                                <span style={{ color: "#16a34a", fontWeight: 700 }}>Resolved {new Date(entry.resolvedAt).toLocaleDateString()}</span>
                                {entry.resolutionNotes && <span style={{ color: "#166534", marginLeft: 8 }}>— {entry.resolutionNotes}</span>}
                              </div>
                            )}
                            {!entry.resolvedAt && <Btn small variant="ghost" style={{ marginTop: 10 }} onClick={() => resolveEquipmentBreakage(equipmentViewItem.id || equipmentViewItem._id, entry._id)}>Mark Resolved</Btn>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                  <Btn small onClick={() => openEquipmentModal("edit", equipmentViewItem)}>Edit Equipment</Btn>
                  <Btn small onClick={() => { setEquipmentServiceModal(equipmentViewItem.id || equipmentViewItem._id); setEquipmentServiceForm({ type: "service", description: "", cost: "", technician: "" }); }}>Log Service</Btn>
                  <Btn small danger onClick={() => { setEquipmentBreakageModal(equipmentViewItem.id || equipmentViewItem._id); setEquipmentBreakageForm({ description: "", reportedBy: "" }); }}>Report Breakage</Btn>
                  <Btn variant="ghost" onClick={() => setEquipmentViewItem(null)}>Close</Btn>
                </div>
              </Modal>
            );
          })()}

          {/* Equipment Service Modal */}
          {equipmentServiceModal && (
            <Modal title="Log Service / Repair" onClose={() => setEquipmentServiceModal(null)}>
              <FormField label="Service Type">
                <Select value={equipmentServiceForm.type} onChange={(e) => setEquipmentServiceForm((prev) => ({ ...prev, type: e.target.value }))}>
                  <option value="service">Routine Service</option>
                  <option value="repair">Repair</option>
                  <option value="inspection">Inspection</option>
                </Select>
              </FormField>
              <FormField label="Description"><TextArea rows={3} value={equipmentServiceForm.description} onChange={(e) => setEquipmentServiceForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Describe what was done…" /></FormField>
              <FormField label="Technician / Company"><Input value={equipmentServiceForm.technician} onChange={(e) => setEquipmentServiceForm((prev) => ({ ...prev, technician: e.target.value }))} /></FormField>
              <FormField label="Cost (LKR) — auto-creates expense entry"><Input type="number" min="0" value={equipmentServiceForm.cost} onChange={(e) => setEquipmentServiceForm((prev) => ({ ...prev, cost: e.target.value }))} /></FormField>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={logEquipmentService}>🔧 Save &amp; Log</Btn>
                <Btn variant="ghost" onClick={() => setEquipmentServiceModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {/* Equipment Breakage Modal */}
          {equipmentBreakageModal && (
            <Modal title="Report Breakage" onClose={() => setEquipmentBreakageModal(null)}>
              <FormField label="Breakage Description"><TextArea rows={3} value={equipmentBreakageForm.description} onChange={(e) => setEquipmentBreakageForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Describe what broke or was damaged…" /></FormField>
              <FormField label="Reported By"><Input value={equipmentBreakageForm.reportedBy} onChange={(e) => setEquipmentBreakageForm((prev) => ({ ...prev, reportedBy: e.target.value }))} /></FormField>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn danger onClick={logEquipmentBreakage}>⚠ Report</Btn>
                <Btn variant="ghost" onClick={() => setEquipmentBreakageModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

        </>
      )}
    </DashboardShell>
  );
}
