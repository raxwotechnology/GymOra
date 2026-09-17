import React from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useDashboard } from "../../context/DashboardContext";
import { useAuth } from "../../../auth/context/AuthContext";
import { apiFetch } from "../../../../lib/api/client";
import {
  Avatar,
  StatCard,
  Badge,
  Btn,
  Card,
  SectionHeader,
  Modal,
  FormField,
  Input,
  TextArea,
  Select,
  Table,
  ProgressBar,
  BarChart,
  MiniChart,
  RingStat,
  BankPicker,
  resolveImageUrl,
  SearchableSelect
} from "../../../../components/shared";
import { useIsMobile, responsiveGrid, useNotificationReadState } from "../../shared/lib/hooks";
import { matchesQuery, paginateItems } from "../../shared/lib/formatters";
import { getPdfTheme, addPdfHeader, addPdfSectionTitle, addPdfSummaryCards, getPdfTableConfig, finalizePdf } from "../../shared/lib/pdf";
import { PLATFORM_INCOME_CATEGORIES, PLATFORM_EXPENSE_CATEGORIES } from "../../shared/lib/constants";
import { IconBtn, IcoView, IcoEdit, IcoTag, IcoKey, IcoBackup, IcoBan, IcoCheck, IcoPlus, IcoTrash, IcoCalendar, IcoMail } from "../../shared/components/icons";
import { DashboardStatus, DashboardShell, NotificationCard } from "../../shared/components/DashboardShell";
import {
  EmptyState,
  ExportButtonGroup,
  ReportExportButton,
  SpreadsheetExportButton,
  ProfileSection,
  DetailStack,
  PaginationControls,
  InfoTile,
  Toolbar,
  ProfilePhotoField,
  TemporaryCredentialModal,
  BankAccountsPanel
} from "../../shared/components/common";
import { ProfileHeroCard } from "../../shared/components/management";

export default function SuperAdminDash() {
  const { user, logout } = useAuth();
  const {
    data, error, loading,
    addGym, editGym, uploadGymLogo, suspendGym, reactivateGym, getGymDetails, resetOwnerPassword, editMyProfile,
    addGymOwner, removeGymOwner,
    addSubscriptionPlan, editSubscriptionPlan, removeSubscriptionPlan, assignGymSubscription,
    recordGymPayment,
    extendGymTrial, sendTrialReminder,
    addBankDetail, editBankDetail, removeBankDetail,
    addCheque, editCheque, removeCheque,
    addPlatformExpense, editPlatformExpense, removePlatformExpense,
    downloadGymsExcel, backupGymData, backupPlatformData
  } = useDashboard();
  const isMobile = useIsMobile();
  const [page, setPage] = React.useState("dashboard");
  const [search, setSearch] = React.useState("");
  const [ownerSearch, setOwnerSearch] = React.useState("");
  const [planFilter, setPlanFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [gymPage, setGymPage] = React.useState(1);
  const [ownerPage, setOwnerPage] = React.useState(1);
  const [trialPage, setTrialPage] = React.useState(1);
  const [healthPage, setHealthPage] = React.useState(1);
  const [auditPage, setAuditPage] = React.useState(1);
  const [gymModal, setGymModal] = React.useState(null);
  const [profileModal, setProfileModal] = React.useState(false);
  const [credentialNotice, setCredentialNotice] = React.useState(null);
  const [gymFormError, setGymFormError] = React.useState("");
  const [gymDetail, setGymDetail] = React.useState(null);
  const [gymDetailLoading, setGymDetailLoading] = React.useState(false);
  const [gymDetailError, setGymDetailError] = React.useState("");

  // Subscription plan state
  const [subPlanModal, setSubPlanModal] = React.useState(null);
  const emptySubPlanForm = React.useMemo(() => ({ id: "", name: "", price: "", billingCycle: "monthly", memberLimit: "", coachLimit: "", features: "", isActive: true, color: "#2563eb", description: "", trialDays: "", storageGb: "", supportLevel: "basic", customBranding: false, analyticsAccess: false, apiAccess: false, maxLocations: 1, smsCredits: "" }), []);
  const [subPlanForm, setSubPlanForm] = React.useState(emptySubPlanForm);
  const [subPlanError, setSubPlanError] = React.useState("");

  // Assign subscription state
  const [assignSubModal, setAssignSubModal] = React.useState(null);
  const [assignSubForm, setAssignSubForm] = React.useState({ gymId: "", subscriptionPlanId: "", note: "", method: "manual" });
  const [assignSubError, setAssignSubError] = React.useState("");

  // Multi-owner state
  const [addOwnerModal, setAddOwnerModal] = React.useState(null);
  const [addOwnerForm, setAddOwnerForm] = React.useState({ name: "", email: "" });
  const [addOwnerError, setAddOwnerError] = React.useState("");
  const [expandedOwnerGym, setExpandedOwnerGym] = React.useState(null);

  // Trial extend state
  const [extendTrialModal, setExtendTrialModal] = React.useState(null);
  const [extendTrialDate, setExtendTrialDate] = React.useState("");
  const [trialSortBy, setTrialSortBy] = React.useState("daysLeft");

  // Health sort state
  const [healthSortBy, setHealthSortBy] = React.useState("gymName");
  const [healthSortDir, setHealthSortDir] = React.useState("asc");

  // Bank details state
  const [bankModal, setBankModal] = React.useState(null);
  const emptyBankForm = React.useMemo(() => ({ id: "", bankName: "", accountName: "", accountNumber: "", branchCode: "", swiftCode: "", currency: "LKR", isDefault: false, accountType: "", iban: "", bankAddress: "", contactPhone: "" }), []);
  const [bankForm, setBankForm] = React.useState(emptyBankForm);
  const [bankFormError, setBankFormError] = React.useState("");

  // Cheque state
  const [chequeModal, setChequeModal] = React.useState(null);
  const emptyChequeForm = React.useMemo(() => ({ id: "", gymId: "", gymName: "", chequeNumber: "", bankName: "", amount: "", issuedDate: "", depositedDate: "", clearedDate: "", status: "pending", notes: "" }), []);
  const [chequeForm, setChequeForm] = React.useState(emptyChequeForm);
  const [chequeFormError, setChequeFormError] = React.useState("");
  const [chequeSearch, setChequeSearch] = React.useState("");
  const [chequeStatusFilter, setChequeStatusFilter] = React.useState("all");
  const [chequePage, setChequePage] = React.useState(1);

  // Platform expense state
  const [pfExpenseModal, setPfExpenseModal] = React.useState(null);
  const emptyPfExpenseForm = React.useMemo(() => ({ id: "", type: "income", title: "", category: "", amount: "", gymId: "", gymName: "", paymentMethod: "cash", bankDetail: "", referenceNumber: "", status: "paid", entryDate: new Date().toISOString().slice(0, 10), notes: "" }), []);
  const [pfExpenseForm, setPfExpenseForm] = React.useState(emptyPfExpenseForm);
  const [pfExpenseError, setPfExpenseError] = React.useState("");
  const [pfExpenseSearch, setPfExpenseSearch] = React.useState("");
  const [pfExpenseTypeFilter, setPfExpenseTypeFilter] = React.useState("all");
  const [pfExpensePage, setPfExpensePage] = React.useState(1);
  const [platformExpenses, setPlatformExpenses] = React.useState([]);

  // Billing sort state
  const [billingSortBy, setBillingSortBy] = React.useState("revenue");
  // Billing email/SMS modal state
  const [billingEmailModal, setBillingEmailModal] = React.useState(null); // { gym }
  const [billingEmailForm, setBillingEmailForm] = React.useState({ subject: "", body: "", type: "payment-reminder" });
  const [billingEmailSending, setBillingEmailSending] = React.useState(false);
  const [billingEmailMsg, setBillingEmailMsg] = React.useState("");
  const [billingSmsModal, setBillingSmsModal] = React.useState(null); // { gym }
  const [billingSmsForm, setBillingSmsForm] = React.useState({ message: "", type: "payment-reminder" });
  const [billingSmsSending, setBillingSmsSending] = React.useState(false);
  const [billingSmsMsg, setBillingSmsMsg] = React.useState("");
  const [billingHistorySearch, setBillingHistorySearch] = React.useState("");
  const [billingMethodFilter, setBillingMethodFilter] = React.useState("all");
  // Mark-as-paid modal state
  const emptyMarkPaidForm = React.useMemo(() => ({ amount: "", date: new Date().toISOString().slice(0, 10), method: "cash", bankDetail: "", reference: "", notes: "" }), []);
  const [markPaidModal, setMarkPaidModal] = React.useState(null); // { gym }
  const [markPaidForm, setMarkPaidForm] = React.useState(emptyMarkPaidForm);
  const [markPaidSaving, setMarkPaidSaving] = React.useState(false);
  const [markPaidError, setMarkPaidError] = React.useState("");
  const [gymHistoryModal, setGymHistoryModal] = React.useState(null); // { gym }
  const [gymHistoryMonth, setGymHistoryMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const [bankTxBankFilter, setBankTxBankFilter] = React.useState("all");
  const [bankAccountSort, setBankAccountSort] = React.useState("name");

  const emptyGymForm = React.useMemo(() => ({ id: "", name: "", owner: "", email: "", location: "", phone: "", website: "", facebookUrl: "", googleMapsUrl: "", brNumber: "", description: "", plan: "Starter", status: "trial", subscriptionPlanId: "", logoFile: null }), []);
  const [gymForm, setGymForm] = React.useState(emptyGymForm);
  const [logoPreview, setLogoPreview] = React.useState("");
  const [profileForm, setProfileForm] = React.useState({ name: "", email: "", phone: "", bio: "", title: "", profileImageFile: null });
  const notificationState = useNotificationReadState(`super-admin-${user?.id}`, data ? (data.notifications || []) : null, data?.readNotificationIds);

  const [chequesList, setChequesList] = React.useState([]);

  // Bank transactions state
  const [bankTxList, setBankTxList] = React.useState([]);
  const [bankTxLoading, setBankTxLoading] = React.useState(false);
  const [bankTxSearch, setBankTxSearch] = React.useState("");
  const [bankTxTypeFilter, setBankTxTypeFilter] = React.useState("all");
  const [bankTxStatusFilter, setBankTxStatusFilter] = React.useState("all");
  const [bankTxSort, setBankTxSort] = React.useState("date-desc");
  const [bankTxPage, setBankTxPage] = React.useState(1);
  // Owner bank transaction state
  const [ownerBankTxSearch, setOwnerBankTxSearch] = React.useState("");
  const [ownerBankTxTypeFilter, setOwnerBankTxTypeFilter] = React.useState("all");
  const [ownerBankTxStatusFilter, setOwnerBankTxStatusFilter] = React.useState("all");
  const [ownerBankTxSort, setOwnerBankTxSort] = React.useState("date-desc");
  const [ownerBankTxPage, setOwnerBankTxPage] = React.useState(1);
  const [bankTxModal, setBankTxModal] = React.useState(null);
  const emptyBankTxForm = React.useMemo(() => ({ id: "", type: "credit", amount: "", description: "", category: "", gymId: "", gymName: "", paymentMethod: "bank-transfer", referenceNumber: "", bankDetail: "", bankName: "", accountNumber: "", transactionDate: new Date().toISOString().slice(0, 10), status: "completed", notes: "" }), []);
  const [bankTxForm, setBankTxForm] = React.useState(emptyBankTxForm);
  const [bankTxError, setBankTxError] = React.useState("");

  // SMS logs state
  const [smsLogs, setSmsLogs] = React.useState([]);
  const [smsLogsLoading, setSmsLogsLoading] = React.useState(false);
  const [smsLogSearch, setSmsLogSearch] = React.useState("");
  const [smsLogStatusFilter, setSmsLogStatusFilter] = React.useState("all");
  const [smsLogPage, setSmsLogPage] = React.useState(1);

  // Email logs state
  const [emailLogs, setEmailLogs] = React.useState([]);
  const [emailLogsLoading, setEmailLogsLoading] = React.useState(false);
  const [emailLogSearch, setEmailLogSearch] = React.useState("");
  const [emailLogStatusFilter, setEmailLogStatusFilter] = React.useState("all");
  const [emailLogPage, setEmailLogPage] = React.useState(1);

  // System settings form state
  const [sysSettingsForm, setSysSettingsForm] = React.useState(null);
  const [sysSettingsSaving, setSysSettingsSaving] = React.useState(false);
  const [sysSettingsMsg, setSysSettingsMsg] = React.useState("");
  const [sysLogoPreview, setSysLogoPreview] = React.useState("");
  const [sysHeroPreview, setSysHeroPreview] = React.useState("");
  const [smtpTestResult, setSmtpTestResult] = React.useState(null);
  const [smtpTesting, setSmtpTesting] = React.useState(false);

  // AI summary state
  const [aiSummary, setAiSummary] = React.useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = React.useState(false);
  const [aiSummaryError, setAiSummaryError] = React.useState("");
  const [aiSummaryTimestamp, setAiSummaryTimestamp] = React.useState(null);

  const handleGenerateAiSummary = React.useCallback(() => {
    setAiSummaryLoading(true);
    setAiSummaryError("");
    setAiSummary(null);
    apiFetch("/api/admin/ai-summary", { method: "POST" })
      .then((d) => {
        setAiSummary(d.summary);
        setAiSummaryTimestamp(d.generatedAt ? new Date(d.generatedAt).toLocaleTimeString() : "");
      })
      .catch((err) => setAiSummaryError(err?.message || "Failed to generate summary."))
      .finally(() => setAiSummaryLoading(false));
  }, []);

  // Load platform expenses and cheques when navigating to those pages
  React.useEffect(() => {
    if (page === "platform-finance" && data) {
      apiFetch("/api/admin/platform-expenses")
        .then((d) => setPlatformExpenses(d.expenses || []))
        .catch(() => {});
    }
    if (page === "bank" && data) {
      apiFetch("/api/admin/cheques")
        .then((d) => setChequesList(d.cheques || []))
        .catch(() => {});
    }
    if (page === "bank" || page === "bank-transactions") {
      setBankTxLoading(true);
      apiFetch("/api/admin/bank-transactions")
        .then((d) => setBankTxList(d.transactions || []))
        .catch(() => {})
        .finally(() => setBankTxLoading(false));
    }
    if (page === "sms-logs") {
      setSmsLogsLoading(true);
      apiFetch("/api/admin/sms-logs")
        .then((d) => setSmsLogs(d.logs || []))
        .catch(() => {})
        .finally(() => setSmsLogsLoading(false));
    }
    if (page === "email-logs") {
      setEmailLogsLoading(true);
      apiFetch("/api/admin/email-logs")
        .then((d) => setEmailLogs(d.logs || []))
        .catch(() => {})
        .finally(() => setEmailLogsLoading(false));
    }
    if (page === "settings" && data?.systemSettings && !sysSettingsForm) {
      const s = data.systemSettings;
      setSysSettingsForm({ systemName: s.systemName || "", tagline: s.tagline || "", supportEmail: s.supportEmail || "", trialDays: s.trialDays || 14, primaryColor: s.primaryColor || "#2563eb", privacyPolicy: s.privacyPolicy || "", termsOfUse: s.termsOfUse || "", helpCenter: s.helpCenter || "" });
    }
  }, [page, data]);

  React.useEffect(() => {
    setGymPage(1);
  }, [search, planFilter, statusFilter]);

  React.useEffect(() => {
    setOwnerPage(1);
  }, [ownerSearch]);

  if (!data) {
    return <DashboardStatus error={error} />;
  }

  const { superAdmin, gyms, revenueData, profile, notifications = [], owners = [], gymOwnersMap = {}, trials = [], gymHealth = [], platformAudit = [], subscriptionEndingAlerts = [], subscriptionPlans = [], bankDetails = [], systemSettings = {} } = data;
  const filteredGyms = gyms.filter((gym) => (
    matchesQuery(gym, search, ["name", "owner", "location", "ownerEmail"]) &&
    (planFilter === "all" || gym.plan === planFilter) &&
    (statusFilter === "all" || gym.status === statusFilter)
  ));
  const totalRevenue = gyms.reduce((sum, gym) => sum + gym.revenue, 0);
  const pagedGyms = paginateItems(filteredGyms, gymPage);
  const filteredOwners = owners.filter((owner) => matchesQuery(owner, ownerSearch, ["name", "email", "gymName", "plan", "gymStatus"]));
  const pagedOwners = paginateItems(filteredOwners, ownerPage);
  const sortedTrials = [...trials].sort((a, b) => {
    if (trialSortBy === "daysLeft") return Number(a.daysLeft || 0) - Number(b.daysLeft || 0);
    if (trialSortBy === "plan") return (a.plan || "").localeCompare(b.plan || "");
    if (trialSortBy === "joinedAt") return (a.joinedAt || "").localeCompare(b.joinedAt || "");
    return 0;
  });
  const pagedTrials = paginateItems(sortedTrials, trialPage);
  const sortedHealth = [...gymHealth].sort((a, b) => {
    const dir = healthSortDir === "asc" ? 1 : -1;
    if (healthSortBy === "gymName") return dir * (a.gymName || "").localeCompare(b.gymName || "");
    if (healthSortBy === "members") return dir * (Number(a.members || 0) - Number(b.members || 0));
    if (healthSortBy === "outstandingBalance") return dir * (Number(a.outstandingBalance || 0) - Number(b.outstandingBalance || 0));
    if (healthSortBy === "monthsOnPlatform") return dir * (Number(a.monthsOnPlatform || 0) - Number(b.monthsOnPlatform || 0));
    if (healthSortBy === "subscriptionEndsAt") return dir * (a.subscriptionEndsAt || "").localeCompare(b.subscriptionEndsAt || "");
    return 0;
  });
  const pagedHealth = paginateItems(sortedHealth, healthPage);
  const pagedAudit = paginateItems(platformAudit, auditPage);
  const activeGyms = gyms.filter((gym) => gym.status === "active");
  const trialGyms = gyms.filter((gym) => gym.status === "trial");
  const suspendedGyms = gyms.filter((gym) => gym.status === "suspended");
  const planNames = Array.from(new Set(gyms.map((gym) => gym.plan).filter(Boolean)));
  const planMix = planNames.map((plan) => ({
    plan,
    count: gyms.filter((gym) => gym.plan === plan).length
  }));
  const topRevenueGyms = [...gyms]
    .sort((left, right) => Number(right.revenue || 0) - Number(left.revenue || 0))
    .slice(0, 5);
  const recentAlerts = notifications.slice(0, 4);
  const averageMembersPerGym = gyms.length
    ? Math.round(gyms.reduce((sum, gym) => sum + Number(gym.members || 0), 0) / gyms.length)
    : 0;
  const trialRate = gyms.length ? Math.round((trialGyms.length / gyms.length) * 100) : 0;
  const activeRate = gyms.length ? Math.round((activeGyms.length / gyms.length) * 100) : 0;
  const monthlyRevenue = Number(superAdmin?.stats?.monthlyRevenue || 0);
  const ownersRequiringReset = owners.filter((owner) => owner.mustChangePassword).length;
  const activeOwnerAccounts = owners.filter((owner) => owner.status === "active").length;
  const trialsEndingSoon = trials.filter((trial) => Number(trial.daysLeft || 0) <= 7).length;
  const urgentTrials = trials.filter((trial) => Number(trial.daysLeft || 0) <= 2).length;
  const totalOutstandingBalance = gymHealth.reduce((sum, item) => sum + Number(item.outstandingBalance || 0), 0);
  const totalExpiredMembers = gymHealth.reduce((sum, item) => sum + Number(item.expiredMembers || 0), 0);
  const totalUnpaidMembers = gymHealth.reduce((sum, item) => sum + Number(item.unpaidMembers || 0), 0);
  const inactiveHealthGyms = gymHealth.filter((item) => !item.lastAttendanceAt).length;
  const auditDeleteActions = platformAudit.filter((item) => item.action === "delete").length;
  const auditGymsTouched = new Set(platformAudit.map((item) => String(item.gymId || item.gymName || ""))).size;

  function openCreateGym() {
    setGymModal("create");
    setGymForm(emptyGymForm);
    setGymFormError("");
    setLogoPreview("");
  }

  function openEditGym(gym) {
    setGymModal("edit");
    setGymFormError("");
    setLogoPreview(gym.logoUrl || "");
    setGymForm({
      id: gym.id,
      name: gym.name,
      owner: gym.owner,
      email: gym.ownerEmail,
      location: gym.location,
      phone: gym.phone || "",
      website: gym.website || "",
      facebookUrl: gym.facebookUrl || "",
      googleMapsUrl: gym.googleMapsUrl || "",
      brNumber: gym.brNumber || "",
      description: gym.description || "",
      plan: gym.plan,
      status: gym.status,
      subscriptionPlanId: gym.subscriptionPlanId || "",
      logoFile: null
    });
  }

  async function saveGym() {
    setGymFormError("");
    if (!gymForm.name || !gymForm.owner || !gymForm.email || !gymForm.location) {
      setGymFormError("Name, owner, email, and location are required.");
      return;
    }
    try {
      if (gymModal === "edit") {
        await editGym(gymForm.id, gymForm);
        if (gymForm.logoFile) {
          await uploadGymLogo(gymForm.id, gymForm.logoFile);
        }
      } else {
        const result = await addGym(gymForm);
        if (result?.credentials) setCredentialNotice(result.credentials);
        if (result?.id && gymForm.logoFile) {
          await uploadGymLogo(result.id, gymForm.logoFile);
        }
      }
      setGymModal(null);
      setGymForm(emptyGymForm);
      setLogoPreview("");
      setPage("gyms");
    } catch (error) {
      setGymFormError(error.message || "Failed to save gym");
    }
  }

  // Subscription plan functions
  function openCreateSubPlan() {
    setSubPlanForm(emptySubPlanForm);
    setSubPlanError("");
    setSubPlanModal("create");
  }

  function openEditSubPlan(plan) {
    setSubPlanForm({
      id: plan._id || plan.id,
      name: plan.name,
      price: String(plan.price),
      billingCycle: plan.billingCycle,
      memberLimit: plan.memberLimit ? String(plan.memberLimit) : "",
      coachLimit: plan.coachLimit ? String(plan.coachLimit) : "",
      features: Array.isArray(plan.features) ? plan.features.join(", ") : (plan.features || ""),
      isActive: plan.isActive !== false,
      color: plan.color || "#2563eb",
      description: plan.description || "",
      trialDays: plan.trialDays != null ? String(plan.trialDays) : "",
      storageGb: plan.storageGb != null ? String(plan.storageGb) : "",
      supportLevel: plan.supportLevel || "basic",
      customBranding: !!plan.customBranding,
      analyticsAccess: !!plan.analyticsAccess,
      apiAccess: !!plan.apiAccess,
      maxLocations: plan.maxLocations != null ? String(plan.maxLocations) : "1",
      smsCredits: plan.smsCredits != null ? String(plan.smsCredits) : ""
    });
    setSubPlanError("");
    setSubPlanModal("edit");
  }

  async function saveSubPlan() {
    setSubPlanError("");
    if (!subPlanForm.name || !subPlanForm.price || !subPlanForm.billingCycle) { setSubPlanError("Name, price, and billing cycle are required."); return; }
    try {
      const payload = { name: subPlanForm.name, price: Number(subPlanForm.price), billingCycle: subPlanForm.billingCycle, memberLimit: subPlanForm.memberLimit ? Number(subPlanForm.memberLimit) : null, coachLimit: subPlanForm.coachLimit ? Number(subPlanForm.coachLimit) : null, features: subPlanForm.features, isActive: subPlanForm.isActive, color: subPlanForm.color, description: subPlanForm.description, trialDays: Number(subPlanForm.trialDays) || 0, storageGb: Number(subPlanForm.storageGb) || 0, supportLevel: subPlanForm.supportLevel, customBranding: subPlanForm.customBranding, analyticsAccess: subPlanForm.analyticsAccess, apiAccess: subPlanForm.apiAccess, maxLocations: Number(subPlanForm.maxLocations) || 1, smsCredits: Number(subPlanForm.smsCredits) || 0 };
      if (subPlanModal === "edit") await editSubscriptionPlan(subPlanForm.id, payload);
      else await addSubscriptionPlan(payload);
      setSubPlanModal(null);
    } catch (e) { setSubPlanError(e.message || "Failed to save plan"); }
  }

  // Assign subscription functions
  function openAssignSub(gym) {
    setAssignSubForm({ gymId: gym.id || "", subscriptionPlanId: gym.subscriptionPlanId || "", note: "", method: "manual" });
    setAssignSubError("");
    setAssignSubModal(gym);
  }

  async function saveAssignSub() {
    setAssignSubError("");
    const gymId = assignSubModal.id || assignSubForm.gymId;
    if (!gymId) { setAssignSubError("Select a gym."); return; }
    if (!assignSubForm.subscriptionPlanId) { setAssignSubError("Select a subscription plan."); return; }
    try {
      await assignGymSubscription(gymId, assignSubForm);
      setAssignSubModal(null);
    } catch (e) { setAssignSubError(e.message || "Failed to assign subscription"); }
  }

  // Add owner functions
  function openAddOwner(gym) {
    setAddOwnerForm({ name: "", email: "" });
    setAddOwnerError("");
    setAddOwnerModal(gym);
  }

  async function saveAddOwner() {
    if (!addOwnerForm.name || !addOwnerForm.email) { setAddOwnerError("Name and email are required."); return; }
    try {
      const result = await addGymOwner(addOwnerModal.gymId || addOwnerModal.id, addOwnerForm);
      if (result?.credentials) setCredentialNotice(result.credentials);
      setAddOwnerModal(null);
    } catch (e) { setAddOwnerError(e.message || "Failed to add owner"); }
  }

  async function handleRemoveOwner(gymId, ownerId) {
    try { await removeGymOwner(gymId, ownerId); } catch (e) { alert(e.message || "Failed to remove owner"); }
  }

  // Bank detail functions
  function openCreateBank() { setBankForm(emptyBankForm); setBankFormError(""); setBankModal("create"); }
  function openEditBank(d) { setBankForm({ id: d._id || d.id, bankName: d.bankName, accountName: d.accountName, accountNumber: d.accountNumber, branchCode: d.branchCode || "", swiftCode: d.swiftCode || "", currency: d.currency || "LKR", isDefault: Boolean(d.isDefault), notes: d.notes || "" }); setBankFormError(""); setBankModal("edit"); }
  async function saveBank() {
    setBankFormError("");
    if (!bankForm.bankName || !bankForm.accountName || !bankForm.accountNumber) { setBankFormError("Bank name, account name, and account number are required."); return; }
    try {
      if (bankModal === "edit") await editBankDetail(bankForm.id, bankForm);
      else await addBankDetail(bankForm);
      setBankModal(null);
    } catch (e) { setBankFormError(e.message || "Failed to save bank detail"); }
  }

  // Cheque functions
  function openCreateCheque() { setChequeForm(emptyChequeForm); setChequeFormError(""); setChequeModal("create"); }
  function openEditCheque(c) { setChequeForm({ id: c._id || c.id, gymId: c.gymId || "", gymName: c.gymName || "", chequeNumber: c.chequeNumber, bankName: c.bankName, amount: String(c.amount), issuedDate: c.issuedDate ? c.issuedDate.slice(0, 10) : "", depositedDate: c.depositedDate ? c.depositedDate.slice(0, 10) : "", clearedDate: c.clearedDate ? c.clearedDate.slice(0, 10) : "", status: c.status, notes: c.notes || "" }); setChequeFormError(""); setChequeModal("edit"); }
  async function saveCheque() {
    setChequeFormError("");
    if (!chequeForm.chequeNumber || !chequeForm.bankName || !chequeForm.amount || !chequeForm.issuedDate) { setChequeFormError("Cheque number, bank, amount, and issued date are required."); return; }
    try {
      if (chequeModal === "edit") await editCheque(chequeForm.id, { ...chequeForm, amount: Number(chequeForm.amount) });
      else await addCheque({ ...chequeForm, amount: Number(chequeForm.amount) });
      setChequeModal(null);
      apiFetch("/api/admin/cheques").then((d) => setChequesList(d.cheques || [])).catch(() => {});
    } catch (e) { setChequeFormError(e.message || "Failed to save cheque"); }
  }

  // Platform expense functions
  function openCreatePfExpense() { setPfExpenseForm(emptyPfExpenseForm); setPfExpenseError(""); setPfExpenseModal("create"); }
  function openEditPfExpense(e) { setPfExpenseForm({ id: e._id || e.id, type: e.type, title: e.title, category: e.category, amount: String(e.amount), gymId: e.gymId || "", gymName: e.gymName || "", paymentMethod: e.paymentMethod || "cash", bankDetail: e.bankDetail ? String(e.bankDetail._id || e.bankDetail) : "", referenceNumber: e.referenceNumber || "", status: e.status || "paid", entryDate: e.entryDate ? e.entryDate.slice(0, 10) : "", notes: e.notes || "" }); setPfExpenseError(""); setPfExpenseModal("edit"); }
  async function savePfExpense() {
    setPfExpenseError("");
    if (!pfExpenseForm.type || !pfExpenseForm.title || !pfExpenseForm.category || !pfExpenseForm.amount || !pfExpenseForm.entryDate) { setPfExpenseError("Type, title, category, amount, and date are required."); return; }
    try {
      const payload = { ...pfExpenseForm, amount: Number(pfExpenseForm.amount) };
      if (pfExpenseModal === "edit") { await editPlatformExpense(pfExpenseForm.id, payload); }
      else { await addPlatformExpense(payload); }
      setPlatformExpenses((prev) => {
        const updated = pfExpenseModal === "edit" ? prev.map((x) => (x._id === pfExpenseForm.id ? { ...x, ...payload } : x)) : [...prev, { _id: Date.now(), ...payload }];
        return updated;
      });
      setPfExpenseModal(null);
    } catch (e) { setPfExpenseError(e.message || "Failed to save entry"); }
  }

  // Bank transaction functions
  function openCreateBankTx() { setBankTxForm(emptyBankTxForm); setBankTxError(""); setBankTxModal("create"); }
  function openEditBankTx(tx) {
    setBankTxForm({ id: tx._id || tx.id, type: tx.type, amount: String(tx.amount), description: tx.description, category: tx.category || "", gymId: tx.gymId || "", gymName: tx.gymName || "", paymentMethod: tx.paymentMethod || "bank-transfer", referenceNumber: tx.referenceNumber || "", bankDetail: tx.bankDetail ? String(tx.bankDetail._id || tx.bankDetail) : "", bankName: tx.bankName || "", accountNumber: tx.accountNumber || "", transactionDate: tx.transactionDate ? tx.transactionDate.slice(0, 10) : "", status: tx.status || "completed", notes: tx.notes || "" });
    setBankTxError(""); setBankTxModal("edit");
  }
  async function saveBankTx() {
    setBankTxError("");
    if (!bankTxForm.type || !bankTxForm.amount || !bankTxForm.description || !bankTxForm.transactionDate) { setBankTxError("Type, amount, description, and date are required."); return; }
    try {
      const payload = { ...bankTxForm, amount: Number(bankTxForm.amount) };
      if (bankTxModal === "edit") {
        const r = await apiFetch(`/api/admin/bank-transactions/${bankTxForm.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setBankTxList((prev) => prev.map((t) => (String(t._id || t.id) === bankTxForm.id ? { ...t, ...r.transaction } : t)));
      } else {
        const r = await apiFetch("/api/admin/bank-transactions", { method: "POST", body: JSON.stringify(payload) });
        setBankTxList((prev) => [r.transaction, ...prev]);
      }
      setBankTxModal(null);
    } catch (e) { setBankTxError(e.message || "Failed to save transaction"); }
  }
  async function deleteBankTxEntry(id) {
    if (!window.confirm("Delete this transaction?")) return;
    await apiFetch(`/api/admin/bank-transactions/${id}`, { method: "DELETE" }).catch(() => {});
    setBankTxList((prev) => prev.filter((t) => String(t._id || t.id) !== String(id)));
  }

  async function deleteSmsLogEntry(id) {
    if (!window.confirm("Delete this SMS log entry?")) return;
    await apiFetch(`/api/admin/sms-logs/${id}`, { method: "DELETE" }).catch(() => {});
    setSmsLogs((prev) => prev.filter((l) => String(l._id || l.id) !== String(id)));
  }

  async function deleteEmailLogEntry(id) {
    if (!window.confirm("Delete this email log entry?")) return;
    await apiFetch(`/api/admin/email-logs/${id}`, { method: "DELETE" }).catch(() => {});
    setEmailLogs((prev) => prev.filter((l) => String(l._id || l.id) !== String(id)));
  }

  async function testSmtp() {
    setSmtpTesting(true); setSmtpTestResult(null);
    try {
      const r = await apiFetch("/api/admin/system-settings/test-smtp", { method: "POST" });
      setSmtpTestResult({ ok: true, message: r.message || "SMTP connection verified." });
    } catch (e) {
      setSmtpTestResult({ ok: false, message: e.message || "SMTP test failed." });
    }
    setSmtpTesting(false);
  }

  // System settings save
  async function saveSystemSettings() {
    setSysSettingsSaving(true); setSysSettingsMsg("");
    try {
      await apiFetch("/api/admin/system-settings", { method: "PATCH", body: JSON.stringify(sysSettingsForm) });
      setSysSettingsMsg("Settings saved successfully.");
    } catch (e) { setSysSettingsMsg("Error: " + (e.message || "Failed to save")); }
    setSysSettingsSaving(false);
  }
  async function handleSysLogoUpload(file) {
    if (!file) return;
    const formData = new FormData(); formData.append("logo", file);
    try {
      const r = await apiFetch("/api/admin/system-settings/logo", { method: "POST", body: formData, isFormData: true });
      setSysLogoPreview(r.logoUrl || URL.createObjectURL(file));
      setSysSettingsMsg("Logo uploaded.");
    } catch (e) { setSysSettingsMsg("Logo upload failed."); }
  }
  async function handleSysHeroUpload(file) {
    if (!file) return;
    const formData = new FormData(); formData.append("hero", file);
    try {
      const r = await apiFetch("/api/admin/system-settings/hero", { method: "POST", body: formData, isFormData: true });
      setSysHeroPreview(r.heroImageUrl || URL.createObjectURL(file));
      setSysSettingsMsg("Hero image uploaded.");
    } catch (e) { setSysSettingsMsg("Hero upload failed."); }
  }

  // PDF export function for gyms
  function exportSuperAdminGymsPdf() {
    const accent = [37, 99, 235];
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const contentStartY = addPdfHeader(doc, {
      title: "Gym Portfolio Report",
      subtitle: "All registered gyms across the Gymora platform",
      gymName: systemSettings?.systemName || "Gymora",
      ownerName: "Platform Administration",
      location: "Gymora HQ",
      generatedAt: new Date().toLocaleString(),
      accent
    });
    const tableY = addPdfSectionTitle(doc, "Gym Directory", contentStartY, accent, `Records: ${filteredGyms.length}`);
    autoTable(doc, getPdfTableConfig(doc, accent, tableY,
      [["Gym", "Owner", "Location", "Plan", "Status", "Members", "Revenue", "Joined"]],
      filteredGyms.map((g) => [g.name, g.owner, g.location, g.plan, g.status, g.members, `LKR ${Number(g.revenue || 0).toLocaleString()}`, g.joined])));
    finalizePdf(doc, `gyms-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportSuperAdminGymsExcel() {
    downloadGymsExcel().catch(() => {});
  }

  function saXlsx(header, rows, sheet, filename) {
    const XLSX = window.__XLSX__;
    if (!XLSX) { alert("Excel export not available. Please refresh and try again."); return; }
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = header.map((h, i) => {
      const longest = rows.reduce((max, row) => Math.max(max, String(row[i] ?? "").length), String(h ?? "").length);
      return { wch: Math.min(42, Math.max(10, longest + 2)) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet);
    XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function saPdf(title, subtitle, headers, rows, landscape, filename, summaryCards) {
    const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
    const generatedAt = new Date().toLocaleString();
    const contentStartY = addPdfHeader(doc, {
      title,
      subtitle,
      gymName: systemSettings?.systemName || "Gymora",
      ownerName: "Platform Administration",
      location: "Gymora HQ",
      generatedAt,
      accent: [37, 99, 235]
    });
    let tableY = contentStartY;
    if (Array.isArray(summaryCards) && summaryCards.length) {
      tableY = addPdfSummaryCards(doc, summaryCards, contentStartY, [37, 99, 235]) + 22;
    }
    autoTable(doc, getPdfTableConfig(doc, [37, 99, 235], tableY, [headers], rows));
    finalizePdf(doc, `${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportOwnersPdf() { saPdf("Owner Management", "All registered gym owners", ["Owner", "Email", "Gym", "Plan", "Gym Status", "Last Login"], filteredOwners.map((o) => [o.name || "", o.email || "", o.gymName || "", o.plan || "", o.gymStatus || "", o.lastLoginAt ? new Date(o.lastLoginAt).toLocaleDateString() : "Never"]), true, "owners"); }
  function exportOwnersExcel() { saXlsx(["Owner", "Email", "Gym", "Plan", "Gym Status", "Last Login"], filteredOwners.map((o) => [o.name || "", o.email || "", o.gymName || "", o.plan || "", o.gymStatus || "", o.lastLoginAt ? new Date(o.lastLoginAt).toLocaleDateString() : "Never"]), "Owners", "owners"); }

  function exportTrialsPdf() { saPdf("Trial Management", "Gyms currently on trial", ["Gym", "Owner", "Plan", "Days Left", "Trial Ends", "Status"], trials.map((t) => [t.name || "", t.owner || "", t.plan || "", String(t.daysLeft ?? ""), t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : "", t.status || ""]), true, "trials"); }
  function exportTrialsExcel() { saXlsx(["Gym", "Owner", "Plan", "Days Left", "Trial Ends", "Status"], trials.map((t) => [t.name || "", t.owner || "", t.plan || "", t.daysLeft ?? "", t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : "", t.status || ""]), "Trials", "trials"); }

  function exportAuditPdf() { saPdf("Platform Audit Log", "All recorded platform activity", ["Time", "Gym", "Actor", "Action", "Target", "Summary"], platformAudit.map((a) => [a.timestamp ? new Date(a.timestamp).toLocaleString() : "", a.gymName || "", a.actorName || "", a.action || "", a.targetName || "", a.summary || ""]), true, "audit-log"); }
  function exportAuditExcel() { saXlsx(["Time", "Gym", "Actor", "Action", "Target", "Summary"], platformAudit.map((a) => [a.timestamp ? new Date(a.timestamp).toLocaleString() : "", a.gymName || "", a.actorName || "", a.action || "", a.targetName || "", a.summary || ""]), "Audit Log", "audit-log"); }

  // Payment method color map (reused across billing & bank tx)
  const METHOD_COLORS = { cash: "#16a34a", card: "#2563eb", "bank-transfer": "#0891b2", cheque: "#7c3aed", manual: "#64748b", online: "#f59e0b", other: "#94a3b8" };
  const METHOD_BG = { cash: "#dcfce7", card: "#dbeafe", "bank-transfer": "#e0f2fe", cheque: "#f3e8ff", manual: "#f1f5f9", online: "#fef9c3", other: "#f1f5f9" };
  function MethodBadge({ method }) {
    const m = (method || "manual").toLowerCase();
    const label = m === "bank-transfer" ? "Bank Transfer" : m.charAt(0).toUpperCase() + m.slice(1);
    return <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: METHOD_BG[m] || "#f1f5f9", color: METHOD_COLORS[m] || "#64748b", whiteSpace: "nowrap" }}>{label}</span>;
  }

  // PDF Invoice (jsPDF) — branded theme system
  function downloadInvoicePdf(gym, planPriceMapArg) {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const today = new Date().toISOString().slice(0, 10);
    const accent = [37, 99, 235];
    const theme = getPdfTheme(accent);
    const invoiceNum = `INV-${gym.name ? gym.name.slice(0, 4).toUpperCase().replace(/\s/g, "") : "GYM"}-${today.replace(/-/g, "")}`;
    const planPrice = gym.subscriptionPlanName && planPriceMapArg?.[gym.subscriptionPlanName] != null
      ? `LKR ${Number(planPriceMapArg[gym.subscriptionPlanName]).toLocaleString()}`
      : null;

    let contentY = addPdfHeader(doc, {
      title: `Subscription Invoice — ${invoiceNum}`,
      subtitle: `Billed to ${gym.name || "Gym"} | Owner: ${gym.owner || "—"} | Email: ${gym.ownerEmail || "—"}`,
      gymName: gym.name || "Gymora Gym",
      ownerName: gym.owner || "—",
      location: gym.location || "—",
      generatedAt: `${today} · Due ${gym.subscriptionEndsAt || "—"}`,
      accent
    });

    contentY = addPdfSummaryCards(doc, [
      { label: "Plan", value: gym.subscriptionPlanName || gym.plan || "—" },
      { label: "Billing Cycle", value: (gym.subscriptionPlan?.billingCycle || "monthly") },
      { label: "Unit Price", value: planPrice || "—" },
      { label: "Total Due", value: `LKR ${Number(gym.revenue || 0).toLocaleString()}` }
    ], contentY, accent) + 22;

    let tableY = addPdfSectionTitle(doc, "Subscription Line Items", contentY, accent,
      `Subscription period: ${gym.subscriptionStartedAt || "—"} → ${gym.subscriptionEndsAt || "—"} | Status: ${gym.status || "—"}`);
    autoTable(doc, {
      ...getPdfTableConfig(doc, accent, tableY,
        [["Plan / Service", "Billing Cycle", "Unit Price", "Period", "Amount"]],
        [[
          gym.subscriptionPlanName || gym.plan || "—",
          gym.subscriptionPlan?.billingCycle || "monthly",
          planPrice || "—",
          `${gym.subscriptionStartedAt || "—"} → ${gym.subscriptionEndsAt || "—"}`,
          `LKR ${Number(gym.revenue || 0).toLocaleString()}`
        ]]),
      foot: [["", "", "", "Total Due", `LKR ${Number(gym.revenue || 0).toLocaleString()}`]],
      footStyles: { fontStyle: "bold", fillColor: theme.panelStrong, textColor: theme.ink }
    });

    const hist = gym.subscriptionBillingHistory || [];
    if (hist.length > 0) {
      const finalY = (doc.lastAutoTable?.finalY || tableY) + 28;
      const histTableY = addPdfSectionTitle(doc, "Payment History", finalY, accent, "All recorded subscription payments for this gym.");
      autoTable(doc, {
        ...getPdfTableConfig(doc, accent, histTableY,
          [["Date", "Method", "Amount (LKR)", "Note"]],
          hist.map((e) => [
            e.date ? new Date(e.date).toLocaleDateString() : "—",
            (e.method || "manual").replace(/-/g, " "),
            Number(e.amount || 0).toLocaleString(),
            e.note || "—"
          ])),
        foot: [["", "Total Paid", hist.reduce((s, e) => s + Number(e.amount || 0), 0).toLocaleString(), ""]],
        footStyles: { fontStyle: "bold", fillColor: theme.panelStrong, textColor: theme.ink }
      });
    }

    finalizePdf(doc, `invoice-${(gym.name || "gym").toLowerCase().replace(/\s+/g, "-")}-${today}.pdf`);
  }

  // Gym Full History PDF
  function downloadGymHistoryPdf(gym) {
    const hist = gym.subscriptionBillingHistory || [];
    if (hist.length === 0) { alert("No payment history found for this gym."); return; }
    const total = hist.reduce((s, e) => s + Number(e.amount || 0), 0);
    saPdf(
      `${gym.name} — Full Payment History`,
      `Owner: ${gym.owner || "—"} | Location: ${gym.location || "—"} | Total Paid: LKR ${total.toLocaleString()}`,
      ["Date", "Method", "Amount (LKR)", "Note"],
      hist.map((e) => [
        e.date ? new Date(e.date).toLocaleDateString() : "—",
        (e.method || "manual").replace(/-/g, " "),
        Number(e.amount || 0).toLocaleString(),
        e.note || "—"
      ]),
      false,
      `history-${(gym.name || "gym").toLowerCase().replace(/\s+/g, "-")}-all`
    );
  }

  // Gym Monthly Statement PDF
  function downloadGymMonthlyPdf(gym, yearMonth) {
    const [year, month] = (yearMonth || "").split("-");
    const hist = (gym.subscriptionBillingHistory || []).filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d.getFullYear() === Number(year) && (d.getMonth() + 1) === Number(month);
    });
    if (hist.length === 0) { alert(`No payment records for ${yearMonth}.`); return; }
    const monthLabel = new Date(`${yearMonth}-01`).toLocaleString("default", { month: "long", year: "numeric" });
    const total = hist.reduce((s, e) => s + Number(e.amount || 0), 0);
    saPdf(
      `${gym.name} — ${monthLabel} Statement`,
      `Owner: ${gym.owner || "—"} | Records: ${hist.length} | Month Total: LKR ${total.toLocaleString()}`,
      ["Date", "Method", "Amount (LKR)", "Note"],
      hist.map((e) => [
        e.date ? new Date(e.date).toLocaleDateString() : "—",
        (e.method || "manual").replace(/-/g, " "),
        Number(e.amount || 0).toLocaleString(),
        e.note || "—"
      ]),
      false,
      `history-${(gym.name || "gym").toLowerCase().replace(/\s+/g, "-")}-${yearMonth}`
    );
  }

  // Billing email/SMS send functions
  const EMAIL_TEMPLATES = {
    "payment-reminder": (gym, plan) => ({
      subject: `Payment Reminder – ${gym.name} Subscription`,
      body: `Hi ${gym.owner || "there"},\n\nThis is a friendly reminder that the subscription payment for ${gym.name} is due.\n\nPlan: ${plan || gym.plan || "—"}\nExpiry: ${gym.subscriptionEndsAt || "—"}\nAmount: LKR ${Number(gym.revenue || 0).toLocaleString()}\n\nPlease ensure your payment is processed on time to avoid service interruption.\n\nThank you,\nGymora Platform Team`
    }),
    "renewal-reminder": (gym, plan) => ({
      subject: `Subscription Renewal – ${gym.name}`,
      body: `Hi ${gym.owner || "there"},\n\nYour subscription for ${gym.name} is coming up for renewal on ${gym.subscriptionEndsAt || "—"}.\n\nPlan: ${plan || gym.plan || "—"}\nAmount: LKR ${Number(gym.revenue || 0).toLocaleString()}\n\nTo continue uninterrupted access, please renew before the expiry date.\n\nThank you,\nGymora Platform Team`
    }),
    "overdue-alert": (gym, plan) => ({
      subject: `URGENT: Overdue Payment – ${gym.name}`,
      body: `Hi ${gym.owner || "there"},\n\nYour subscription for ${gym.name} has expired on ${gym.subscriptionEndsAt || "—"} and payment is overdue.\n\nPlan: ${plan || gym.plan || "—"}\nAmount Due: LKR ${Number(gym.revenue || 0).toLocaleString()}\n\nPlease make the payment immediately to restore full service access.\n\nGymora Platform Team`
    }),
    "invoice": (gym, plan) => ({
      subject: `Invoice – ${gym.name} Subscription`,
      body: `Hi ${gym.owner || "there"},\n\nPlease find your subscription invoice details below.\n\nGym: ${gym.name}\nOwner: ${gym.owner || "—"}\nLocation: ${gym.location || "—"}\nPlan: ${plan || gym.plan || "—"}\nSub Plan: ${gym.subscriptionPlanName || "—"}\nStarted: ${gym.subscriptionStartedAt || "—"}\nExpires: ${gym.subscriptionEndsAt || "—"}\nAmount: LKR ${Number(gym.revenue || 0).toLocaleString()}\n\nThank you for your business.\nGymora Platform Team`
    }),
    "custom": () => ({ subject: "", body: "" })
  };
  const SMS_TEMPLATES = {
    "payment-reminder": (gym) => ({ message: `Gymora: Payment reminder for ${gym.name}. Subscription expires ${gym.subscriptionEndsAt || "soon"}. Amount: LKR ${Number(gym.revenue || 0).toLocaleString()}. Please pay on time.` }),
    "renewal-reminder": (gym) => ({ message: `Gymora: ${gym.name} subscription renews on ${gym.subscriptionEndsAt || "—"}. LKR ${Number(gym.revenue || 0).toLocaleString()}. Renew now to avoid interruption.` }),
    "overdue-alert": (gym) => ({ message: `Gymora URGENT: ${gym.name} subscription OVERDUE since ${gym.subscriptionEndsAt || "—"}. Pay LKR ${Number(gym.revenue || 0).toLocaleString()} immediately to restore access.` }),
    "custom": () => ({ message: "" })
  };
  function openBillingEmail(gym) {
    const tmpl = EMAIL_TEMPLATES["payment-reminder"](gym, gym.subscriptionPlanName);
    setBillingEmailForm({ subject: tmpl.subject, body: tmpl.body, type: "payment-reminder" });
    setBillingEmailMsg("");
    setBillingEmailModal({ gym });
  }
  function openBillingSms(gym) {
    const tmpl = SMS_TEMPLATES["payment-reminder"](gym);
    setBillingSmsForm({ message: tmpl.message, type: "payment-reminder" });
    setBillingSmsMsg("");
    setBillingSmsModal({ gym });
  }
  async function sendBillingEmail() {
    if (!billingEmailModal) return;
    setBillingEmailSending(true); setBillingEmailMsg("");
    try {
      await apiFetch(`/api/admin/gyms/${billingEmailModal.gym.id || billingEmailModal.gym._id}/billing/email`, {
        method: "POST", body: JSON.stringify({ subject: billingEmailForm.subject, body: billingEmailForm.body, type: billingEmailForm.type })
      });
      setBillingEmailMsg("Email sent successfully.");
    } catch (e) { setBillingEmailMsg(`Error: ${e.message || "Failed to send"}`); }
    finally { setBillingEmailSending(false); }
  }
  async function sendBillingSms() {
    if (!billingSmsModal) return;
    setBillingSmsSending(true); setBillingSmsMsg("");
    try {
      await apiFetch(`/api/admin/gyms/${billingSmsModal.gym.id || billingSmsModal.gym._id}/billing/sms`, {
        method: "POST", body: JSON.stringify({ message: billingSmsForm.message, type: billingSmsForm.type })
      });
      setBillingSmsMsg("SMS logged successfully.");
    } catch (e) { setBillingSmsMsg(`Error: ${e.message || "Failed to send"}`); }
    finally { setBillingSmsSending(false); }
  }

  function openMarkPaid(gym) {
    const plan = subscriptionPlans.find((p) => p.name === gym.subscriptionPlanName);
    setMarkPaidForm({ ...emptyMarkPaidForm, amount: plan ? String(plan.price) : "" });
    setMarkPaidError("");
    setMarkPaidModal({ gym });
  }
  async function saveMarkPaid() {
    if (!markPaidModal) return;
    setMarkPaidError("");
    const amount = Number(markPaidForm.amount);
    if (!amount || amount <= 0) { setMarkPaidError("Enter a valid amount."); return; }
    if (markPaidForm.method === "bank-transfer" && !markPaidForm.bankDetail) { setMarkPaidError("Select a bank account."); return; }
    setMarkPaidSaving(true);
    try {
      const gymId = markPaidModal.gym.id || markPaidModal.gym._id;
      await recordGymPayment(gymId, markPaidForm);
      setMarkPaidModal(null);
      setMarkPaidForm(emptyMarkPaidForm);
    } catch (e) { setMarkPaidError(e.message || "Failed to record payment"); }
    finally { setMarkPaidSaving(false); }
  }

  function exportBillingHistoryPdf(list) {
    const rows = list || [];
    saPdf("Billing Payment History", "Subscription payments recorded across all gyms", ["Date", "Gym", "Owner", "Plan", "Method", "Amount (LKR)", "Note"], rows.map((e) => [e.date ? new Date(e.date).toLocaleDateString() : "—", e.gymName || "—", e.gymOwner || "—", e.gymPlan || "—", e.method || "manual", Number(e.amount || 0).toLocaleString(), e.note || ""]), true, "billing-payment-history");
  }
  function exportBillingHistoryExcel(list) {
    const rows = list || [];
    saXlsx(["Date", "Gym", "Owner", "Location", "Plan", "Method", "Amount (LKR)", "Note", "Gym Status"], rows.map((e) => [e.date ? new Date(e.date).toLocaleDateString() : "", e.gymName || "", e.gymOwner || "", e.gymLocation || "", e.gymPlan || "", e.method || "manual", Number(e.amount || 0), e.note || "", e.gymStatus || ""]), "Payment History", "billing-payment-history");
  }

  function exportBankTxPdf() {
    const list = bankTxList || [];
    saPdf("Bank Transactions", "Platform bank transaction ledger", ["Date", "Type", "Description", "Gym", "Amount (LKR)", "Method", "Reference", "Status"], list.map((t) => [t.transactionDate ? t.transactionDate.slice(0, 10) : "", t.type || "", t.description || "", t.gymName || "Platform", Number(t.amount || 0).toLocaleString(), t.paymentMethod || "", t.referenceNumber || "", t.status || ""]), true, "bank-transactions");
  }
  function exportBankTxExcel() {
    const list = bankTxList || [];
    saXlsx(["Date", "Type", "Description", "Gym", "Amount (LKR)", "Method", "Reference", "Status"], list.map((t) => [t.transactionDate ? t.transactionDate.slice(0, 10) : "", t.type || "", t.description || "", t.gymName || "Platform", t.amount || 0, t.paymentMethod || "", t.referenceNumber || "", t.status || ""]), "Bank Transactions", "bank-transactions");
  }

  function exportEmailLogsPdf() {
    const list = emailLogs || [];
    saPdf("Email Logs", "Platform email delivery log", ["Sent At", "To", "Subject", "Type", "Gym", "Status"], list.map((l) => [l.sentAt ? l.sentAt.slice(0, 16).replace("T", " ") : "", l.to || "", l.subject || "", l.type || "", l.gymName || "Platform", l.status || ""]), true, "email-logs");
  }
  function exportEmailLogsExcel() {
    const list = emailLogs || [];
    saXlsx(["Sent At", "To", "Recipient", "Subject", "Type", "Gym", "Status"], list.map((l) => [l.sentAt ? l.sentAt.slice(0, 16).replace("T", " ") : "", l.to || "", l.recipientName || "", l.subject || "", l.type || "", l.gymName || "Platform", l.status || ""]), "Email Logs", "email-logs");
  }

  function exportSmsLogsPdf() {
    const list = smsLogs || [];
    saPdf("SMS Logs", "Platform SMS delivery log", ["Sent At", "To", "Recipient", "Message", "Gym", "Status"], list.map((l) => [l.sentAt ? l.sentAt.slice(0, 16).replace("T", " ") : "", l.to || "", l.recipientName || "", (l.message || "").slice(0, 60), l.gymName || "Platform", l.status || ""]), true, "sms-logs");
  }
  function exportSmsLogsExcel() {
    const list = smsLogs || [];
    saXlsx(["Sent At", "To", "Recipient", "Message", "Type", "Gym", "Status"], list.map((l) => [l.sentAt ? l.sentAt.slice(0, 16).replace("T", " ") : "", l.to || "", l.recipientName || "", l.message || "", l.type || "", l.gymName || "Platform", l.status || ""]), "SMS Logs", "sms-logs");
  }

  function exportPlatformFinancePdf() {
    const expenses = platformExpenses || [];
    saPdf("Platform Finance", "Income and expense ledger", ["Date", "Type", "Title", "Category", "Amount (LKR)", "Status", "Vendor"], expenses.map((e) => [e.expenseDate || "", e.type || "", e.title || "", e.category || "", Number(e.amount || 0).toLocaleString(), e.status || "", e.vendor || e.contactName || ""]), true, "platform-finance");
  }
  function exportPlatformFinanceExcel() {
    const expenses = platformExpenses || [];
    saXlsx(["Date", "Type", "Title", "Category", "Amount (LKR)", "Status", "Vendor", "Reference"], expenses.map((e) => [e.expenseDate || "", e.type || "", e.title || "", e.category || "", e.amount || 0, e.status || "", e.vendor || e.contactName || "", e.referenceNumber || ""]), "Platform Finance", "platform-finance");
  }

  function exportHealthPdf() {
    saPdf("Gym Health Report", "Operational health metrics across all gyms", ["Gym", "Status", "Plan", "Members", "Unpaid", "Expired", "Balance (LKR)", "Months", "Sub Plan", "Sub Ends", "Last Activity"], sortedHealth.map((g) => [g.gymName || "", g.status || "", g.plan || "", `${g.activeMembers || 0}/${g.members || 0}`, String(g.unpaidMembers || 0), String(g.expiredMembers || 0), Number(g.outstandingBalance || 0).toLocaleString(), String(g.monthsOnPlatform || 0), g.subscriptionPlanName || "None", g.subscriptionEndsAt || "—", g.lastAttendanceAt ? g.lastAttendanceAt.slice(0, 10) : "No activity"]), true, "gym-health");
  }
  function exportHealthExcel() {
    saXlsx(["Gym", "Status", "Plan", "Members", "Active Members", "Unpaid", "Expired", "Balance (LKR)", "Months", "Sub Plan", "Sub Ends", "Last Activity"], sortedHealth.map((g) => [g.gymName || "", g.status || "", g.plan || "", g.members || 0, g.activeMembers || 0, g.unpaidMembers || 0, g.expiredMembers || 0, g.outstandingBalance || 0, g.monthsOnPlatform || 0, g.subscriptionPlanName || "", g.subscriptionEndsAt || "", g.lastAttendanceAt ? g.lastAttendanceAt.slice(0, 10) : ""]), "Gym Health", "gym-health");
  }

  function openProfileModal() {
    setProfileForm({
      name: profile?.name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      bio: profile?.bio || "",
      title: profile?.title || "",
      profileImageFile: null
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

  async function openGymDetails(gymId) {
    setGymDetailLoading(true);
    setGymDetailError("");
    try {
      const result = await getGymDetails(gymId);
      setGymDetail(result);
    } catch (error) {
      setGymDetailError(error.message || "Failed to load gym details");
    } finally {
      setGymDetailLoading(false);
    }
  }

  async function handleResetOwnerPassword(gymId) {
    const result = await resetOwnerPassword(gymId);
    if (result?.credentials) {
      setCredentialNotice(result.credentials);
    }
  }

  return (
    <DashboardShell
      isMobile={isMobile}
      title={systemSettings?.systemName || "Gymora"}
      logoUrl={systemSettings?.logoUrl ? resolveImageUrl(systemSettings.logoUrl) : "/gymora-logo.png"}
      navItems={[
        { id: "dashboard",         label: "Dashboard",          section: "Overview" },
        { id: "notifications",     label: "Notifications",      count: notificationState.unreadCount, hiddenInNav: true },
        { id: "gyms",              label: "Gyms",               section: "Gyms & Owners" },
        { id: "subscriptions",     label: "Subscriptions",      section: "Gyms & Owners" },
        { id: "owners",            label: "Owner Management",   section: "Gyms & Owners" },
        { id: "trials",            label: "Trial Management",   section: "Gyms & Owners" },
        { id: "health",            label: "Gym Health",         section: "Gyms & Owners" },
        { id: "billing",           label: "Billing",            section: "Billing & Finance" },
        { id: "platform-finance",  label: "Income & Expenses",  section: "Billing & Finance" },
        { id: "bank",              label: "Bank Details",       section: "Billing & Finance" },
        { id: "bank-transactions", label: "Bank Transactions",  section: "Billing & Finance" },
        { id: "email-logs",        label: "Email Logs",         section: "Communication" },
        { id: "sms-logs",          label: "SMS Logs",           section: "Communication" },
        { id: "audit",             label: "Platform Audit",     section: "Platform" },
        { id: "settings",          label: "Settings",           section: "Platform" }
      ]}
      page={page}
      setPage={setPage}
      sidebar={(
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar initials="AR" size={32} imageUrl={profile?.profileImageUrl || ""} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{superAdmin.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{superAdmin.email}</div>
          </div>
        </div>
      )}
      topRight={(
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Btn small variant="ghost" onClick={logout}>→ Log out</Btn>
        </div>
      )}
    >
      {page === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card
            style={{
              background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 52%, #f8fafc 100%)",
              border: "1px solid #dbeafe"
            }}
          >
            <div style={{ ...responsiveGrid(isMobile, "1.45fr 1fr"), gap: 18, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "inline-flex", alignItems: "center", alignSelf: "flex-start", minHeight: 26, padding: "0 12px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Platform Command Center
                </div>
                <div>
                  <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1.05 }}>
                    Watch growth, trials, and platform risk from one place.
                  </div>
                  <div style={{ marginTop: 10, fontSize: 14, color: "#475569", maxWidth: 620, lineHeight: 1.7 }}>
                    You currently have {gyms.length} gyms on the platform, {trialGyms.length} in trial, and {notifications.length} active alerts needing follow-up.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn onClick={() => setPage("gyms")}>Review Gyms</Btn>
                  <Btn variant="ghost" onClick={() => setPage("billing")}>Open Billing</Btn>
                </div>
              </div>
              <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))", "repeat(3,minmax(0,1fr))"), gap: 12 }}>
                <RingStat value={activeRate} max={100} color="#2563eb" label="Active gyms" />
                <RingStat value={trialRate} max={100} color="#f59e0b" label="Trial mix" />
                <RingStat value={notifications.length} max={Math.max(notifications.length, 1)} color="#dc2626" label="Alerts now" />
              </div>
            </div>
          </Card>
          <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
            <StatCard label="Total Gyms" value={gyms.length} accent="#2563eb" sub={`${activeGyms.length} active, ${trialGyms.length} trial`} />
            <StatCard label="Members" value={superAdmin.stats.totalMembers.toLocaleString()} accent="#16a34a" />
            <StatCard label="Coaches" value={superAdmin.stats.totalCoaches.toLocaleString()} accent="#dc2626" />
            <StatCard label="Platform Revenue" value={`LKR ${totalRevenue.toLocaleString()}`} accent="#7c3aed" sub={`Latest monthly total: LKR ${monthlyRevenue.toLocaleString()}`} />
          </div>
          {/* AI Platform Summary */}
          <Card style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ffffff 60%)", border: "1px solid #ddd6fe" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: aiSummary || aiSummaryLoading || aiSummaryError ? 20 : 0, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✦</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>AI Platform Summary</div>
                  <div style={{ fontSize: 12, color: "#7c3aed" }}>Powered by Gemini 2.5 Flash</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {aiSummaryTimestamp && (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Generated at {aiSummaryTimestamp}</span>
                )}
                <Btn
                  small
                  onClick={handleGenerateAiSummary}
                  disabled={aiSummaryLoading}
                  style={{ background: "#7c3aed", color: "#fff", border: "none", opacity: aiSummaryLoading ? 0.7 : 1 }}
                >
                  {aiSummaryLoading ? "Generating…" : aiSummary ? "Regenerate" : "Generate Summary"}
                </Btn>
              </div>
            </div>
            {aiSummaryError && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
                {aiSummaryError}
              </div>
            )}
            {aiSummaryLoading && !aiSummary && (
              <div style={{ padding: "28px 0", textAlign: "center", color: "#7c3aed", fontSize: 14 }}>
                Analyzing platform data with Gemini…
              </div>
            )}
            {!aiSummaryLoading && !aiSummary && !aiSummaryError && (
              <div style={{ padding: "18px 0 4px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                Click "Generate Summary" to get an AI-powered analysis of your platform's health, revenue, and risks.
              </div>
            )}
            {aiSummary && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Top two panels side by side */}
                <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 16 }}>
                  {aiSummary.platformHealth && (
                    <div style={{ padding: "16px 18px", borderRadius: 14, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏛</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>Platform Health</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "#1e3a5f", lineHeight: 1.7 }}>{aiSummary.platformHealth}</p>
                    </div>
                  )}
                  {aiSummary.revenuePerformance && (
                    <div style={{ padding: "16px 18px", borderRadius: 14, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💰</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>Revenue Performance</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "#14532d", lineHeight: 1.7 }}>{aiSummary.revenuePerformance}</p>
                    </div>
                  )}
                </div>
                {/* Bottom two panels side by side */}
                <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 16 }}>
                  {aiSummary.riskAreas && aiSummary.riskAreas.length > 0 && (
                    <div style={{ padding: "16px 18px", borderRadius: 14, background: "#fffbeb", border: "1px solid #fde68a" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚠️</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#b45309" }}>Risk Areas</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {aiSummary.riskAreas.map((risk, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ marginTop: 4, width: 6, height: 6, borderRadius: 999, background: "#f59e0b", flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>{risk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiSummary.recommendedActions && aiSummary.recommendedActions.length > 0 && (
                    <div style={{ padding: "16px 18px", borderRadius: 14, background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✅</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#6d28d9" }}>Recommended Actions</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {aiSummary.recommendedActions.map((action, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ marginTop: 3, fontSize: 12, color: "#7c3aed", fontWeight: 800, flexShrink: 0 }}>{i + 1}.</div>
                            <span style={{ fontSize: 13, color: "#3b1f6e", lineHeight: 1.5 }}>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          <div style={{ ...responsiveGrid(isMobile, "2fr 1fr"), gap: 20 }}>
            <Card>
              <SectionHeader title="Revenue Trend" action={<Badge label={`${revenueData.months.length || 0} periods`} />} />
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <BarChart data={revenueData.values} labels={revenueData.months} color="#2563eb" height={150} />
                <MiniChart data={revenueData.values} labels={revenueData.months} color="#60a5fa" height={70} />
              </div>
            </Card>
            <Card>
              <SectionHeader title="Plan Mix" action={<Badge label={`${planNames.length || 0} plans`} />} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {planMix.map(({ plan, count }) => {
                  return (
                    <div key={plan}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: "var(--text)" }}>{plan}</span>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>{count} gyms</span>
                      </div>
                      <ProgressBar value={(count / Math.max(gyms.length, 1)) * 100} color="#2563eb" height={6} />
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
          <div style={{ ...responsiveGrid(isMobile, "1.1fr 1fr"), gap: 20 }}>
            <Card>
              <SectionHeader title="Top Gyms By Revenue" action={<Btn small variant="ghost" onClick={() => setPage("gyms")}>Open All</Btn>} />
              {topRevenueGyms.length === 0 ? (
                <EmptyState title="No gyms yet" message="Create your first gym to start seeing platform performance rankings." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {topRevenueGyms.map((gym, index) => (
                    <div key={gym.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 12, background: index === 0 ? "#dbeafe" : "#eef2ff", color: index === 0 ? "#1d4ed8" : "#4338ca", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{gym.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{gym.owner} · {gym.location}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>LKR {Number(gym.revenue || 0).toLocaleString()}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{gym.members} members</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <SectionHeader title="Platform Health" />
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <InfoTile label="Active Gyms" value={`${activeGyms.length} / ${gyms.length || 0}`} tone="#2563eb" soft="#eff6ff" />
                <InfoTile label="Trial Gyms" value={`${trialGyms.length} gyms`} tone="#f59e0b" soft="#fffbeb" />
                <InfoTile label="Suspended Gyms" value={`${suspendedGyms.length} gyms`} tone="#dc2626" soft="#fef2f2" />
                <InfoTile label="Avg Members Per Gym" value={averageMembersPerGym} tone="#7c3aed" soft="#f5f3ff" />
              </div>
            </Card>
          </div>
          <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 20 }}>
            <Card>
              <SectionHeader title="Urgent Platform Alerts" action={<Btn small variant="ghost" onClick={() => setPage("notifications")}>See All</Btn>} />
              {recentAlerts.length === 0 ? (
                <EmptyState title="No alerts right now" message="Platform warnings, missed check-ins, and expiring plans will show up here first." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {recentAlerts.map((item) => (
                    <NotificationCard
                      key={item.id}
                      item={item}
                      isRead={notificationState.isRead(item.id)}
                      onMarkRead={() => notificationState.markRead(item.id)}
                    />
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <SectionHeader title="Status Mix" />
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Active", count: activeGyms.length, color: "#2563eb", badge: "active" },
                  { label: "Trial", count: trialGyms.length, color: "#f59e0b", badge: "trial" },
                  { label: "Suspended", count: suspendedGyms.length, color: "#dc2626", badge: "suspended" }
                ].map((item) => (
                  <div key={item.label} style={{ padding: "12px 14px", borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Badge label={item.label} type={item.badge} />
                        <span style={{ fontSize: 13, color: "#475569" }}>{item.count} gyms</span>
                      </div>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{gyms.length ? Math.round((item.count / gyms.length) * 100) : 0}%</span>
                    </div>
                    <ProgressBar value={gyms.length ? (item.count / gyms.length) * 100 : 0} color={item.color} height={7} />
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>
      )}

      {page === "notifications" && (
        notifications.length === 0 ? (
          <EmptyState title="No platform alerts yet" message="Cross-gym trial warnings, suspended gyms, unpaid membership concentration, inactivity, and audit risk alerts will appear here." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: isMobile ? "100%" : 860 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn small variant="ghost" onClick={notificationState.markAllRead}>Mark All Read</Btn>
            </div>
            {notifications.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                isRead={notificationState.isRead(item.id)}
                onMarkRead={() => notificationState.markRead(item.id)}
              />
            ))}
          </div>
        )
      )}

      {page === "gyms" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Toolbar
            search={search}
            setSearch={setSearch}
            searchPlaceholder="Search gyms, owners, locations, or emails"
            filters={[
              { label: "Plan", value: planFilter, onChange: setPlanFilter, options: [{ value: "all", label: "All Plans" }, { value: "Starter", label: "Starter" }, { value: "Pro", label: "Pro" }, { value: "Enterprise", label: "Enterprise" }] },
              { label: "Status", value: statusFilter, onChange: setStatusFilter, options: [{ value: "all", label: "All Statuses" }, { value: "active", label: "Active" }, { value: "trial", label: "Trial" }, { value: "suspended", label: "Suspended" }] }
            ]}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn small onClick={exportSuperAdminGymsPdf} style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>📄 Export PDF</Btn>
            <Btn small onClick={exportSuperAdminGymsExcel} style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac" }}>📊 Export Excel</Btn>
            <Btn small onClick={openCreateGym} disabled={loading}>&#x2B; Add Gym</Btn>
          </div>
          <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
            <StatCard label="Visible Gyms" value={filteredGyms.length} accent="#2563eb" />
            <StatCard label="Active Rate" value={`${activeRate}%`} accent="#16a34a" />
            <StatCard label="Trial Rate" value={`${trialRate}%`} accent="#f59e0b" />
            <StatCard label="Visible Revenue" value={`LKR ${filteredGyms.reduce((sum, gym) => sum + Number(gym.revenue || 0), 0).toLocaleString()}`} accent="#7c3aed" />
          </div>
          <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
            <InfoTile label="Starter Plan" value={String(filteredGyms.filter((gym) => gym.plan === "Starter").length)} tone="#2563eb" soft="#eff6ff" />
            <InfoTile label="Pro Plan" value={String(filteredGyms.filter((gym) => gym.plan === "Pro").length)} tone="#16a34a" soft="#f0fdf4" />
            <InfoTile label="Enterprise" value={String(filteredGyms.filter((gym) => gym.plan === "Enterprise").length)} tone="#7c3aed" soft="#f5f3ff" />
            <InfoTile label="Suspended" value={String(filteredGyms.filter((gym) => gym.status === "suspended").length)} tone="#dc2626" soft="#fef2f2" />
          </div>
          <Card style={{ padding: 0 }}>
            <Table
              headers={["Gym", "Owner", "Location", "Members", "Plan", "Sub Plan", "Revenue", "Status", "Actions"]}
              rows={pagedGyms.visibleItems.map((gym) => [
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {gym.logoUrl ? <img src={resolveImageUrl(gym.logoUrl)} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} /> : null}
                  <span style={{ fontWeight: 700 }}>{gym.name}</span>
                </div>,
                <div>
                  <div>{gym.owner}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{gym.ownerEmail}</div>
                </div>,
                gym.location,
                gym.members,
                <Badge label={gym.plan} />,
                gym.subscriptionPlanName ? <Badge label={gym.subscriptionPlanName} /> : <span style={{ fontSize: 12, color: "var(--muted)" }}>None</span>,
                `LKR ${gym.revenue.toLocaleString()}`,
                <Badge label={gym.status} type={gym.status} />,
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <IconBtn title="View details" onClick={() => openGymDetails(gym.id)}><IcoView /></IconBtn>
                  <IconBtn title="Edit gym" onClick={() => openEditGym(gym)}><IcoEdit /></IconBtn>
                  <IconBtn title="Assign subscription" onClick={() => openAssignSub(gym)}><IcoTag /></IconBtn>
                  <IconBtn title="Reset owner password" onClick={() => handleResetOwnerPassword(gym.id)}><IcoKey /></IconBtn>
                  <IconBtn title="Download backup" onClick={() => backupGymData(gym.id, gym.name)}><IcoBackup /></IconBtn>
                  {gym.status !== "suspended"
                    ? <IconBtn title="Suspend gym" danger onClick={() => suspendGym(gym.id)}><IcoBan /></IconBtn>
                    : <IconBtn title="Reactivate gym" onClick={() => reactivateGym(gym.id)}><IcoCheck /></IconBtn>}
                </div>
              ])}
            />
          </Card>
          <PaginationControls page={pagedGyms.page} totalPages={pagedGyms.totalPages} onPageChange={setGymPage} totalItems={filteredGyms.length} label="gyms" />
        </div>
      )}

      {page === "owners" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Toolbar search={ownerSearch} setSearch={setOwnerSearch} searchPlaceholder="Search owners, gyms, emails, or plans" action={<ExportButtonGroup><SpreadsheetExportButton compact onClick={exportOwnersExcel} label="Owners" /><ReportExportButton compact onClick={exportOwnersPdf} label="Owners" /></ExportButtonGroup>} />
          <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
            <StatCard label="Visible Owners" value={filteredOwners.length} accent="#2563eb" />
            <StatCard label="Active Accounts" value={activeOwnerAccounts} accent="#16a34a" />
            <StatCard label="Must Reset" value={ownersRequiringReset} accent="#f59e0b" />
            <StatCard label="Never Logged In" value={owners.filter((owner) => !owner.lastLoginAt).length} accent="#7c3aed" />
          </div>
          <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
            <InfoTile label="Starter Owners" value={String(filteredOwners.filter((owner) => owner.plan === "Starter").length)} tone="#2563eb" soft="#eff6ff" />
            <InfoTile label="Pro Owners" value={String(filteredOwners.filter((owner) => owner.plan === "Pro").length)} tone="#16a34a" soft="#f0fdf4" />
            <InfoTile label="Enterprise Owners" value={String(filteredOwners.filter((owner) => owner.plan === "Enterprise").length)} tone="#7c3aed" soft="#f5f3ff" />
            <InfoTile label="Suspended Gyms" value={String(filteredOwners.filter((owner) => owner.gymStatus === "suspended").length)} tone="#dc2626" soft="#fef2f2" />
          </div>
          <Card style={{ padding: 0 }}>
            <Table
              headers={["Owner", "Gym", "Plan", "Gym Status", "Last Login", "Account", "Actions"]}
              rows={pagedOwners.visibleItems.map((owner) => {
                const extraOwners = (gymOwnersMap[String(owner.gymId)] || []).filter((o) => String(o.id) !== String(owner.id));
                return [
                  <div>
                    <div style={{ fontWeight: 700 }}>{owner.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{owner.email}</div>
                    {extraOwners.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <button style={{ fontSize: 11, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setExpandedOwnerGym(expandedOwnerGym === String(owner.gymId) ? null : String(owner.gymId))}>
                          {expandedOwnerGym === String(owner.gymId) ? "▲ Hide" : `▼ +${extraOwners.length} more owner${extraOwners.length > 1 ? "s" : ""}`}
                        </button>
                        {expandedOwnerGym === String(owner.gymId) && extraOwners.map((o) => (
                          <div key={String(o.id)} style={{ marginTop: 4, padding: "4px 8px", background: "#f8fafc", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{o.name}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{o.email}</div>
                            </div>
                            <IconBtn title="Remove owner" danger small onClick={() => { if (window.confirm(`Remove ${o.name} as owner?`)) handleRemoveOwner(owner.gymId, o.id); }}><IcoTrash /></IconBtn>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>,
                  owner.gymName,
                  <Badge label={owner.plan} />,
                  <Badge label={owner.gymStatus} type={owner.gymStatus} />,
                  owner.lastLoginAt ? owner.lastLoginAt.slice(0, 10) : "Never",
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Badge label={owner.status} type={owner.status} />
                    {owner.mustChangePassword ? <Badge label="Must Reset" type="warning" /> : null}
                  </div>,
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <IconBtn title="View gym" onClick={() => openGymDetails(owner.gymId)}><IcoView /></IconBtn>
                    <IconBtn title="Reset password" onClick={() => handleResetOwnerPassword(owner.gymId)}><IcoKey /></IconBtn>
                    <IconBtn title="Add another owner" onClick={() => openAddOwner(owner)}><IcoPlus /></IconBtn>
                    <IconBtn title="Remove owner" danger onClick={() => { if (window.confirm(`Remove ${owner.name} as owner of ${owner.gymName}?`)) handleRemoveOwner(owner.gymId, owner.id); }}><IcoTrash /></IconBtn>
                  </div>
                ];
              })}
            />
          </Card>
          <PaginationControls page={pagedOwners.page} totalPages={pagedOwners.totalPages} onPageChange={setOwnerPage} totalItems={filteredOwners.length} label="owners" />
        </div>
      )}

      {page === "trials" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {trials.length === 0 ? (
            <EmptyState title="No trial gyms right now" message="Trial management will show gyms nearing conversion deadlines here." />
          ) : (
            <>
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Trial Gyms" value={trials.length} accent="#2563eb" />
                <StatCard label="Ending Soon" value={trialsEndingSoon} accent="#f59e0b" />
                <StatCard label="Urgent Trials" value={urgentTrials} accent="#dc2626" />
                <StatCard label="Conversion Rate" value={`${gyms.length > 0 ? Math.round((activeGyms.length / gyms.length) * 100) : 0}%`} accent="#7c3aed" />
              </div>
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <InfoTile label="Starter Trials" value={String(trials.filter((t) => t.plan === "Starter").length)} tone="#2563eb" soft="#eff6ff" />
                <InfoTile label="Pro Trials" value={String(trials.filter((t) => t.plan === "Pro").length)} tone="#16a34a" soft="#f0fdf4" />
                <InfoTile label="Enterprise Trials" value={String(trials.filter((t) => t.plan === "Enterprise").length)} tone="#7c3aed" soft="#f5f3ff" />
                <InfoTile label="Needs Follow-up" value={String(trials.filter((t) => Number(t.daysLeft || 0) <= 3).length)} tone="#dc2626" soft="#fef2f2" />
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Sort by:</span>
                {[["daysLeft", "Days Left"], ["plan", "Plan"], ["joinedAt", "Start Date"]].map(([val, label]) => (
                  <Btn key={val} small variant={trialSortBy === val ? "primary" : "ghost"} onClick={() => setTrialSortBy(val)}>{label}</Btn>
                ))}
                <ExportButtonGroup style={{ marginLeft: "auto" }}>
                  <SpreadsheetExportButton compact onClick={exportTrialsExcel} label="Trials" />
                  <ReportExportButton compact onClick={exportTrialsPdf} label="Trials" />
                </ExportButtonGroup>
              </div>
              <Card style={{ padding: 0 }}>
                <Table
                  headers={["Gym", "Owner", "Started", "Trial Ends", "Days Left", "Plan", "Sub Plan", "Actions"]}
                  rows={pagedTrials.visibleItems.map((trial) => [
                    trial.gymName,
                    <div>
                      <div>{trial.ownerName}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{trial.ownerEmail}</div>
                    </div>,
                    trial.joinedAt,
                    trial.trialEndsAt,
                    <Badge label={`${trial.daysLeft}d`} type={trial.daysLeft <= 2 ? "warning" : "info"} />,
                    <Badge label={trial.plan} />,
                    trial.subscriptionPlanName ? <Badge label={trial.subscriptionPlanName} /> : <span style={{ fontSize: 11, color: "var(--muted)" }}>None</span>,
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <IconBtn title="View gym" onClick={() => openGymDetails(trial.gymId)}><IcoView /></IconBtn>
                      <IconBtn title="Convert to paid" onClick={() => openAssignSub({ id: trial.gymId, name: trial.gymName, subscriptionPlanId: trial.subscriptionPlanId || "" })}><IcoCheck /></IconBtn>
                      <IconBtn title="Extend trial" onClick={() => { setExtendTrialModal(trial); setExtendTrialDate(trial.trialEndsAt || ""); }}><IcoCalendar /></IconBtn>
                      <IconBtn title="Send reminder email" onClick={() => sendTrialReminder(trial.gymId).then(() => alert("Reminder sent!")).catch((e) => alert(e.message))}><IcoMail /></IconBtn>
                      <IconBtn title="Suspend" danger onClick={() => suspendGym(trial.gymId)}><IcoBan /></IconBtn>
                    </div>
                  ])}
                />
              </Card>
              <PaginationControls page={pagedTrials.page} totalPages={pagedTrials.totalPages} onPageChange={setTrialPage} totalItems={trials.length} label="trial gyms" />
            </>
          )}
        </div>
      )}

      {page === "health" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {subscriptionEndingAlerts.length > 0 && (
            <Card style={{ borderLeft: "4px solid #f59e0b", background: "#fffbeb" }}>
              <SectionHeader title={`⚠ Subscriptions Ending Soon (${subscriptionEndingAlerts.length})`} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {subscriptionEndingAlerts.map((alert) => (
                  <div key={String(alert.gymId)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid #fde68a" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{alert.gymName}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{alert.ownerEmail} · {alert.subscriptionPlanName} · ends {alert.subscriptionEndsAt} ({alert.daysLeft}d left)</div>
                    </div>
                    <Btn small onClick={() => openAssignSub({ id: alert.gymId, name: alert.gymName, subscriptionPlanId: "" })}>Renew</Btn>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
            <StatCard label="Health Rows" value={gymHealth.length} accent="#2563eb" />
            <StatCard label="Unpaid Members" value={totalUnpaidMembers} accent="#f59e0b" />
            <StatCard label="Expired Members" value={totalExpiredMembers} accent="#dc2626" />
            <StatCard label="Outstanding" value={`LKR ${totalOutstandingBalance.toLocaleString()}`} accent="#7c3aed" />
          </div>
          <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
            <InfoTile label="No Activity" value={String(inactiveHealthGyms)} tone="#dc2626" soft="#fef2f2" />
            <InfoTile label="Active Gyms" value={String(gymHealth.filter((i) => i.status === "active").length)} tone="#16a34a" soft="#f0fdf4" />
            <InfoTile label="Trial Gyms" value={String(gymHealth.filter((i) => i.status === "trial").length)} tone="#f59e0b" soft="#fffbeb" />
            <InfoTile label="Suspended Gyms" value={String(gymHealth.filter((i) => i.status === "suspended").length)} tone="#2563eb" soft="#eff6ff" />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Sort:</span>
            {[["gymName", "Name"], ["members", "Members"], ["outstandingBalance", "Balance"], ["monthsOnPlatform", "Age"], ["subscriptionEndsAt", "Sub Ends"]].map(([val, label]) => (
              <Btn key={val} small variant={healthSortBy === val ? "primary" : "ghost"} onClick={() => { if (healthSortBy === val) setHealthSortDir((d) => d === "asc" ? "desc" : "asc"); else { setHealthSortBy(val); setHealthSortDir("asc"); } }}>{label} {healthSortBy === val ? (healthSortDir === "asc" ? "↑" : "↓") : ""}</Btn>
            ))}
            <ExportButtonGroup style={{ marginLeft: "auto" }}>
              <SpreadsheetExportButton compact onClick={exportHealthExcel} label="Health" />
              <ReportExportButton compact onClick={exportHealthPdf} label="Health" />
            </ExportButtonGroup>
          </div>
          <Card style={{ padding: 0 }}>
            <Table
              headers={["Gym", "Status", "Members", "Unpaid", "Expired", "Balance", "Months", "Sub Plan", "Sub Ends", "Last Pmt", "Last Activity", "Actions"]}
              rows={pagedHealth.visibleItems.map((item) => [
                item.gymName,
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge label={item.status} type={item.status} />
                  <Badge label={item.plan} />
                </div>,
                `${item.activeMembers}/${item.members}`,
                item.unpaidMembers,
                item.expiredMembers,
                `LKR ${Number(item.outstandingBalance || 0).toLocaleString()}`,
                item.monthsOnPlatform || 0,
                item.subscriptionPlanName ? <Badge label={item.subscriptionPlanName} /> : <span style={{ fontSize: 11, color: "var(--muted)" }}>None</span>,
                item.subscriptionEndsAt ? <span style={{ fontSize: 12, color: item.subscriptionEndsAt < new Date().toISOString().slice(0, 10) ? "#dc2626" : "#16a34a" }}>{item.subscriptionEndsAt}</span> : "—",
                item.paymentHistory && item.paymentHistory.length > 0 ? <span style={{ fontSize: 12 }}>{item.paymentHistory[item.paymentHistory.length - 1]?.date} · LKR {item.paymentHistory[item.paymentHistory.length - 1]?.amount}</span> : "—",
                item.lastAttendanceAt ? item.lastAttendanceAt.slice(0, 10) : "No activity",
                <IconBtn title="View gym details" onClick={() => openGymDetails(item.gymId)}><IcoView /></IconBtn>
              ])}
            />
          </Card>
          <PaginationControls page={pagedHealth.page} totalPages={pagedHealth.totalPages} onPageChange={setHealthPage} totalItems={gymHealth.length} label="health rows" />
        </div>
      )}

      {page === "audit" && (
        platformAudit.length === 0 ? (
          <EmptyState title="No platform audit records yet" message="Coach actions across all gyms will appear here for company-level oversight." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
              <StatCard label="Audit Events" value={platformAudit.length} accent="#2563eb" />
              <StatCard label="Delete Actions" value={auditDeleteActions} accent="#dc2626" />
              <StatCard label="Gyms Touched" value={auditGymsTouched} accent="#16a34a" />
              <StatCard label="Current Page Rows" value={pagedAudit.visibleItems.length} accent="#7c3aed" />
            </div>
            <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
              <InfoTile label="Create Actions" value={String(platformAudit.filter((item) => item.action === "create").length)} tone="#16a34a" soft="#f0fdf4" />
              <InfoTile label="Update Actions" value={String(platformAudit.filter((item) => item.action === "update").length)} tone="#2563eb" soft="#eff6ff" />
              <InfoTile label="Delete Actions" value={String(auditDeleteActions)} tone="#dc2626" soft="#fef2f2" />
              <InfoTile label="Message Actions" value={String(platformAudit.filter((item) => item.action === "message").length)} tone="#7c3aed" soft="#f5f3ff" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ExportButtonGroup>
                <SpreadsheetExportButton compact onClick={exportAuditExcel} label="Audit" />
                <ReportExportButton compact onClick={exportAuditPdf} label="Audit" />
              </ExportButtonGroup>
            </div>
            <Card style={{ padding: 0 }}>
              <Table
                headers={["Time", "Gym", "Actor", "Action", "Target", "Summary"]}
                rows={pagedAudit.visibleItems.map((item) => [
                  item.createdAt ? item.createdAt.replace("T", " ").slice(0, 16) : "",
                  item.gymName,
                  <div>
                    <div>{item.actorName}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.actorRole}</div>
                  </div>,
                  <Badge label={item.action} />,
                  `${item.targetType}: ${item.targetName || "Record"}`,
                  item.summary
                ])}
              />
            </Card>
            <PaginationControls page={pagedAudit.page} totalPages={pagedAudit.totalPages} onPageChange={setAuditPage} totalItems={platformAudit.length} label="audit events" />
          </div>
        )
      )}

      {page === "billing" && (() => {
        const today = new Date().toISOString().slice(0, 10);
        const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

        // Plan price lookup
        const planPriceMap = {};
        const planCycleMap = {};
        (subscriptionPlans || []).forEach((p) => { planPriceMap[p.name] = p.price; planCycleMap[p.name] = p.billingCycle; });
        function getPlanPrice(gym) {
          if (gym.subscriptionPlanName && planPriceMap[gym.subscriptionPlanName] != null)
            return `LKR ${Number(planPriceMap[gym.subscriptionPlanName]).toLocaleString()}`;
          return null;
        }

        // Derived gym lists
        const billingSorted = [...gyms].sort((a, b) => {
          if (billingSortBy === "revenue") return Number(b.revenue || 0) - Number(a.revenue || 0);
          if (billingSortBy === "plan") return (a.plan || "").localeCompare(b.plan || "");
          if (billingSortBy === "subscriptionEndsAt") return (a.subscriptionEndsAt || "").localeCompare(b.subscriptionEndsAt || "");
          if (billingSortBy === "name") return (a.name || "").localeCompare(b.name || "");
          return 0;
        });
        const overdueGyms = gyms.filter((g) => g.subscriptionEndsAt && g.subscriptionEndsAt < today && g.status === "active");
        const renewingIn7 = gyms.filter((g) => g.subscriptionEndsAt && g.subscriptionEndsAt >= today && g.subscriptionEndsAt <= in7Days);
        const renewingIn30 = gyms.filter((g) => g.subscriptionEndsAt && g.subscriptionEndsAt >= today && g.subscriptionEndsAt <= in30Days);
        const activeSubGyms = gyms.filter((g) => g.subscriptionEndsAt && g.subscriptionEndsAt >= today);

        // All billing history (enriched)
        const allBillingHistory = gyms.flatMap((g) =>
          (g.subscriptionBillingHistory || []).map((e) => ({ ...e, gymName: g.name, gymId: g.id, gymPlan: g.plan, gymOwner: g.owner, gymLocation: g.location, gymStatus: g.status }))
        ).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const totalCollected = allBillingHistory.reduce((s, e) => s + Number(e.amount || 0), 0);

        const filteredHistory = allBillingHistory
          .filter((e) => billingMethodFilter === "all" || (e.method || "manual").toLowerCase() === billingMethodFilter)
          .filter((e) => !billingHistorySearch || [e.gymName, e.gymOwner, e.gymLocation, e.gymPlan, e.method, e.note].some((v) => (v || "").toLowerCase().includes(billingHistorySearch.toLowerCase())));

        // Monthly revenue trend (last 12 months)
        const monthlyRevMap = {};
        allBillingHistory.forEach((e) => {
          if (!e.date) return;
          const ym = String(e.date).slice(0, 7);
          monthlyRevMap[ym] = (monthlyRevMap[ym] || 0) + Number(e.amount || 0);
        });
        const now = new Date();
        const last12 = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        });
        const monthlyRevData = last12.map((ym) => monthlyRevMap[ym] || 0);
        const monthlyRevLabels = last12.map((ym) => ym.slice(5));

        // Payment method breakdown
        const methodTotals = {};
        allBillingHistory.forEach((e) => {
          const m = (e.method || "manual").toLowerCase();
          if (!methodTotals[m]) methodTotals[m] = { count: 0, total: 0 };
          methodTotals[m].count++;
          methodTotals[m].total += Number(e.amount || 0);
        });
        const methodList = Object.entries(methodTotals).sort((a, b) => b[1].total - a[1].total);

        // Plan revenue breakdown
        const planRevMap = {};
        gyms.forEach((g) => {
          const p = g.plan || "Unknown";
          if (!planRevMap[p]) planRevMap[p] = { count: 0, revenue: 0 };
          planRevMap[p].count++;
          planRevMap[p].revenue += Number(g.revenue || 0);
        });
        const planRevList = Object.entries(planRevMap).sort((a, b) => b[1].revenue - a[1].revenue);

        // Per-gym extras: last payment, total paid, last method
        function gymLastPayment(gym) {
          const h = [...(gym.subscriptionBillingHistory || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
          return h[0] || null;
        }
        function gymTotalPaid(gym) {
          return (gym.subscriptionBillingHistory || []).reduce((s, e) => s + Number(e.amount || 0), 0);
        }

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* ── Email Modal ── */}
            {billingEmailModal && (
              <Modal title={`Send Email — ${billingEmailModal.gym.name}`} onClose={() => { setBillingEmailModal(null); setBillingEmailMsg(""); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <FormField label="Template">
                    <Select value={billingEmailForm.type} onChange={(e) => {
                      const t = e.target.value;
                      const tmpl = EMAIL_TEMPLATES[t]?.(billingEmailModal.gym, billingEmailModal.gym.subscriptionPlanName) || { subject: "", body: "" };
                      setBillingEmailForm({ subject: tmpl.subject, body: tmpl.body, type: t });
                    }}>
                      <option value="payment-reminder">Payment Reminder</option>
                      <option value="renewal-reminder">Renewal Reminder</option>
                      <option value="overdue-alert">Overdue Alert</option>
                      <option value="invoice">Invoice</option>
                      <option value="custom">Custom</option>
                    </Select>
                  </FormField>
                  <FormField label="To"><Input value={billingEmailModal.gym.ownerEmail || ""} disabled /></FormField>
                  <FormField label="Subject"><Input value={billingEmailForm.subject} onChange={(e) => setBillingEmailForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Email subject" /></FormField>
                  <FormField label="Body"><TextArea rows={8} value={billingEmailForm.body} onChange={(e) => setBillingEmailForm((p) => ({ ...p, body: e.target.value }))} placeholder="Email body..." /></FormField>
                  {billingEmailMsg && <div style={{ fontSize: 13, color: billingEmailMsg.startsWith("Error") ? "#dc2626" : "#16a34a" }}>{billingEmailMsg}</div>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn onClick={sendBillingEmail} disabled={billingEmailSending || !billingEmailForm.subject || !billingEmailForm.body}>{billingEmailSending ? "Sending…" : "Send Email"}</Btn>
                    <Btn variant="ghost" onClick={() => { setBillingEmailModal(null); setBillingEmailMsg(""); }}>Cancel</Btn>
                  </div>
                </div>
              </Modal>
            )}
            {/* ── SMS Modal ── */}
            {billingSmsModal && (
              <Modal title={`Send SMS — ${billingSmsModal.gym.name}`} onClose={() => { setBillingSmsModal(null); setBillingSmsMsg(""); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <FormField label="Template">
                    <Select value={billingSmsForm.type} onChange={(e) => {
                      const t = e.target.value;
                      const tmpl = SMS_TEMPLATES[t]?.(billingSmsModal.gym) || { message: "" };
                      setBillingSmsForm({ message: tmpl.message, type: t });
                    }}>
                      <option value="payment-reminder">Payment Reminder</option>
                      <option value="renewal-reminder">Renewal Reminder</option>
                      <option value="overdue-alert">Overdue Alert</option>
                      <option value="custom">Custom</option>
                    </Select>
                  </FormField>
                  <FormField label="To (Phone)"><Input value={billingSmsModal.gym.ownerPhone || billingSmsModal.gym.phone || "No phone on record"} disabled /></FormField>
                  <FormField label="Message">
                    <TextArea rows={4} value={billingSmsForm.message} onChange={(e) => setBillingSmsForm((p) => ({ ...p, message: e.target.value }))} placeholder="SMS message..." />
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{billingSmsForm.message.length} characters</div>
                  </FormField>
                  {billingSmsMsg && <div style={{ fontSize: 13, color: billingSmsMsg.startsWith("Error") ? "#dc2626" : "#16a34a" }}>{billingSmsMsg}</div>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn onClick={sendBillingSms} disabled={billingSmsSending || !billingSmsForm.message}>{billingSmsSending ? "Sending…" : "Log SMS"}</Btn>
                    <Btn variant="ghost" onClick={() => { setBillingSmsModal(null); setBillingSmsMsg(""); }}>Cancel</Btn>
                  </div>
                </div>
              </Modal>
            )}
            {/* ── Monthly History Modal ── */}
            {gymHistoryModal && (
              <Modal title={`Monthly Statement — ${gymHistoryModal.gym.name}`} onClose={() => setGymHistoryModal(null)}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <FormField label="Select Month">
                    <Input type="month" value={gymHistoryMonth} onChange={(e) => setGymHistoryMonth(e.target.value)} />
                  </FormField>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn onClick={() => { downloadGymMonthlyPdf(gymHistoryModal.gym, gymHistoryMonth); setGymHistoryModal(null); }}>↓ Download PDF</Btn>
                    <Btn variant="ghost" onClick={() => setGymHistoryModal(null)}>Cancel</Btn>
                  </div>
                </div>
              </Modal>
            )}
            {/* ── Mark as Paid Modal ── */}
            {markPaidModal && (
              <Modal title={`Record Payment — ${markPaidModal.gym.name}`} onClose={() => { setMarkPaidModal(null); setMarkPaidError(""); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                    <FormField label="Amount (LKR)">
                      <Input type="number" min="0" value={markPaidForm.amount} onChange={(e) => setMarkPaidForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                    </FormField>
                    <FormField label="Date">
                      <Input type="date" value={markPaidForm.date} onChange={(e) => setMarkPaidForm((p) => ({ ...p, date: e.target.value }))} />
                    </FormField>
                  </div>
                  <FormField label="Payment Method">
                    <Select value={markPaidForm.method} onChange={(e) => setMarkPaidForm((p) => ({ ...p, method: e.target.value, bankDetail: "" }))}>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank-transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other</option>
                    </Select>
                  </FormField>
                  {markPaidForm.method === "bank-transfer" && (
                    <FormField label="Bank Account">
                      <BankPicker banks={bankDetails} value={markPaidForm.bankDetail} onChange={(id) => setMarkPaidForm((p) => ({ ...p, bankDetail: id }))} />
                    </FormField>
                  )}
                  <FormField label="Reference (optional)">
                    <Input value={markPaidForm.reference} onChange={(e) => setMarkPaidForm((p) => ({ ...p, reference: e.target.value }))} placeholder="Transaction reference / receipt no." />
                  </FormField>
                  <FormField label="Notes (optional)">
                    <TextArea rows={3} value={markPaidForm.notes} onChange={(e) => setMarkPaidForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." />
                  </FormField>
                  {markPaidError && <div style={{ fontSize: 13, color: "#dc2626" }}>{markPaidError}</div>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn onClick={saveMarkPaid} disabled={markPaidSaving}>{markPaidSaving ? "Saving…" : "Record Payment"}</Btn>
                    <Btn variant="ghost" onClick={() => { setMarkPaidModal(null); setMarkPaidError(""); }}>Cancel</Btn>
                  </div>
                </div>
              </Modal>
            )}

            {/* ── KPI Row 1 ── */}
            <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)", "repeat(2,1fr)"), gap: 16 }}>
              <StatCard label="MRR" value={`LKR ${totalRevenue.toLocaleString()}`} accent="#16a34a" />
              <StatCard label="ARR" value={`LKR ${(totalRevenue * 12).toLocaleString()}`} accent="#2563eb" />
              <StatCard label="Avg per Gym" value={`LKR ${Math.round(totalRevenue / Math.max(gyms.length, 1)).toLocaleString()}`} accent="#7c3aed" />
              <StatCard label="Total Collected" value={`LKR ${totalCollected.toLocaleString()}`} accent="#0f766e" />
            </div>
            {/* ── KPI Row 2 ── */}
            <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)", "repeat(2,1fr)"), gap: 16 }}>
              <StatCard label="Active Subs" value={activeSubGyms.length} accent="#16a34a" />
              <StatCard label="Overdue" value={overdueGyms.length} accent="#dc2626" />
              <StatCard label="Renewing in 7d" value={renewingIn7.length} accent="#f59e0b" />
              <StatCard label="Renewing in 30d" value={renewingIn30.length} accent="#2563eb" />
            </div>

            {/* ── Monthly Revenue Trend + Plan Breakdown ── */}
            <div style={{ ...responsiveGrid(isMobile, "1.6fr 1fr"), gap: 20 }}>
              <Card>
                <SectionHeader title="Monthly Revenue Trend (12 Months)" />
                <div style={{ marginTop: 10 }}>
                  <BarChart data={monthlyRevData} labels={monthlyRevLabels} color="#2563eb" height={120} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
                  <span>Peak: LKR {Math.max(...monthlyRevData).toLocaleString()}</span>
                  <span>Avg/mo: LKR {Math.round(monthlyRevData.reduce((s, v) => s + v, 0) / 12).toLocaleString()}</span>
                </div>
              </Card>
              <Card>
                <SectionHeader title="Subscription Status" />
                <div style={{ display: "flex", justifyContent: "space-around", padding: "12px 0 8px" }}>
                  <RingStat value={activeSubGyms.length} max={Math.max(gyms.length, 1)} color="#16a34a" label="Active" size={80} />
                  <RingStat value={trialGyms.length} max={Math.max(gyms.length, 1)} color="#f59e0b" label="Trial" size={80} />
                  <RingStat value={overdueGyms.length} max={Math.max(gyms.length, 1)} color="#dc2626" label="Overdue" size={80} />
                </div>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {planRevList.map(([plan, { count, revenue }]) => (
                    <div key={plan}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12 }}>{plan} ({count})</span>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>LKR {revenue.toLocaleString()}</span>
                      </div>
                      <ProgressBar value={totalRevenue ? (revenue / totalRevenue) * 100 : 0} color="#2563eb" height={5} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ── Payment Method Breakdown + Billing Alerts ── */}
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
                          <MethodBadge method={method} />
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>{count} payments · LKR {total.toLocaleString()}</span>
                        </div>
                        <ProgressBar value={totalCollected ? (total / totalCollected) * 100 : 0} color={METHOD_COLORS[method] || "#64748b"} height={6} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card>
                <SectionHeader title="Revenue Distribution (Top Gyms)" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  {topRevenueGyms.slice(0, 6).map((gym) => (
                    <div key={gym.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{gym.name}</span>
                          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>{gym.owner}</span>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>LKR {Number(gym.revenue || 0).toLocaleString()}</span>
                      </div>
                      <ProgressBar value={totalRevenue ? (Number(gym.revenue || 0) / totalRevenue) * 100 : 0} color="#16a34a" height={6} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ── Billing Alerts summary ── */}
            <Card>
              <SectionHeader title="Billing Alerts & Platform Summary" />
              <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)", "repeat(2,1fr)"), gap: 12, marginTop: 8 }}>
                <InfoTile label="Trial Gyms" value={`${trialGyms.length} awaiting conversion`} tone="#f59e0b" soft="#fffbeb" />
                <InfoTile label="Overdue Renewals" value={`${overdueGyms.length} gyms need attention`} tone="#dc2626" soft="#fef2f2" />
                <InfoTile label="Renewing This Week" value={`${renewingIn7.length} gyms`} tone="#ea580c" soft="#fff7ed" />
                <InfoTile label="Renewing This Month" value={`${renewingIn30.length} gyms`} tone="#f59e0b" soft="#fffbeb" />
                <InfoTile label="Best Plan" value={[...planMix].sort((a, b) => b.count - a.count)[0]?.plan || "—"} tone="#2563eb" soft="#eff6ff" />
                <InfoTile label="Plan Mix" value={planMix.map((p) => `${p.plan}: ${p.count}`).join(" · ") || "—"} tone="#7c3aed" soft="#f5f3ff" />
              </div>
            </Card>

            {/* ── Overdue Gyms ── */}
            {overdueGyms.length > 0 && (
              <Card style={{ borderLeft: "4px solid #dc2626" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <SectionHeader title="Overdue Renewals" />
                  <Btn small onClick={() => overdueGyms.forEach((g) => openBillingEmail(g))}>✉ Email All Overdue</Btn>
                </div>
                <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 10 }}>{overdueGyms.length} gym(s) have passed their subscription end date.</div>
                <Table
                  headers={["Gym", "Owner", "Location", "Plan", "Expired On", "Revenue", "Status", "Actions"]}
                  rows={overdueGyms.map((gym) => [
                    <span style={{ fontWeight: 600 }}>{gym.name}</span>,
                    <div><div style={{ fontSize: 13 }}>{gym.owner || "—"}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{gym.ownerEmail || ""}</div></div>,
                    gym.location || "—",
                    <Badge label={gym.plan} />,
                    <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 12 }}>{gym.subscriptionEndsAt}</span>,
                    `LKR ${Number(gym.revenue || 0).toLocaleString()}`,
                    <Badge label={gym.status} type={gym.status} />,
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small variant="ghost" onClick={() => openBillingEmail(gym)}>✉ Email</Btn>
                      <Btn small variant="ghost" onClick={() => openBillingSms(gym)}>✆ SMS</Btn>
                    </div>
                  ])}
                />
              </Card>
            )}

            {/* ── Upcoming Renewals ── */}
            {renewingIn30.length > 0 && (
              <Card style={{ borderLeft: "4px solid #f59e0b" }}>
                <SectionHeader title="Upcoming Renewals (Next 30 Days)" />
                <Table
                  headers={["Gym", "Owner", "Location", "Plan", "Sub Plan & Price", "Renews On", "Revenue", "Actions"]}
                  rows={renewingIn30.sort((a, b) => (a.subscriptionEndsAt || "").localeCompare(b.subscriptionEndsAt || "")).map((gym) => [
                    gym.name,
                    <div><div style={{ fontSize: 13 }}>{gym.owner || "—"}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{gym.ownerEmail || ""}</div></div>,
                    gym.location || "—",
                    <Badge label={gym.plan} />,
                    gym.subscriptionPlanName
                      ? <div><Badge label={gym.subscriptionPlanName} />{getPlanPrice(gym) && <div style={{ fontSize: 11, color: "#16a34a", marginTop: 2 }}>{getPlanPrice(gym)}/mo</div>}</div>
                      : <span style={{ fontSize: 11, color: "var(--muted)" }}>None</span>,
                    <span style={{ color: gym.subscriptionEndsAt <= in7Days ? "#ea580c" : "#16a34a", fontWeight: 600, fontSize: 12 }}>{gym.subscriptionEndsAt}</span>,
                    `LKR ${Number(gym.revenue || 0).toLocaleString()}`,
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small variant="ghost" onClick={() => openBillingEmail(gym)}>✉ Email</Btn>
                      <Btn small variant="ghost" onClick={() => openBillingSms(gym)}>✆ SMS</Btn>
                    </div>
                  ])}
                />
              </Card>
            )}

            {/* ── Per-Gym Billing Breakdown ── */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <SectionHeader title="Per-Gym Billing Breakdown" />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>Sort:</span>
                  {[["revenue", "Revenue"], ["plan", "Plan"], ["subscriptionEndsAt", "Sub Ends"], ["name", "Name"]].map(([val, label]) => (
                    <Btn key={val} small variant={billingSortBy === val ? "primary" : "ghost"} onClick={() => setBillingSortBy(val)}>{label}</Btn>
                  ))}
                </div>
              </div>
              <Table
                headers={["Gym", "Owner", "Location", "Members", "Plan", "Sub Plan & Price", "Billing Cycle", "Sub Started", "Sub Ends", "Last Payment", "Last Method", "Total Paid", "Status", "Actions"]}
                rows={billingSorted.map((gym) => {
                  const planPrice = getPlanPrice(gym);
                  const planCycle = gym.subscriptionPlanName ? planCycleMap[gym.subscriptionPlanName] : null;
                  const lastPay = gymLastPayment(gym);
                  const totalPaid = gymTotalPaid(gym);
                  return [
                    <span style={{ fontWeight: 600 }}>{gym.name}</span>,
                    <div><div style={{ fontSize: 13 }}>{gym.owner || "—"}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{gym.ownerEmail || ""}</div></div>,
                    gym.location || "—",
                    gym.members ?? "—",
                    <Badge label={gym.plan} />,
                    gym.subscriptionPlanName
                      ? <div><Badge label={gym.subscriptionPlanName} />{planPrice && <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginTop: 2 }}>{planPrice}/mo</div>}</div>
                      : <span style={{ fontSize: 11, color: "var(--muted)" }}>None</span>,
                    planCycle ? <span style={{ fontSize: 11, textTransform: "capitalize" }}>{planCycle}</span> : "—",
                    gym.subscriptionStartedAt || "—",
                    gym.subscriptionEndsAt
                      ? <span style={{ color: gym.subscriptionEndsAt < today ? "#dc2626" : "#16a34a", fontWeight: 600, fontSize: 12 }}>{gym.subscriptionEndsAt}</span>
                      : "—",
                    lastPay ? <span style={{ fontSize: 12 }}>{lastPay.date ? new Date(lastPay.date).toLocaleDateString() : "—"}</span> : "—",
                    lastPay ? <MethodBadge method={lastPay.method} /> : "—",
                    totalPaid > 0 ? <span style={{ fontSize: 12, fontWeight: 600, color: "#0f766e" }}>LKR {totalPaid.toLocaleString()}</span> : "—",
                    <Badge label={gym.status} type={gym.status} />,
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <Btn small variant="primary" onClick={() => openMarkPaid(gym)}>✓ Mark as Paid</Btn>
                      <Btn small variant="ghost" onClick={() => downloadInvoicePdf(gym, planPriceMap)}>↓ Invoice</Btn>
                      <Btn small variant="ghost" onClick={() => downloadGymHistoryPdf(gym)}>↓ History</Btn>
                      <Btn small variant="ghost" onClick={() => setGymHistoryModal({ gym })}>↓ Monthly</Btn>
                      <Btn small variant="ghost" onClick={() => openBillingEmail(gym)}>✉</Btn>
                      <Btn small variant="ghost" onClick={() => openBillingSms(gym)}>✆</Btn>
                    </div>
                  ];
                })}
              />
            </Card>

            {/* ── Full Billing History ── */}
            <Card>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 10 : 10, marginBottom: 12 }}>
                <div>
                  <SectionHeader title="Full Payment History" />
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{filteredHistory.length} records · LKR {filteredHistory.reduce((s, e) => s + Number(e.amount || 0), 0).toLocaleString()} total</div>
                </div>
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 8, alignItems: isMobile ? "stretch" : "center" }}>
                  <Select value={billingMethodFilter} onChange={(e) => setBillingMethodFilter(e.target.value)} style={{ width: isMobile ? "100%" : 160 }}>
                    <option value="all">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank-transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="manual">Manual</option>
                    <option value="other">Other</option>
                  </Select>
                  <Input placeholder="Search gym, owner, method…" value={billingHistorySearch} onChange={(e) => setBillingHistorySearch(e.target.value)} style={{ width: isMobile ? "100%" : 240 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn small variant="ghost" onClick={() => exportBillingHistoryPdf(filteredHistory)} style={{ flex: 1 }}>↓ PDF</Btn>
                    <Btn small variant="ghost" onClick={() => exportBillingHistoryExcel(filteredHistory)} style={{ flex: 1 }}>↓ Excel</Btn>
                  </div>
                </div>
              </div>
              {filteredHistory.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--muted)", padding: "20px 0", textAlign: "center" }}>No payment records found.</div>
              ) : (
                <Table
                  headers={["Date", "Gym", "Owner", "Location", "Plan", "Method", "Amount", "Note", "Gym Status"]}
                  rows={filteredHistory.map((entry) => [
                    entry.date ? new Date(entry.date).toLocaleDateString() : "—",
                    entry.gymName || "—",
                    entry.gymOwner || "—",
                    entry.gymLocation || "—",
                    entry.gymPlan ? <Badge label={entry.gymPlan} /> : "—",
                    <MethodBadge method={entry.method} />,
                    <span style={{ fontWeight: 600, color: "#16a34a" }}>LKR {Number(entry.amount || 0).toLocaleString()}</span>,
                    entry.note || "—",
                    entry.gymStatus ? <Badge label={entry.gymStatus} type={entry.gymStatus} /> : "—"
                  ])}
                />
              )}
            </Card>
          </div>
        );
      })()}

      {page === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {profile && (
            <div style={{ ...responsiveGrid(isMobile, "1.2fr 1fr"), gap: 20 }}>
              <ProfileHeroCard
                title={profile.name}
                subtitle={profile.title || "Super Admin"}
                accent="#2563eb"
                soft="#eff6ff"
                initials="AR"
                imageUrl={profile?.profileImageUrl || ""}
                highlights={[
                  { label: "Managed Gyms", value: gyms.length, tone: "#2563eb", soft: "#eff6ff" },
                  { label: "Members", value: superAdmin.stats.totalMembers, tone: "#16a34a", soft: "#f0fdf4" },
                  { label: "Coaches", value: superAdmin.stats.totalCoaches, tone: "#7c3aed", soft: "#f5f3ff" },
                  { label: "Unread Alerts", value: notifications.length, tone: "#f59e0b", soft: "#fffbeb" }
                ]}
                action={(
                  <>
                    <Btn small variant="ghost" onClick={openProfileModal}>Edit Profile</Btn>
                  </>
                )}
              >
                <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 12 }}>
                  <InfoTile label="Email" value={profile.email} tone="#2563eb" soft="#eff6ff" />
                  <InfoTile label="Phone" value={profile.phone || "Not provided"} tone="#0f766e" soft="#ecfeff" />
                  <InfoTile label="Joined" value={profile.joined} tone="#7c3aed" soft="#f5f3ff" />
                  <InfoTile label="Role" value="Platform Administrator" tone="#ea580c" soft="#fff7ed" />
                </div>
                <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Bio</div>
                  <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7 }}>{profile.bio || "No bio added yet."}</div>
                </div>
              </ProfileHeroCard>
              <ProfileSection title="Platform Snapshot" description="A quick view of the platform footprint tied to this administrator account.">
                <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 14 }}>
                  <StatCard label="Gyms" value={gyms.length} accent="#2563eb" />
                  <StatCard label="Members" value={superAdmin.stats.totalMembers} accent="#16a34a" />
                  <StatCard label="Coaches" value={superAdmin.stats.totalCoaches} accent="#dc2626" />
                  <StatCard label="Alerts" value={notifications.length} accent="#f59e0b" />
                </div>
                <div style={{ marginTop: 16 }}>
                  <DetailStack
                    items={[
                      { label: "Role Scope", value: "Platform Administrator", helper: "Oversees gyms, owners, risk alerts, and platform-wide operations." },
                      { label: "Account Since", value: profile.joined, helper: "Used as the account creation date for this administrator profile." },
                      { label: "Contact Channel", value: profile.email, helper: "Primary email used for platform account communication." }
                    ]}
                  />
                </div>
              </ProfileSection>
            </div>
          )}
          {/* ── System Branding & Settings ── */}
          {sysSettingsForm && (
            <Card style={{ borderLeft: "4px solid #7c3aed" }}>
              <SectionHeader title="System Branding & Settings" />
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: "12px 20px" }}>
                <FormField label="System Name">
                  <Input value={sysSettingsForm.systemName} onChange={(e) => setSysSettingsForm((p) => ({ ...p, systemName: e.target.value }))} placeholder="Gymora" />
                </FormField>
                <FormField label="Tagline">
                  <Input value={sysSettingsForm.tagline} onChange={(e) => setSysSettingsForm((p) => ({ ...p, tagline: e.target.value }))} placeholder="Gym Management Platform" />
                </FormField>
                <FormField label="Support Email">
                  <Input type="email" value={sysSettingsForm.supportEmail} onChange={(e) => setSysSettingsForm((p) => ({ ...p, supportEmail: e.target.value }))} />
                </FormField>
                <FormField label="Trial Period (days)">
                  <Input type="number" value={sysSettingsForm.trialDays} onChange={(e) => setSysSettingsForm((p) => ({ ...p, trialDays: e.target.value }))} />
                </FormField>
              </div>
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: "12px 20px", marginTop: 4 }}>
                <FormField label="System Logo">
                  <input type="file" accept="image/*" style={{ fontSize: 13 }} onChange={(e) => { const f = e.target.files[0]; if (f) { setSysLogoPreview(URL.createObjectURL(f)); handleSysLogoUpload(f); } }} />
                  {(sysLogoPreview || systemSettings?.logoUrl) && (
                    <img src={sysLogoPreview || resolveImageUrl(systemSettings.logoUrl)} alt="Logo" style={{ marginTop: 8, height: 52, objectFit: "contain", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  )}
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Square image recommended · Min 128×128 px</div>
                </FormField>
                <FormField label="Login Page Hero Image">
                  <input type="file" accept="image/*" style={{ fontSize: 13 }} onChange={(e) => { const f = e.target.files[0]; if (f) { setSysHeroPreview(URL.createObjectURL(f)); handleSysHeroUpload(f); } }} />
                  {(sysHeroPreview || systemSettings?.heroImageUrl) && (
                    <img src={sysHeroPreview || resolveImageUrl(systemSettings.heroImageUrl)} alt="Hero" style={{ marginTop: 8, height: 52, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", width: "100%" }} />
                  )}
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Recommended: 1600 × 900 px (landscape) · JPG or PNG</div>
                </FormField>
              </div>
              {sysSettingsMsg && <div style={{ fontSize: 13, color: sysSettingsMsg.startsWith("Error") ? "#dc2626" : "#16a34a", marginTop: 8, marginBottom: 4 }}>{sysSettingsMsg}</div>}
              <div style={{ marginTop: 8 }}>
                <Btn onClick={saveSystemSettings} disabled={sysSettingsSaving}>{sysSettingsSaving ? "Saving..." : "Save Branding Settings"}</Btn>
              </div>
            </Card>
          )}

          {/* ── Legal Pages ── */}
          {sysSettingsForm && (
            <Card style={{ borderLeft: "4px solid #0891b2" }}>
              <SectionHeader title="Legal & Help Content" />
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>Content entered here is shown in the login page footer links. Leave blank to show static placeholder text.</div>
              <FormField label="Privacy Policy">
                <TextArea rows={4} value={sysSettingsForm.privacyPolicy} onChange={(e) => setSysSettingsForm((p) => ({ ...p, privacyPolicy: e.target.value }))} placeholder="Enter your privacy policy text here..." />
              </FormField>
              <FormField label="Terms of Use">
                <TextArea rows={4} value={sysSettingsForm.termsOfUse} onChange={(e) => setSysSettingsForm((p) => ({ ...p, termsOfUse: e.target.value }))} placeholder="Enter terms of use here..." />
              </FormField>
              <FormField label="Help Center">
                <TextArea rows={4} value={sysSettingsForm.helpCenter} onChange={(e) => setSysSettingsForm((p) => ({ ...p, helpCenter: e.target.value }))} placeholder="Enter help center content or URL here..." />
              </FormField>
              {sysSettingsMsg && <div style={{ fontSize: 13, color: sysSettingsMsg.startsWith("Error") ? "#dc2626" : "#16a34a", marginBottom: 4 }}>{sysSettingsMsg}</div>}
              <Btn onClick={saveSystemSettings} disabled={sysSettingsSaving}>{sysSettingsSaving ? "Saving..." : "Save Legal Content"}</Btn>
            </Card>
          )}

          <Card style={{ borderLeft: "4px solid #7c3aed" }}>
            <SectionHeader title="Email (SMTP) Configuration" />
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              SMTP credentials are configured via server environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM). Use the button below to verify the connection is working.
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <Btn onClick={testSmtp} disabled={smtpTesting}>{smtpTesting ? "Testing..." : "Test SMTP Connection"}</Btn>
              {smtpTestResult && (
                <div style={{ fontSize: 13, fontWeight: 600, color: smtpTestResult.ok ? "#16a34a" : "#dc2626", padding: "8px 14px", borderRadius: 10, background: smtpTestResult.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${smtpTestResult.ok ? "#bbf7d0" : "#fecaca"}` }}>
                  {smtpTestResult.ok ? "✓ " : "✗ "}{smtpTestResult.message}
                </div>
              )}
            </div>
          </Card>

          <div style={{ ...responsiveGrid(isMobile, "1.1fr 0.9fr"), gap: 20 }}>
            <Card style={{ maxWidth: isMobile ? "100%" : 560 }}>
              <SectionHeader title="Platform Defaults" />
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <InfoTile label="Default Trial Window" value={`${systemSettings?.trialDays || 14} days`} tone="#f59e0b" soft="#fffbeb" />
                <InfoTile label="Platform Status" value="Operational" tone="#16a34a" soft="#f0fdf4" />
                <InfoTile label="Support Inbox" value={systemSettings?.supportEmail || "support@fitnesshub.io"} tone="#2563eb" soft="#eff6ff" />
                <InfoTile label="Managed Gyms" value={gyms.length} tone="#7c3aed" soft="#f5f3ff" />
              </div>
            </Card>
            <Card>
              <SectionHeader title="System Info" />
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <InfoTile label="System Name" value={systemSettings?.systemName || "Gymora"} tone="#7c3aed" soft="#f5f3ff" />
                <InfoTile label="Tagline" value={systemSettings?.tagline || "Gym Management Platform"} tone="#0891b2" soft="#ecfeff" />
                <InfoTile label="Primary Color" value={systemSettings?.primaryColor || "#2563eb"} tone="#ea580c" soft="#fff7ed" />
              </div>
            </Card>
          </div>
          <Card style={{ borderLeft: "4px solid #2563eb" }}>
            <SectionHeader title="Backup & Recovery" />
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Backups include all members, coaches, attendance, expenses, sales, equipment, and audit logs. Full platform backups include all gyms and platform data.
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <Btn onClick={() => backupPlatformData().catch(() => {})}>⬇ Full Platform Backup</Btn>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>Per-Gym Backups</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {gyms.map((gym) => (
                  <div key={gym.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{gym.name}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{gym.status}</span>
                    </div>
                    <Btn small variant="ghost" onClick={() => backupGymData(gym.id, gym.name).catch(() => {})} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IcoBackup /> Backup</Btn>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Bank Transactions page ── */}
      {page === "bank-transactions" && (() => {
        const uniqueBanks = [...new Set(bankTxList.map((t) => t.bankName).filter(Boolean))].sort();
        const filtered = bankTxList.filter((t) =>
          (bankTxTypeFilter === "all" || t.type === bankTxTypeFilter) &&
          (bankTxStatusFilter === "all" || t.status === bankTxStatusFilter) &&
          (bankTxBankFilter === "all" || t.bankName === bankTxBankFilter) &&
          (!bankTxSearch || [t.description, t.gymName, t.referenceNumber, t.bankName, t.category, t.accountNumber].some((v) => (v || "").toLowerCase().includes(bankTxSearch.toLowerCase())))
        );
        const sorted = [...filtered].sort((a, b) => {
          if (bankTxSort === "date-desc") return new Date(b.transactionDate || 0) - new Date(a.transactionDate || 0);
          if (bankTxSort === "date-asc")  return new Date(a.transactionDate || 0) - new Date(b.transactionDate || 0);
          if (bankTxSort === "amount-desc") return Number(b.amount || 0) - Number(a.amount || 0);
          if (bankTxSort === "amount-asc")  return Number(a.amount || 0) - Number(b.amount || 0);
          if (bankTxSort === "type") return (a.type || "").localeCompare(b.type || "");
          return 0;
        });
        const totalCredit = filtered.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount || 0), 0);
        const totalDebit  = filtered.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount || 0), 0);
        const netBalance  = totalCredit - totalDebit;
        const paged = paginateItems(sorted, bankTxPage);

        const txStatusStyle = (s) => ({
          completed: { bg: "#dcfce7", color: "#166534" },
          pending:   { bg: "#fef9c3", color: "#92400e" },
          failed:    { bg: "#fee2e2", color: "#991b1b" },
          reversed:  { bg: "#f1f5f9", color: "#475569" }
        }[s] || { bg: "#f1f5f9", color: "#475569" });

        const bankAccountStats = bankDetails.map((d) => {
          const bankTx = bankTxList.filter((t) => t.bankName === d.bankName);
          const income = bankTx.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount || 0), 0);
          const expense = bankTx.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount || 0), 0);
          return { ...d, income, expense };
        });
        const sortedBankAccounts = [...bankAccountStats].sort((a, b) => {
          if (bankAccountSort === "balance-desc") return Number(b.currentBalance || 0) - Number(a.currentBalance || 0);
          if (bankAccountSort === "balance-asc")  return Number(a.currentBalance || 0) - Number(b.currentBalance || 0);
          if (bankAccountSort === "income-desc")  return b.income - a.income;
          return (a.bankName || "").localeCompare(b.bankName || "");
        });

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* ── Summary cards ── */}
            <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))"), gap: 14 }}>
              <StatCard label="Total Entries" value={filtered.length} accent="#2563eb" />
              <StatCard label="Total Credits" value={`LKR ${totalCredit.toLocaleString()}`} accent="#16a34a" />
              <StatCard label="Total Debits" value={`LKR ${totalDebit.toLocaleString()}`} accent="#dc2626" />
              <StatCard label="Net Balance" value={`${netBalance >= 0 ? "+" : ""}LKR ${Math.abs(netBalance).toLocaleString()}`} accent={netBalance >= 0 ? "#16a34a" : "#dc2626"} />
            </div>

            {/* ── Bank accounts overview ── */}
            <BankAccountsPanel
              accounts={sortedBankAccounts}
              sortValue={bankAccountSort}
              onSortChange={setBankAccountSort}
              onSelect={(d, isActive) => { setBankTxBankFilter(isActive ? "all" : d.bankName); setBankTxPage(1); }}
              activeBank={bankTxBankFilter}
              isMobile={isMobile}
            />

            {/* ── Filters + actions toolbar ── */}
            <Card style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Input
                  placeholder="Search description, gym, reference, bank…"
                  value={bankTxSearch}
                  onChange={(e) => { setBankTxSearch(e.target.value); setBankTxPage(1); }}
                  style={{ minWidth: 240, flex: 1 }}
                />
                <Select value={bankTxTypeFilter} onChange={(e) => { setBankTxTypeFilter(e.target.value); setBankTxPage(1); }} style={{ width: 130 }}>
                  <option value="all">All Types</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </Select>
                <Select value={bankTxStatusFilter} onChange={(e) => { setBankTxStatusFilter(e.target.value); setBankTxPage(1); }} style={{ width: 145 }}>
                  <option value="all">All Statuses</option>
                  {["completed", "pending", "failed", "reversed"].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </Select>
                <Select value={bankTxBankFilter} onChange={(e) => { setBankTxBankFilter(e.target.value); setBankTxPage(1); }} style={{ width: 190 }}>
                  <option value="all">All Banks</option>
                  {uniqueBanks.map((b) => <option key={b} value={b}>{b}</option>)}
                </Select>
                <Select value={bankTxSort} onChange={(e) => { setBankTxSort(e.target.value); setBankTxPage(1); }} style={{ width: 175 }}>
                  <option value="date-desc">Date: Newest First</option>
                  <option value="date-asc">Date: Oldest First</option>
                  <option value="amount-desc">Amount: High to Low</option>
                  <option value="amount-asc">Amount: Low to High</option>
                  <option value="type">Type (Credit first)</option>
                </Select>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <ExportButtonGroup>
                    <SpreadsheetExportButton compact onClick={exportBankTxExcel} label="Transactions" />
                    <ReportExportButton compact onClick={exportBankTxPdf} label="Transactions" />
                  </ExportButtonGroup>
                  <Btn small onClick={openCreateBankTx}><IcoPlus /> Record Transaction</Btn>
                </div>
              </div>
              {(bankTxSearch || bankTxTypeFilter !== "all" || bankTxStatusFilter !== "all" || bankTxBankFilter !== "all") && (
                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                  <button onClick={() => { setBankTxSearch(""); setBankTxTypeFilter("all"); setBankTxStatusFilter("all"); setBankTxBankFilter("all"); setBankTxPage(1); }} style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Clear filters</button>
                </div>
              )}
            </Card>

            {/* ── Transaction list ── */}
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {bankTxLoading ? (
                <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", padding: "40px 0" }}>Loading…</div>
              ) : paged.visibleItems.length === 0 ? (
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
                  {paged.visibleItems.map((t, idx) => {
                    const isCredit = t.type === "credit";
                    const st = txStatusStyle(t.status);
                    const dateStr = t.transactionDate ? t.transactionDate.slice(0, 10) : "—";
                    const [yyyy, mm, dd] = dateStr.split("-");
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    const prettyDate = yyyy && mm && dd ? `${dd} ${months[parseInt(mm,10)-1]} ${yyyy}` : dateStr;

                    if (isMobile) {
                      return (
                        <div key={t._id || t.id || idx} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", borderBottom: idx < paged.visibleItems.length - 1 ? "1px solid var(--border)" : "none", background: idx % 2 === 0 ? "var(--surface)" : "#fafbfc" }}>
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
                              {t.gymName ? <span style={{ fontSize: 11, color: "#64748b" }}>🏢 {t.gymName}</span> : <span style={{ fontSize: 11, color: "#94a3b8" }}>Platform</span>}
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
                            <IconBtn title="Edit" onClick={() => openEditBankTx(t)}><IcoEdit /></IconBtn>
                            <IconBtn title="Delete" danger onClick={() => deleteBankTxEntry(t._id || t.id)}><IcoTrash /></IconBtn>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={t._id || t.id || idx} style={{ display: "grid", gridTemplateColumns: "110px 1fr 160px 140px 130px 140px 80px", gap: 0, padding: "14px 20px", borderBottom: idx < paged.visibleItems.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center", background: idx % 2 === 0 ? "var(--surface)" : "#fafbfc", transition: "background 0.15s" }}>
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
                            {t.gymName ? <span style={{ fontSize: 11, color: "#64748b" }}>🏢 {t.gymName}</span> : <span style={{ fontSize: 11, color: "#94a3b8" }}>Platform</span>}
                            {t.notes && <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{t.notes}</span>}
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
                          <IconBtn title="Edit" onClick={() => openEditBankTx(t)}><IcoEdit /></IconBtn>
                          <IconBtn title="Delete" danger onClick={() => deleteBankTxEntry(t._id || t.id)}><IcoTrash /></IconBtn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "#f8fafc" }}>
                <PaginationControls page={paged.page} totalPages={paged.totalPages} onPageChange={setBankTxPage} totalItems={sorted.length} label="transactions" />
              </div>
            </Card>
          </div>
        );
      })()}

      {/* ── Email Logs page ── */}
      {page === "email-logs" && (() => {
        const filtered = emailLogs.filter((l) =>
          (emailLogStatusFilter === "all" || l.status === emailLogStatusFilter) &&
          (!emailLogSearch || [l.to, l.subject, l.gymName, l.recipientName, l.type].some((v) => (v || "").toLowerCase().includes(emailLogSearch.toLowerCase())))
        );
        const sentCount = filtered.filter((l) => l.status === "sent").length;
        const failedCount = filtered.filter((l) => l.status === "failed").length;
        const paged = paginateItems(filtered, emailLogPage);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))"), gap: 14 }}>
              <StatCard label="Total Emails" value={filtered.length} accent="#2563eb" />
              <StatCard label="Sent" value={sentCount} accent="#16a34a" />
              <StatCard label="Failed" value={failedCount} accent="#dc2626" />
            </div>
            <Card>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
                <Input placeholder="Search to, subject, gym…" value={emailLogSearch} onChange={(e) => { setEmailLogSearch(e.target.value); setEmailLogPage(1); }} style={{ maxWidth: 260 }} />
                <Select value={emailLogStatusFilter} onChange={(e) => { setEmailLogStatusFilter(e.target.value); setEmailLogPage(1); }} style={{ maxWidth: 160 }}>
                  <option value="all">All Statuses</option>
                  {["sent", "failed", "pending"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </Select>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <ExportButtonGroup>
                    <SpreadsheetExportButton compact onClick={exportEmailLogsExcel} label="Email Logs" />
                    <ReportExportButton compact onClick={exportEmailLogsPdf} label="Email Logs" />
                  </ExportButtonGroup>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Last 500</span>
                </div>
              </div>
              {emailLogsLoading ? <div style={{ fontSize: 14, color: "var(--muted)" }}>Loading…</div> : filtered.length === 0 ? (
                <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>No email logs found.</div>
              ) : (
                <Table
                  headers={["Sent At", "To", "Recipient", "Subject", "Type", "Gym", "Status", "Actions"]}
                  rows={paged.visibleItems.map((l) => [
                    l.sentAt ? l.sentAt.slice(0, 16).replace("T", " ") : (l.createdAt ? l.createdAt.slice(0, 16).replace("T", " ") : "—"),
                    <span style={{ fontSize: 12 }}>{l.to}</span>,
                    l.recipientName || "—",
                    <span style={{ fontSize: 12 }}>{l.subject}</span>,
                    <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, background: "#eff6ff", color: "#1d4ed8" }}>{l.type}</span>,
                    l.gymName || "Platform",
                    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: l.status === "sent" ? "#dcfce7" : l.status === "failed" ? "#fee2e2" : "#fef9c3", color: l.status === "sent" ? "#166534" : l.status === "failed" ? "#991b1b" : "#92400e" }}>{l.status}</span>,
                    <IconBtn title="Delete log" danger onClick={() => deleteEmailLogEntry(l._id || l.id)}><IcoTrash /></IconBtn>
                  ])}
                />
              )}
              <PaginationControls page={paged.page} totalPages={paged.totalPages} onPageChange={setEmailLogPage} totalItems={filtered.length} label="email logs" />
            </Card>
          </div>
        );
      })()}

      {/* ── SMS Logs page ── */}
      {page === "sms-logs" && (() => {
        const filtered = smsLogs.filter((l) =>
          (smsLogStatusFilter === "all" || l.status === smsLogStatusFilter) &&
          (!smsLogSearch || [l.to, l.message, l.gymName, l.recipientName, l.type].some((v) => (v || "").toLowerCase().includes(smsLogSearch.toLowerCase())))
        );
        const sentCount = filtered.filter((l) => l.status === "sent").length;
        const failedCount = filtered.filter((l) => l.status === "failed").length;
        const paged = paginateItems(filtered, smsLogPage);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))"), gap: 14 }}>
              <StatCard label="Total SMS" value={filtered.length} accent="#7c3aed" />
              <StatCard label="Sent" value={sentCount} accent="#16a34a" />
              <StatCard label="Failed" value={failedCount} accent="#dc2626" />
            </div>
            <Card>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
                <Input placeholder="Search number, message, gym…" value={smsLogSearch} onChange={(e) => { setSmsLogSearch(e.target.value); setSmsLogPage(1); }} style={{ maxWidth: 280 }} />
                <Select value={smsLogStatusFilter} onChange={(e) => { setSmsLogStatusFilter(e.target.value); setSmsLogPage(1); }} style={{ maxWidth: 160 }}>
                  <option value="all">All Statuses</option>
                  {["sent", "failed", "pending"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </Select>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <ExportButtonGroup>
                    <SpreadsheetExportButton compact onClick={exportSmsLogsExcel} label="SMS Logs" />
                    <ReportExportButton compact onClick={exportSmsLogsPdf} label="SMS Logs" />
                  </ExportButtonGroup>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Last 500</span>
                </div>
              </div>
              {smsLogsLoading ? <div style={{ fontSize: 14, color: "var(--muted)" }}>Loading…</div> : filtered.length === 0 ? (
                <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>No SMS logs found.</div>
              ) : (
                <Table
                  headers={["Sent At", "To", "Recipient", "Type", "Gym", "Message", "Status", "Actions"]}
                  rows={paged.visibleItems.map((l) => [
                    l.sentAt ? l.sentAt.slice(0, 16).replace("T", " ") : (l.createdAt ? l.createdAt.slice(0, 16).replace("T", " ") : "—"),
                    l.to,
                    l.recipientName || "—",
                    <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, background: "#f5f3ff", color: "#5b21b6" }}>{l.type}</span>,
                    l.gymName || "Platform",
                    <span style={{ fontSize: 12, color: "var(--muted)", maxWidth: 240, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.message}</span>,
                    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: l.status === "sent" ? "#dcfce7" : l.status === "failed" ? "#fee2e2" : "#fef9c3", color: l.status === "sent" ? "#166534" : l.status === "failed" ? "#991b1b" : "#92400e" }}>{l.status}</span>,
                    <IconBtn title="Delete log" danger onClick={() => deleteSmsLogEntry(l._id || l.id)}><IcoTrash /></IconBtn>
                  ])}
                />
              )}
              <PaginationControls page={paged.page} totalPages={paged.totalPages} onPageChange={setSmsLogPage} totalItems={filtered.length} label="SMS logs" />
            </Card>
          </div>
        );
      })()}

      {/* ── Bank Transaction modal ── */}
      {bankTxModal && (
        <Modal title={bankTxModal === "edit" ? "Edit Transaction" : "Record Bank Transaction"} onClose={() => setBankTxModal(null)} width={720}>
          <div style={{ fontFamily: "'Poppins', sans-serif" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Type *">
                <Select value={bankTxForm.type} onChange={(e) => setBankTxForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="credit">Credit (Money In)</option>
                  <option value="debit">Debit (Money Out)</option>
                </Select>
              </FormField>
              <FormField label="Amount (LKR) *">
                <Input type="number" value={bankTxForm.amount} onChange={(e) => setBankTxForm((p) => ({ ...p, amount: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Description *">
              <Input value={bankTxForm.description} onChange={(e) => setBankTxForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Subscription payment from gym" />
            </FormField>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Category">
                <Input value={bankTxForm.category} onChange={(e) => setBankTxForm((p) => ({ ...p, category: e.target.value }))} placeholder="e.g. Subscription, Salary" />
              </FormField>
              <FormField label="Transaction Date *">
                <Input type="date" value={bankTxForm.transactionDate} onChange={(e) => setBankTxForm((p) => ({ ...p, transactionDate: e.target.value }))} />
              </FormField>
              {bankTxForm.paymentMethod === "bank-transfer" ? (
                <FormField label="Bank Account">
                  <BankPicker
                    banks={bankDetails}
                    value={bankTxForm.bankDetail}
                    onChange={(id) => {
                      const b = bankDetails.find((x) => String(x._id || x.id) === String(id));
                      setBankTxForm((p) => ({ ...p, bankDetail: id, bankName: b ? b.bankName : "", accountNumber: b ? b.accountNumber : "" }));
                    }}
                  />
                </FormField>
              ) : (
                <>
                  <FormField label="Bank Name">
                    <Input value={bankTxForm.bankName} onChange={(e) => setBankTxForm((p) => ({ ...p, bankName: e.target.value }))} />
                  </FormField>
                  <FormField label="Account Number">
                    <Input value={bankTxForm.accountNumber} onChange={(e) => setBankTxForm((p) => ({ ...p, accountNumber: e.target.value }))} />
                  </FormField>
                </>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Payment Method">
                <Select value={bankTxForm.paymentMethod} onChange={(e) => setBankTxForm((p) => ({ ...p, paymentMethod: e.target.value, ...(e.target.value !== "bank-transfer" ? { bankDetail: "" } : {}) }))}>
                  {["cash", "bank-transfer", "cheque", "card", "other"].map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </FormField>
              <FormField label="Status">
                <Select value={bankTxForm.status} onChange={(e) => setBankTxForm((p) => ({ ...p, status: e.target.value }))}>
                  {["completed", "pending", "failed", "reversed"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </Select>
              </FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Related Gym">
                <Select value={bankTxForm.gymId} onChange={(e) => { const g = gyms.find((x) => String(x.id) === e.target.value); setBankTxForm((p) => ({ ...p, gymId: e.target.value, gymName: g ? g.name : "" })); }}>
                  <option value="">Platform (no gym)</option>
                  {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Reference Number">
                <Input value={bankTxForm.referenceNumber} onChange={(e) => setBankTxForm((p) => ({ ...p, referenceNumber: e.target.value }))} placeholder="Optional" />
              </FormField>
            </div>
            <FormField label="Notes">
              <TextArea rows={2} value={bankTxForm.notes} onChange={(e) => setBankTxForm((p) => ({ ...p, notes: e.target.value }))} />
            </FormField>
            {bankTxError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>{bankTxError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveBankTx}>&#x2713; {bankTxModal === "edit" ? "Save Changes" : "Record Transaction"}</Btn>
              <Btn variant="ghost" onClick={() => setBankTxModal(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {gymModal && (
        <Modal title={gymModal === "edit" ? "Edit Gym" : "Add New Gym"} onClose={() => setGymModal(null)} width={720}>
          <div style={{ fontFamily: "'Poppins', sans-serif" }}>
            <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: "12px 20px" }}>
              <FormField label="Gym Name *"><Input value={gymForm.name} onChange={(e) => setGymForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
              <FormField label="Owner Name *"><Input value={gymForm.owner} onChange={(e) => setGymForm((prev) => ({ ...prev, owner: e.target.value }))} /></FormField>
              <FormField label="Owner Email *"><Input type="email" value={gymForm.email} onChange={(e) => setGymForm((prev) => ({ ...prev, email: e.target.value }))} /></FormField>
              <FormField label="Location *"><Input value={gymForm.location} onChange={(e) => setGymForm((prev) => ({ ...prev, location: e.target.value }))} /></FormField>
              <FormField label="Phone"><Input value={gymForm.phone} onChange={(e) => setGymForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Optional" /></FormField>
              <FormField label="Business Reg. Number (BR)"><Input value={gymForm.brNumber} onChange={(e) => setGymForm((prev) => ({ ...prev, brNumber: e.target.value }))} placeholder="Optional" /></FormField>
            </div>
            <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: "12px 20px" }}>
              <FormField label="Website URL"><Input value={gymForm.website} onChange={(e) => setGymForm((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://..." /></FormField>
              <FormField label="Facebook Page URL"><Input value={gymForm.facebookUrl} onChange={(e) => setGymForm((prev) => ({ ...prev, facebookUrl: e.target.value }))} placeholder="https://facebook.com/..." /></FormField>
            </div>
            <FormField label="Google Maps URL"><Input value={gymForm.googleMapsUrl} onChange={(e) => setGymForm((prev) => ({ ...prev, googleMapsUrl: e.target.value }))} placeholder="https://maps.google.com/..." /></FormField>
            <FormField label="Description / About"><TextArea rows={2} value={gymForm.description} onChange={(e) => setGymForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Optional short description of this gym" /></FormField>
            <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: "12px 20px" }}>
              <FormField label="Platform Plan *">
                <Select value={gymForm.plan} onChange={(e) => setGymForm((prev) => ({ ...prev, plan: e.target.value }))}>
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </Select>
              </FormField>
              <FormField label="Subscription Plan">
                <Select value={gymForm.subscriptionPlanId} onChange={(e) => setGymForm((prev) => ({ ...prev, subscriptionPlanId: e.target.value }))}>
                  <option value="">None</option>
                  {subscriptionPlans.filter((p) => p.isActive !== false).map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>{p.name} — LKR {p.price}/{p.billingCycle}</option>
                  ))}
                </Select>
              </FormField>
            </div>
            {gymModal === "edit" && (
              <FormField label="Status">
                <Select value={gymForm.status} onChange={(e) => setGymForm((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                </Select>
              </FormField>
            )}
            <FormField label="Gym Logo">
              <input type="file" accept="image/*" style={{ fontSize: 13 }} onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setGymForm((prev) => ({ ...prev, logoFile: file }));
                  setLogoPreview(URL.createObjectURL(file));
                }
              }} />
              {logoPreview && <img src={logoPreview} alt="Logo preview" style={{ marginTop: 8, width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid #e2e8f0" }} />}
            </FormField>
            {gymFormError ? <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>{gymFormError}</div> : null}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveGym}>&#x2713; {gymModal === "edit" ? "Save Changes" : "Create Gym"}</Btn>
              <Btn variant="ghost" onClick={() => { setGymModal(null); setLogoPreview(""); }}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}
      {profileModal && (
            <Modal title="Edit Super Admin Profile" onClose={() => setProfileModal(false)} width={620}>
          <FormField label="Name"><Input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
          <FormField label="Email"><Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} /></FormField>
          <FormField label="Phone"><Input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} /></FormField>
          <FormField label="Title"><Input value={profileForm.title} onChange={(e) => setProfileForm((prev) => ({ ...prev, title: e.target.value }))} /></FormField>
          <FormField label="Bio"><TextArea rows={4} value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} /></FormField>
          <ProfilePhotoField
            file={profileForm.profileImageFile}
            onChange={(file) => setProfileForm((prev) => ({ ...prev, profileImageFile: file }))}
            currentImageUrl={profile?.profileImageUrl || ""}
            initials="AR"
          />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={saveProfile}>&#x2713; Save Profile</Btn>
            <Btn variant="ghost" onClick={() => setProfileModal(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
      {(gymDetail || gymDetailLoading || gymDetailError) && (
        <Modal title={gymDetail?.gym?.name ? `${gymDetail.gym.name} Details` : "Gym Details"} onClose={() => { setGymDetail(null); setGymDetailError(""); }} width={960}>
          {gymDetailLoading ? (
            <div style={{ fontSize: 14, color: "var(--muted)" }}>Loading gym details...</div>
          ) : gymDetailError ? (
            <div style={{ fontSize: 14, color: "#dc2626" }}>{gymDetailError}</div>
          ) : gymDetail ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: "'Poppins', sans-serif" }}>
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 12 }}>
                <StatCard label="Members" value={gymDetail.summary.totalMembers} accent="#16a34a" />
                <StatCard label="Coaches" value={gymDetail.summary.coaches} accent="#2563eb" />
                <StatCard label="Unpaid" value={gymDetail.summary.unpaidMembers} accent="#f59e0b" />
                <StatCard label="Expired" value={gymDetail.summary.expiredMembers} accent="#dc2626" />
              </div>
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 16 }}>
                <Card>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    {gymDetail.gym.logoUrl && <img src={resolveImageUrl(gymDetail.gym.logoUrl)} alt="Gym logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }} />}
                    <SectionHeader title="Gym Profile" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <InfoTile label="Owner" value={gymDetail.gym.owner} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Owner Email" value={gymDetail.gym.ownerEmail} tone="#0f766e" soft="#ecfeff" />
                    <InfoTile label="Location" value={gymDetail.gym.location} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Status" value={gymDetail.gym.status} tone="#ea580c" soft="#fff7ed" />
                    <InfoTile label="Platform Plan" value={gymDetail.gym.plan} tone="#16a34a" soft="#f0fdf4" />
                    {gymDetail.gym.phone && <InfoTile label="Phone" value={gymDetail.gym.phone} tone="#64748b" soft="#f8fafc" />}
                    {gymDetail.gym.brNumber && <InfoTile label="BR Number" value={gymDetail.gym.brNumber} tone="#64748b" soft="#f8fafc" />}
                    {gymDetail.gym.website && <InfoTile label="Website" value={gymDetail.gym.website} tone="#2563eb" soft="#eff6ff" />}
                    {gymDetail.gym.facebookUrl && <InfoTile label="Facebook" value={gymDetail.gym.facebookUrl} tone="#1877f2" soft="#eff6ff" />}
                    {gymDetail.gym.googleMapsUrl && <InfoTile label="Google Maps" value={gymDetail.gym.googleMapsUrl} tone="#34a853" soft="#f0fdf4" />}
                    {gymDetail.gym.description && <InfoTile label="About" value={gymDetail.gym.description} tone="#64748b" soft="#f8fafc" />}
                    <InfoTile label="Joined" value={gymDetail.gym.joinedAt} tone="#64748b" soft="#f8fafc" />
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Subscription" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                    <InfoTile label="Sub Plan" value={gymDetail.gym.subscriptionPlanName || "None assigned"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Started" value={gymDetail.gym.subscriptionStartedAt || "—"} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Ends" value={gymDetail.gym.subscriptionEndsAt || "—"} tone={gymDetail.gym.subscriptionEndsAt && gymDetail.gym.subscriptionEndsAt < new Date().toISOString().slice(0, 10) ? "#dc2626" : "#16a34a"} soft="#f0fdf4" />
                  </div>
                  {gymDetail.gym.subscriptionBillingHistory && gymDetail.gym.subscriptionBillingHistory.length > 0 && (
                    <>
                      <SectionHeader title="Payment History" />
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                        {gymDetail.gym.subscriptionBillingHistory.map((entry, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#f8fafc", borderRadius: 8, fontSize: 12 }}>
                            <span>{entry.date}</span>
                            <span style={{ fontWeight: 600 }}>LKR {Number(entry.amount || 0).toLocaleString()}</span>
                            <span style={{ color: "var(--muted)" }}>{entry.method}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ marginTop: 14 }}>
                    <SectionHeader title="All Owners" />
                    {(gymDetail.owners || [gymDetail.owner]).filter(Boolean).map((o) => (
                      <div key={String(o.id)} style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, marginTop: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{o.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{o.email} · {o.status} · Last login: {o.lastLoginAt ? o.lastLoginAt.slice(0, 10) : "Never"}</div>
                        {o.mustChangePassword && <Badge label="Must Reset Password" type="warning" />}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                    <IconBtn title="Reset password" onClick={() => handleResetOwnerPassword(gymDetail.gym.id)}><IcoKey /></IconBtn>
                    <Btn small onClick={() => { setGymDetail(null); openAssignSub({ id: gymDetail.gym.id, name: gymDetail.gym.name, subscriptionPlanId: gymDetail.gym.subscriptionPlanId || "" }); }}>Assign Subscription</Btn>
                  </div>
                </Card>
              </div>
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 16 }}>
                <Card>
                  <SectionHeader title="Recent Attendance" />
                  {gymDetail.recentAttendance.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>No attendance records yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {gymDetail.recentAttendance.slice(0, 6).map((item) => (
                        <div key={item.id} style={{ padding: "10px 12px", borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.memberName}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{item.coachName} · {item.sessionDate ? item.sessionDate.slice(0, 10) : ""}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                <Card>
                  <SectionHeader title="Recent Audit" />
                  {gymDetail.recentAudit.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>No recent coach audit records.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {gymDetail.recentAudit.slice(0, 6).map((item) => (
                        <div key={item.id} style={{ padding: "10px 12px", borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.actorName} · {item.action}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{item.summary}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
      {/* ── Subscriptions page ── */}
      {page === "subscriptions" && (() => {
        const activePlans = subscriptionPlans.filter((p) => p.isActive !== false);
        const inactivePlans = subscriptionPlans.filter((p) => p.isActive === false);
        const PLAN_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2", "#dc2626"];
        function planColor(plan, idx) { return plan.color || PLAN_COLORS[idx % PLAN_COLORS.length]; }
        function cycleLabel(c) { return c === "monthly" ? "/mo" : c === "quarterly" ? "/qtr" : "/yr"; }

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Subscription Plans</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Create plans and assign them to gym owners</div>
              </div>
              <Btn onClick={openCreateSubPlan}>+ New Plan</Btn>
            </div>

            {/* Stats */}
            <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
              <StatCard label="Total Plans" value={subscriptionPlans.length} accent="#2563eb" />
              <StatCard label="Active Plans" value={activePlans.length} accent="#16a34a" />
              <StatCard label="Gyms Subscribed" value={gyms.filter((g) => g.subscriptionPlanId).length} accent="#7c3aed" />
              <StatCard label="Unassigned Gyms" value={gyms.filter((g) => !g.subscriptionPlanId && g.status !== "suspended").length} accent="#f59e0b" />
            </div>

            {/* Plan cards */}
            {activePlans.length === 0 ? (
              <EmptyState title="No subscription plans yet" message="Create your first plan to start assigning subscriptions to gym owners." />
            ) : (
              <>
                <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)", "1fr"), gap: 20 }}>
                  {activePlans.map((plan, idx) => {
                    const color = planColor(plan, idx);
                    const assignedCount = gyms.filter((g) => String(g.subscriptionPlanId) === String(plan._id || plan.id)).length;
                    const features = Array.isArray(plan.features) ? plan.features : (plan.features ? String(plan.features).split(",").map(f => f.trim()).filter(Boolean) : []);
                    return (
                      <Card key={plan._id || plan.id} style={{ borderTop: `4px solid ${color}`, padding: 24, position: "relative" }}>
                        {/* top row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{plan.name}</div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <IconBtn title="Edit plan" onClick={() => openEditSubPlan(plan)}><IcoEdit /></IconBtn>
                            <IconBtn title="Delete plan" danger onClick={() => { if (window.confirm(`Delete "${plan.name}"?`)) removeSubscriptionPlan(plan._id || plan.id); }}><IcoTrash /></IconBtn>
                          </div>
                        </div>

                        {/* Price */}
                        <div style={{ fontSize: 36, fontWeight: 900, color: "#0f172a", lineHeight: 1, marginBottom: 2 }}>
                          LKR {Number(plan.price || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
                          {cycleLabel(plan.billingCycle)} · {plan.memberLimit ? `${plan.memberLimit} members` : "Unlimited members"} · {plan.coachLimit ? `${plan.coachLimit} coaches` : "Unlimited coaches"}
                        </div>

                        {/* Features */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
                          {features.map((f, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              {f}
                            </div>
                          ))}
                          {features.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>No features listed</div>}
                        </div>

                        {/* Footer */}
                        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            {assignedCount > 0
                              ? <span style={{ color: "#16a34a", fontWeight: 600 }}>{assignedCount} gym{assignedCount !== 1 ? "s" : ""} on this plan</span>
                              : <span>No gyms assigned yet</span>}
                          </div>
                          <Btn small onClick={() => openAssignSub({ id: "", name: "", subscriptionPlanId: plan._id || plan.id })}>Assign to Gym</Btn>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {/* Gyms without a plan */}
            {gyms.filter((g) => !g.subscriptionPlanId && g.status !== "suspended").length > 0 && (
              <Card>
                <SectionHeader title="Gyms Without a Plan" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {gyms.filter((g) => !g.subscriptionPlanId && g.status !== "suspended").map((gym) => (
                    <div key={gym.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 14px", background: "#fafafa", borderRadius: 10, border: "1px solid #e2e8f0", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{gym.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{gym.location} · {gym.ownerEmail}</div>
                      </div>
                      <Btn small onClick={() => openAssignSub(gym)}>Assign Plan</Btn>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Inactive plans collapsed section */}
            {inactivePlans.length > 0 && (
              <Card>
                <SectionHeader title={`Inactive Plans (${inactivePlans.length})`} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {inactivePlans.map((plan) => (
                    <div key={plan._id || plan.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", flexWrap: "wrap" }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#94a3b8" }}>{plan.name}</span>
                        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 10 }}>LKR {Number(plan.price || 0).toLocaleString()} · {plan.billingCycle}</span>
                      </div>
                      <IconBtn title="Edit" onClick={() => openEditSubPlan(plan)}><IcoEdit /></IconBtn>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        );
      })()}

      {/* ── Bank Details page ── */}
      {page === "bank" && (() => {
        const bankAccountStats = bankDetails.map((d) => {
          const bankTx = bankTxList.filter((t) => t.bankName === d.bankName);
          const income = bankTx.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount || 0), 0);
          const expense = bankTx.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount || 0), 0);
          return { ...d, income, expense };
        });
        const sortedBankAccounts = [...bankAccountStats].sort((a, b) => {
          if (bankAccountSort === "balance-desc") return Number(b.currentBalance || 0) - Number(a.currentBalance || 0);
          if (bankAccountSort === "balance-asc")  return Number(a.currentBalance || 0) - Number(b.currentBalance || 0);
          if (bankAccountSort === "income-desc")  return b.income - a.income;
          return (a.bankName || "").localeCompare(b.bankName || "");
        });
        return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <BankAccountsPanel
            accounts={sortedBankAccounts}
            sortValue={bankAccountSort}
            onSortChange={setBankAccountSort}
            onSelect={(d) => { setBankTxBankFilter(d.bankName); setBankTxPage(1); setPage("bank-transactions"); }}
            isMobile={isMobile}
          />
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              <SectionHeader title="Platform Bank Accounts" />
              <Btn small onClick={openCreateBank}>+ Add Account</Btn>
            </div>
            {bankDetails.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>No bank accounts added yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {bankDetails.map((d) => (
                  <div key={d._id || d.id} style={{ padding: "14px 16px", borderRadius: 14, background: "#f8fafc", border: `1px solid ${d.isDefault ? "#2563eb" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{d.bankName} {d.isDefault ? <Badge label="Default" /> : null}</div>
                      <div style={{ fontSize: 13, color: "#334155" }}>{d.accountName} · {d.accountNumber}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Branch: {d.branchCode || "—"} · SWIFT: {d.swiftCode || "—"} · {d.currency || "LKR"}</div>
                      {d.notes && <div style={{ fontSize: 12, color: "var(--muted)" }}>{d.notes}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <IconBtn title="Edit" onClick={() => openEditBank(d)}><IcoEdit /></IconBtn>
                      <IconBtn title="Delete" danger onClick={() => { if (window.confirm("Delete this bank account?")) removeBankDetail(d._id || d.id); }}><IcoTrash /></IconBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              <SectionHeader title="Cheque Payments" />
              <Btn small onClick={openCreateCheque}>+ Record Cheque</Btn>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <Input style={{ maxWidth: 200 }} placeholder="Search cheques..." value={chequeSearch} onChange={(e) => setChequeSearch(e.target.value)} />
              <Select value={chequeStatusFilter} onChange={(e) => { setChequeStatusFilter(e.target.value); setChequePage(1); }} style={{ maxWidth: 160 }}>
                <option value="all">All Statuses</option>
                {["pending", "deposited", "cleared", "bounced"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </Select>
            </div>
            {(() => {
              const filteredCheques = chequesList.filter((c) => {
                const q = chequeSearch.toLowerCase();
                const matchQ = !q || (c.chequeNumber || "").toLowerCase().includes(q) || (c.gymName || "").toLowerCase().includes(q) || (c.bankName || "").toLowerCase().includes(q);
                const matchStatus = chequeStatusFilter === "all" || c.status === chequeStatusFilter;
                return matchQ && matchStatus;
              });
              const pagedCheques = paginateItems(filteredCheques, chequePage);
              return (
                <>
                  <Table
                    headers={["Gym", "Cheque #", "Bank", "Amount", "Issued", "Status", "Actions"]}
                    rows={pagedCheques.visibleItems.map((c) => [
                      c.gymName || "Platform",
                      c.chequeNumber,
                      c.bankName,
                      `LKR ${Number(c.amount || 0).toLocaleString()}`,
                      c.issuedDate ? c.issuedDate.slice(0, 10) : "—",
                      <Badge label={c.status} type={c.status === "cleared" ? "active" : c.status === "bounced" ? "suspended" : "trial"} />,
                      <div style={{ display: "flex", gap: 6 }}>
                        <IconBtn title="Edit" onClick={() => openEditCheque(c)}><IcoEdit /></IconBtn>
                        <IconBtn title="Delete" danger onClick={() => { if (window.confirm("Delete this cheque?")) removeCheque(c._id || c.id); }}><IcoTrash /></IconBtn>
                      </div>
                    ])}
                  />
                  <PaginationControls page={pagedCheques.page} totalPages={pagedCheques.totalPages} onPageChange={setChequePage} totalItems={filteredCheques.length} label="cheques" />
                </>
              );
            })()}
          </Card>
        </div>
        );
      })()}

      {/* ── Income & Expenses page ── */}
      {page === "platform-finance" && (() => {
        const filtered = platformExpenses.filter((e) => {
          const q = pfExpenseSearch.toLowerCase();
          const matchQ = !q || (e.title || "").toLowerCase().includes(q) || (e.category || "").toLowerCase().includes(q) || (e.gymName || "").toLowerCase().includes(q);
          const matchType = pfExpenseTypeFilter === "all" || e.type === pfExpenseTypeFilter;
          return matchQ && matchType;
        });
        const totalIncome = filtered.filter((e) => e.type === "income" && e.status === "paid").reduce((s, e) => s + Number(e.amount || 0), 0);
        const totalExpense = filtered.filter((e) => e.type === "expense" && e.status === "paid").reduce((s, e) => s + Number(e.amount || 0), 0);
        const totalPending = filtered.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.amount || 0), 0);
        const pagedPfExpense = paginateItems(filtered, pfExpensePage);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Income & Expenses</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Platform-level financials including subscription income and operating costs</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <ExportButtonGroup>
                  <SpreadsheetExportButton compact onClick={exportPlatformFinanceExcel} label="Finance" />
                  <ReportExportButton compact onClick={exportPlatformFinancePdf} label="Finance" />
                </ExportButtonGroup>
                <Btn onClick={openCreatePfExpense}>+ Add Entry</Btn>
              </div>
            </div>
            <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
              <StatCard label="Total Income" value={`LKR ${totalIncome.toLocaleString()}`} accent="#16a34a" />
              <StatCard label="Total Expenses" value={`LKR ${totalExpense.toLocaleString()}`} accent="#dc2626" />
              <StatCard label="Net" value={`LKR ${(totalIncome - totalExpense).toLocaleString()}`} accent={totalIncome >= totalExpense ? "#16a34a" : "#dc2626"} />
              <StatCard label="Pending" value={`LKR ${totalPending.toLocaleString()}`} accent="#f59e0b" />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Input style={{ maxWidth: 220 }} placeholder="Search entries..." value={pfExpenseSearch} onChange={(e) => { setPfExpenseSearch(e.target.value); setPfExpensePage(1); }} />
              <Select value={pfExpenseTypeFilter} onChange={(e) => { setPfExpenseTypeFilter(e.target.value); setPfExpensePage(1); }} style={{ maxWidth: 160 }}>
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </Select>
            </div>
            {filtered.length === 0 ? (
              <EmptyState title="No entries yet" message="Record platform income (subscription fees) and expenses (hosting, support, etc.) here." />
            ) : (
              <Card style={{ padding: 0 }}>
                <Table
                  headers={["Type", "Title", "Category", "Gym", "Method", "Ref", "Date", "Amount", "Status", "Actions"]}
                  rows={pagedPfExpense.visibleItems.map((e) => [
                    <Badge label={e.type} type={e.type === "income" ? "active" : "suspended"} />,
                    e.title,
                    e.category,
                    e.gymName || "Platform",
                    e.paymentMethod || "cash",
                    e.referenceNumber || "—",
                    e.entryDate ? e.entryDate.slice(0, 10) : "—",
                    `LKR ${Number(e.amount || 0).toLocaleString()}`,
                    <Badge label={e.status} type={e.status === "paid" ? "active" : "trial"} />,
                    <div style={{ display: "flex", gap: 6 }}>
                      <IconBtn title="Edit" onClick={() => openEditPfExpense(e)}><IcoEdit /></IconBtn>
                      <IconBtn title="Delete" danger onClick={() => { if (window.confirm("Delete this entry?")) { removePlatformExpense(e._id || e.id); setPlatformExpenses((prev) => prev.filter((x) => String(x._id) !== String(e._id))); } }}><IcoTrash /></IconBtn>
                    </div>
                  ])}
                />
                <PaginationControls page={pagedPfExpense.page} totalPages={pagedPfExpense.totalPages} onPageChange={setPfExpensePage} totalItems={filtered.length} label="entries" />
              </Card>
            )}
          </div>
        );
      })()}

      {/* ── New Modals ── */}

      {/* Subscription plan modal */}
      {subPlanModal && (
        <Modal title={subPlanModal === "edit" ? "Edit Subscription Plan" : "New Subscription Plan"} onClose={() => setSubPlanModal(null)} width={700}>
          <div style={{ fontFamily: "'Poppins', sans-serif" }}>
            {/* Live preview */}
            <div style={{ borderRadius: 12, borderTop: `4px solid ${subPlanForm.color || "#2563eb"}`, background: "#f8fafc", padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: subPlanForm.color || "#2563eb", textTransform: "uppercase", marginBottom: 4 }}>{subPlanForm.name || "Plan Name"}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>LKR {Number(subPlanForm.price || 0).toLocaleString()}<span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>/{subPlanForm.billingCycle === "quarterly" ? "qtr" : subPlanForm.billingCycle === "annual" ? "yr" : "mo"}</span></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 12px" }}>
              <FormField label="Plan Name *"><Input value={subPlanForm.name} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Pro Monthly" /></FormField>
              <FormField label="Price (LKR) *"><Input type="number" value={subPlanForm.price} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="9900" /></FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 12px" }}>
              <FormField label="Billing Cycle *">
                <Select value={subPlanForm.billingCycle} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, billingCycle: e.target.value }))}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (3 months)</option>
                  <option value="annual">Annual (12 months)</option>
                </Select>
              </FormField>
              <FormField label="Card Colour">
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", paddingTop: 4 }}>
                  {["#2563eb","#16a34a","#f59e0b","#7c3aed","#0891b2","#dc2626","#0f172a","#ea580c"].map((c) => (
                    <button key={c} onClick={() => setSubPlanForm((prev) => ({ ...prev, color: c }))} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: subPlanForm.color === c ? "3px solid #0f172a" : "2px solid transparent", cursor: "pointer", padding: 0 }} />
                  ))}
                </div>
              </FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 12px" }}>
              <FormField label="Member Limit"><Input type="number" value={subPlanForm.memberLimit} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, memberLimit: e.target.value }))} placeholder="Leave blank = unlimited" /></FormField>
              <FormField label="Coach Limit"><Input type="number" value={subPlanForm.coachLimit} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, coachLimit: e.target.value }))} placeholder="Leave blank = unlimited" /></FormField>
            </div>
            <FormField label="Description">
              <TextArea rows={2} value={subPlanForm.description} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Brief plan description shown to gym owners…" />
            </FormField>
            <FormField label="Features (one per line or comma-separated)">
              <TextArea rows={4} value={subPlanForm.features} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, features: e.target.value }))} placeholder={"Attendance tracking\nPDF & Excel exports\nPriority support"} />
            </FormField>
            <div style={{ marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Plan Limits & Features</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 12px" }}>
              <FormField label="Trial Days"><Input type="number" min="0" value={subPlanForm.trialDays} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, trialDays: e.target.value }))} placeholder="0 = no trial" /></FormField>
              <FormField label="Storage (GB)"><Input type="number" min="0" value={subPlanForm.storageGb} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, storageGb: e.target.value }))} placeholder="0 = none" /></FormField>
              <FormField label="Max Locations"><Input type="number" min="1" value={subPlanForm.maxLocations} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, maxLocations: e.target.value }))} /></FormField>
              <FormField label="SMS Credits"><Input type="number" min="0" value={subPlanForm.smsCredits} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, smsCredits: e.target.value }))} /></FormField>
              <FormField label="Support Level">
                <Select value={subPlanForm.supportLevel} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, supportLevel: e.target.value }))}>
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="priority">Priority</option>
                  <option value="dedicated">Dedicated</option>
                </Select>
              </FormField>
              <FormField label="Status">
                <Select value={subPlanForm.isActive ? "active" : "inactive"} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </FormField>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 4, flexWrap: "wrap" }}>
              {[["customBranding", "Custom Branding"], ["analyticsAccess", "Advanced Analytics"], ["apiAccess", "API Access"]].map(([key, label]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!subPlanForm[key]} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, [key]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
            {subPlanError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>{subPlanError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveSubPlan}>&#x2713; {subPlanModal === "edit" ? "Save Changes" : "Create Plan"}</Btn>
              <Btn variant="ghost" onClick={() => setSubPlanModal(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign subscription modal */}
      {assignSubModal && (
        <Modal title="Assign Subscription Plan" onClose={() => setAssignSubModal(null)} width={620}>
          <div style={{ fontFamily: "'Poppins', sans-serif" }}>
            {/* Show gym selector only when opened from a plan card (no gym pre-selected) */}
            {!assignSubModal.id ? (
              <FormField label="Gym *">
                <Select value={assignSubForm.gymId} onChange={(e) => setAssignSubForm((prev) => ({ ...prev, gymId: e.target.value }))}>
                  <option value="">Select a gym...</option>
                  {gyms.filter((g) => g.status !== "suspended").map((g) => (
                    <option key={g.id} value={g.id}>{g.name} {g.subscriptionPlanName ? `(current: ${g.subscriptionPlanName})` : "(no plan)"}</option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <div style={{ background: "#f1f5f9", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Gym:</span> {assignSubModal.name || assignSubModal.gymName}
              </div>
            )}
            <FormField label="Subscription Plan *">
              <Select value={assignSubForm.subscriptionPlanId} onChange={(e) => setAssignSubForm((prev) => ({ ...prev, subscriptionPlanId: e.target.value }))}>
                <option value="">Select a plan...</option>
                {subscriptionPlans.filter((p) => p.isActive !== false).map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>{p.name} — LKR {Number(p.price).toLocaleString()} / {p.billingCycle}</option>
                ))}
              </Select>
            </FormField>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 12px" }}>
              <FormField label="Payment Method">
                <Select value={assignSubForm.method} onChange={(e) => setAssignSubForm((prev) => ({ ...prev, method: e.target.value }))}>
                  <option value="manual">Manual</option>
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </Select>
              </FormField>
              <FormField label="Note">
                <Input value={assignSubForm.note} onChange={(e) => setAssignSubForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Optional note" />
              </FormField>
            </div>
            {assignSubError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>{assignSubError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveAssignSub}>&#x2713; Assign & Activate</Btn>
              <Btn variant="ghost" onClick={() => setAssignSubModal(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Add owner modal */}
      {addOwnerModal && (
        <Modal title={`Add Owner — ${addOwnerModal.gymName || addOwnerModal.name}`} onClose={() => setAddOwnerModal(null)}>
          <div style={{ fontFamily: "'Poppins', sans-serif" }}>
            <FormField label="Owner Name *"><Input value={addOwnerForm.name} onChange={(e) => setAddOwnerForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
            <FormField label="Owner Email *"><Input type="email" value={addOwnerForm.email} onChange={(e) => setAddOwnerForm((prev) => ({ ...prev, email: e.target.value }))} /></FormField>
            {addOwnerError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>{addOwnerError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveAddOwner}>&#x2713; Add Owner</Btn>
              <Btn variant="ghost" onClick={() => setAddOwnerModal(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Extend trial modal */}
      {extendTrialModal && (
        <Modal title={`Extend Trial — ${extendTrialModal.gymName}`} onClose={() => setExtendTrialModal(null)}>
          <div style={{ fontFamily: "'Poppins', sans-serif" }}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Current trial ends: {extendTrialModal.trialEndsAt}</div>
            <FormField label="New Trial End Date *"><Input type="date" value={extendTrialDate} onChange={(e) => setExtendTrialDate(e.target.value)} /></FormField>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => extendGymTrial(extendTrialModal.gymId, { newEndDate: extendTrialDate }).then(() => setExtendTrialModal(null)).catch((e) => alert(e.message))}>Extend Trial</Btn>
              <Btn variant="ghost" onClick={() => setExtendTrialModal(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Bank detail modal */}
      {bankModal && (
        <Modal title={bankModal === "edit" ? "Edit Bank Account" : "Add Bank Account"} onClose={() => setBankModal(null)} width={680}>
          <div style={{ fontFamily: "'Poppins', sans-serif" }}>
            <FormField label="Bank Name *"><Input value={bankForm.bankName} onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))} /></FormField>
            <FormField label="Account Name *"><Input value={bankForm.accountName} onChange={(e) => setBankForm((prev) => ({ ...prev, accountName: e.target.value }))} /></FormField>
            <FormField label="Account Number *"><Input value={bankForm.accountNumber} onChange={(e) => setBankForm((prev) => ({ ...prev, accountNumber: e.target.value }))} /></FormField>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Branch Code"><Input value={bankForm.branchCode} onChange={(e) => setBankForm((prev) => ({ ...prev, branchCode: e.target.value }))} /></FormField>
              <FormField label="SWIFT Code"><Input value={bankForm.swiftCode} onChange={(e) => setBankForm((prev) => ({ ...prev, swiftCode: e.target.value }))} /></FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Account Type">
                <Select value={bankForm.accountType} onChange={(e) => setBankForm((prev) => ({ ...prev, accountType: e.target.value }))}>
                  <option value="">Select type</option>
                  <option value="savings">Savings</option>
                  <option value="current">Current</option>
                  <option value="fixed-deposit">Fixed Deposit</option>
                </Select>
              </FormField>
              <FormField label="Currency"><Input value={bankForm.currency} onChange={(e) => setBankForm((prev) => ({ ...prev, currency: e.target.value }))} placeholder="LKR / USD" /></FormField>
            </div>
            <FormField label="IBAN"><Input value={bankForm.iban} onChange={(e) => setBankForm((prev) => ({ ...prev, iban: e.target.value }))} placeholder="International Bank Account Number" /></FormField>
            <FormField label="Bank Address"><Input value={bankForm.bankAddress} onChange={(e) => setBankForm((prev) => ({ ...prev, bankAddress: e.target.value }))} /></FormField>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Bank Contact Phone"><Input value={bankForm.contactPhone} onChange={(e) => setBankForm((prev) => ({ ...prev, contactPhone: e.target.value }))} /></FormField>
              <FormField label="Set as Default">
                <Select value={bankForm.isDefault ? "yes" : "no"} onChange={(e) => setBankForm((prev) => ({ ...prev, isDefault: e.target.value === "yes" }))}>
                  <option value="no">No</option>
                  <option value="yes">Yes — Set as default</option>
                </Select>
              </FormField>
            </div>
            {bankFormError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>{bankFormError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveBank}>&#x2713; {bankModal === "edit" ? "Save Changes" : "Add Account"}</Btn>
              <Btn variant="ghost" onClick={() => setBankModal(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Cheque modal */}
      {chequeModal && (
        <Modal title={chequeModal === "edit" ? "Edit Cheque" : "Record Cheque Payment"} onClose={() => setChequeModal(null)} width={700}>
          <div style={{ fontFamily: "'Poppins', sans-serif" }}>
            <FormField label="Gym">
              <Select value={chequeForm.gymId} onChange={(e) => { const gym = gyms.find((g) => String(g.id) === e.target.value); setChequeForm((prev) => ({ ...prev, gymId: e.target.value, gymName: gym ? gym.name : "" })); }}>
                <option value="">Platform (no gym)</option>
                {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </FormField>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Cheque Number *"><Input value={chequeForm.chequeNumber} onChange={(e) => setChequeForm((prev) => ({ ...prev, chequeNumber: e.target.value }))} /></FormField>
              <FormField label="Bank Name *"><Input value={chequeForm.bankName} onChange={(e) => setChequeForm((prev) => ({ ...prev, bankName: e.target.value }))} /></FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Amount (LKR) *"><Input type="number" value={chequeForm.amount} onChange={(e) => setChequeForm((prev) => ({ ...prev, amount: e.target.value }))} /></FormField>
              <FormField label="Issued Date *"><Input type="date" value={chequeForm.issuedDate} onChange={(e) => setChequeForm((prev) => ({ ...prev, issuedDate: e.target.value }))} /></FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Deposited Date"><Input type="date" value={chequeForm.depositedDate} onChange={(e) => setChequeForm((prev) => ({ ...prev, depositedDate: e.target.value }))} /></FormField>
              <FormField label="Cleared Date"><Input type="date" value={chequeForm.clearedDate} onChange={(e) => setChequeForm((prev) => ({ ...prev, clearedDate: e.target.value }))} /></FormField>
            </div>
            <FormField label="Status">
              <Select value={chequeForm.status} onChange={(e) => setChequeForm((prev) => ({ ...prev, status: e.target.value }))}>
                {["pending", "deposited", "cleared", "bounced"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </Select>
            </FormField>
            <FormField label="Notes"><TextArea rows={2} value={chequeForm.notes} onChange={(e) => setChequeForm((prev) => ({ ...prev, notes: e.target.value }))} /></FormField>
            {chequeFormError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>{chequeFormError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveCheque}>&#x2713; {chequeModal === "edit" ? "Save Changes" : "Record Cheque"}</Btn>
              <Btn variant="ghost" onClick={() => setChequeModal(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Platform expense modal */}
      {pfExpenseModal && (
        <Modal title={pfExpenseModal === "edit" ? "Edit Entry" : "Add Income / Expense"} onClose={() => setPfExpenseModal(null)} width={740}>
          <div style={{ fontFamily: "'Poppins', sans-serif" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Type *">
                <Select value={pfExpenseForm.type} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, type: e.target.value, category: "" }))}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </Select>
              </FormField>
              <FormField label="Category *">
                <Select value={pfExpenseForm.category} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, category: e.target.value }))}>
                  <option value="">Select...</option>
                  {(pfExpenseForm.type === "income" ? PLATFORM_INCOME_CATEGORIES : PLATFORM_EXPENSE_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Title *"><Input value={pfExpenseForm.title} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, title: e.target.value }))} /></FormField>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Amount (LKR) *"><Input type="number" value={pfExpenseForm.amount} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, amount: e.target.value }))} /></FormField>
              <FormField label="Date *"><Input type="date" value={pfExpenseForm.entryDate} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, entryDate: e.target.value }))} /></FormField>
            </div>
            <FormField label="Related Gym">
              <SearchableSelect
                value={pfExpenseForm.gymId}
                onChange={(id) => { const gym = gyms.find((g) => String(g.id) === String(id)); setPfExpenseForm((prev) => ({ ...prev, gymId: id, gymName: gym ? gym.name : "" })); }}
                options={gyms.map((g) => ({ value: g.id, label: g.name }))}
                emptyOption={{ value: "", label: "Platform (no specific gym)" }}
                placeholder="Search gyms..."
                allowClear
              />
            </FormField>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Payment Method">
                <Select value={pfExpenseForm.paymentMethod} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, paymentMethod: e.target.value, ...(e.target.value !== "bank-transfer" ? { bankDetail: "" } : {}) }))}>
                  {["cash", "bank-transfer", "cheque", "card", "other"].map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </FormField>
              {pfExpenseForm.paymentMethod === "bank-transfer" ? (
                <FormField label="Bank Account">
                  <BankPicker banks={bankDetails} value={pfExpenseForm.bankDetail} onChange={(id) => setPfExpenseForm((prev) => ({ ...prev, bankDetail: id }))} />
                </FormField>
              ) : (
                <FormField label="Status">
                  <Select value={pfExpenseForm.status} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </Select>
                </FormField>
              )}
            </div>
            {pfExpenseForm.paymentMethod === "bank-transfer" && (
              <FormField label="Status">
                <Select value={pfExpenseForm.status} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </Select>
              </FormField>
            )}
            <FormField label="Reference Number"><Input value={pfExpenseForm.referenceNumber} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, referenceNumber: e.target.value }))} placeholder="Optional" /></FormField>
            <FormField label="Notes"><TextArea rows={2} value={pfExpenseForm.notes} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, notes: e.target.value }))} /></FormField>
            {pfExpenseError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>{pfExpenseError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={savePfExpense}>&#x2713; {pfExpenseModal === "edit" ? "Save Changes" : "Add Entry"}</Btn>
              <Btn variant="ghost" onClick={() => setPfExpenseModal(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      <TemporaryCredentialModal details={credentialNotice} onClose={() => setCredentialNotice(null)} />
    </DashboardShell>
  );
}
