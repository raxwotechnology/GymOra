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
  Modal,
  FormField,
  Input,
  TextArea,
  Select,
  Btn,
  ProgressBar,
  Table,
  SectionHeader,
  Card
} from "../../../../components/shared";
import { useIsMobile, responsiveGrid, useNotificationReadState } from "../../shared/lib/hooks";
import { matchesQuery, paginateItems, toMealEntries } from "../../shared/lib/formatters";
import { getPdfTheme, addPdfHeader, addPdfSectionTitle, getPdfTableConfig, finalizePdf } from "../../shared/lib/pdf";
import { IconBtn, IcoAssign, IcoTag, IcoCreditCard, IcoView, IcoClock, IcoCoffee, IcoCheck, IcoTrash } from "../../shared/components/icons";
import { DashboardStatus, NotificationBell, DashboardShell, NotificationCard } from "../../shared/components/DashboardShell";
import {
  EmptyState,
  ExportButtonGroup,
  MessageBubble,
  ReportExportButton,
  SpreadsheetExportButton,
  ProfileSection,
  DetailStack,
  PaginationControls,
  InfoTile,
  Toolbar,
  ProfilePhotoField
} from "../../shared/components/common";
import { ProfileHeroCard } from "../../shared/components/management";
import { MacroPill, WorkoutPlanCard, MealPlanCard } from "../../shared/components/plans";

export default function CoachDash() {
  const { user, logout } = useAuth();
  const { data, error, addWorkoutPlan, editWorkoutPlan, removeWorkoutPlan, addMealPlan, editMealPlan, removeMealPlan, assignWorkoutPlan, unassignWorkoutPlan, assignMealPlan, unassignMealPlan, editMyProfile, checkInMember, clockOutMember, memberStartBreak, memberEndBreak, sendMessage, markMessagesRead, addMember, removeMember, editMemberSubscription, coachClockIn, coachClockOut, coachStartBreak, coachEndBreak, getMyPayroll } = useDashboard();
  const isMobile = useIsMobile();
  const coachAccent = "#16a34a";
  const coachAccentSoft = "#f0fdf4";
  const coachAccentMid = "#22c55e";
  const [page, setPage] = React.useState("dashboard");
  const [attendanceTab, setAttendanceTab] = React.useState("member");
  const [memberSearch, setMemberSearch] = React.useState("");
  const [memberStatusFilter, setMemberStatusFilter] = React.useState("all");
  const [memberPaymentFilter, setMemberPaymentFilter] = React.useState("all");
  const [memberSort, setMemberSort] = React.useState("renewal-asc");
  const [memberPage, setMemberPage] = React.useState(1);
  const [workoutSearch, setWorkoutSearch] = React.useState("");
  const [workoutLevel, setWorkoutLevel] = React.useState("all");
  const [workoutPage, setWorkoutPage] = React.useState(1);
  const [mealSearch, setMealSearch] = React.useState("");
  const [mealPage, setMealPage] = React.useState(1);
  // Coach leave state
  const [myLeaves, setMyLeaves] = React.useState([]);
  const [myLeavesLoading, setMyLeavesLoading] = React.useState(false);
  const [myPayslips, setMyPayslips] = React.useState([]);
  const [myPayslipsLoading, setMyPayslipsLoading] = React.useState(false);
  const [leaveRequestModal, setLeaveRequestModal] = React.useState(false);
  const [leaveRequestForm, setLeaveRequestForm] = React.useState({ leaveType: "sick", startDate: "", endDate: "", reason: "" });
  const [leaveRequestError, setLeaveRequestError] = React.useState("");
  const [leaveRequestSaving, setLeaveRequestSaving] = React.useState(false);
  const [attendanceSearch, setAttendanceSearch] = React.useState("");
  const [attendancePage, setAttendancePage] = React.useState(1);
  const [attendanceMemberSearch, setAttendanceMemberSearch] = React.useState("");
  const [attendanceSelectedMember, setAttendanceSelectedMember] = React.useState(null);
  const [attendanceDate, setAttendanceDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [attendanceClockIn, setAttendanceClockIn] = React.useState(new Date().toTimeString().slice(0, 5));
  const [attendanceClockOut, setAttendanceClockOut] = React.useState("");
  const [messageSearch, setMessageSearch] = React.useState("");
  const [messageUnread, setMessageUnread] = React.useState("all");
  const [messagePage, setMessagePage] = React.useState(1);
  const [activeMessageMemberId, setActiveMessageMemberId] = React.useState("");
  const [messageDraft, setMessageDraft] = React.useState("");
  const [notificationPage, setNotificationPage] = React.useState(1);
  const [workoutModal, setWorkoutModal] = React.useState(null);
  const [assignWorkoutModal, setAssignWorkoutModal] = React.useState(false);
  const [mealModal, setMealModal] = React.useState(null);
  const [assignMealModal, setAssignMealModal] = React.useState(false);
  const [profileModal, setProfileModal] = React.useState(false);
  const [viewMemberModal, setViewMemberModal] = React.useState(null);
  const [subscriptionModal, setSubscriptionModal] = React.useState(null);
  const [createMemberModal, setCreateMemberModal] = React.useState(false);
  const emptyWorkoutForm = React.useMemo(() => ({ id: "", name: "", level: "Beginner", duration: "", days: "", category: "", description: "", exercises: [] }), []);
  const emptyMealForm = React.useMemo(() => ({ id: "", name: "", calories: "", protein: "", carbs: "", fat: "", goal: "", meals: [{ time: "", name: "", foods: "" }] }), []);
  const emptyAssignWorkoutForm = React.useMemo(() => ({ memberId: "", workoutPlanId: "" }), []);
  const emptyAssignMealForm = React.useMemo(() => ({ memberId: "", mealPlanId: "" }), []);
  const emptySubscriptionForm = React.useMemo(() => ({ plan: "", durationMonths: "1", amountPaid: "", paymentMethod: "", note: "" }), []);
  const emptyCreateMemberForm = React.useMemo(() => ({ name: "", email: "", plan: "", goal: "", durationMonths: "1", amountPaid: "", paymentMethod: "" }), []);
  const [workoutForm, setWorkoutForm] = React.useState(emptyWorkoutForm);
  const [mealForm, setMealForm] = React.useState(emptyMealForm);
  const [assignWorkoutForm, setAssignWorkoutForm] = React.useState(emptyAssignWorkoutForm);
  const [assignMealForm, setAssignMealForm] = React.useState(emptyAssignMealForm);
  const [subscriptionForm, setSubscriptionForm] = React.useState(emptySubscriptionForm);
  const [createMemberForm, setCreateMemberForm] = React.useState(emptyCreateMemberForm);
  const [profileForm, setProfileForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    title: "",
    profileImageFile: null,
    specialty: "",
    certifications: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    nationalId: "",
    employeeCode: "",
    hireDate: "",
    employmentType: "",
    salaryModel: "",
    shiftSchedule: "",
    specializations: "",
    yearsOfExperience: "",
    languages: "",
    certificationExpiryDates: "",
    availableHours: "",
    maxClientCapacity: "",
    performanceNotes: "",
    bankPaymentDetails: "",
    emergencyContact: "",
    documents: ""
  });
  const notificationState = useNotificationReadState(`coach-${user?.id}`, data ? (data.notifications || []) : null, data?.readNotificationIds);

  React.useEffect(() => setMemberPage(1), [memberSearch, memberStatusFilter, memberPaymentFilter, memberSort]);
  React.useEffect(() => setWorkoutPage(1), [workoutSearch, workoutLevel]);
  React.useEffect(() => setMealPage(1), [mealSearch]);
  React.useEffect(() => setAttendancePage(1), [attendanceSearch]);
  React.useEffect(() => setMessagePage(1), [messageSearch, messageUnread]);
  React.useEffect(() => setNotificationPage(1), []);

  const coachMembersSeed = data?.members || [];
  const coachMessagesSeed = data?.messages || [];
  const coachMessageConversationsSeed = coachMembersSeed
    .map((member) => {
      const threadMessages = coachMessagesSeed.filter((message) => message.memberName === member.name);
      return {
        member,
        messages: threadMessages
      };
    })
    .filter((item) => item.messages.length > 0 || !messageSearch);
  const coachActiveConversationSeed =
    coachMessageConversationsSeed.find((item) => String(item.member.id) === String(activeMessageMemberId)) ||
    coachMessageConversationsSeed[0] ||
    null;
  const unreadConversationIds = (coachActiveConversationSeed?.messages || [])
    .filter((message) => message.unread && message.recipientRole === "coach")
    .map((message) => message.id);
  const unreadConversationKey = unreadConversationIds.join(",");

  React.useEffect(() => {
    if (!activeMessageMemberId && coachMessageConversationsSeed[0]?.member?.id) {
      setActiveMessageMemberId(String(coachMessageConversationsSeed[0].member.id));
    }
  }, [activeMessageMemberId, coachMessageConversationsSeed]);

  React.useEffect(() => {
    if (page !== "messages" || !unreadConversationKey) {
      return;
    }

    markMessagesRead(unreadConversationIds).catch(() => {});
  }, [page, unreadConversationKey, markMessagesRead]);

  React.useEffect(() => {
    if (page === "leaves" && myLeaves.length === 0 && !myLeavesLoading) {
      setMyLeavesLoading(true);
      apiFetch("/api/owner/coach-leaves/my").then(d => setMyLeaves(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setMyLeavesLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  React.useEffect(() => {
    if (page === "salary" && myPayslips.length === 0 && !myPayslipsLoading) {
      setMyPayslipsLoading(true);
      getMyPayroll().then(d => setMyPayslips(Array.isArray(d?.records) ? d.records : [])).catch(() => {}).finally(() => setMyPayslipsLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (!data) {
    return <DashboardStatus error={error} />;
  }

  const {
    coach = null,
    members = [],
    workoutPlans = [],
    mealPlans = [],
    messages = [],
    attendance = [],
    profile = null,
    notifications = [],
    coachAttendance = [],
    todayCoachAttendance = null,
    salaryAdvances = [],
    membershipPlans = []
  } = data || {};
  const hasCoachData = Boolean(coach);
  const unread = messages.filter((message) => message.unread).length;
  const avgProgress = members.length ? Math.round(members.reduce((sum, member) => sum + member.progress, 0) / members.length) : 0;
  const checkedInCount = attendance.filter((item) => item.status === "checked-in").length;
  const checkedOutCount = attendance.filter((item) => item.status === "checked-out").length;
  const paidMembersCount = members.filter((member) => member.paymentStatus === "paid").length;
  const membersNeedingAttention = members.filter((member) => member.progress < 45 || member.paymentStatus !== "paid").length;
  const topMembers = [...members].sort((a, b) => (b.progress || 0) - (a.progress || 0)).slice(0, 4);
  const coachPersonalDetails = [
    { label: "Date Of Birth", value: profile?.dateOfBirth || "Not set" },
    { label: "Gender", value: profile?.gender || "Not set" },
    { label: "Address", value: profile?.address || "Not set" },
    { label: "Employee Code", value: profile?.employeeCode || "Not set" },
    { label: "National ID", value: profile?.nationalId || "Not set" },
    { label: "Emergency Contact", value: profile?.emergencyContact || "Not set" },
    { label: "Languages", value: Array.isArray(profile?.languages) && profile.languages.length ? profile.languages.join(", ") : "Not set" }
  ];
  const coachProfessionalDetails = [
    { label: "Employment Type", value: profile?.employmentType || "Not set" },
    { label: "Hire Date", value: profile?.hireDate || "Not set" },
    { label: "Salary / Commission Model", value: profile?.salaryModel || "Not set" },
    { label: "Experience", value: profile?.yearsOfExperience != null ? `${profile.yearsOfExperience} years` : "Not set" },
    { label: "Available Hours", value: profile?.availableHours || "Not set" },
    { label: "Shift Schedule", value: profile?.shiftSchedule || "Not set" },
    { label: "Specializations", value: Array.isArray(profile?.specializations) && profile.specializations.length ? profile.specializations.join(", ") : "Not set" },
    { label: "Certification Expiry", value: Array.isArray(profile?.certificationExpiryDates) && profile.certificationExpiryDates.length ? profile.certificationExpiryDates.join(", ") : "Not set" },
    { label: "Max Client Capacity", value: profile?.maxClientCapacity != null ? String(profile.maxClientCapacity) : "Not set" },
    { label: "Performance Notes", value: profile?.performanceNotes || "Not set" },
    { label: "Bank / Payment Details", value: profile?.bankPaymentDetails || "Not set" },
    { label: "Documents", value: Array.isArray(profile?.documents) && profile.documents.length ? profile.documents.join(", ") : "Not set" }
  ];

  const filteredMembers = members.filter((member) => (
    matchesQuery(member, memberSearch, ["name", "email", "memberCode", "goal", "plan", "dietPlanName", "paymentStatus"]) &&
    (memberStatusFilter === "all" || member.status === memberStatusFilter) &&
    (memberPaymentFilter === "all" || member.paymentStatus === memberPaymentFilter)
  ));
  const sortedMembers = [...filteredMembers].sort((left, right) => {
    switch (memberSort) {
      case "progress-desc":
        return Number(right.progress || 0) - Number(left.progress || 0);
      case "progress-asc":
        return Number(left.progress || 0) - Number(right.progress || 0);
      case "payment":
        return String(left.paymentStatus || "").localeCompare(String(right.paymentStatus || ""));
      case "renewal-desc":
        return String(right.planExpiresAt || "9999-12-31").localeCompare(String(left.planExpiresAt || "9999-12-31"));
      case "renewal-asc":
      default:
        return String(left.planExpiresAt || "9999-12-31").localeCompare(String(right.planExpiresAt || "9999-12-31"));
    }
  });
  const filteredWorkouts = workoutPlans.filter((plan) => (
    matchesQuery(plan, workoutSearch, ["name", "category", "duration"]) &&
    (workoutLevel === "all" || plan.level === workoutLevel)
  ));
  const filteredMeals = mealPlans.filter((plan) => matchesQuery(plan, mealSearch, ["name", "goal"]));
  const filteredAttendance = attendance.filter((item) => matchesQuery(item, attendanceSearch, ["member", "date", "time"]));
  const filteredMessages = messages.filter((message) => (
    matchesQuery(message, messageSearch, ["from", "text", "time"]) &&
    (messageUnread === "all" || String(message.unread) === messageUnread)
  ));

  const pagedMembers = paginateItems(sortedMembers, memberPage);
  const pagedWorkouts = paginateItems(filteredWorkouts, workoutPage);
  const pagedMeals = paginateItems(filteredMeals, mealPage);
  const pagedAttendance = paginateItems(filteredAttendance, attendancePage);
  const pagedMessages = paginateItems(filteredMessages, messagePage);
  const pagedNotifications = paginateItems(notifications, notificationPage);
  const coachMessageUnread = messages.filter((message) => message.unread && message.recipientRole === "coach").length;
  const messageConversations = members
    .map((member) => {
      const threadMessages = messages.filter((message) => message.memberName === member.name);
      const lastMessage = threadMessages[threadMessages.length - 1] || null;
      const unreadCount = threadMessages.filter((message) => message.unread && message.recipientRole === "coach").length;
      return {
        member,
        messages: threadMessages,
        lastMessage,
        unreadCount
      };
    })
    .filter((item) => item.messages.length > 0 || !messageSearch);
  const activeConversation = messageConversations.find((item) => String(item.member.id) === String(activeMessageMemberId)) || messageConversations[0] || null;
  const activeConversationMessages = activeConversation?.messages || [];

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
    setAssignWorkoutForm({
      memberId: member?.id || "",
      workoutPlanId: selectedPlanId || ""
    });
    setAssignWorkoutModal(true);
  }

  function openAssignMealModal(member = null, selectedPlanId = "") {
    setAssignMealForm({
      memberId: member?.id || "",
      mealPlanId: selectedPlanId || ""
    });
    setAssignMealModal(true);
  }

  async function saveWorkout() {
    if (!workoutForm.name || !workoutForm.duration || !workoutForm.days || !workoutForm.category) {
      return;
    }

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
    if (!assignWorkoutForm.memberId || !assignWorkoutForm.workoutPlanId) {
      return;
    }

    await assignWorkoutPlan(assignWorkoutForm.memberId, { workoutPlanId: assignWorkoutForm.workoutPlanId });
    setAssignWorkoutModal(false);
    setAssignWorkoutForm(emptyAssignWorkoutForm);
  }

  async function saveMeal() {
    if (!mealForm.name || !mealForm.calories || !mealForm.protein || !mealForm.carbs || !mealForm.fat || !mealForm.goal) {
      return;
    }

    const cleanedMeals = (mealForm.meals || [])
      .map((meal) => ({
        time: String(meal.time || "").trim(),
        name: String(meal.name || "").trim(),
        foods: String(meal.foods || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      }))
      .filter((meal) => meal.time || meal.name || meal.foods.length);

    const payload = {
      ...mealForm,
      meals: cleanedMeals
    };

    if (mealModal === "edit") {
      await editMealPlan(mealForm.id, payload);
    } else {
      await addMealPlan({ gymId: user.gymId, ...payload });
    }

    setMealModal(null);
    setMealForm(emptyMealForm);
  }

  async function saveAssignedMealPlan() {
    if (!assignMealForm.memberId || !assignMealForm.mealPlanId) {
      return;
    }

    await assignMealPlan(assignMealForm.memberId, { mealPlanId: assignMealForm.mealPlanId });
    setAssignMealModal(false);
    setAssignMealForm(emptyAssignMealForm);
  }

  async function deleteWorkout(planId) {
    if (!window.confirm("Delete this workout plan? This action cannot be undone.")) {
      return;
    }

    await removeWorkoutPlan(planId);
  }

  async function deleteMeal(planId) {
    if (!window.confirm("Delete this meal plan? This action cannot be undone.")) {
      return;
    }

    await removeMealPlan(planId);
  }

  async function removeAssignedWorkout(memberId) {
    if (!window.confirm("Remove this member's assigned workout plan?")) {
      return;
    }

    await unassignWorkoutPlan(memberId);
  }

  async function removeAssignedMeal(memberId) {
    if (!window.confirm("Remove this member's assigned meal plan?")) {
      return;
    }

    await unassignMealPlan(memberId);
  }

  function openSubscriptionModal(member) {
    setSubscriptionForm({
      plan: member.plan || "",
      durationMonths: String(member.subscriptionDurationMonths || 1),
      amountPaid: String(member.amountPaid || ""),
      paymentMethod: member.paymentMethod || "",
      note: ""
    });
    setSubscriptionModal(member);
  }

  async function saveSubscription() {
    if (!subscriptionModal) return;
    await editMemberSubscription(subscriptionModal.id, {
      plan: subscriptionForm.plan,
      durationMonths: Number(subscriptionForm.durationMonths),
      amountPaid: Number(subscriptionForm.amountPaid) || 0,
      paymentMethod: subscriptionForm.paymentMethod,
      note: subscriptionForm.note
    });
    setSubscriptionModal(null);
  }

  async function saveCreateMember() {
    if (!createMemberForm.name || !createMemberForm.email || !createMemberForm.plan || !createMemberForm.goal) return;
    await addMember({
      gymId: user.gymId,
      name: createMemberForm.name,
      email: createMemberForm.email,
      plan: createMemberForm.plan,
      goal: createMemberForm.goal,
      subscriptionDurationMonths: Number(createMemberForm.durationMonths) || 1,
      amountPaid: Number(createMemberForm.amountPaid) || 0,
      paymentMethod: createMemberForm.paymentMethod
    });
    setCreateMemberModal(false);
    setCreateMemberForm(emptyCreateMemberForm);
  }

  function openProfileModal() {
    setProfileForm({
      name: profile?.name || coach?.name || "",
      email: profile?.email || coach?.email || "",
      phone: profile?.phone || "",
      bio: profile?.bio || "",
      title: profile?.title || "",
      profileImageFile: null,
      specialty: profile?.specialty || coach?.specialty || "",
      certifications: profile?.certifications || coach?.certifications || "",
      dateOfBirth: profile?.dateOfBirth || "",
      gender: profile?.gender || "",
      address: profile?.address || "",
      nationalId: profile?.nationalId || "",
      employeeCode: profile?.employeeCode || "",
      hireDate: profile?.hireDate || "",
      employmentType: profile?.employmentType || "",
      salaryModel: profile?.salaryModel || "",
      shiftSchedule: profile?.shiftSchedule || "",
      specializations: Array.isArray(profile?.specializations) ? profile.specializations.join(", ") : "",
      yearsOfExperience: profile?.yearsOfExperience ?? "",
      languages: Array.isArray(profile?.languages) ? profile.languages.join(", ") : "",
      certificationExpiryDates: Array.isArray(profile?.certificationExpiryDates) ? profile.certificationExpiryDates.join(", ") : "",
      availableHours: profile?.availableHours || "",
      maxClientCapacity: profile?.maxClientCapacity ?? "",
      performanceNotes: profile?.performanceNotes || "",
      bankPaymentDetails: profile?.bankPaymentDetails || "",
      emergencyContact: profile?.emergencyContact || "",
      documents: Array.isArray(profile?.documents) ? profile.documents.join(", ") : ""
    });
    setProfileModal(true);
  }

  async function saveProfile() {
    if (!profileForm.name || !profileForm.email || !profileForm.specialty) {
      return;
    }

    await editMyProfile(profileForm);
    setProfileModal(false);
  }

  async function submitCoachAttendance() {
    if (!attendanceSelectedMember) return;

    const checkInDateTime = new Date(`${attendanceDate}T${attendanceClockIn || "00:00"}`);
    const payload = { gymId: user.gymId, memberId: attendanceSelectedMember.id, coachName: coach?.name, checkInAt: checkInDateTime.toISOString() };
    if (attendanceClockOut) {
      payload.checkOutAt = new Date(`${attendanceDate}T${attendanceClockOut}`).toISOString();
    }

    await checkInMember(payload);
    setAttendanceSelectedMember(null);
    setAttendanceMemberSearch("");
    setAttendanceDate(new Date().toISOString().slice(0, 10));
    setAttendanceClockIn(new Date().toTimeString().slice(0, 5));
    setAttendanceClockOut("");
  }

  async function submitCoachMessage() {
    if (!activeConversation?.member?.id || !String(messageDraft || "").trim()) {
      return;
    }

    await sendMessage({
      memberId: activeConversation.member.id,
      text: messageDraft
    });
    setMessageDraft("");
  }

  function coXlsx(header, rows, sheet, filename) {
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

  function coPdf(title, headers, rows, landscape, filename, subtitle) {
    const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
    const accent = [22, 163, 74];
    const contentStartY = addPdfHeader(doc, {
      title,
      subtitle: subtitle || `Generated for ${coach?.name || profile?.name || "Coach"}`,
      gymName: coach?.gymName || "Gymora Gym",
      ownerName: coach?.name || profile?.name || "Coach",
      location: coach?.location || "",
      generatedAt: new Date().toLocaleString(),
      accent
    });
    autoTable(doc, getPdfTableConfig(doc, accent, contentStartY, [headers], rows));
    finalizePdf(doc, `${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportCoachMembersPdf() { coPdf("My Members", ["Name", "Member ID", "Plan", "Status", "Payment", "Progress %", "Check-Ins", "Goal"], members.map((m) => [m.name, m.memberCode || "", m.plan || "", m.status, m.paymentStatus, String(m.progress || 0), String(m.checkIns || 0), m.goal || ""]), true, "coach-members"); }
  function exportCoachMembersExcel() { coXlsx(["Name", "Member ID", "Email", "Plan", "Status", "Payment", "Paid (LKR)", "Due (LKR)", "Progress %", "Check-Ins", "Goal"], members.map((m) => [m.name, m.memberCode || "", m.email || "", m.plan || "", m.status, m.paymentStatus, m.amountPaid || 0, m.amountDue || 0, m.progress || 0, m.checkIns || 0, m.goal || ""]), "Members", "coach-members"); }

  function exportCoachAttendancePdf() {
    const records = data?.attendance || [];
    coPdf("Member Attendance", ["Member", "Date", "Clock In", "Clock Out", "Status"], records.map((r) => [r.member || r.memberName || "", r.date || "", r.checkInAt || r.time || "", r.checkOutAt || "", r.status || ""]), true, "coach-attendance");
  }
  function exportCoachAttendanceExcel() {
    const records = data?.attendance || [];
    coXlsx(["Member", "Date", "Clock In", "Clock Out", "Status"], records.map((r) => [r.member || r.memberName || "", r.date || "", r.checkInAt || r.time || "", r.checkOutAt || "", r.status || ""]), "Attendance", "coach-attendance");
  }

  function exportWorkoutsPdf() {
    const plans = data?.workoutPlans || [];
    coPdf("Workout Plans", ["Name", "Level", "Duration", "Category", "Days", "Exercises"], plans.map((p) => [p.name, p.level || "", p.duration || "", p.category || "", p.days || "", (p.exercises || []).length]), false, "workout-plans");
  }
  function exportWorkoutsExcel() {
    const plans = data?.workoutPlans || [];
    coXlsx(["Name", "Level", "Duration", "Category", "Days", "Description", "Exercise Count"], plans.map((p) => [p.name, p.level || "", p.duration || "", p.category || "", p.days || "", p.description || "", (p.exercises || []).length]), "Workout Plans", "workout-plans");
  }

  function exportMealsPdf() {
    const plans = data?.mealPlans || [];
    coPdf("Meal Plans", ["Name", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Goal", "Meals"], plans.map((p) => [p.name, p.calories || "", p.protein || "", p.carbs || "", p.fat || "", p.goal || "", (p.meals || []).length]), false, "meal-plans");
  }
  function exportMealsExcel() {
    const plans = data?.mealPlans || [];
    coXlsx(["Name", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Goal", "Meal Count"], plans.map((p) => [p.name, p.calories || "", p.protein || "", p.carbs || "", p.fat || "", p.goal || "", (p.meals || []).length]), "Meal Plans", "meal-plans");
  }

  function exportSalaryPdf() {
    coPdf("Salary & Advances", ["Date", "Amount (LKR)", "Reason", "Status", "Note"], salaryAdvances.map((a) => [a.date || "", a.amount || 0, a.reason || "", a.status || "", a.note || ""]), false, "salary-advances");
  }
  function exportSalaryExcel() {
    coXlsx(["Date", "Amount (LKR)", "Reason", "Status", "Note"], salaryAdvances.map((a) => [a.date || "", a.amount || 0, a.reason || "", a.status || "", a.note || ""]), "Salary Advances", "salary-advances");
  }

  function downloadMyPayslipPdf(record) {
    const accent = [22, 163, 74];
    const theme = getPdfTheme(accent);
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const contentStartY = addPdfHeader(doc, {
      title: `Salary Slip — ${record.month}`,
      subtitle: `Employee: ${record.coachName || coach?.name || profile?.name || "—"} | Status: ${String(record.status || "").toUpperCase()}`,
      gymName: coach?.gymName || profile?.gymName || "Gymora Gym",
      ownerName: profile?.name || coach?.name || "Coach",
      location: coach?.location || profile?.location || "",
      generatedAt: new Date().toLocaleString(),
      accent
    });

    let y = addPdfSectionTitle(doc, "Employment Details", contentStartY, accent);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...theme.ink);
    doc.text(`ID: ${coach?.coachCode || coach?.employeeCode || "—"}`, 28, y + 6);
    doc.text(`Specialty: ${coach?.specialty || "—"}`, 28, y + 20);
    const colX = doc.internal.pageSize.getWidth() / 2 + 10;
    doc.text(`Type: ${coach?.employmentType || profile?.employmentType || "—"}`, colX, y + 6);
    doc.text(`Shift: ${coach?.shiftSchedule || profile?.shiftSchedule || "—"}`, colX, y + 20);
    doc.text(`Bank: ${coach?.bankPaymentDetails || profile?.bankPaymentDetails || "—"}`, colX, y + 34);

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

    finalizePdf(doc, `salary-slip-${(record.coachName || coach?.name || "coach").toLowerCase().replace(/\s+/g, "-")}-${record.month}.pdf`);
  }

  return (
    <DashboardShell
      isMobile={isMobile}
      accent={coachAccent}
      title={data?.gym?.name || "Gymora"}
      logoUrl={data?.gym?.logoUrl ? resolveImageUrl(data.gym.logoUrl) : "/gymora-logo.png"}
      subtitle="Coach Portal"
      navItems={[
        { id: "dashboard", label: "Dashboard", section: "Overview" },
        { id: "notifications", label: "Notifications", count: notificationState.unreadCount, section: "Overview", hiddenInNav: true },
        { id: "members", label: "My Members", section: "Coaching" },
        { id: "workouts", label: "Workout Plans", section: "Coaching" },
        { id: "meals", label: "Meal Plans", section: "Coaching" },
        { id: "attendance", label: "Attendance", section: "Operations" },
        { id: "leaves", label: "Leave Requests", section: "Operations" },
        { id: "salary", label: "Salary", section: "Operations" },
        { id: "messages", label: "Messages", count: coachMessageUnread, section: "Operations" },
        { id: "settings", label: "Settings", section: "Operations" }
      ]}
      page={page}
      setPage={setPage}
      sidebar={coach ? (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "14px 16px", borderRadius: 18, background: `linear-gradient(135deg, ${coachAccentSoft}, #ffffff 70%)`, border: `1px solid ${coachAccent}24` }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a", lineHeight: 1.25 }}>
              {profile?.gymName || "Gym not assigned"}
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Powered by Gymora</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar initials={coach.avatar} size={42} imageUrl={profile?.profileImageUrl || ""} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{coach.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{coach.specialty}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>{members.length} active members</div>
            </div>
          </div>
        </div>
      ) : null}
      topRight={(
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <NotificationBell count={notificationState.unreadCount} active={page === "notifications"} onClick={() => setPage("notifications")} />
          {!isMobile && <Badge label={`${unread} unread`} type={unread ? "warning" : "default"} />}
          {!isMobile && <Badge label={`${checkedInCount} checked in`} type="checked-in" />}
          <Btn small variant="ghost" onClick={logout}>→ Log out</Btn>
        </div>
      )}
    >
      {!hasCoachData && (
        <EmptyState
          title="No coach data yet"
          message="This coach login works, but there is no real coach profile or assigned gym data in the database yet. Add a gym and coach record first to start using this dashboard with real data."
        />
      )}

      {hasCoachData && (
        <>
          {page === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Members" value={members.length} accent={coachAccent} />
                <StatCard label="Avg Progress" value={`${avgProgress}%`} accent="#2563eb" />
                <StatCard label="Check-ins Today" value={attendance.length} accent="#dc2626" />
                <StatCard label="Unread Messages" value={unread} accent="#7c3aed" />
              </div>
              <div style={{ ...responsiveGrid(isMobile, "1.35fr 1fr"), gap: 20 }}>
                <Card style={{ padding: 0, overflow: "hidden", border: `1px solid ${coachAccent}18` }}>
                  <div style={{ padding: 22, background: `linear-gradient(135deg, ${coachAccentSoft}, #ffffff 68%)`, borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 800 }}>Coach Overview</div>
                        <div style={{ marginTop: 8, fontSize: isMobile ? 24 : 30, fontWeight: 900, letterSpacing: "-0.05em", color: "#0f172a" }}>{coach?.name || "Coach"}</div>
                        <div style={{ marginTop: 8, fontSize: 14, color: "#475569", lineHeight: 1.6, maxWidth: 520 }}>
                          Keep members progressing, assign plans faster, and stay on top of attendance and message follow-ups from one workspace.
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "1fr", gap: 10, minWidth: isMobile ? "100%" : 190 }}>
                        <InfoTile label="Specialty" value={coach?.specialty || "General Coaching"} tone={coachAccent} soft={coachAccentSoft} />
                        <InfoTile label="Gym" value={profile?.gymName || "Not assigned"} tone="#2563eb" soft="#eff6ff" />
                      </div>
                    </div>
                    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 10 }}>
                      <MacroPill label="Paid" value={paidMembersCount} tone={coachAccent} />
                      <MacroPill label="Needs Attention" value={membersNeedingAttention} tone="#dc2626" />
                      <MacroPill label="Checked In" value={checkedInCount} tone="#2563eb" />
                      <MacroPill label="Checked Out" value={checkedOutCount} tone="#7c3aed" />
                    </div>
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Today's Focus" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <InfoTile label="Pending Follow-Ups" value={`${unread} unread member messages`} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Floor Activity" value={`${checkedInCount} members currently checked in`} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Plan Library" value={`${workoutPlans.length} workouts and ${mealPlans.length} meal plans ready`} tone={coachAccent} soft={coachAccentSoft} />
                  </div>
                </Card>
              </div>
              <div style={{ ...responsiveGrid(isMobile, "1.3fr 1fr"), gap: 20 }}>
                <Card>
                  <SectionHeader title="Member Progress Board" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {members.map((member) => (
                      <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <Avatar initials={member.avatar} size={40} imageUrl={member.profileImageUrl || ""} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{member.name}</div>
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{member.goal} • {member.plan}</div>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>{member.progress}%</span>
                          </div>
                          <ProgressBar value={member.progress} color={coachAccentMid} height={7} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Top Performing Members" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {(topMembers.length ? topMembers : members).slice(0, 4).map((member) => (
                      <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <Avatar initials={member.avatar} size={38} imageUrl={member.profileImageUrl || ""} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{member.name}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{member.goal}</div>
                        </div>
                        <Badge label={`${member.progress}% progress`} type={member.progress >= 70 ? "success" : "info"} />
                      </div>
                    ))}
                    <div style={{ padding: "14px 16px", borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Coach Notes</div>
                      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                        Focus today on members below 45% progress or those with unpaid status so training and retention stay healthy.
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {page === "settings" && coach && (
            <div style={{ ...responsiveGrid(isMobile, "1.08fr 0.92fr"), gap: 20, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <ProfileHeroCard
                  title={coach.name}
                  subtitle={coach.specialty}
                  badge={<Badge label={coach.status} type={coach.status} />}
                  accent={coachAccent}
                  soft={coachAccentSoft}
                  initials={coach.avatar}
                  imageUrl={profile?.profileImageUrl || ""}
                  highlights={[
                    { label: "Members Managed", value: coach.members, tone: coachAccent, soft: coachAccentSoft },
                    { label: "Unread Messages", value: unread, tone: "#7c3aed", soft: "#f5f3ff" },
                    { label: "Check-ins Today", value: attendance.length, tone: "#dc2626", soft: "#fef2f2" }
                  ]}
                  action={(
                    <>
                      <Btn small variant="ghost" onClick={openProfileModal}>Edit Profile</Btn>
                    </>
                  )}
                >
                  <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 12 }}>
                    <InfoTile label="Coach ID" value={profile?.coachCode || "Pending"} tone={coachAccent} soft={coachAccentSoft} />
                    <InfoTile label="Email" value={coach.email} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Phone" value={profile?.phone || "Not provided"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Gym" value={profile?.gymName || "Not assigned"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Location" value={profile?.location || "Not provided"} tone="#ea580c" soft="#fff7ed" />
                    <InfoTile label="Members Managed" value={String(coach.members)} tone="#16a34a" soft="#f0fdf4" />
                  </div>
                  <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 18, background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Certifications</div>
                    <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{profile?.certifications || coach.certifications || "Not added yet"}</div>
                  </div>
                  <div style={{ marginTop: 12, padding: "16px 18px", borderRadius: 18, background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Bio</div>
                    <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{profile?.bio || "No bio added yet."}</div>
                  </div>
                </ProfileHeroCard>
                <ProfileSection title="Snapshot" description="Live coaching performance and member servicing indicators.">
                  <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 14 }}>
                    <StatCard label="Assigned Members" value={members.length} accent={coachAccent} />
                    <StatCard label="Unread Messages" value={unread} accent="#7c3aed" />
                    <StatCard label="Check-ins Today" value={attendance.length} accent="#dc2626" />
                    <StatCard label="Avg Progress" value={`${avgProgress}%`} accent="#2563eb" />
                  </div>
                </ProfileSection>
                <ProfileSection title="Coach Details" description="Personal details used for account identity and contact coverage.">
                  <DetailStack items={coachPersonalDetails} />
                </ProfileSection>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <ProfileSection title="Session Health" description="How today's member engagement is trending for this coach account.">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    <InfoTile label="Checked In Now" value={String(checkedInCount)} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Completed Sessions" value={String(checkedOutCount)} tone={coachAccent} soft={coachAccentSoft} />
                    <InfoTile label="Members Needing Attention" value={String(membersNeedingAttention)} tone="#dc2626" soft="#fef2f2" />
                  </div>
                </ProfileSection>
                <ProfileSection title="Responsibilities" description="The working scope expected from coach accounts in the system.">
                  <DetailStack
                    items={[
                      { label: "Member Progress", value: "Manage assigned member progress and check-ins." },
                      { label: "Training Plans", value: "Create and maintain workout plans for active clients." },
                      { label: "Nutrition And Messaging", value: "Prepare meal plans and respond to member messages." }
                    ]}
                  />
                </ProfileSection>
                <ProfileSection title="Professional Details" description="Scheduling, payroll, certifications, and coaching capacity information.">
                  <DetailStack items={coachProfessionalDetails} />
                </ProfileSection>
              </div>
            </div>
          )}

          {page === "notifications" && (
            notifications.length === 0 ? (
              <EmptyState title="No notifications yet" message="Announcements and missed member check-in alerts will appear here." />
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

          {page === "members" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <Toolbar
                  search={memberSearch}
                  setSearch={setMemberSearch}
                  searchPlaceholder="Search by name, ID, email, goal, or plan"
                  filters={[
                    {
                      label: "Status",
                      value: memberStatusFilter,
                      onChange: setMemberStatusFilter,
                      options: [
                        { value: "all", label: "All Statuses" },
                        { value: "active", label: "Active" },
                        { value: "inactive", label: "Inactive" }
                      ]
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
                    },
                    {
                      label: "Sort",
                      value: memberSort,
                      onChange: setMemberSort,
                      options: [
                        { value: "renewal-asc", label: "Renewal Soonest" },
                        { value: "renewal-desc", label: "Renewal Latest" },
                        { value: "progress-desc", label: "Progress High-Low" },
                        { value: "progress-asc", label: "Progress Low-High" },
                        { value: "payment", label: "Payment Status" }
                      ]
                    }
                  ]}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ExportButtonGroup>
                    <SpreadsheetExportButton compact onClick={exportCoachMembersExcel} label="Members" />
                    <ReportExportButton compact onClick={exportCoachMembersPdf} label="Members" />
                  </ExportButtonGroup>
                  <Btn small variant="primary" onClick={() => setCreateMemberModal(true)}>+ Add Member</Btn>
                </div>
              </div>
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Assigned Members" value={members.length} accent={coachAccent} />
                <StatCard label="Checked In Now" value={checkedInCount} accent="#2563eb" />
                <StatCard label="Avg Progress" value={`${avgProgress}%`} accent="#16a34a" />
                <StatCard label="Need Attention" value={membersNeedingAttention} accent="#dc2626" />
              </div>
              <Card style={{ padding: 0 }}>
                <Table
                  headers={["Member", "Phone", "Height / Weight", "Membership", "Payment", "Renewal", "Actions"]}
                  rows={pagedMembers.visibleItems.map((member) => [
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar initials={member.avatar} size={30} imageUrl={member.profileImageUrl || ""} />
                      <div>
                        <div style={{ fontWeight: 700 }}>{member.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{member.memberCode || ""}</div>
                      </div>
                    </div>,
                    member.phone || "—",
                    <div>
                      <div style={{ fontSize: 13 }}>{member.heightCm ? `${member.heightCm} cm` : "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{member.currentWeightKg ? `${member.currentWeightKg} kg` : "—"}</div>
                    </div>,
                    <div>
                      <Badge label={member.plan} />
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{member.subscriptionDurationMonths} mo</div>
                    </div>,
                    <div>
                      <Badge label={member.paymentStatus} type={member.paymentStatus} />
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                        Paid: {member.amountPaid ?? 0} / {member.amountDue ?? 0}
                      </div>
                    </div>,
                    member.planExpiresAt || "—",
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <IconBtn title="Assign Workout" onClick={() => openAssignWorkoutModal(member)}><IcoAssign /></IconBtn>
                      <IconBtn title="Assign Meal" onClick={() => openAssignMealModal(member)}><IcoTag /></IconBtn>
                      <IconBtn title="Subscription" onClick={() => openSubscriptionModal(member)}><IcoCreditCard /></IconBtn>
                      <IconBtn title="View" onClick={() => setViewMemberModal(member)}><IcoView /></IconBtn>
                      <IconBtn title="Delete member" danger onClick={() => { if (window.confirm(`Delete ${member.name}? This action cannot be undone.`)) removeMember(member.id).catch((e) => alert(e.message || "Failed to delete member")); }}><IcoTrash /></IconBtn>
                    </div>
                  ])}
                />
              </Card>
              <PaginationControls page={pagedMembers.page} totalPages={pagedMembers.totalPages} onPageChange={setMemberPage} totalItems={sortedMembers.length} label="members" />
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

          {page === "attendance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Btn small variant={attendanceTab === "member" ? "primary" : "ghost"} onClick={() => setAttendanceTab("member")}>📋 Member Attendance</Btn>
                <Btn small variant={attendanceTab === "my" ? "primary" : "ghost"} onClick={() => setAttendanceTab("my")}>🕐 My Attendance</Btn>
                <ExportButtonGroup style={{ marginLeft: "auto" }}>
                  <SpreadsheetExportButton compact onClick={exportCoachAttendanceExcel} label="Attendance" />
                  <ReportExportButton compact onClick={exportCoachAttendancePdf} label="Attendance" />
                </ExportButtonGroup>
              </div>

              {attendanceTab === "member" && (
                <>
                  <Card>
                    <SectionHeader title="Add Member Attendance" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ position: "relative" }}>
                        <Input
                          placeholder="Search member by name or ID..."
                          value={attendanceMemberSearch}
                          onChange={(e) => { setAttendanceMemberSearch(e.target.value); setAttendanceSelectedMember(null); }}
                        />
                        {attendanceMemberSearch && !attendanceSelectedMember && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", maxHeight: 200, overflowY: "auto" }}>
                            {members
                              .filter((m) => m.name.toLowerCase().includes(attendanceMemberSearch.toLowerCase()) || (m.memberCode || "").toLowerCase().includes(attendanceMemberSearch.toLowerCase()))
                              .slice(0, 8)
                              .map((m) => (
                                <button key={m.id} onClick={() => { setAttendanceSelectedMember(m); setAttendanceMemberSearch(m.name); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}>
                                  <Avatar initials={m.avatar} size={28} imageUrl={m.profileImageUrl || ""} />
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.memberCode || ""}</div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                      {attendanceSelectedMember && (
                        <div style={{ padding: "10px 14px", borderRadius: 12, background: coachAccentSoft, border: `1px solid ${coachAccent}30`, display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar initials={attendanceSelectedMember.avatar} size={30} imageUrl={attendanceSelectedMember.profileImageUrl || ""} />
                          <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{attendanceSelectedMember.name}</div>
                          <Btn small variant="ghost" onClick={() => { setAttendanceSelectedMember(null); setAttendanceMemberSearch(""); }}>✕</Btn>
                        </div>
                      )}
                      <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)"), gap: 10 }}>
                        <FormField label="Date">
                          <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                        </FormField>
                        <FormField label="Clock-In Time">
                          <Input type="time" value={attendanceClockIn} onChange={(e) => setAttendanceClockIn(e.target.value)} />
                        </FormField>
                        <FormField label="Clock-Out Time (optional)">
                          <Input type="time" value={attendanceClockOut} onChange={(e) => setAttendanceClockOut(e.target.value)} />
                        </FormField>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Btn variant="primary" onClick={submitCoachAttendance} disabled={!attendanceSelectedMember}>✅ Add Attendance</Btn>
                      </div>
                    </div>
                  </Card>
                  <Toolbar search={attendanceSearch} setSearch={setAttendanceSearch} searchPlaceholder="Search attendance by member, date, or time" />
                  <Card style={{ padding: 0 }}>
                    <Table
                      headers={["Member", "Check In", "Check Out", "Date", "Actions"]}
                      rows={pagedAttendance.visibleItems.map((item) => [
                        item.member,
                        item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : item.time,
                        item.checkOutAt ? new Date(item.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Still inside",
                        item.date,
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
                  <PaginationControls page={pagedAttendance.page} totalPages={pagedAttendance.totalPages} onPageChange={setAttendancePage} totalItems={filteredAttendance.length} label="records" />
                </>
              )}

              {attendanceTab === "my" && (
                <>
                  <Card>
                    <SectionHeader title="My Clock-In Status" />
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      {!todayCoachAttendance && (
                        <Btn variant="primary" onClick={() => coachClockIn()}>🟢 Clock In</Btn>
                      )}
                      {todayCoachAttendance?.status === "clocked-in" && (
                        <>
                          <Btn variant="ghost" onClick={() => coachStartBreak(todayCoachAttendance.id)}>☕ Start Break</Btn>
                          <Btn variant="danger" onClick={() => coachClockOut(todayCoachAttendance.id)}>🔴 Clock Out</Btn>
                        </>
                      )}
                      {todayCoachAttendance?.status === "on-break" && (
                        <Btn variant="primary" onClick={() => coachEndBreak(todayCoachAttendance.id)}>▶️ End Break</Btn>
                      )}
                      {todayCoachAttendance?.status === "clocked-out" && (
                        <div style={{ fontSize: 14, color: "var(--muted)" }}>✅ Clocked out today — {todayCoachAttendance.totalWorkMinutes} min worked</div>
                      )}
                      {todayCoachAttendance && (
                        <div style={{ fontSize: 13, color: coachAccent, fontWeight: 700 }}>Status: {todayCoachAttendance.status}</div>
                      )}
                    </div>
                  </Card>
                  <Card style={{ padding: 0 }}>
                    <Table
                      headers={["Date", "Clock In", "Clock Out", "Break", "Work Hours", "Status"]}
                      rows={coachAttendance.map((r) => [
                        r.date,
                        r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
                        r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
                        r.breakMinutes ? `${r.breakMinutes} min` : "—",
                        r.totalWorkMinutes ? `${Math.floor(r.totalWorkMinutes / 60)}h ${r.totalWorkMinutes % 60}m` : "—",
                        <Badge label={r.status} type={r.status === "clocked-out" ? "success" : r.status === "on-break" ? "warning" : "info"} />
                      ])}
                    />
                  </Card>
                </>
              )}
            </div>
          )}

          {page === "messages" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Toolbar
                search={messageSearch}
                setSearch={setMessageSearch}
                searchPlaceholder="Search messages"
                filters={[
                  {
                    label: "Unread",
                    value: messageUnread,
                    onChange: setMessageUnread,
                    options: [
                      { value: "all", label: "All Messages" },
                      { value: "true", label: "Unread Only" },
                      { value: "false", label: "Read Only" }
                    ]
                  }
                ]}
              />
              <div style={{ ...responsiveGrid(isMobile, "320px 1fr"), gap: 16, alignItems: "start" }}>
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Member Conversations</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Select a member to view the full thread and reply.</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {messageConversations.length === 0 ? (
                      <div style={{ padding: 18, fontSize: 13, color: "var(--muted)" }}>No member conversations yet.</div>
                    ) : (
                      messageConversations.map((conversation) => (
                        <button
                          key={conversation.member.id}
                          onClick={() => setActiveMessageMemberId(String(conversation.member.id))}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            width: "100%",
                            textAlign: "left",
                            padding: "14px 16px",
                            background: String(activeConversation?.member?.id) === String(conversation.member.id) ? "#eff6ff" : "#ffffff",
                            border: "none",
                            borderBottom: "1px solid #e2e8f0",
                            cursor: "pointer"
                          }}
                        >
                          <Avatar initials={conversation.member.avatar} size={34} imageUrl={conversation.member.profileImageUrl || ""} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{conversation.member.name}</div>
                              {conversation.unreadCount ? <Badge label={`${conversation.unreadCount} new`} type="warning" /> : null}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {conversation.lastMessage?.text || "No messages yet"}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </Card>
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  {activeConversation ? (
                    <>
                      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", background: `linear-gradient(135deg, ${coachAccentSoft}, #ffffff 62%)` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{activeConversation.member.name}</div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{activeConversation.member.goal} • {activeConversation.member.plan}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <IconBtn title="Assign Workout" onClick={() => openAssignWorkoutModal(activeConversation.member)}><IcoAssign /></IconBtn>
                            <IconBtn title="Assign Meal" onClick={() => openAssignMealModal(activeConversation.member)}><IcoTag /></IconBtn>
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, background: "#fbfdff", minHeight: 320 }}>
                        {activeConversationMessages.map((message) => (
                          <MessageBubble key={message.id} message={message} isOwn={message.senderRole === "coach"} accent={coachAccent} soft="#ffffff" />
                        ))}
                      </div>
                      <div style={{ padding: 18, borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                        <FormField label="Reply">
                          <Input value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} placeholder={`Message ${activeConversation.member.name}`} />
                        </FormField>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <Btn onClick={submitCoachMessage}>Send Message</Btn>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: 20, fontSize: 13, color: "var(--muted)" }}>Select a member conversation to start messaging.</div>
                  )}
                </Card>
              </div>
              <PaginationControls page={pagedMessages.page} totalPages={pagedMessages.totalPages} onPageChange={setMessagePage} totalItems={filteredMessages.length} label="messages" />
            </div>
          )}

          {page === "leaves" && hasCoachData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>My Leave Requests</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Submit and track your leave requests here.</div>
                </div>
                <Btn onClick={() => { setLeaveRequestForm({ leaveType: "sick", startDate: "", endDate: "", reason: "" }); setLeaveRequestError(""); setLeaveRequestModal(true); }}>+ Request Leave</Btn>
              </div>
              {myLeavesLoading ? (
                <div style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Loading…</div>
              ) : myLeaves.length === 0 ? (
                <EmptyState title="No leave requests yet" message="Submit a leave request to get started. Your gym owner will review and approve or reject it." />
              ) : (
                <Card style={{ padding: 0 }}>
                  <Table
                    headers={["Type", "Start Date", "End Date", "Days", "Reason", "Status", "Owner Notes"]}
                    rows={myLeaves.map(l => {
                      const leaveTypeColors = { sick: "#dc2626", vacation: "#2563eb", personal: "#7c3aed", unpaid: "#f59e0b", emergency: "#ea580c" };
                      const leaveTypeBg = { sick: "#fef2f2", vacation: "#eff6ff", personal: "#f5f3ff", unpaid: "#fffbeb", emergency: "#fff7ed" };
                      return [
                        <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: leaveTypeBg[l.leaveType] || "#f1f5f9", color: leaveTypeColors[l.leaveType] || "#64748b" }}>{(l.leaveType||"").charAt(0).toUpperCase()+(l.leaveType||"").slice(1)}</span>,
                        l.startDate ? new Date(l.startDate).toLocaleDateString() : "—",
                        l.endDate ? new Date(l.endDate).toLocaleDateString() : "—",
                        l.totalDays || 1,
                        l.reason || "—",
                        <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: l.status === "approved" ? "#f0fdf4" : l.status === "rejected" ? "#fef2f2" : "#fffbeb", color: l.status === "approved" ? "#16a34a" : l.status === "rejected" ? "#dc2626" : "#f59e0b" }}>{(l.status||"").charAt(0).toUpperCase()+(l.status||"").slice(1)}</span>,
                        l.ownerNotes || "—"
                      ];
                    })}
                  />
                </Card>
              )}
              {leaveRequestModal && (
                <Modal title="Request Leave" onClose={() => setLeaveRequestModal(false)} width={480}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                    <FormField label="Leave Type *">
                      <Select value={leaveRequestForm.leaveType} onChange={e => setLeaveRequestForm(p => ({ ...p, leaveType: e.target.value }))}>
                        <option value="sick">Sick Leave</option>
                        <option value="vacation">Vacation</option>
                        <option value="personal">Personal</option>
                        <option value="unpaid">Unpaid Leave</option>
                        <option value="emergency">Emergency</option>
                      </Select>
                    </FormField>
                    <div />
                    <FormField label="Start Date *"><Input type="date" value={leaveRequestForm.startDate} onChange={e => setLeaveRequestForm(p => ({ ...p, startDate: e.target.value }))} /></FormField>
                    <FormField label="End Date *"><Input type="date" value={leaveRequestForm.endDate} onChange={e => setLeaveRequestForm(p => ({ ...p, endDate: e.target.value }))} /></FormField>
                  </div>
                  {leaveRequestForm.startDate && leaveRequestForm.endDate && (
                    <div style={{ fontSize: 12, color: "#2563eb", marginBottom: 4 }}>{Math.max(1, Math.round((new Date(leaveRequestForm.endDate) - new Date(leaveRequestForm.startDate)) / 86400000) + 1)} day(s) requested</div>
                  )}
                  <FormField label="Reason *"><Input value={leaveRequestForm.reason} onChange={e => setLeaveRequestForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Medical appointment, family event" /></FormField>
                  {leaveRequestError && <div style={{ fontSize: 12, color: "#dc2626" }}>{leaveRequestError}</div>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn onClick={async () => {
                      if (!leaveRequestForm.startDate || !leaveRequestForm.endDate || !leaveRequestForm.reason) { setLeaveRequestError("Start date, end date, and reason are required."); return; }
                      setLeaveRequestSaving(true); setLeaveRequestError("");
                      try {
                        const res = await apiFetch("/api/owner/coach-leaves/request", { method: "POST", body: JSON.stringify(leaveRequestForm) });
                        const totalDays = Math.max(1, Math.round((new Date(leaveRequestForm.endDate) - new Date(leaveRequestForm.startDate)) / 86400000) + 1);
                        setMyLeaves(prev => [{ ...leaveRequestForm, _id: res.id, status: "pending", totalDays }, ...prev]);
                        setLeaveRequestModal(false);
                      } catch (e) { setLeaveRequestError(e.message || "Failed to submit request."); }
                      finally { setLeaveRequestSaving(false); }
                    }} disabled={leaveRequestSaving}>{leaveRequestSaving ? "Submitting…" : "Submit Request"}</Btn>
                    <Btn variant="ghost" onClick={() => setLeaveRequestModal(false)}>Cancel</Btn>
                  </div>
                </Modal>
              )}
            </div>
          )}

          {page === "salary" && (() => {
            const baseSalaryText = profile?.salaryModel || coach?.salaryModel || "Not set";
            const baseSalaryNum = parseFloat(String(baseSalaryText).replace(/[^0-9.]/g, "")) || 0;
            const now = new Date();
            const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const lastMonth = (() => { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();
            const monthAdvances = salaryAdvances.filter((a) => (a.date || "").startsWith(thisMonth));
            const lastMonthAdvances = salaryAdvances.filter((a) => (a.date || "").startsWith(lastMonth));
            const totalAdvancesThisMonth = monthAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const totalAdvancesLastMonth = lastMonthAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const totalAdvancesAllTime = salaryAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const deducted = salaryAdvances.filter((a) => a.status === "deducted").reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const pending = salaryAdvances.filter((a) => a.status === "pending").reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const approved = salaryAdvances.filter((a) => a.status === "approved").reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const netPay = Math.max(0, baseSalaryNum - totalAdvancesThisMonth);
            const pendingCount = salaryAdvances.filter((a) => a.status === "pending").length;
            const approvedCount = salaryAdvances.filter((a) => a.status === "approved").length;

            // Monthly timeline — last 6 months
            const monthlyHistory = Array.from({ length: 6 }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
              const advances = salaryAdvances.filter((a) => (a.date || "").startsWith(key)).reduce((s, a) => s + Number(a.amount || 0), 0);
              return { label, key, advances, net: Math.max(0, baseSalaryNum - advances) };
            });
            const maxNet = Math.max(1, ...monthlyHistory.map((m) => m.net || baseSalaryNum || 1));

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Export toolbar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {salaryAdvances.length} advance records &bull; {pendingCount} pending approval
                  </div>
                  <ExportButtonGroup>
                    <SpreadsheetExportButton compact onClick={exportSalaryExcel} label="Salary" />
                    <ReportExportButton compact onClick={exportSalaryPdf} label="Salary" />
                  </ExportButtonGroup>
                </div>

                {/* Stat cards */}
                <div style={{ ...responsiveGrid(isMobile, "repeat(5,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 14 }}>
                  <StatCard label="Base Salary" value={baseSalaryNum ? `LKR ${baseSalaryNum.toLocaleString()}` : "See Model"} accent={coachAccent} />
                  <StatCard label="Net Pay This Month" value={`LKR ${netPay.toLocaleString()}`} accent="#16a34a" />
                  <StatCard label="Advances This Month" value={`LKR ${totalAdvancesThisMonth.toLocaleString()}`} accent="#f59e0b" />
                  <StatCard label="Pending Approval" value={`LKR ${pending.toLocaleString()}`} accent={pendingCount > 0 ? "#dc2626" : "#64748b"} />
                  <StatCard label="Total Deducted" value={`LKR ${deducted.toLocaleString()}`} accent="#7c3aed" />
                </div>

                {/* Salary model + employment info */}
                <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 16 }}>
                  <Card>
                    <SectionHeader title="Salary Model" />
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.8, marginBottom: 14 }}>{baseSalaryText}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span style={{ color: "var(--muted)" }}>Employment Type</span>
                        <span style={{ fontWeight: 600 }}>{profile?.employmentType || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span style={{ color: "var(--muted)" }}>Shift Schedule</span>
                        <span style={{ fontWeight: 600 }}>{profile?.shiftSchedule || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span style={{ color: "var(--muted)" }}>Hire Date</span>
                        <span style={{ fontWeight: 600 }}>{profile?.hireDate || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--muted)" }}>Bank / Payment Details</span>
                        <span style={{ fontWeight: 600, textAlign: "right", maxWidth: 180 }}>{profile?.bankPaymentDetails || "—"}</span>
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <SectionHeader title="This Month Breakdown" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span style={{ color: "var(--muted)" }}>Gross Pay</span>
                        <span style={{ fontWeight: 700, color: "#16a34a" }}>LKR {baseSalaryNum.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span style={{ color: "var(--muted)" }}>Advances ({monthAdvances.length})</span>
                        <span style={{ fontWeight: 700, color: "#dc2626" }}>− LKR {totalAdvancesThisMonth.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span style={{ color: "var(--muted)" }}>Last Month Advances</span>
                        <span style={{ fontWeight: 600, color: "#f59e0b" }}>LKR {totalAdvancesLastMonth.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, paddingTop: 4 }}>
                        <span style={{ fontWeight: 700 }}>Net Pay Estimate</span>
                        <span style={{ fontWeight: 800, color: coachAccent, fontSize: 15 }}>LKR {netPay.toLocaleString()}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* 6-month net pay trend */}
                {baseSalaryNum > 0 && (
                  <Card>
                    <SectionHeader title="6-Month Net Pay Trend" />
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 90, padding: "0 4px" }}>
                      {monthlyHistory.map((m, i) => (
                        <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>
                            LKR {(m.net / 1000).toFixed(0)}k
                          </div>
                          <div style={{
                            width: "100%",
                            height: `${Math.round((m.net / maxNet) * 60)}px`,
                            minHeight: 6,
                            borderRadius: "4px 4px 0 0",
                            background: i === 5 ? coachAccent : "#e2e8f0",
                            transition: "height 0.3s"
                          }} />
                          <div style={{ fontSize: 10, color: i === 5 ? coachAccent : "var(--muted)", fontWeight: i === 5 ? 700 : 400 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                      Advances this month: LKR {totalAdvancesThisMonth.toLocaleString()} &bull; All-time total advances: LKR {totalAdvancesAllTime.toLocaleString()}
                    </div>
                  </Card>
                )}

                {/* Advance status breakdown */}
                {salaryAdvances.length > 0 && (
                  <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)"), gap: 14 }}>
                    <div style={{ padding: "16px 18px", borderRadius: 16, background: "#fffbeb", border: "1px solid #fde68a" }}>
                      <div style={{ fontSize: 11, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Pending</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#d97706" }}>LKR {pending.toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: "#a16207", marginTop: 4 }}>{pendingCount} advance{pendingCount !== 1 ? "s" : ""} awaiting review</div>
                    </div>
                    <div style={{ padding: "16px 18px", borderRadius: 16, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                      <div style={{ fontSize: 11, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Approved</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb" }}>LKR {approved.toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: "#1d4ed8", marginTop: 4 }}>{approvedCount} advance{approvedCount !== 1 ? "s" : ""} approved</div>
                    </div>
                    <div style={{ padding: "16px 18px", borderRadius: 16, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                      <div style={{ fontSize: 11, color: "#14532d", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Deducted</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>LKR {deducted.toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}>Already deducted from pay</div>
                    </div>
                  </div>
                )}

                {/* My payslips */}
                <Card style={{ padding: 0 }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>My Payslips</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{myPayslips.length} record{myPayslips.length !== 1 ? "s" : ""}</div>
                  </div>
                  {myPayslipsLoading ? (
                    <div style={{ padding: 20, fontSize: 13, color: "var(--muted)" }}>Loading payslips…</div>
                  ) : myPayslips.length === 0 ? (
                    <div style={{ padding: 20, fontSize: 13, color: "var(--muted)" }}>No payroll records yet. Your payslips will appear here once your gym generates monthly payroll.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {myPayslips.map((r, i) => (
                        <div key={r._id || r.id || i} style={{ padding: "13px 20px", borderBottom: i < myPayslips.length - 1 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{r.month}</span>
                              <Badge label={r.status} type={r.status === "paid" ? "success" : r.status === "approved" ? "info" : "warning"} />
                            </div>
                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Net Pay: LKR {Number(r.netPay || 0).toLocaleString()}</div>
                          </div>
                          <Btn small variant="ghost" onClick={() => downloadMyPayslipPdf(r)}>↓ Download Slip</Btn>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Advance history table */}
                <Card style={{ padding: 0 }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>Advance History</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {salaryAdvances.length} record{salaryAdvances.length !== 1 ? "s" : ""} &bull; Total LKR {totalAdvancesAllTime.toLocaleString()}
                    </div>
                  </div>
                  {salaryAdvances.length === 0 ? (
                    <div style={{ padding: 20, fontSize: 13, color: "var(--muted)" }}>No salary advances recorded.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {[...salaryAdvances].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).map((adv, i) => (
                        <div key={adv.id || i} style={{ padding: "13px 20px", borderBottom: i < salaryAdvances.length - 1 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>LKR {Number(adv.amount || 0).toLocaleString()}</span>
                              <Badge label={adv.status} type={adv.status === "deducted" ? "success" : adv.status === "approved" ? "info" : "warning"} />
                            </div>
                            {adv.reason && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{adv.reason}</div>}
                            {adv.note && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontStyle: "italic" }}>"{adv.note}"</div>}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "right", flexShrink: 0 }}>
                            {adv.date ? new Date(adv.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            );
          })()}

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
                          <Btn
                            small
                            danger
                            onClick={() => setMealForm((prev) => ({
                              ...prev,
                              meals: prev.meals.filter((_, mealIndex) => mealIndex !== index)
                            }))}
                          >
                            Remove
                          </Btn>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <Input
                          value={meal.time}
                          onChange={(e) => setMealForm((prev) => ({
                            ...prev,
                            meals: prev.meals.map((item, mealIndex) => mealIndex === index ? { ...item, time: e.target.value } : item)
                          }))}
                          placeholder="Time, e.g. 7:30 AM"
                        />
                        <Input
                          value={meal.name}
                          onChange={(e) => setMealForm((prev) => ({
                            ...prev,
                            meals: prev.meals.map((item, mealIndex) => mealIndex === index ? { ...item, name: e.target.value } : item)
                          }))}
                          placeholder="Meal name, e.g. Breakfast"
                        />
                        <Input
                          value={meal.foods}
                          onChange={(e) => setMealForm((prev) => ({
                            ...prev,
                            meals: prev.meals.map((item, mealIndex) => mealIndex === index ? { ...item, foods: e.target.value } : item)
                          }))}
                          placeholder="Foods, comma separated"
                        />
                      </div>
                    </div>
                  ))}
                  <Btn
                    small
                    variant="ghost"
                    onClick={() => setMealForm((prev) => ({
                      ...prev,
                      meals: [...prev.meals, { time: "", name: "", foods: "" }]
                    }))}
                  >
                    + Add Meal
                  </Btn>
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
          {viewMemberModal && (
            <Modal title={`👁️ ${viewMemberModal.name}`} onClose={() => setViewMemberModal(null)} width={720} subtitle="Full member details">
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                  <InfoTile label="Phone" value={viewMemberModal.phone || "—"} tone="#2563eb" soft="#eff6ff" />
                  <InfoTile label="Email" value={viewMemberModal.email || "—"} tone="#7c3aed" soft="#f5f3ff" />
                  <InfoTile label="Gender" value={viewMemberModal.gender || "—"} tone={coachAccent} soft={coachAccentSoft} />
                  <InfoTile label="Date of Birth" value={viewMemberModal.dateOfBirth || "—"} tone="#f59e0b" soft="#fffbeb" />
                  <InfoTile label="Height" value={viewMemberModal.heightCm ? `${viewMemberModal.heightCm} cm` : "—"} tone="#ea580c" soft="#fff7ed" />
                  <InfoTile label="Current Weight" value={viewMemberModal.currentWeightKg ? `${viewMemberModal.currentWeightKg} kg` : "—"} tone="#dc2626" soft="#fef2f2" />
                  <InfoTile label="Target Weight" value={viewMemberModal.targetWeightKg ? `${viewMemberModal.targetWeightKg} kg` : "—"} tone="#16a34a" soft="#f0fdf4" />
                  <InfoTile label="BMI" value={viewMemberModal.bmi ? String(viewMemberModal.bmi) : "—"} tone="#0891b2" soft="#ecfeff" />
                  <InfoTile label="Body Fat %" value={viewMemberModal.bodyFatPercentage ? `${viewMemberModal.bodyFatPercentage}%` : "—"} tone="#7c3aed" soft="#f5f3ff" />
                  <InfoTile label="Fitness Level" value={viewMemberModal.fitnessLevel || "—"} tone={coachAccent} soft={coachAccentSoft} />
                  <InfoTile label="Goal" value={viewMemberModal.goal || "—"} tone="#2563eb" soft="#eff6ff" />
                  <InfoTile label="Plan" value={viewMemberModal.plan || "—"} tone="#f59e0b" soft="#fffbeb" />
                  <InfoTile label="Payment Status" value={viewMemberModal.paymentStatus || "—"} tone={viewMemberModal.paymentStatus === "paid" ? "#16a34a" : "#dc2626"} soft={viewMemberModal.paymentStatus === "paid" ? "#f0fdf4" : "#fef2f2"} />
                  <InfoTile label="Amount Paid / Due" value={`${viewMemberModal.amountPaid ?? 0} / ${viewMemberModal.amountDue ?? 0}`} tone="#ea580c" soft="#fff7ed" />
                  <InfoTile label="Expires" value={viewMemberModal.planExpiresAt || "—"} tone="#7c3aed" soft="#f5f3ff" />
                  <InfoTile label="Workout Plan" value={viewMemberModal.assignedWorkoutPlanName || "Not assigned"} tone="#2563eb" soft="#eff6ff" />
                  <InfoTile label="Meal Plan" value={viewMemberModal.assignedMealPlanName || viewMemberModal.dietPlanName || "Not assigned"} tone={coachAccent} soft={coachAccentSoft} />
                  <InfoTile label="Emergency Contact" value={viewMemberModal.emergencyContact || "—"} tone="#dc2626" soft="#fef2f2" />
                </div>
                {viewMemberModal.address && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Address</div>
                    <div style={{ fontSize: 14, color: "#334155" }}>{viewMemberModal.address}</div>
                  </div>
                )}
                {viewMemberModal.medicalNotes && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
                    <div style={{ fontSize: 11, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Medical Notes</div>
                    <div style={{ fontSize: 14, color: "#334155" }}>{viewMemberModal.medicalNotes}</div>
                  </div>
                )}
              </div>
            </Modal>
          )}

          {subscriptionModal && (
            <Modal title={`💳 Subscription — ${subscriptionModal.name}`} onClose={() => setSubscriptionModal(null)} width={560}>
              <FormField label="Membership Plan">
                <Select value={subscriptionForm.plan} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, plan: e.target.value }))}>
                  <option value="">Select plan</option>
                  {membershipPlans.map((p) => <option key={p.id} value={p.name}>{p.name} ({p.durationMonths} mo)</option>)}
                </Select>
              </FormField>
              <FormField label="Duration (months)"><Input type="number" value={subscriptionForm.durationMonths} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, durationMonths: e.target.value }))} /></FormField>
              <FormField label="Amount Paid (LKR)"><Input type="number" value={subscriptionForm.amountPaid} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, amountPaid: e.target.value }))} /></FormField>
              <FormField label="Payment Method"><Input value={subscriptionForm.paymentMethod} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, paymentMethod: e.target.value }))} placeholder="Cash, Card, Bank Transfer..." /></FormField>
              <FormField label="Note (optional)"><Input value={subscriptionForm.note} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, note: e.target.value }))} /></FormField>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveSubscription}>💾 Save Subscription</Btn>
                <Btn variant="ghost" onClick={() => setSubscriptionModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {createMemberModal && (
            <Modal title="➕ Add Member" onClose={() => setCreateMemberModal(false)} width={560}>
              <FormField label="Full Name"><Input value={createMemberForm.name} onChange={(e) => setCreateMemberForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
              <FormField label="Email"><Input type="email" value={createMemberForm.email} onChange={(e) => setCreateMemberForm((prev) => ({ ...prev, email: e.target.value }))} /></FormField>
              <FormField label="Membership Plan">
                <Select value={createMemberForm.plan} onChange={(e) => setCreateMemberForm((prev) => ({ ...prev, plan: e.target.value }))}>
                  <option value="">Select plan</option>
                  {membershipPlans.map((p) => <option key={p.id} value={p.name}>{p.name} ({p.durationMonths} mo)</option>)}
                </Select>
              </FormField>
              <FormField label="Goal"><Input value={createMemberForm.goal} onChange={(e) => setCreateMemberForm((prev) => ({ ...prev, goal: e.target.value }))} placeholder="Weight loss, Muscle gain..." /></FormField>
              <FormField label="Duration (months)"><Input type="number" value={createMemberForm.durationMonths} onChange={(e) => setCreateMemberForm((prev) => ({ ...prev, durationMonths: e.target.value }))} /></FormField>
              <FormField label="Amount Paid (LKR)"><Input type="number" value={createMemberForm.amountPaid} onChange={(e) => setCreateMemberForm((prev) => ({ ...prev, amountPaid: e.target.value }))} /></FormField>
              <FormField label="Payment Method"><Input value={createMemberForm.paymentMethod} onChange={(e) => setCreateMemberForm((prev) => ({ ...prev, paymentMethod: e.target.value }))} placeholder="Cash, Card..." /></FormField>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveCreateMember}>✅ Create Member</Btn>
                <Btn variant="ghost" onClick={() => setCreateMemberModal(false)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {profileModal && (
            <Modal title="Edit Coach Profile" onClose={() => setProfileModal(false)}>
              <FormField label="Name"><Input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
              <FormField label="Email"><Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} /></FormField>
              <FormField label="Phone"><Input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} /></FormField>
              <FormField label="Title"><Input value={profileForm.title} onChange={(e) => setProfileForm((prev) => ({ ...prev, title: e.target.value }))} /></FormField>
              <FormField label="Specialty"><Input value={profileForm.specialty} onChange={(e) => setProfileForm((prev) => ({ ...prev, specialty: e.target.value }))} /></FormField>
              <FormField label="Employee Code"><Input value={profileForm.employeeCode} onChange={(e) => setProfileForm((prev) => ({ ...prev, employeeCode: e.target.value }))} /></FormField>
              <FormField label="Date Of Birth"><Input type="date" value={profileForm.dateOfBirth} onChange={(e) => setProfileForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))} /></FormField>
              <FormField label="Gender"><Input value={profileForm.gender} onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: e.target.value }))} /></FormField>
              <FormField label="Address"><TextArea rows={2} value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} /></FormField>
              <FormField label="NIC / National ID"><Input value={profileForm.nationalId} onChange={(e) => setProfileForm((prev) => ({ ...prev, nationalId: e.target.value }))} /></FormField>
              <FormField label="Hire Date"><Input type="date" value={profileForm.hireDate} onChange={(e) => setProfileForm((prev) => ({ ...prev, hireDate: e.target.value }))} /></FormField>
              <FormField label="Employment Type"><Input value={profileForm.employmentType} onChange={(e) => setProfileForm((prev) => ({ ...prev, employmentType: e.target.value }))} /></FormField>
              <FormField label="Salary / Commission Model"><Input value={profileForm.salaryModel} onChange={(e) => setProfileForm((prev) => ({ ...prev, salaryModel: e.target.value }))} /></FormField>
              <FormField label="Shift Schedule"><Input value={profileForm.shiftSchedule} onChange={(e) => setProfileForm((prev) => ({ ...prev, shiftSchedule: e.target.value }))} /></FormField>
              <FormField label="Specializations"><TextArea rows={2} value={profileForm.specializations} onChange={(e) => setProfileForm((prev) => ({ ...prev, specializations: e.target.value }))} placeholder="Comma separated" /></FormField>
              <FormField label="Years Of Experience"><Input type="number" min="0" value={profileForm.yearsOfExperience} onChange={(e) => setProfileForm((prev) => ({ ...prev, yearsOfExperience: e.target.value }))} /></FormField>
              <FormField label="Languages"><Input value={profileForm.languages} onChange={(e) => setProfileForm((prev) => ({ ...prev, languages: e.target.value }))} placeholder="Comma separated" /></FormField>
              <FormField label="Certification Expiry Dates"><Input value={profileForm.certificationExpiryDates} onChange={(e) => setProfileForm((prev) => ({ ...prev, certificationExpiryDates: e.target.value }))} placeholder="Comma separated dates" /></FormField>
              <FormField label="Available Hours"><Input value={profileForm.availableHours} onChange={(e) => setProfileForm((prev) => ({ ...prev, availableHours: e.target.value }))} /></FormField>
              <FormField label="Max Client Capacity"><Input type="number" min="0" value={profileForm.maxClientCapacity} onChange={(e) => setProfileForm((prev) => ({ ...prev, maxClientCapacity: e.target.value }))} /></FormField>
              <FormField label="Certifications"><TextArea rows={3} value={profileForm.certifications} onChange={(e) => setProfileForm((prev) => ({ ...prev, certifications: e.target.value }))} /></FormField>
              <FormField label="Performance Notes"><TextArea rows={3} value={profileForm.performanceNotes} onChange={(e) => setProfileForm((prev) => ({ ...prev, performanceNotes: e.target.value }))} /></FormField>
              <FormField label="Bank / Payment Details"><TextArea rows={2} value={profileForm.bankPaymentDetails} onChange={(e) => setProfileForm((prev) => ({ ...prev, bankPaymentDetails: e.target.value }))} /></FormField>
              <FormField label="Emergency Contact"><Input value={profileForm.emergencyContact} onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContact: e.target.value }))} /></FormField>
              <FormField label="Documents"><TextArea rows={2} value={profileForm.documents} onChange={(e) => setProfileForm((prev) => ({ ...prev, documents: e.target.value }))} placeholder="Comma separated" /></FormField>
              <FormField label="Bio"><TextArea rows={4} value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} /></FormField>
              <ProfilePhotoField
                file={profileForm.profileImageFile}
                onChange={(file) => setProfileForm((prev) => ({ ...prev, profileImageFile: file }))}
                currentImageUrl={profile?.profileImageUrl || ""}
                initials={coach?.avatar || "CH"}
                color="#16a34a"
              />
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveProfile}>&#x2713; Save Profile</Btn>
                <Btn variant="ghost" onClick={() => setProfileModal(false)}>Cancel</Btn>
              </div>
            </Modal>
          )}

        </>
      )}
    </DashboardShell>
  );
}
