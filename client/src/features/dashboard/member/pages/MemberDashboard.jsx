import React from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useDashboard } from "../../context/DashboardContext";
import { useAuth } from "../../../auth/context/AuthContext";
import {
  Avatar,
  StatCard,
  Badge,
  Modal,
  FormField,
  Input,
  TextArea,
  Btn,
  BarChart,
  MiniChart,
  ProgressBar,
  RingStat,
  Table,
  SectionHeader,
  Card
} from "../../../../components/shared";
import { PAGE_SIZE } from "../../shared/lib/constants";
import { useIsMobile, responsiveGrid, useNotificationReadState } from "../../shared/lib/hooks";
import { paginateItems, lastMetricValue, metricDelta, metricValue, targetProgress, toMealEntries } from "../../shared/lib/formatters";
import { addPdfHeader, getPdfTableConfig, finalizePdf } from "../../shared/lib/pdf";
import { DashboardStatus, NotificationBell, DashboardShell } from "../../shared/components/DashboardShell";
import { EmptyState, ExportButtonGroup, MessageBubble, ReportExportButton, SpreadsheetExportButton, InfoTile, ProfileSection, DetailStack, PaginationControls } from "../../shared/components/common";
import { ProfileHeroCard } from "../../shared/components/management";
import { MacroPill, MealTimelineItem } from "../../shared/components/plans";

export default function MemberDash() {
  const { user, logout } = useAuth();
  const { data, error, editMyProfile, updateMyWorkoutProgress, checkInMember, clockOutMember, sendMessage, markMessagesRead } = useDashboard();
  const isMobile = useIsMobile();
  const memberAccent = "#0f766e";
  const memberAccentSoft = "#ecfeff";
  const memberAccentMid = "#14b8a6";
  const [page, setPage] = React.useState("dashboard");
  const [notificationPage, setNotificationPage] = React.useState(1);
  const [checkInHistoryPage, setCheckInHistoryPage] = React.useState(1);
  const [messageDraft, setMessageDraft] = React.useState("");
  const [profileModal, setProfileModal] = React.useState(false);
  const [profileModalTab, setProfileModalTab] = React.useState("personal");
  const [workoutLogDraft, setWorkoutLogDraft] = React.useState([]);
  const [savingWorkoutLog, setSavingWorkoutLog] = React.useState(false);
  const [workoutSaved, setWorkoutSaved] = React.useState(false);
  const [workoutSaveError, setWorkoutSaveError] = React.useState("");
  const [sessionElapsed, setSessionElapsed] = React.useState(0);
  const [profileForm, setProfileForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    title: "",
    goal: "",
    emergencyContact: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    medicalNotes: "",
    fitnessLevel: "",
    preferredWorkoutTime: "",
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
  });
  const notificationState = useNotificationReadState(`member-${user?.id}`, data ? (data.notifications || []) : null, data?.readNotificationIds);
  const unreadMemberMessageIds = (data?.messages || [])
    .filter((message) => message.unread && message.recipientRole === "member")
    .map((message) => message.id);
  const unreadMemberMessageKey = unreadMemberMessageIds.join(",");
  const workoutExercisesForDraft = React.useMemo(
    () => Array.isArray(data?.myWorkoutPlan?.today?.exercises)
      ? data.myWorkoutPlan.today.exercises.filter(Boolean)
      : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(data?.myWorkoutPlan?.today?.exercises)]
  );

  React.useEffect(() => {
    if (page !== "messages" || !unreadMemberMessageKey) {
      return;
    }

    markMessagesRead(unreadMemberMessageIds).catch(() => {});
  }, [page, unreadMemberMessageKey, markMessagesRead]);

  React.useEffect(() => {
    setWorkoutLogDraft(workoutExercisesForDraft.map((exercise) => ({
      done: Boolean(exercise.done),
      loggedWeight: exercise.loggedWeight || "",
      completionNotes: exercise.completionNotes || ""
    })));
  }, [workoutExercisesForDraft]);

  React.useEffect(() => {
    if (!data) return;
    const openSession = (Array.isArray(data?.attendance) ? data.attendance : []).find((s) => s.status === "checked-in");
    if (!openSession?.checkInAt) {
      setSessionElapsed(0);
      return;
    }
    const tick = () => setSessionElapsed(Math.floor((Date.now() - new Date(openSession.checkInAt).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data]);

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  function formatElapsed(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  if (!data) {
    return <DashboardStatus error={error} />;
  }

  const safeProfile = data?.profile && typeof data.profile === "object" ? data.profile : null;
  const safeCoachRecord = data?.coach && typeof data.coach === "object" ? data.coach : null;
  const safeMemberRecord = data?.member && typeof data.member === "object" ? data.member : null;
  const profile = safeProfile;
  const coach = safeCoachRecord;
  const member = safeMemberRecord;
  const myWorkoutPlan = data?.myWorkoutPlan && typeof data.myWorkoutPlan === "object" ? data.myWorkoutPlan : null;
  const myMealPlan = data?.myMealPlan && typeof data.myMealPlan === "object" ? data.myMealPlan : null;
  const myStats = data?.myStats && typeof data.myStats === "object" ? data.myStats : null;
  const announcements = Array.isArray(data?.announcements) ? data.announcements.filter(Boolean) : [];
  const attendance = Array.isArray(data?.attendance) ? data.attendance.filter(Boolean) : [];
  const notifications = Array.isArray(data?.notifications) ? data.notifications.filter(Boolean) : [];
  const messages = Array.isArray(data?.messages) ? data.messages.filter(Boolean) : [];
  const workoutToday = myWorkoutPlan?.today && typeof myWorkoutPlan.today === "object" ? myWorkoutPlan.today : null;
  const workoutExercises = Array.isArray(workoutToday?.exercises) ? workoutToday.exercises.filter(Boolean) : [];
  const mealEntries = Array.isArray(myMealPlan?.meals) ? myMealPlan.meals.filter(Boolean) : [];
  const hasMemberRecord = Boolean(safeMemberRecord);
  const hasWorkoutPlan = Boolean(myWorkoutPlan && workoutToday);
  const hasMealPlan = Boolean(myMealPlan);
  const hasStats = Boolean(myStats);
  const safeMember = safeMemberRecord || { avatar: "MB", name: "Member", plan: "Pending", goal: "", progress: 0 };
  const safeStats = myStats || { weight: [0], bodyFat: [0], benchPress: [0], labels: [], checkInsThisMonth: 0, streak: 0, totalCheckIns: 0 };
  const workoutDone = workoutExercises.filter((exercise) => exercise.done).length;
  const macros = mealEntries.reduce((acc, meal) => ({
    cals: acc.cals + Number(meal?.cals || 0),
    protein: acc.protein + Number(meal?.protein || 0),
    carbs: acc.carbs + Number(meal?.carbs || 0),
    fat: acc.fat + Number(meal?.fat || 0)
  }), { cals: 0, protein: 0, carbs: 0, fat: 0 });
  const pagedNotifications = paginateItems(notifications, notificationPage);
  const pagedCheckIn = paginateItems(attendance, checkInHistoryPage);
  const openAttendanceSession = attendance.find((session) => session.status === "checked-in");
  const currentWeightValue = metricValue(safeStats.weight);
  const currentBodyFatValue = metricValue(safeStats.bodyFat);
  const currentBenchValue = metricValue(safeStats.benchPress);
  const weightDelta = metricDelta(safeStats.weight);
  const bodyFatDelta = metricDelta(safeStats.bodyFat);
  const benchDelta = metricDelta(safeStats.benchPress);
  const weightProgress = targetProgress(safeProfile?.currentWeightKg, safeProfile?.targetWeightKg, (safeMemberRecord?.goal || "").includes("Gain") || ["Strength", "Powerlifting", "Performance"].includes(safeMemberRecord?.goal) ? "up" : "down");
  const bodyFatProgress = targetProgress(safeProfile?.currentWeightKg != null && safeProfile?.targetBodyFat != null ? currentBodyFatValue : null, safeProfile?.targetBodyFat, "down");
  const unreadCoachMessages = messages.filter((message) => message.unread && message.recipientRole === "member").length;
  const memberProfileDetails = [
    { label: "Date Of Birth", value: profile?.dateOfBirth || "Not set" },
    { label: "Gender", value: profile?.gender || "Not set" },
    { label: "Address", value: profile?.address || "Not set" },
    { label: "Fitness Level", value: profile?.fitnessLevel || "Not set" },
    { label: "Preferred Workout Time", value: profile?.preferredWorkoutTime || "Not set" },
    { label: "Join Source", value: profile?.joinSource || "Not set" },
    { label: "Renewal Reminder Preference", value: profile?.renewalReminderPreference || "Not set" },
    { label: "Emergency Contact Relationship", value: profile?.emergencyContactRelationship || "Not set" },
    { label: "Assigned Locker", value: profile?.assignedLocker || "Not set" },
    { label: "Member Tag", value: profile?.memberTag || "Not set" },
    { label: "Barcode", value: profile?.barcode || "Not set" }
  ];
  const memberHealthDetails = [
    { label: "Payment Method", value: profile?.paymentMethod || "Not set" },
    { label: "Membership Freeze Status", value: profile?.membershipFreezeStatus || "Not set" },
    { label: "Goal Target Date", value: profile?.goalTargetDate || "Not set" },
    { label: "Body Fat Percentage", value: profile?.bodyFatPercentage != null ? `${profile.bodyFatPercentage}%` : "Not set" },
    { label: "BMI", value: profile?.bmi != null ? String(profile.bmi) : "Not set" },
    { label: "Waist To Hip Ratio", value: profile?.waistToHipRatio != null ? String(profile.waistToHipRatio) : "Not set" },
    { label: "Medical Notes", value: profile?.medicalNotes || "Not set" },
    { label: "Attendance Notes", value: profile?.attendanceNotes || "Not set" },
    { label: "Supplement Usage", value: profile?.supplementUsage || "Not set" },
    { label: "Progress Photos", value: Array.isArray(profile?.progressPhotos) && profile.progressPhotos.length ? profile.progressPhotos.join(", ") : "Not set" }
  ];
  const renewalDate = profile?.planExpiresAt ? new Date(profile.planExpiresAt) : null;
  const renewalDaysLeft = renewalDate && !Number.isNaN(renewalDate.getTime())
    ? Math.ceil((renewalDate.getTime() - Date.now()) / 86400000)
    : null;
  const goalDate = profile?.goalTargetDate ? new Date(profile.goalTargetDate) : null;
  const goalDaysLeft = goalDate && !Number.isNaN(goalDate.getTime())
    ? Math.ceil((goalDate.getTime() - Date.now()) / 86400000)
    : null;
  const workoutCompletionRatio = workoutExercises.length ? Math.round((workoutDone / workoutExercises.length) * 100) : 0;
  const goalProgressValues = [weightProgress, bodyFatProgress].filter((value) => Number.isFinite(value) && value > 0);
  const overallGoalProgress = goalProgressValues.length
    ? Math.round(goalProgressValues.reduce((sum, value) => sum + value, 0) / goalProgressValues.length)
    : Math.max(0, Number(safeMember.progress || 0));
  const renewalTone = renewalDaysLeft == null ? "default" : renewalDaysLeft < 0 ? "inactive" : renewalDaysLeft <= 7 ? "warning" : "success";
  const renewalLabel = renewalDaysLeft == null
    ? "No renewal date"
    : renewalDaysLeft < 0
      ? "Expired"
      : renewalDaysLeft === 0
        ? "Ends today"
        : `${renewalDaysLeft} days left`;
  const workoutSessionStatus = workoutCompletionRatio === 100 ? "Complete" : workoutCompletionRatio >= 50 ? "In Progress" : "Not Started";

  function openProfileModal() {
    setProfileForm({
      name: safeProfile?.name || safeMemberRecord?.name || "",
      email: safeProfile?.email || "",
      phone: safeProfile?.phone || "",
      bio: safeProfile?.bio || "",
      title: safeProfile?.title || "",
      goal: safeProfile?.goal || safeMemberRecord?.goal || "",
      emergencyContact: safeProfile?.emergencyContact || safeMemberRecord?.emergencyContact || "",
      dateOfBirth: safeProfile?.dateOfBirth || "",
      gender: safeProfile?.gender || "",
      address: safeProfile?.address || "",
      medicalNotes: safeProfile?.medicalNotes || "",
      fitnessLevel: safeProfile?.fitnessLevel || "",
      preferredWorkoutTime: safeProfile?.preferredWorkoutTime || "",
      emergencyContactRelationship: safeProfile?.emergencyContactRelationship || "",
      joinSource: safeProfile?.joinSource || "",
      renewalReminderPreference: safeProfile?.renewalReminderPreference || "",
      attendanceNotes: safeProfile?.attendanceNotes || "",
      assignedLocker: safeProfile?.assignedLocker || "",
      memberTag: safeProfile?.memberTag || "",
      barcode: safeProfile?.barcode || "",
      progressPhotos: Array.isArray(safeProfile?.progressPhotos) ? safeProfile.progressPhotos.join(", ") : "",
      bodyFatPercentage: safeProfile?.bodyFatPercentage ?? "",
      bmi: safeProfile?.bmi ?? "",
      waistToHipRatio: safeProfile?.waistToHipRatio ?? "",
      supplementUsage: safeProfile?.supplementUsage || "",
      paymentMethod: safeProfile?.paymentMethod || "",
      membershipFreezeStatus: safeProfile?.membershipFreezeStatus || "",
      goalTargetDate: safeProfile?.goalTargetDate || "",
      heightCm: safeProfile?.heightCm ?? safeMemberRecord?.heightCm ?? "",
      currentWeightKg: safeProfile?.currentWeightKg ?? "",
      targetWeightKg: safeProfile?.targetWeightKg ?? "",
      targetBodyFat: safeProfile?.targetBodyFat ?? "",
      personalNotes: safeProfile?.personalNotes || "",
      chestCm: safeProfile?.bodyMeasurements?.chestCm ?? "",
      waistCm: safeProfile?.bodyMeasurements?.waistCm ?? "",
      armsCm: safeProfile?.bodyMeasurements?.armsCm ?? "",
      thighsCm: safeProfile?.bodyMeasurements?.thighsCm ?? ""
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

  async function handleMemberAttendanceAction() {
    if (!safeMemberRecord?.id) {
      return;
    }

    if (openAttendanceSession) {
      await clockOutMember(openAttendanceSession.id);
      return;
    }

    await checkInMember({ gymId: user.gymId, memberId: safeMemberRecord.id });
  }

  async function submitMemberMessage() {
    if (!String(messageDraft || "").trim()) {
      return;
    }

    await sendMessage({ text: messageDraft });
    setMessageDraft("");
  }

  function updateWorkoutDraft(index, key, value) {
    setWorkoutLogDraft((prev) => prev.map((entry, entryIndex) => (
      entryIndex === index ? { ...entry, [key]: value } : entry
    )));
  }

  async function saveWorkoutLog() {
    if (!workoutLogDraft.length) {
      return;
    }

    setSavingWorkoutLog(true);
    setWorkoutSaved(false);
    setWorkoutSaveError("");
    try {
      await updateMyWorkoutProgress({
        exercises: workoutLogDraft.map((entry) => ({
          done: Boolean(entry.done),
          loggedWeight: String(entry.loggedWeight || "").trim(),
          completionNotes: String(entry.completionNotes || "").trim()
        }))
      });
      setWorkoutSaved(true);
      setTimeout(() => setWorkoutSaved(false), 3000);
    } catch (err) {
      setWorkoutSaveError(err.message || "Failed to save workout progress. Please try again.");
      setTimeout(() => setWorkoutSaveError(""), 5000);
    } finally {
      setSavingWorkoutLog(false);
    }
  }

  const memberAccentRgb = [15, 118, 110];

  function meXlsx(header, rows, sheet, filename) {
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

  function mePdf(title, headers, rows, landscape, filename, subtitle) {
    const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
    const accent = memberAccentRgb;
    const contentStartY = addPdfHeader(doc, {
      title,
      subtitle: subtitle || `Generated for ${profile?.name || "Member"}`,
      gymName: profile?.gymName || "Gymora Gym",
      ownerName: profile?.name || "Member",
      location: profile?.location || "",
      generatedAt: new Date().toLocaleString(),
      accent
    });
    autoTable(doc, getPdfTableConfig(doc, accent, contentStartY, [headers], rows));
    finalizePdf(doc, `${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportWorkoutHistoryExcel() {
    const history = data?.workoutHistory || [];
    const rows = [];
    history.forEach((session) => (session.exercises || []).forEach((ex) => rows.push([
      session.date || "—", session.planName || "Workout", session.day || "—",
      ex.name || "—", ex.sets || "—", ex.reps || "—", ex.loggedWeight || "—",
      ex.done ? "Done" : "Skipped", ex.completionNotes || ""
    ])));
    meXlsx(["Date", "Plan", "Day", "Exercise", "Sets", "Reps", "Logged Weight", "Status", "Notes"], rows, "Workout History", "workout-history");
  }
  function exportWorkoutHistoryPdf() {
    const history = data?.workoutHistory || [];
    const rows = [];
    history.forEach((session) => (session.exercises || []).forEach((ex) => rows.push([
      session.date || "—", session.planName || "Workout",
      ex.name || "—", `${ex.sets || "—"} / ${ex.reps || "—"}`, ex.loggedWeight || "—",
      ex.done ? "Done" : "Skipped"
    ])));
    mePdf("Workout History", ["Date", "Plan", "Exercise", "Sets/Reps", "Logged Weight", "Status"], rows, true, "workout-history");
  }

  function exportMealPlanExcel() {
    const entries = toMealEntries(myMealPlan?.meals);
    meXlsx(["Time", "Meal", "Foods"], entries.map((m) => [m.time || "—", m.name || "—", m.foods || "—"]), "Meal Plan", "meal-plan");
  }
  function exportMealPlanPdf() {
    const entries = toMealEntries(myMealPlan?.meals);
    mePdf(myMealPlan?.name || "Meal Plan", ["Time", "Meal", "Foods"], entries.map((m) => [m.time || "—", m.name || "—", m.foods || "—"]), false, "meal-plan",
      `${myMealPlan?.calories ? `${myMealPlan.calories} kcal` : ""}${myMealPlan?.goal ? ` · Goal: ${myMealPlan.goal}` : ""}`);
  }

  function calcAttendanceDuration(checkIn, checkOut) {
    if (!checkIn || !checkOut) return "—";
    const mins = Math.round((new Date(checkOut) - new Date(checkIn)) / 60000);
    if (isNaN(mins) || mins < 0) return "—";
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  }

  function exportAttendanceExcel() {
    meXlsx(["#", "Date", "Check In", "Check Out", "Duration", "Status"], attendance.map((s, idx) => [
      idx + 1,
      s.date || (s.checkInAt ? new Date(s.checkInAt).toLocaleDateString() : "—"),
      s.checkInAt ? new Date(s.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
      s.checkOutAt ? new Date(s.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
      calcAttendanceDuration(s.checkInAt, s.checkOutAt), s.status || "—"
    ]), "Attendance", "attendance-history");
  }
  function exportAttendancePdf() {
    mePdf("Attendance History", ["#", "Date", "Check In", "Check Out", "Duration", "Status"], attendance.map((s, idx) => [
      idx + 1,
      s.date || (s.checkInAt ? new Date(s.checkInAt).toLocaleDateString() : "—"),
      s.checkInAt ? new Date(s.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
      s.checkOutAt ? new Date(s.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
      calcAttendanceDuration(s.checkInAt, s.checkOutAt), s.status || "—"
    ]), true, "attendance-history");
  }

  function exportPaymentsExcel() {
    const paymentHistory = Array.isArray(data?.paymentHistory) ? data.paymentHistory : [];
    meXlsx(["Date", "Plan", "Duration", "Method", "Amount", "Note"], paymentHistory.map((p) => [
      p.date ? new Date(p.date).toLocaleDateString() : "—",
      p.planName || "—",
      p.months ? `${p.months} month${p.months > 1 ? "s" : ""}` : "—",
      p.method || "—", Number(p.amount || 0), p.note || "—"
    ]), "Payment History", "payment-history");
  }
  function exportPaymentsPdf() {
    const paymentHistory = Array.isArray(data?.paymentHistory) ? data.paymentHistory : [];
    mePdf("Payment History", ["Date", "Plan", "Duration", "Method", "Amount", "Note"], paymentHistory.map((p) => [
      p.date ? new Date(p.date).toLocaleDateString() : "—",
      p.planName || "—",
      p.months ? `${p.months} month${p.months > 1 ? "s" : ""}` : "—",
      p.method || "—", `LKR ${Number(p.amount || 0).toLocaleString()}`, p.note || "—"
    ]), true, "payment-history");
  }

  return (
    <DashboardShell
      isMobile={isMobile}
      accent={memberAccent}
      title={data?.gym?.name || "Gymora"}
      logoUrl={data?.gym?.logoUrl ? resolveImageUrl(data.gym.logoUrl) : "/gymora-logo.png"}
      subtitle="Member Portal"
      navItems={[
        { id: "dashboard", label: "Dashboard" },
        { id: "notifications", label: "Notifications", count: notificationState.unreadCount, hiddenInNav: true },
        { id: "messages", label: "Messages", count: unreadCoachMessages },
        { id: "workout", label: "My Workout" },
        { id: "workout-history", label: "Workout History" },
        { id: "meal", label: "My Meal Plan" },
        { id: "stats", label: "My Stats" },
        { id: "payments", label: "Payment History" },
        { id: "checkin", label: "Check-in" },
        { id: "settings", label: "Settings" }
      ]}
      page={page}
      setPage={setPage}
      sidebar={(
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "14px 16px", borderRadius: 18, background: `linear-gradient(135deg, ${memberAccentSoft}, #ffffff 70%)`, border: `1px solid ${memberAccent}18` }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a", lineHeight: 1.25 }}>
              {profile?.gymName || "Gym not assigned"}
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Powered by Gymora</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar initials={safeMember.avatar} size={42} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{safeMember.name}</div>
              <div style={{ marginTop: 4 }}><Badge label={safeMember.plan} /></div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>Member Portal</div>
            </div>
          </div>
        </div>
      )}
      topRight={(
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <NotificationBell count={notificationState.unreadCount} active={page === "notifications"} onClick={() => setPage("notifications")} />
          {!isMobile && <div style={{ fontSize: 11, color: "var(--muted)" }}>Coach: {coach?.name || "Not assigned"} | Gym: {profile?.gymName || "Not assigned"}</div>}
          <Btn small variant="ghost" onClick={logout}>→ Log out</Btn>
        </div>
      )}
    >
      {!hasMemberRecord && (
        <EmptyState
          title="No member data yet"
          message="This member login works, but there is no real member profile or gym assignment in the database yet. Add the member record first to use the member dashboard."
        />
      )}

      {hasMemberRecord && (
        <>
          {page === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Greeting banner */}
              <Card style={{ background: `linear-gradient(135deg, ${memberAccentSoft} 0%, #ffffff 65%)`, border: `1px solid ${memberAccent}22`, padding: isMobile ? "18px 18px" : "22px 26px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: memberAccent, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 }}>{getGreeting()}</div>
                    <div style={{ fontSize: isMobile ? 22 : 27, fontWeight: 900, color: "#0f172a", marginTop: 4, letterSpacing: "-0.03em" }}>{safeMember.name}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, lineHeight: 1.5 }}>
                      {safeMember.goal ? `Goal: ${safeMember.goal}` : "Set your fitness goal in Settings"}
                      {renewalDaysLeft != null && renewalDaysLeft > 0 && renewalDaysLeft <= 30 && (
                        <span style={{ marginLeft: 10, padding: "2px 8px", borderRadius: 999, background: renewalDaysLeft <= 7 ? "#fef2f2" : "#fffbeb", color: renewalDaysLeft <= 7 ? "#dc2626" : "#b45309", fontWeight: 700, fontSize: 11 }}>
                          Renewal in {renewalDaysLeft}d
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Btn small onClick={handleMemberAttendanceAction} style={{ background: openAttendanceSession ? "#dc2626" : memberAccent, color: "#fff", border: "none" }}>
                      {openAttendanceSession ? "⏹ Clock Out" : "✓ Check In"}
                    </Btn>
                    <Btn small variant="ghost" onClick={() => setPage("workout")}>Workout →</Btn>
                    <Btn small variant="ghost" onClick={() => setPage("messages")}>
                      Coach {unreadCoachMessages > 0 ? `(${unreadCoachMessages})` : ""}
                    </Btn>
                  </div>
                </div>
              </Card>

              {renewalDaysLeft != null && renewalDaysLeft <= 7 && (
                <Card style={{ border: `1px solid ${renewalDaysLeft < 0 ? "#dc2626" : "#f59e0b"}33`, background: renewalDaysLeft < 0 ? "#fff5f5" : "#fffaf0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row" }}>
                    <div>
                      <div style={{ fontSize: 11, color: renewalDaysLeft < 0 ? "#b91c1c" : "#b45309", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 }}>
                        Renewal Reminder
                      </div>
                      <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                        {renewalDaysLeft < 0 ? "Your subscription has expired." : "Your subscription is ending soon."}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
                        {profile?.plan || safeMember.plan} {renewalDaysLeft < 0 ? `ended on ${profile?.planExpiresAt}.` : `ends on ${profile?.planExpiresAt}.`}
                      </div>
                    </div>
                    <Btn small onClick={() => setPage("settings")}>Open Subscription</Btn>
                  </div>
                </Card>
              )}
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Check-ins This Month" value={safeStats.checkInsThisMonth} accent={memberAccent} />
                <StatCard label="Streak" value={`${safeStats.streak} days`} accent="#f59e0b" />
                <StatCard label="Total Check-ins" value={safeStats.totalCheckIns} accent="#2563eb" />
                <StatCard label="Goal Progress" value={`${overallGoalProgress}%`} accent="#16a34a" />
              </div>
              <div style={{ ...responsiveGrid(isMobile, "1.1fr 0.9fr"), gap: 20 }}>
                <Card>
                  <SectionHeader title="Subscription Center" action={<Badge label={renewalLabel} type={renewalTone} />} />
                  <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 12 }}>
                    <InfoTile label="Membership Plan" value={profile?.plan || safeMember.plan || "Not assigned"} tone={memberAccent} soft={memberAccentSoft} />
                    <InfoTile label="Payment Status" value={profile?.paymentStatus || "unpaid"} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Next Renewal" value={profile?.planExpiresAt || "Not scheduled"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Remaining Balance" value={`LKR ${Number(profile?.remainingBalance || member?.remainingBalance || 0).toLocaleString()}`} tone="#dc2626" soft="#fef2f2" />
                    <InfoTile label="Renewal Preference" value={profile?.renewalReminderPreference || "Not set"} tone="#ea580c" soft="#fff7ed" />
                    <InfoTile label="Joined" value={profile?.joined || "Not set"} tone="#2563eb" soft="#eff6ff" />
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Goal Tracking" action={<Badge label={`${overallGoalProgress}% tracked`} type="success" />} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <InfoTile label="Primary Goal" value={profile?.goal || member?.goal || "Not set"} tone={memberAccent} soft={memberAccentSoft} />
                    <InfoTile label="Goal Target Date" value={profile?.goalTargetDate || "Not set"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Target Window" value={goalDaysLeft == null ? "Set a target date in Settings" : goalDaysLeft < 0 ? "Target date passed" : `${goalDaysLeft} days remaining`} tone="#f59e0b" soft="#fffbeb" />
                    <div style={{ padding: "12px 14px", borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Overall goal progress</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>{overallGoalProgress}%</span>
                      </div>
                      <ProgressBar value={overallGoalProgress} color={memberAccentMid} height={8} />
                    </div>
                  </div>
                </Card>
              </div>
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 20 }}>
                {hasWorkoutPlan ? (
                  <Card style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: 20, background: `linear-gradient(135deg, ${memberAccentSoft}, #ffffff 62%)`, borderBottom: "1px solid var(--border)" }}>
                      <SectionHeader title="Today's Workout" action={<Badge label={`${workoutCompletionRatio}% complete`} type={workoutCompletionRatio === 100 ? "success" : "info"} />} />
                      <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>{workoutToday?.day || "Workout day not set"}</div>
                    </div>
                    <div style={{ padding: 20 }}>
                      <ProgressBar value={(workoutDone / Math.max(workoutExercises.length, 1)) * 100} color={memberAccentMid} height={8} />
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>{workoutDone}/{workoutExercises.length} complete</div>
                      <div style={{ marginTop: 16, ...responsiveGrid(isMobile, "repeat(2,1fr)"), gap: 10 }}>
                        {workoutExercises.slice(0, 4).map((exercise) => (
                          <div key={exercise.name} style={{ padding: "12px 14px", borderRadius: 14, background: "#f0fdfa", border: "1px solid #ccfbf1" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{exercise.name}</div>
                            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>{exercise.sets} sets - {exercise.reps}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ) : (
                  <EmptyState title="No workout plan assigned" message="Your coach has not assigned a workout plan yet. Once a plan is assigned, today&apos;s workout will appear here." />
                )}
                {hasMealPlan ? (
                  <Card style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: 20, background: "linear-gradient(135deg, #effcf3, #ffffff 62%)", borderBottom: "1px solid var(--border)" }}>
                      <SectionHeader title="Today's Macros" />
                      <div style={{ marginTop: 10, fontSize: 28, fontWeight: 900, color: "#15803d" }}>{macros.cals} kcal</div>
                    </div>
                    <div style={{ padding: 20, ...responsiveGrid(isMobile, "repeat(3,1fr)"), gap: 10 }}>
                      <MacroPill label="Protein" value={`${macros.protein}g`} tone="#2563eb" />
                      <MacroPill label="Carbs" value={`${macros.carbs}g`} tone="#ca8a04" />
                      <MacroPill label="Fat" value={`${macros.fat}g`} tone={memberAccent} />
                    </div>
                  </Card>
                ) : (
                  <EmptyState title="No meal plan assigned" message="Your coach has not assigned a meal plan yet. Once it&apos;s assigned, your daily calories and macros will show here." />
                )}
              </div>
              <Card>
                <SectionHeader title="Announcements" action={announcements.length > 0 ? <Badge label={`${announcements.length} active`} type="info" /> : null} />
                {announcements.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>No announcements at this time.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {announcements.map((announcement) => {
                      const announcedAt = announcement.createdAt ? new Date(announcement.createdAt) : null;
                      const daysAgo = announcedAt ? Math.floor((Date.now() - announcedAt.getTime()) / 86400000) : null;
                      const ageLabel = daysAgo == null ? "" : daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
                      const catColor = announcement.category === "urgent" ? "#dc2626" : announcement.category === "event" ? "#7c3aed" : memberAccent;
                      const catBg = announcement.category === "urgent" ? "#fef2f2" : announcement.category === "event" ? "#f5f3ff" : memberAccentSoft;
                      return (
                        <div key={announcement.id} style={{ borderRadius: 14, border: `1px solid ${catColor}22`, background: catBg, padding: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{announcement.title}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                              {announcement.category && <Badge label={announcement.category} type={announcement.category === "urgent" ? "inactive" : "info"} />}
                              {ageLabel && <span style={{ fontSize: 11, color: "#94a3b8" }}>{ageLabel}</span>}
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: "#475569", marginTop: 8, lineHeight: 1.6 }}>{announcement.body}</div>
                          {announcedAt && (
                            <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
                              {announcedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {page === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <ProfileHeroCard
                  title={safeMember.name}
                  subtitle="Member Account"
                  badge={<Badge label={safeMember.plan} />}
                  accent={memberAccent}
                  soft={memberAccentSoft}
                  initials={safeMember.avatar}
                  highlights={[
                    { label: "Progress", value: `${safeMember.progress}%`, tone: memberAccent, soft: memberAccentSoft },
                    { label: "Coach", value: coach?.name || "Not assigned", tone: "#7c3aed", soft: "#f5f3ff" },
                    { label: "Renewal", value: profile?.planExpiresAt || "Not scheduled", tone: "#ea580c", soft: "#fff7ed" },
                    { label: "Balance", value: `LKR ${Number(profile?.remainingBalance || member?.remainingBalance || 0).toLocaleString()}`, tone: "#dc2626", soft: "#fef2f2" }
                  ]}
                  action={(
                    <>
                      <Btn small variant="ghost" onClick={openProfileModal}>Edit Profile</Btn>
                    </>
                  )}
                >
                  <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 12 }}>
                    <InfoTile label="Member ID" value={profile?.memberCode || "Pending"} tone={memberAccent} soft={memberAccentSoft} />
                    <InfoTile label="Email" value={profile?.email || "Not provided"} tone={memberAccent} soft={memberAccentSoft} />
                    <InfoTile label="Phone" value={profile?.phone || "Not provided"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Coach" value={coach?.name || "Not assigned"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Gym" value={profile?.gymName || "Not assigned"} tone="#ea580c" soft="#fff7ed" />
                    <InfoTile label="Goal" value={safeMember.goal || "Not set"} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Progress" value={`${safeMember.progress}%`} tone={memberAccent} soft={memberAccentSoft} />
                    <InfoTile label="Current Weight" value={safeProfile?.currentWeightKg != null ? `${safeProfile.currentWeightKg} kg` : "Not provided"} tone="#0f766e" soft="#f0fdfa" />
                    <InfoTile label="Target Weight" value={safeProfile?.targetWeightKg != null ? `${safeProfile.targetWeightKg} kg` : "Not provided"} tone="#0891b2" soft="#ecfeff" />
                    <InfoTile label="Target Body Fat" value={safeProfile?.targetBodyFat != null ? `${safeProfile.targetBodyFat}%` : "Not provided"} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Height" value={safeProfile?.heightCm ? `${safeProfile.heightCm} cm` : "Not provided"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Emergency Contact" value={profile?.emergencyContact || "Not provided"} tone="#dc2626" soft="#fef2f2" />
                  </div>
                  <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 18, background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Bio</div>
                    <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{profile?.bio || "No bio added yet."}</div>
                  </div>
                  <div style={{ marginTop: 12, padding: "16px 18px", borderRadius: 18, background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Personal Notes</div>
                    <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{profile?.personalNotes || "No personal notes added yet."}</div>
                  </div>
                </ProfileHeroCard>
              </div>
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 20, alignItems: "start" }}>
                <ProfileSection title="Current Plan" description="The active account plan, assigned coaching assets, and renewal details.">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    <InfoTile label="Workout Plan" value={myWorkoutPlan?.name || "Not assigned"} tone={memberAccent} soft={memberAccentSoft} />
                    <InfoTile label="Meal Plan" value={myMealPlan?.name || "Not assigned"} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Diet Plan" value={profile?.dietPlanName || member?.dietPlanName || "Not assigned"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Check-ins This Month" value={String(safeStats.checkInsThisMonth)} tone="#ea580c" soft="#fff7ed" />
                    <InfoTile label="Current Streak" value={`${safeStats.streak} days`} tone="#f59e0b" soft="#fffbeb" />
                    <InfoTile label="Next Renewal" value={profile?.planExpiresAt || "Not scheduled"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Remaining Balance" value={`LKR ${Number(profile?.remainingBalance || member?.remainingBalance || 0).toLocaleString()}`} tone="#dc2626" soft="#fef2f2" />
                  </div>
                </ProfileSection>
                <ProfileSection title="Member Details" description="Core member information for identity, habits, and follow-up context.">
                  <DetailStack items={memberProfileDetails} />
                </ProfileSection>
                <ProfileSection title="Latest Metrics" description="Most recent measurements and performance checkpoints saved to the member account.">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                    <StatCard label="Weight" value={lastMetricValue(safeStats.weight, " kg")} accent="#2563eb" />
                    <StatCard label="Body Fat" value={lastMetricValue(safeStats.bodyFat, "%")} accent="#16a34a" />
                    <StatCard label="Bench Press" value={lastMetricValue(safeStats.benchPress, " kg")} accent={memberAccent} />
                  </div>
                </ProfileSection>
                <ProfileSection title="Health Details" description="Health metrics, attendance notes, and account-specific operational details.">
                  <DetailStack items={memberHealthDetails} />
                </ProfileSection>
              </div>
            </div>
          )}

          {page === "notifications" && (
            notifications.length === 0 ? (
              <EmptyState title="No notifications yet" message="Announcements, renewal reminders, and missed check-in alerts will appear here." />
          ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: isMobile ? "100%" : 860 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {notificationState.unreadCount > 0 && (
                      <Badge label={`${notificationState.unreadCount} unread`} type="warning" />
                    )}
                    <span style={{ fontSize: 12, color: "#64748b" }}>{notifications.length} total</span>
                  </div>
                  <Btn small variant="ghost" onClick={notificationState.markAllRead}>Mark All Read</Btn>
                </div>
                {pagedNotifications.visibleItems.map((item) => {
                  const notifAt = item.createdAt ? new Date(item.createdAt) : null;
                  const daysAgo = notifAt ? Math.floor((Date.now() - notifAt.getTime()) / 86400000) : null;
                  const timeLabel = notifAt ? (
                    daysAgo === 0 ? `Today ${notifAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : daysAgo === 1 ? "Yesterday"
                    : notifAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  ) : null;
                  const typeIcon = item.type === "renewal" ? "🔔" : item.type === "urgent" ? "⚠️" : item.type === "achievement" ? "🏆" : item.type === "workout" ? "💪" : "📢";
                  const isRead = notificationState.isRead(item.id);
                  return (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 16, border: `1px solid ${isRead ? "#e2e8f0" : memberAccent + "33"}`,
                        background: isRead ? "#ffffff" : memberAccentSoft,
                        padding: "16px 18px", cursor: "pointer", transition: "background 0.15s"
                      }}
                      onClick={() => notificationState.markRead(item.id)}
                    >
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.3 }}>{typeIcon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                            <div style={{ fontSize: 14, fontWeight: isRead ? 600 : 800, color: "#0f172a", lineHeight: 1.4 }}>{item.title || item.message}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                              {!isRead && <div style={{ width: 8, height: 8, borderRadius: "50%", background: memberAccent, flexShrink: 0 }} />}
                              {timeLabel && <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{timeLabel}</span>}
                            </div>
                          </div>
                          {item.body && item.body !== item.title && (
                            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, lineHeight: 1.6 }}>{item.body}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <PaginationControls page={pagedNotifications.page} totalPages={pagedNotifications.totalPages} onPageChange={setNotificationPage} totalItems={notifications.length} label="alerts" />
              </div>
            )
          )}

          {page === "messages" && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: isMobile ? 16 : 22, background: `linear-gradient(135deg, ${memberAccentSoft}, #ffffff 62%)`, borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar initials={coach?.name ? coach.name.slice(0, 2).toUpperCase() : "CO"} size={44} imageUrl={coach?.profileImageUrl || ""} />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{coach?.name || "No coach assigned"}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                        {coach?.name ? "Your personal coach" : "Contact gym to get a coach assigned"}
                      </div>
                    </div>
                  </div>
                  {unreadCoachMessages > 0 && (
                    <Badge label={`${unreadCoachMessages} unread`} type="warning" />
                  )}
                </div>
              </div>
              <div style={{ padding: isMobile ? 16 : 20, display: "flex", flexDirection: "column", gap: 10, background: "#f8fafc", minHeight: 340 }}>
                {messages.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "40px 0", gap: 10 }}>
                    <div style={{ fontSize: 32 }}>💬</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>No messages yet</div>
                    <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", maxWidth: 280 }}>
                      {coach?.name ? `Send ${coach.name} a question, check-in, or progress update.` : "Once a coach is assigned, you can message them here."}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const sentAt = message.createdAt || message.sentAt;
                    const timeLabel = sentAt ? new Date(sentAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
                    return (
                      <div key={message.id}>
                        <MessageBubble message={message} isOwn={message.senderRole === "member"} accent={memberAccent} soft="#ffffff" />
                        {timeLabel && (
                          <div style={{ textAlign: message.senderRole === "member" ? "right" : "left", fontSize: 11, color: "#94a3b8", marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>
                            {timeLabel}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ padding: isMobile ? 14 : 18, borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={messageDraft}
                      onChange={(e) => setMessageDraft(e.target.value)}
                      placeholder={coach?.name ? `Message ${coach.name}…` : "Send a message"}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMemberMessage(); } }}
                    />
                  </div>
                  <Btn onClick={submitMemberMessage} disabled={!coach?.name || !String(messageDraft || "").trim()} style={{ flexShrink: 0 }}>Send</Btn>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: "#94a3b8" }}>Press Enter to send</div>
              </div>
            </Card>
          )}

          {page === "workout" && (
            hasWorkoutPlan ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Plan metadata card */}
              <Card style={{ padding: isMobile ? 16 : 20, background: `linear-gradient(135deg, ${memberAccentSoft} 0%, #ffffff 70%)`, border: `1px solid ${memberAccent}22` }}>
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 16, justifyContent: "space-between" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {myWorkoutPlan.level && <MacroPill label="Level" value={myWorkoutPlan.level} tone="#7c3aed" />}
                    {myWorkoutPlan.category && <MacroPill label="Type" value={myWorkoutPlan.category} tone="#ea580c" />}
                    {myWorkoutPlan.duration && <MacroPill label="Duration" value={`${myWorkoutPlan.duration} min`} tone="#2563eb" />}
                    <MacroPill label="Exercises" value={workoutExercises.length} tone={memberAccent} />
                    <MacroPill label={`Week ${myWorkoutPlan.week || 1}`} value={`of ${myWorkoutPlan.totalWeeks || 1}`} tone="#16a34a" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <Btn small onClick={saveWorkoutLog} disabled={savingWorkoutLog} style={{ background: workoutSaved ? "#16a34a" : undefined, color: workoutSaved ? "#fff" : undefined }}>
                      {savingWorkoutLog ? "Saving..." : workoutSaved ? "Saved!" : "Save Progress"}
                    </Btn>
                    {workoutSaveError && (
                      <div style={{ fontSize: 12, color: "#dc2626", textAlign: "right", maxWidth: 220 }}>{workoutSaveError}</div>
                    )}
                  </div>
                </div>
              </Card>

              <Card style={{ padding: 0, overflow: "hidden", border: "1px solid rgba(15, 23, 42, 0.08)", boxShadow: "0 18px 34px rgba(15, 23, 42, 0.06)" }}>
                <div style={{ padding: isMobile ? 18 : 24, background: `linear-gradient(135deg, ${memberAccentSoft}, #ffffff 58%)`, borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: 14, alignItems: isMobile ? "flex-start" : "center" }}>
                    <div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "rgba(15, 118, 110, 0.1)", color: memberAccent, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Today&apos;s Session
                      </div>
                      <div style={{ marginTop: 12, fontSize: isMobile ? 24 : 28, fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a" }}>{myWorkoutPlan.name}</div>
                      <div style={{ marginTop: 6, fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{workoutToday?.day || "Workout day not set"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: isMobile ? "100%" : "auto", alignItems: "center" }}>
                      <MacroPill label="Week" value={myWorkoutPlan.week || 1} tone={memberAccent} />
                      <MacroPill label="Length" value={`${myWorkoutPlan.totalWeeks || 1} weeks`} tone="#ea580c" />
                      <MacroPill label="Moves" value={workoutExercises.length} tone="#2563eb" />
                    </div>
                  </div>
                </div>
                <div style={{ padding: isMobile ? 18 : 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Workout Completion Log</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{workoutDone}/{workoutExercises.length} exercises completed • {workoutSessionStatus}</div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <ProgressBar value={workoutCompletionRatio} color={memberAccentMid} height={8} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {workoutExercises.map((exercise, index) => (
                      <div key={exercise.name} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "auto 1.4fr auto", gap: 12, alignItems: isMobile ? "stretch" : "center", padding: isMobile ? 14 : 16, borderRadius: 18, background: index % 2 === 0 ? "#ffffff" : "#f8fafc", border: "1px solid #e5e7eb" }}>
                        <div style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: 14, background: "rgba(15, 118, 110, 0.12)", color: memberAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 }}>
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.35 }}>{exercise.name}</div>
                          <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>
                            {exercise.sets} sets · {exercise.reps} reps
                          </div>
                          {exercise.notes && (
                            <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8", fontStyle: "italic", lineHeight: 1.5 }}>{exercise.notes}</div>
                          )}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3,minmax(0,1fr))" : "repeat(3, minmax(86px, 1fr))", gap: 10 }}>
                          <MacroPill label="Sets" value={exercise.sets} tone={memberAccent} />
                          <MacroPill label="Reps" value={exercise.reps} tone="#2563eb" />
                          <MacroPill label="Rest" value={exercise.rest} tone="#16a34a" />
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: isMobile ? 14 : 16, borderRadius: 18, background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Log today&apos;s workout</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {workoutExercises.map((exercise, index) => {
                          const draftEntry = workoutLogDraft[index] || { done: Boolean(exercise.done), loggedWeight: "", completionNotes: "" };
                          return (
                            <div key={`${exercise.name}-log`} style={{ padding: "12px 14px", borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{exercise.name}</div>
                                <Badge label={draftEntry.done ? "Completed" : "Pending"} type={draftEntry.done ? "success" : "warning"} />
                              </div>
                              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 180px) minmax(0, 1fr) auto", gap: 10, alignItems: "start" }}>
                                <Input
                                  value={draftEntry.loggedWeight}
                                  onChange={(e) => updateWorkoutDraft(index, "loggedWeight", e.target.value)}
                                  placeholder="Weight used / resistance"
                                />
                                <TextArea
                                  rows={2}
                                  value={draftEntry.completionNotes}
                                  onChange={(e) => updateWorkoutDraft(index, "completionNotes", e.target.value)}
                                  placeholder="Add workout notes or difficulty"
                                />
                                <Btn
                                  small
                                  variant={draftEntry.done ? "ghost" : "primary"}
                                  onClick={() => updateWorkoutDraft(index, "done", !draftEntry.done)}
                                >
                                  {draftEntry.done ? "Mark Pending" : "Mark Done"}
                                </Btn>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            ) : (
              <EmptyState title="No workout plan assigned" message="Your coach has not assigned a workout plan yet. Once it is assigned, your full training schedule will appear here." />
            )
          )}

          {page === "workout-history" && (() => {
            const history = data?.workoutHistory || [];
            return history.length === 0 ? (
              <EmptyState title="No workout history yet" message="Your completed workout sessions will appear here. Mark exercises as done in My Workout to start building your history." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Workout History</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{history.length} session{history.length !== 1 ? "s" : ""} logged</div>
                  </div>
                  <ExportButtonGroup>
                    <SpreadsheetExportButton compact onClick={exportWorkoutHistoryExcel} label="Workout History" />
                    <ReportExportButton compact onClick={exportWorkoutHistoryPdf} label="Workout History" />
                  </ExportButtonGroup>
                </Card>
                {history.map((session, idx) => {
                  const done = (session.exercises || []).filter((e) => e.done).length;
                  const total = (session.exercises || []).length;
                  return (
                    <Card key={`${session.date}-${idx}`} style={{ padding: 0, overflow: "hidden" }}>
                      <div style={{ padding: "14px 20px", background: `linear-gradient(135deg, ${memberAccentSoft}, #ffffff 65%)`, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{session.date}</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{session.planName || "Workout"}{session.day ? ` · ${session.day}` : ""}</div>
                        </div>
                        <Badge label={`${done}/${total} done`} type={done === total ? "success" : "info"} />
                      </div>
                      <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {(session.exercises || []).map((ex, eIdx) => (
                          <div key={eIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "8px 12px", borderRadius: 10, background: ex.done ? "#f0fdf4" : "#f8fafc", border: `1px solid ${ex.done ? "#bbf7d0" : "#e2e8f0"}` }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{ex.name}</div>
                              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{ex.sets ? `${ex.sets} sets` : ""}{ex.reps ? ` · ${ex.reps}` : ""}{ex.loggedWeight ? ` · ${ex.loggedWeight}` : ""}</div>
                              {ex.completionNotes && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{ex.completionNotes}</div>}
                            </div>
                            <Badge label={ex.done ? "Done" : "Skipped"} type={ex.done ? "success" : "inactive"} />
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            );
          })()}

          {page === "meal" && (
            hasMealPlan ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Macro summary card */}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: isMobile ? 18 : 24, background: "linear-gradient(135deg, #effcf3, #ffffff 60%)", borderBottom: "1px solid var(--border)" }}>
                  <SectionHeader title={myMealPlan.name} action={(
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Badge label={`${mealEntries.length} meals`} type="success" />
                      <ExportButtonGroup>
                        <SpreadsheetExportButton compact onClick={exportMealPlanExcel} label="Meal Plan" />
                        <ReportExportButton compact onClick={exportMealPlanPdf} label="Meal Plan" />
                      </ExportButtonGroup>
                    </div>
                  )} />
                  <div style={{ marginTop: 14, fontSize: 34, fontWeight: 900, color: "#15803d", letterSpacing: "-0.04em" }}>
                    {macros.cals} <span style={{ fontSize: 16, fontWeight: 600, color: "#16a34a" }}>kcal</span>
                  </div>
                  {myMealPlan.calories && (
                    <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>Daily target: {myMealPlan.calories} kcal</div>
                  )}
                </div>
                <div style={{ padding: isMobile ? 16 : 22 }}>
                  {/* Macro breakdown bars */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      { label: "Protein", value: macros.protein, unit: "g", target: myMealPlan.protein, color: "#2563eb", bg: "#eff6ff" },
                      { label: "Carbohydrates", value: macros.carbs, unit: "g", target: myMealPlan.carbs, color: "#ca8a04", bg: "#fefce8" },
                      { label: "Fat", value: macros.fat, unit: "g", target: myMealPlan.fat, color: memberAccent, bg: memberAccentSoft }
                    ].map(({ label, value, unit, target, color, bg }) => {
                      const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;
                      return (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{label}</span>
                            <span style={{ fontSize: 13, color: "#64748b" }}>
                              {value}{unit}{target ? ` / ${target}${unit}` : ""}{pct != null ? ` · ${pct}%` : ""}
                            </span>
                          </div>
                          <div style={{ height: 8, borderRadius: 999, background: bg, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: pct != null ? `${pct}%` : "100%", background: color, borderRadius: 999, transition: "width 0.4s" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Meal timeline */}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Daily Meal Schedule</div>
                </div>
                <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18, background: "#f7fff9" }}>
                  {mealEntries.map((meal) => (
                    <MealTimelineItem key={`${meal.time}-${meal.name}`} meal={meal} />
                  ))}
                </div>
              </Card>
            </div>
            ) : (
              <EmptyState title="No meal plan assigned" message="Your coach has not assigned a meal plan yet. Once it is assigned, your meals and macros will appear here." />
            )
          )}

          {page === "stats" && (
            hasStats ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card>
                <SectionHeader
                  title="My Stats"
                  action={<Btn small variant="ghost" onClick={openProfileModal}>Edit Stats</Btn>}
                />
                <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)"), gap: 16 }}>
                  <StatCard label="Current Weight" value={lastMetricValue(safeStats.weight, " kg")} accent="#2563eb" />
                  <StatCard label="Body Fat" value={lastMetricValue(safeStats.bodyFat, "%")} accent="#16a34a" />
                  <StatCard label="Bench Press" value={lastMetricValue(safeStats.benchPress, " kg")} accent={memberAccent} />
                </div>
              </Card>
              <div style={{ ...responsiveGrid(isMobile, "1.2fr 1fr"), gap: 16 }}>
                <Card>
                  <SectionHeader title="Goal Progress" />
                  <div style={{ ...responsiveGrid(isMobile, "repeat(2,minmax(0,1fr))"), gap: 16, alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                      <RingStat value={Math.round(weightProgress)} max={100} color="#2563eb" label="Weight Target" />
                      <RingStat value={Math.round(bodyFatProgress)} max={100} color="#16a34a" label="Body Fat Target" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Current vs target weight</span>
                          <span style={{ fontSize: 12, color: "#64748b" }}>{profile?.currentWeightKg != null ? `${profile.currentWeightKg} kg` : "-"} / {profile?.targetWeightKg != null ? `${profile.targetWeightKg} kg` : "-"}</span>
                        </div>
                        <ProgressBar value={weightProgress} color="#2563eb" height={8} />
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Current vs target body fat</span>
                          <span style={{ fontSize: 12, color: "#64748b" }}>{profile?.targetBodyFat != null ? `${currentBodyFatValue}% / ${profile.targetBodyFat}%` : "Target not set"}</span>
                        </div>
                        <ProgressBar value={bodyFatProgress} color="#16a34a" height={8} />
                      </div>
                    </div>
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Progress Summary" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <InfoTile label="Weight Change" value={`${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg over ${safeStats.labels?.length || 0} entries`} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Body Fat Change" value={`${bodyFatDelta > 0 ? "+" : ""}${bodyFatDelta.toFixed(1)}% over ${safeStats.labels?.length || 0} entries`} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Bench Progress" value={`${benchDelta > 0 ? "+" : ""}${benchDelta.toFixed(1)} kg strength gain`} tone={memberAccent} soft={memberAccentSoft} />
                  </div>
                </Card>
              </div>
              <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))"), gap: 16 }}>
                <Card>
                  <SectionHeader title="Weight Trend" />
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                    {safeStats.labels?.[0] || "Start"} to {safeStats.labels?.[safeStats.labels.length - 1] || "Latest"} | latest {currentWeightValue} kg
                  </div>
                  <MiniChart data={safeStats.weight} labels={safeStats.labels} color="#2563eb" height={90} />
                  <div style={{ marginTop: 10 }}>
                    <BarChart data={safeStats.weight} labels={safeStats.labels} color="#93c5fd" height={110} />
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Body Fat Trend" />
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                    {safeStats.labels?.[0] || "Start"} to {safeStats.labels?.[safeStats.labels.length - 1] || "Latest"} | latest {currentBodyFatValue}%
                  </div>
                  <MiniChart data={safeStats.bodyFat} labels={safeStats.labels} color="#16a34a" height={90} />
                  <div style={{ marginTop: 10 }}>
                    <BarChart data={safeStats.bodyFat} labels={safeStats.labels} color="#86efac" height={110} />
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Strength Trend" />
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                    Bench press progression | latest {currentBenchValue} kg
                  </div>
                  <MiniChart data={safeStats.benchPress} labels={safeStats.labels} color={memberAccent} height={90} />
                  <div style={{ marginTop: 10 }}>
                    <BarChart data={safeStats.benchPress} labels={safeStats.labels} color="#5eead4" height={110} />
                  </div>
                </Card>
              </div>
              <Card>
                <SectionHeader title="Goals" />
                <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)"), gap: 12 }}>
                  <InfoTile label="Goal" value={profile?.goal || member?.goal || "Not set"} tone={memberAccent} soft={memberAccentSoft} />
                  <InfoTile label="Target Weight" value={profile?.targetWeightKg != null ? `${profile.targetWeightKg} kg` : "Not set"} tone="#2563eb" soft="#eff6ff" />
                  <InfoTile label="Target Body Fat" value={profile?.targetBodyFat != null ? `${profile.targetBodyFat}%` : "Not set"} tone="#16a34a" soft="#f0fdf4" />
                </div>
              </Card>
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 16 }}>
                <Card>
                  <SectionHeader title="Body Measurements" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    {[
                      { label: "Chest", value: profile?.bodyMeasurements?.chestCm, unit: "cm", tone: "#7c3aed", soft: "#f5f3ff" },
                      { label: "Waist", value: profile?.bodyMeasurements?.waistCm, unit: "cm", tone: "#ea580c", soft: "#fff7ed" },
                      { label: "Arms", value: profile?.bodyMeasurements?.armsCm, unit: "cm", tone: memberAccent, soft: memberAccentSoft },
                      { label: "Thighs", value: profile?.bodyMeasurements?.thighsCm, unit: "cm", tone: "#dc2626", soft: "#fef2f2" }
                    ].map(({ label, value, unit, tone, soft }) => (
                      <InfoTile key={label} label={label} value={value != null ? `${value} ${unit}` : "Not set"} tone={tone} soft={soft} />
                    ))}
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Health Metrics" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    <InfoTile label="Height" value={profile?.heightCm ? `${profile.heightCm} cm` : "Not set"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="BMI" value={profile?.bmi != null ? String(profile.bmi) : "Not set"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Waist-to-Hip Ratio" value={profile?.waistToHipRatio != null ? String(profile.waistToHipRatio) : "Not set"} tone="#ea580c" soft="#fff7ed" />
                    <InfoTile label="Fitness Level" value={profile?.fitnessLevel || "Not set"} tone={memberAccent} soft={memberAccentSoft} />
                    <InfoTile label="Supplement Usage" value={profile?.supplementUsage || "Not set"} tone="#16a34a" soft="#f0fdf4" />
                  </div>
                </Card>
              </div>
              <Card>
                <SectionHeader title="Attendance Overview" />
                <div style={{ ...responsiveGrid(isMobile, "repeat(3,1fr)"), gap: 12 }}>
                  <InfoTile label="Total Check-ins" value={String(safeStats.totalCheckIns)} tone="#2563eb" soft="#eff6ff" />
                  <InfoTile label="This Month" value={String(safeStats.checkInsThisMonth)} tone={memberAccent} soft={memberAccentSoft} />
                  <InfoTile label="Current Streak" value={`${safeStats.streak} days`} tone="#f59e0b" soft="#fffbeb" />
                </div>
              </Card>
              <Card>
                <SectionHeader title="Personal Notes" />
                <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7 }}>
                  {profile?.personalNotes || "No personal notes added yet."}
                </div>
              </Card>
            </div>
            ) : (
              <EmptyState title="No stats recorded yet" message="Your account is active, but there are no progress stats saved yet. Once measurements are recorded, your trend charts will appear here." />
            )
          )}

          {page === "checkin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Status card */}
              <Card style={{
                padding: isMobile ? 20 : 28,
                background: openAttendanceSession
                  ? "linear-gradient(135deg, #f0fdf4 0%, #ffffff 65%)"
                  : "linear-gradient(135deg, #f8fafc 0%, #ffffff 65%)",
                border: `1px solid ${openAttendanceSession ? "#16a34a" : "#e2e8f0"}44`
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
                      background: openAttendanceSession ? "linear-gradient(135deg, #16a34a, #22c55e)" : "#e2e8f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 28, color: openAttendanceSession ? "#fff" : "#94a3b8",
                      boxShadow: openAttendanceSession ? "0 4px 18px rgba(22,163,74,0.28)" : "none"
                    }}>
                      {openAttendanceSession ? "✓" : "○"}
                    </div>
                    <div>
                      <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: "#0f172a", lineHeight: 1.2 }}>
                        {openAttendanceSession ? "Currently Checked In" : "Not Checked In"}
                      </div>
                      {openAttendanceSession ? (
                        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
                            Started at {new Date(openAttendanceSession.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {sessionElapsed > 0 && (
                            <div style={{ fontSize: 20, fontWeight: 900, color: memberAccent, letterSpacing: "-0.03em" }}>
                              {formatElapsed(sessionElapsed)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                          {safeStats.totalCheckIns > 0 ? `${safeStats.totalCheckIns} total visits · ${safeStats.streak} day streak` : "No check-ins yet. Start your first session!"}
                        </div>
                      )}
                    </div>
                  </div>
                  <Btn
                    onClick={handleMemberAttendanceAction}
                    style={{
                      background: openAttendanceSession ? "#dc2626" : memberAccent,
                      color: "#fff", border: "none",
                      padding: isMobile ? "10px 22px" : "12px 28px",
                      fontSize: 15, fontWeight: 800, borderRadius: 14
                    }}
                  >
                    {openAttendanceSession ? "⏹ Clock Out" : "✓ Check In Now"}
                  </Btn>
                </div>
              </Card>

              {/* Stats row */}
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)", "repeat(2,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Total Check-ins" value={safeStats.totalCheckIns} accent="#2563eb" />
                <StatCard label="This Month" value={safeStats.checkInsThisMonth} accent={memberAccent} />
                <StatCard label="Current Streak" value={`${safeStats.streak} days`} accent="#f59e0b" />
                <StatCard label="Workout Progress" value={`${workoutCompletionRatio}%`} accent="#16a34a" />
              </div>

              {/* Attendance history */}
              <Card>
                <SectionHeader
                  title="Attendance History"
                  action={attendance.length > 0 ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Badge label={`${attendance.length} sessions`} type="info" />
                      <ExportButtonGroup>
                        <SpreadsheetExportButton compact onClick={exportAttendanceExcel} label="Attendance" />
                        <ReportExportButton compact onClick={exportAttendancePdf} label="Attendance" />
                      </ExportButtonGroup>
                    </div>
                  ) : null}
                />
                {attendance.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🏋️</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>No sessions yet</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>Check in above to start tracking your gym attendance.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                            {["#", "Date", "Check In", "Check Out", "Duration", "Status"].map((h) => (
                              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pagedCheckIn.visibleItems.map((session, idx) => {
                            const checkInDt = session.checkInAt ? new Date(session.checkInAt) : null;
                            const checkOutDt = session.checkOutAt ? new Date(session.checkOutAt) : null;
                            const durationMins = checkInDt && checkOutDt
                              ? Math.round((checkOutDt.getTime() - checkInDt.getTime()) / 60000)
                              : null;
                            const globalIdx = (pagedCheckIn.page - 1) * PAGE_SIZE + idx + 1;
                            const isActive = session.status === "checked-in";
                            return (
                              <tr key={session.id || idx} style={{ borderBottom: "1px solid #f1f5f9", background: isActive ? "#f0fdf4" : idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                                <td style={{ padding: "10px 12px", color: "#94a3b8", fontWeight: 700 }}>{globalIdx}</td>
                                <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                                  {checkInDt ? checkInDt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : session.date || "—"}
                                </td>
                                <td style={{ padding: "10px 12px", color: "#334155", whiteSpace: "nowrap" }}>
                                  {checkInDt ? checkInDt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                                </td>
                                <td style={{ padding: "10px 12px", color: "#334155", whiteSpace: "nowrap" }}>
                                  {checkOutDt ? checkOutDt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : isActive ? (
                                    <span style={{ color: "#16a34a", fontWeight: 700 }}>Active</span>
                                  ) : "—"}
                                </td>
                                <td style={{ padding: "10px 12px", color: "#475569", whiteSpace: "nowrap" }}>
                                  {durationMins != null ? (
                                    durationMins >= 60 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : `${durationMins}m`
                                  ) : isActive ? formatElapsed(sessionElapsed) : "—"}
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  <Badge label={session.status} type={isActive ? "success" : session.status === "checked-out" ? "info" : "default"} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <PaginationControls page={pagedCheckIn.page} totalPages={pagedCheckIn.totalPages} onPageChange={setCheckInHistoryPage} totalItems={attendance.length} label="sessions" />
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
          {page === "payments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionHeader title="Payment History" action={(
                <ExportButtonGroup>
                  <SpreadsheetExportButton compact onClick={exportPaymentsExcel} label="Payments" />
                  <ReportExportButton compact onClick={exportPaymentsPdf} label="Payments" />
                </ExportButtonGroup>
              )} />
              {(() => {
                const paymentHistory = Array.isArray(data?.paymentHistory) ? data.paymentHistory : [];
                const totalPaid = paymentHistory.reduce((sum, p) => sum + Number(p?.amount || 0), 0);
                const outstanding = Number(profile?.amountDue || 0);
                const paymentStatus = profile?.paymentStatus || (outstanding > 0 ? "unpaid" : "paid");
                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                      <StatCard label="Total Paid" value={`LKR ${totalPaid.toLocaleString()}`} color={memberAccent} />
                      <StatCard label="Outstanding Balance" value={outstanding > 0 ? `LKR ${outstanding.toLocaleString()}` : "—"} color={outstanding > 0 ? "#dc2626" : memberAccent} />
                      <StatCard
                        label="Payment Status"
                        value={paymentStatus === "paid" ? "Paid" : paymentStatus === "partial" ? "Partial" : "Unpaid"}
                        color={paymentStatus === "paid" ? "#16a34a" : paymentStatus === "partial" ? "#d97706" : "#dc2626"}
                      />
                      <StatCard label="Total Payments" value={String(paymentHistory.length)} color={memberAccent} />
                    </div>
                    {paymentHistory.length === 0 ? (
                      <EmptyState title="No payment records" message="Your payment history will appear here once subscriptions are processed." />
                    ) : (
                      <Card>
                        <SectionHeader title="All Transactions" />
                        <Table
                          headers={["Date", "Plan", "Duration", "Method", "Amount", "Note"]}
                          rows={paymentHistory.map((p) => [
                            p.date ? new Date(p.date).toLocaleDateString() : "—",
                            p.planName || "—",
                            p.months ? `${p.months} month${p.months > 1 ? "s" : ""}` : "—",
                            p.method || "—",
                            `LKR ${Number(p.amount || 0).toLocaleString()}`,
                            p.note || "—"
                          ])}
                        />
                      </Card>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {profileModal && (
            <Modal title="Edit Member Profile" width={780} onClose={() => setProfileModal(false)}>
              {/* Tab nav */}
              <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #e2e8f0", marginBottom: 22, flexWrap: "wrap" }}>
                {[
                  { id: "personal", label: "Personal Info" },
                  { id: "fitness", label: "Health & Fitness" },
                  { id: "measurements", label: "Body Measurements" },
                  { id: "preferences", label: "Preferences & Notes" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setProfileModalTab(tab.id)}
                    style={{
                      padding: "8px 16px", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
                      borderBottom: profileModalTab === tab.id ? `2px solid ${memberAccent}` : "2px solid transparent",
                      color: profileModalTab === tab.id ? memberAccent : "#64748b",
                      background: "transparent", marginBottom: -2, borderRadius: "6px 6px 0 0",
                      transition: "color 0.15s"
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {profileModalTab === "personal" && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                  <FormField label="Name"><Input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} /></FormField>
                  <FormField label="Email"><Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} /></FormField>
                  <FormField label="Phone"><Input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} /></FormField>
                  <FormField label="Title"><Input value={profileForm.title} onChange={(e) => setProfileForm((prev) => ({ ...prev, title: e.target.value }))} /></FormField>
                  <FormField label="Date of Birth"><Input type="date" value={profileForm.dateOfBirth} onChange={(e) => setProfileForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))} /></FormField>
                  <FormField label="Gender"><Input value={profileForm.gender} onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: e.target.value }))} /></FormField>
                  <FormField label="Emergency Contact"><Input value={profileForm.emergencyContact} onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContact: e.target.value }))} /></FormField>
                  <FormField label="Emergency Contact Relationship"><Input value={profileForm.emergencyContactRelationship} onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContactRelationship: e.target.value }))} /></FormField>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                    <FormField label="Address"><TextArea rows={2} value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} /></FormField>
                  </div>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                    <FormField label="Bio"><TextArea rows={3} value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} /></FormField>
                  </div>
                </div>
              )}

              {profileModalTab === "fitness" && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                  <FormField label="Goal"><Input value={profileForm.goal} onChange={(e) => setProfileForm((prev) => ({ ...prev, goal: e.target.value }))} /></FormField>
                  <FormField label="Goal Target Date"><Input type="date" value={profileForm.goalTargetDate} onChange={(e) => setProfileForm((prev) => ({ ...prev, goalTargetDate: e.target.value }))} /></FormField>
                  <FormField label="Fitness Level"><Input value={profileForm.fitnessLevel} onChange={(e) => setProfileForm((prev) => ({ ...prev, fitnessLevel: e.target.value }))} /></FormField>
                  <FormField label="Preferred Workout Time"><Input value={profileForm.preferredWorkoutTime} onChange={(e) => setProfileForm((prev) => ({ ...prev, preferredWorkoutTime: e.target.value }))} /></FormField>
                  <FormField label="Height (cm)"><Input type="number" value={profileForm.heightCm} onChange={(e) => setProfileForm((prev) => ({ ...prev, heightCm: e.target.value }))} /></FormField>
                  <FormField label="Current Weight (kg)"><Input type="number" value={profileForm.currentWeightKg} onChange={(e) => setProfileForm((prev) => ({ ...prev, currentWeightKg: e.target.value }))} /></FormField>
                  <FormField label="Target Weight (kg)"><Input type="number" value={profileForm.targetWeightKg} onChange={(e) => setProfileForm((prev) => ({ ...prev, targetWeightKg: e.target.value }))} /></FormField>
                  <FormField label="Target Body Fat (%)"><Input type="number" value={profileForm.targetBodyFat} onChange={(e) => setProfileForm((prev) => ({ ...prev, targetBodyFat: e.target.value }))} /></FormField>
                  <FormField label="Body Fat (%)"><Input type="number" value={profileForm.bodyFatPercentage} onChange={(e) => setProfileForm((prev) => ({ ...prev, bodyFatPercentage: e.target.value }))} /></FormField>
                  <FormField label="BMI"><Input type="number" value={profileForm.bmi} onChange={(e) => setProfileForm((prev) => ({ ...prev, bmi: e.target.value }))} /></FormField>
                  <FormField label="Waist-to-Hip Ratio"><Input type="number" value={profileForm.waistToHipRatio} onChange={(e) => setProfileForm((prev) => ({ ...prev, waistToHipRatio: e.target.value }))} /></FormField>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                    <FormField label="Medical Conditions / Injury Notes"><TextArea rows={3} value={profileForm.medicalNotes} onChange={(e) => setProfileForm((prev) => ({ ...prev, medicalNotes: e.target.value }))} /></FormField>
                  </div>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                    <FormField label="Supplement Usage"><TextArea rows={2} value={profileForm.supplementUsage} onChange={(e) => setProfileForm((prev) => ({ ...prev, supplementUsage: e.target.value }))} /></FormField>
                  </div>
                </div>
              )}

              {profileModalTab === "measurements" && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                  <FormField label="Chest (cm)"><Input type="number" value={profileForm.chestCm} onChange={(e) => setProfileForm((prev) => ({ ...prev, chestCm: e.target.value }))} /></FormField>
                  <FormField label="Waist (cm)"><Input type="number" value={profileForm.waistCm} onChange={(e) => setProfileForm((prev) => ({ ...prev, waistCm: e.target.value }))} /></FormField>
                  <FormField label="Arms (cm)"><Input type="number" value={profileForm.armsCm} onChange={(e) => setProfileForm((prev) => ({ ...prev, armsCm: e.target.value }))} /></FormField>
                  <FormField label="Thighs (cm)"><Input type="number" value={profileForm.thighsCm} onChange={(e) => setProfileForm((prev) => ({ ...prev, thighsCm: e.target.value }))} /></FormField>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1", padding: "10px 14px", borderRadius: 12, background: "#f0fdfa", border: "1px solid #ccfbf1", fontSize: 13, color: "#0f766e" }}>
                    Enter measurements in centimetres. These are used to track your body composition progress over time.
                  </div>
                </div>
              )}

              {profileModalTab === "preferences" && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                  <FormField label="Payment Method"><Input value={profileForm.paymentMethod} onChange={(e) => setProfileForm((prev) => ({ ...prev, paymentMethod: e.target.value }))} /></FormField>
                  <FormField label="Renewal Reminder Preference"><Input value={profileForm.renewalReminderPreference} onChange={(e) => setProfileForm((prev) => ({ ...prev, renewalReminderPreference: e.target.value }))} /></FormField>
                  <FormField label="Join Source"><Input value={profileForm.joinSource} onChange={(e) => setProfileForm((prev) => ({ ...prev, joinSource: e.target.value }))} /></FormField>
                  <FormField label="Assigned Locker"><Input value={profileForm.assignedLocker} onChange={(e) => setProfileForm((prev) => ({ ...prev, assignedLocker: e.target.value }))} /></FormField>
                  <FormField label="Member Tag"><Input value={profileForm.memberTag} onChange={(e) => setProfileForm((prev) => ({ ...prev, memberTag: e.target.value }))} /></FormField>
                  <FormField label="Barcode"><Input value={profileForm.barcode} onChange={(e) => setProfileForm((prev) => ({ ...prev, barcode: e.target.value }))} /></FormField>
                  <FormField label="Membership Freeze Status"><Input value={profileForm.membershipFreezeStatus} onChange={(e) => setProfileForm((prev) => ({ ...prev, membershipFreezeStatus: e.target.value }))} /></FormField>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                    <FormField label="Attendance Notes"><TextArea rows={2} value={profileForm.attendanceNotes} onChange={(e) => setProfileForm((prev) => ({ ...prev, attendanceNotes: e.target.value }))} /></FormField>
                  </div>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                    <FormField label="Progress Photos (comma separated URLs)"><TextArea rows={2} value={profileForm.progressPhotos} onChange={(e) => setProfileForm((prev) => ({ ...prev, progressPhotos: e.target.value }))} placeholder="https://..." /></FormField>
                  </div>
                  <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                    <FormField label="Personal Notes"><TextArea rows={4} value={profileForm.personalNotes} onChange={(e) => setProfileForm((prev) => ({ ...prev, personalNotes: e.target.value }))} /></FormField>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
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
