import React from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useDashboard } from "../context/DashboardContext";
import { useAuth } from "../../auth/context/AuthContext";
import { apiFetch } from "../../../lib/api/client";
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
  resolveImageUrl
} from "../../../components/shared";

const PAGE_SIZE = 5;
const EXPENSE_CATEGORY_OPTIONS = {
  expense: [
    "Rent",
    "Utilities",
    "Salaries",
    "Equipment",
    "Maintenance",
    "Marketing",
    "Supplies",
    "Transport",
    "Software",
    "Taxes",
    "Other Expense"
  ],
  income: [
    "Membership Income",
    "Personal Training",
    "Supplement Sales",
    "Class Income",
    "Corporate Training",
    "Event Income",
    "Other Income"
  ]
};

const SUPPLEMENT_CATEGORIES = [
  "Protein", "Creatine", "Pre-Workout", "BCAA / Amino Acids",
  "Weight Gainer", "Fat Burner", "Vitamins", "Minerals",
  "Recovery", "Omega / Fish Oil", "Herbal / Natural",
  "Energy Drinks", "Snack / Bar", "Other"
];

function useIsMobile(breakpoint = 768) {
  const getMatch = React.useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth <= breakpoint;
  }, [breakpoint]);

  const [isMobile, setIsMobile] = React.useState(getMatch);

  React.useEffect(() => {
    const onResize = () => setIsMobile(getMatch());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [getMatch]);

  return isMobile;
}

function responsiveGrid(isMobile, desktop, mobile = "1fr") {
  return { display: "grid", gridTemplateColumns: isMobile ? mobile : desktop };
}

function useNotificationReadState(scopeKey, notifications, serverReadIds) {
  const storageKey = React.useMemo(() => `fitnesshub_read_notifications_${scopeKey || "guest"}`, [scopeKey]);
  const notificationsLoaded = notifications !== null;
  const notificationIds = React.useMemo(
    () => (Array.isArray(notifications) ? notifications.map((item) => String(item.id || "")) : []).filter(Boolean),
    [notifications]
  );

  const getInitialIds = React.useCallback(() => {
    const local = (() => {
      if (typeof window === "undefined") return [];
      try {
        const raw = window.localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    const server = Array.isArray(serverReadIds) ? serverReadIds : [];
    return Array.from(new Set([...local, ...server]));
  }, [storageKey, serverReadIds]);

  const [readIds, setReadIds] = React.useState(getInitialIds);
  const [serverSynced, setServerSynced] = React.useState(false);

  React.useEffect(() => {
    if (serverSynced || !Array.isArray(serverReadIds)) return;
    setReadIds((current) => Array.from(new Set([...current, ...serverReadIds])));
    setServerSynced(true);
  }, [serverReadIds, serverSynced]);

  React.useEffect(() => {
    if (!notificationsLoaded) return;
    setReadIds((current) => current.filter((id) => notificationIds.includes(id)));
  }, [notificationsLoaded, notificationIds]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !notificationsLoaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify(readIds));
  }, [storageKey, readIds, notificationsLoaded]);

  const persistToServer = React.useCallback((ids) => {
    apiFetch("/api/profile/me/notifications/read", {
      method: "PATCH",
      body: JSON.stringify({ ids }),
      headers: { "Content-Type": "application/json" }
    }).catch(() => {});
  }, []);

  const unreadIds = notificationIds.filter((id) => !readIds.includes(id));

  const markRead = React.useCallback((ids) => {
    const safeIds = (Array.isArray(ids) ? ids : [ids]).map((id) => String(id || "")).filter(Boolean);
    if (safeIds.length === 0) return;
    setReadIds((current) => Array.from(new Set([...current, ...safeIds])));
    persistToServer(safeIds);
  }, [persistToServer]);

  const markAllRead = React.useCallback(() => {
    if (notificationIds.length === 0) return;
    setReadIds((current) => Array.from(new Set([...current, ...notificationIds])));
    persistToServer(notificationIds);
  }, [notificationIds, persistToServer]);

  const isRead = React.useCallback((id) => readIds.includes(String(id || "")), [readIds]);

  return {
    unreadCount: unreadIds.length,
    isRead,
    markRead,
    markAllRead
  };
}

function DashboardStatus({ error }) {
  return (
    <div style={{ padding: 32, color: error ? "#dc2626" : "var(--muted)" }}>
      {error || "Loading dashboard..."}
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <Card style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{message}</div>
    </Card>
  );
}

function MessageBubble({ message, isOwn = false, accent = "#2563eb", soft = "#eff6ff" }) {
  return (
    <div style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start" }}>
      <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: 10, maxWidth: "86%" }}>
        <Avatar initials={message.avatar || (message.from || "U").slice(0, 2).toUpperCase()} size={30} imageUrl={message.profileImageUrl || ""} color={accent} />
        <div style={{ maxWidth: "78%", padding: "12px 14px", borderRadius: 18, background: isOwn ? accent : soft, color: isOwn ? "#ffffff" : "#0f172a", border: isOwn ? "none" : "1px solid #dbe4f0", boxShadow: isOwn ? "0 8px 18px rgba(15, 23, 42, 0.08)" : "none" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.03em", opacity: isOwn ? 0.92 : 0.65, marginBottom: 6 }}>
            {message.from}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{message.text}</div>
          <div style={{ fontSize: 11, marginTop: 8, opacity: isOwn ? 0.82 : 0.55 }}>
            {message.time}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportExportButton({ onClick, label = "Download PDF", compact = false }) {
  const isMobile = useIsMobile(640);

  return (
    <Btn
      variant="outline"
      onClick={onClick}
      style={{
        minWidth: compact ? (isMobile ? "100%" : 132) : (isMobile ? "100%" : 148),
        minHeight: compact ? 38 : 42,
        padding: compact ? "9px 13px" : "10px 15px",
        borderRadius: 12,
        border: "1px solid #fde68a",
        background: "#fffbeb",
        color: "#92400e",
        boxShadow: "none"
      }}
    >
      <span style={{ fontWeight: 700 }}>📄 {compact ? "Export PDF" : `${label} PDF`}</span>
    </Btn>
  );
}

function SpreadsheetExportButton({ onClick, label = "Export Excel", compact = false }) {
  const isMobile = useIsMobile(640);

  return (
    <Btn
      variant="outline"
      onClick={onClick}
      style={{
        minWidth: compact ? (isMobile ? "100%" : 138) : (isMobile ? "100%" : 154),
        minHeight: compact ? 38 : 42,
        padding: compact ? "9px 13px" : "10px 15px",
        borderRadius: 12,
        border: "1px solid #86efac",
        background: "#dcfce7",
        color: "#15803d",
        boxShadow: "none"
      }}
    >
      <span style={{ fontWeight: 700 }}>📊 {compact ? "Export Excel" : `${label} Excel`}</span>
    </Btn>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{value}</div>
    </div>
  );
}

const AUDIT_LABEL_OVERRIDES = {
  actorName: "Coach",
  calories: "Calories",
  carbs: "Carbs",
  changedFields: "Changed Fields",
  certifications: "Certifications",
  day: "Focus Day",
  duration: "Duration",
  email: "Email",
  fat: "Fat",
  foods: "Foods",
  goal: "Goal",
  level: "Level",
  mealPlanName: "Meal Plan",
  meals: "Meals",
  memberName: "Member",
  message: "Message",
  name: "Name",
  paymentStatus: "Payment Status",
  phone: "Phone",
  profileImageUrl: "Profile Image",
  progress: "Progress",
  protein: "Protein",
  role: "Role",
  specialty: "Specialty",
  status: "Status",
  targetName: "Target",
  time: "Time",
  title: "Title",
  totalWeeks: "Total Weeks",
  week: "Week",
  workoutPlanName: "Workout Plan"
};

function formatAuditFieldLabel(key) {
  if (!key) {
    return "Details";
  }

  if (AUDIT_LABEL_OVERRIDES[key]) {
    return AUDIT_LABEL_OVERRIDES[key];
  }

  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatAuditValue(value, key = "") {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "None";
    }

    if (value.every((item) => typeof item === "string" || typeof item === "number")) {
      return value.join(", ");
    }

    if (key === "meals") {
      return value
        .map((meal) => {
          if (!meal || typeof meal !== "object") {
            return null;
          }
          const mealLabel = meal.name || meal.time || "Meal";
          const foods = Array.isArray(meal.foods) && meal.foods.length ? ` (${meal.foods.join(", ")})` : "";
          return `${mealLabel}${foods}`;
        })
        .filter(Boolean)
        .join("; ");
    }

    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (typeof value === "object") {
    if (value.name) {
      const secondaryKey = ["goal", "day", "time", "level", "week"].find((candidate) => value[candidate]);
      if (secondaryKey) {
        return `${value.name} (${formatAuditFieldLabel(secondaryKey)}: ${value[secondaryKey]})`;
      }
      return value.name;
    }

    const compactEntries = Object.entries(value)
      .filter(([, nestedValue]) => typeof nestedValue !== "object" || nestedValue === null)
      .slice(0, 3)
      .map(([nestedKey, nestedValue]) => `${formatAuditFieldLabel(nestedKey)}: ${nestedValue}`);

    return compactEntries.length ? compactEntries.join(" | ") : "Structured details saved";
  }

  return String(value);
}

function buildAuditFields(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return [];
  }

  return Object.entries(snapshot)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      label: formatAuditFieldLabel(key),
      value: formatAuditValue(value, key)
    }));
}

function AuditFieldList({ snapshot, emptyText }) {
  const fields = React.useMemo(() => buildAuditFields(snapshot), [snapshot]);

  if (!fields.length) {
    return <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{emptyText}</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {fields.map((field, index) => (
        <div
          key={`${field.key}-${index}`}
          style={{
            paddingBottom: 10,
            borderBottom: index === fields.length - 1 ? "none" : "1px solid #e2e8f0"
          }}
        >
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
            {field.label}
          </div>
          <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, wordBreak: "break-word" }}>
            {field.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfilePhotoField({ file, onChange, currentImageUrl = "", initials = "PR", color = "#2563eb" }) {
  const previewUrl = React.useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const hasExistingImage = Boolean(currentImageUrl);
  const helperText = file
    ? file.name
    : hasExistingImage
      ? "Current profile photo"
      : "No profile photo uploaded yet";

  return (
    <FormField label="Profile Photo">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <Avatar initials={initials} size={56} color={color} imageUrl={previewUrl || currentImageUrl} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
            {file ? "New image selected" : hasExistingImage ? "Current image" : "Upload an image"}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{helperText}</div>
        </div>
      </div>
      <Input type="file" accept="image/*" onChange={(event) => onChange(event.target.files?.[0] || null)} />
    </FormField>
  );
}

function SupplementImageField({ file, onChange, currentImageUrl = "" }) {
  const previewUrl = React.useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayUrl = previewUrl || resolveImageUrl(currentImageUrl);
  const helperText = file
    ? file.name
    : currentImageUrl
      ? "Current supplement image"
      : "No image uploaded yet";

  return (
    <FormField label="Supplement Image">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <div style={{ width: 84, height: 84, borderRadius: 18, overflow: "hidden", border: "1px solid var(--border)", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {displayUrl ? (
            <img src={displayUrl} alt="Supplement preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 10 }}>No image</div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
            {file ? "New image selected" : currentImageUrl ? "Current image" : "Upload an image"}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{helperText}</div>
        </div>
      </div>
      <Input type="file" accept="image/*" onChange={(event) => onChange(event.target.files?.[0] || null)} />
    </FormField>
  );
}

function InfoTile({ label, value, tone = "#2563eb", soft = "#eff6ff" }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: 16, background: soft, border: `1px solid ${tone}20` }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

function ProfileMetric({ label, value, tone = "#2563eb", soft = "#eff6ff" }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 16, background: soft, border: `1px solid ${tone}20` }}>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
        {value}
      </div>
    </div>
  );
}

function ProfileSection({ title, description = "", children, action }) {
  return (
    <Card>
      <SectionHeader title={title} action={action} />
      {description ? (
        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 14 }}>
          {description}
        </div>
      ) : null}
      {children}
    </Card>
  );
}

function DetailStack({ items = [] }) {
  const visibleItems = items.filter((item) => item && item.label);

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {visibleItems.map((item) => (
        <div
          key={item.label}
          style={{
            paddingBottom: 12,
            borderBottom: "1px solid #e2e8f0"
          }}
        >
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            {item.label}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.5 }}>
            {item.value}
          </div>
          {item.helper ? (
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.55, marginTop: 4 }}>
              {item.helper}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ModalSectionBlock({ title, description = "", children, accent = "#2563eb" }) {
  return (
    <div style={{ padding: "18px 18px 16px", borderRadius: 20, background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: 999, background: accent }} />
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>{title}</div>
      </div>
      {description ? (
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, marginBottom: 14 }}>{description}</div>
      ) : null}
      {children}
    </div>
  );
}

function ModalFormGrid({ isMobile, children, columns = 2 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${columns}, minmax(0, 1fr))`, gap: 14 }}>
      {children}
    </div>
  );
}

function MemberManagementCard({ member, onEdit, onResetPassword, onRemove }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar initials={member.avatar} size={38} imageUrl={member.profileImageUrl || ""} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{member.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {member.memberCode || "Pending"} | {member.email || "No email"}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginTop: 14 }}>
            <InfoTile label="Plan" value={member.plan} tone="#2563eb" soft="#eff6ff" />
            <InfoTile label="Coach" value={member.coach} tone="#7c3aed" soft="#f5f3ff" />
            <InfoTile label="Diet Plan" value={member.dietPlanName || "Not assigned"} tone="#16a34a" soft="#f0fdf4" />
            <InfoTile label="Check-ins" value={String(member.checkIns)} tone="#ea580c" soft="#fff7ed" />
          </div>
          <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <Badge label={member.paymentStatus} type={member.paymentStatus} />
              <Badge label={member.status} type={member.status} />
            </div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, marginTop: 8 }}>
              Paid LKR {member.amountPaid.toLocaleString()} / Fee LKR {member.amountDue.toLocaleString()} / Remaining LKR {Number(member.remainingBalance || 0).toLocaleString()}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "auto" }}>
          <IconBtn title="Edit" onClick={() => onEdit(member)}><IcoEdit /></IconBtn>
          <IconBtn title="Reset Password" onClick={() => onResetPassword(member.id)}><IcoKey /></IconBtn>
          <IconBtn title="Remove" danger onClick={() => onRemove(member.id)}><IcoTrash /></IconBtn>
        </div>
      </div>
    </Card>
  );
}

function AttendanceMemberLookupCard({ query, onQueryChange, members, selectedMemberId, onSelect, attendance, onSubmit }) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const matches = (normalizedQuery
    ? members.filter((member) => [member.name, member.memberCode, member.email].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)))
    : members)
    .slice(0, 6);

  const selectedMember = members.find((member) => String(member.id) === String(selectedMemberId || "")) || null;
  const openSession = selectedMember
    ? attendance.find((item) => String(item.memberId || "") === String(selectedMember.id) && item.status === "checked-in")
    : null;

  return (
    <Card>
      <SectionHeader
        title="Member Check-in / Clock-out"
        action={selectedMember ? <Badge label={openSession ? "Ready to clock out" : "Ready to clock in"} type={openSession ? "warning" : "checked-in"} /> : null}
      />
      <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 14 }}>
        Search members by name, member ID, or email, select the correct match, and then complete the attendance action.
      </div>
      <FormField label="Find Member">
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search by member name, ID, or email" />
      </FormField>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {matches.map((member) => {
          const memberOpenSession = attendance.find((item) => String(item.memberId || "") === String(member.id) && item.status === "checked-in");
          const active = String(selectedMemberId || "") === String(member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelect(member.id)}
              style={{
                width: "100%",
                textAlign: "left",
                border: active ? "1px solid #93c5fd" : "1px solid #e2e8f0",
                background: active ? "#eff6ff" : "#ffffff",
                borderRadius: 14,
                padding: "12px 14px",
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    {member.memberCode || "Pending"} | {member.email || "No email"}
                  </div>
                </div>
                <Badge label={memberOpenSession ? "checked-in" : "checked-out"} type={memberOpenSession ? "checked-in" : "checked-out"} />
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <Btn onClick={onSubmit} disabled={!selectedMember}>
          {selectedMember ? (openSession ? "Clock Out Member" : "Clock In Member") : "Clock In / Out"}
        </Btn>
      </div>
    </Card>
  );
}

function SearchSelectCard({ label, query, onQueryChange, items, onSelect, selectedId, placeholder, emptyText = "No matches found.", renderMeta, maxItems = 6, scrollable = true }) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const filteredItems = (normalizedQuery
    ? items.filter((item) => [item.name, item.code, item.email, item.meta].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)))
    : items)
    .slice(0, maxItems);

  return (
    <FormField label={label}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: scrollable ? 240 : "none", overflowY: scrollable ? "auto" : "visible" }}>
          {filteredItems.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted)", padding: "10px 12px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>{emptyText}</div>
          ) : filteredItems.map((item) => {
            const active = String(selectedId || "") === String(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: active ? "1px solid #93c5fd" : "1px solid #e2e8f0",
                  background: active ? "#eff6ff" : "#ffffff",
                  borderRadius: 14,
                  padding: "12px 14px",
                  cursor: "pointer"
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{renderMeta ? renderMeta(item) : item.meta}</div>
              </button>
            );
          })}
        </div>
      </div>
    </FormField>
  );
}

function SearchOnlyField({ label, value, onChange, placeholder }) {
  return (
    <FormField label={label}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </FormField>
  );
}

function ProfileHeroCard({ title, subtitle, badge, accent = "#2563eb", soft = "#eff6ff", initials, imageUrl = "", children, action, highlights = [] }) {
  const isMobile = useIsMobile(640);
  const visibleHighlights = highlights.filter((item) => item && item.label);
  return (
    <Card style={{ padding: 0, overflow: "hidden", border: `1px solid ${accent}1c`, boxShadow: "0 18px 34px rgba(15, 23, 42, 0.06)" }}>
      <div style={{ padding: isMobile ? 18 : 24, background: `linear-gradient(135deg, ${soft}, #ffffff 62%)`, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: 16, alignItems: isMobile ? "flex-start" : "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar initials={initials} size={isMobile ? 60 : 72} color={accent} imageUrl={imageUrl} />
            <div>
              <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a" }}>{title}</div>
              <div style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>{subtitle}</div>
              {badge ? <div style={{ marginTop: 10 }}>{badge}</div> : null}
            </div>
          </div>
          {action ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{action}</div> : null}
        </div>
      </div>
      <div style={{ padding: isMobile ? 18 : 24 }}>
        {visibleHighlights.length ? (
          <div style={{ ...responsiveGrid(isMobile, `repeat(${Math.min(visibleHighlights.length, 4)}, minmax(0,1fr))`, "repeat(2,minmax(0,1fr))"), gap: 12, marginBottom: 16 }}>
            {visibleHighlights.map((item) => (
              <ProfileMetric key={item.label} label={item.label} value={item.value} tone={item.tone || accent} soft={item.soft || soft} />
            ))}
          </div>
        ) : null}
        {children}
      </div>
    </Card>
  );
}

function NotificationCard({ item, isRead = false, onMarkRead }) {
  return (
    <Card style={{ opacity: isRead ? 0.72 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{item.title}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{item.body}</div>
          {item.date && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>{item.date}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <Badge label={isRead ? "read" : String(item.type || "info").replace("-", " ")} type={isRead ? "default" : (item.severity || "info")} />
          {!isRead && onMarkRead ? <Btn small variant="ghost" onClick={onMarkRead}>Mark Read</Btn> : null}
        </div>
      </div>
    </Card>
  );
}

function NotificationBell({ count = 0, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `Open notifications (${count} unread)` : "Open notifications"}
      style={{
        position: "relative",
        width: 38,
        height: 38,
        padding: 0,
        border: "none",
        background: "transparent",
        color: active ? "#2563eb" : "#475569",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5c-.9 0-1.6.7-1.6 1.6v.6A5.7 5.7 0 0 0 7.2 11v3.1c0 1.2-.5 2.4-1.4 3.2l-.5.5c-.2.2-.3.5-.2.8.1.3.4.4.7.4h12.4c.3 0 .6-.1.7-.4.1-.3 0-.6-.2-.8l-.5-.5a4.4 4.4 0 0 1-1.4-3.2V11a5.7 5.7 0 0 0-3.2-5.2v-.6c0-.9-.7-1.6-1.6-1.6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9.8 19.1a2.7 2.7 0 0 0 4.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {count > 0 ? (
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 20,
            height: 20,
            padding: "0 6px",
            borderRadius: 999,
            background: "#dc2626",
            color: "#ffffff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1,
            boxShadow: "0 0 0 2px #ffffff"
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

function TemporaryCredentialModal({ details, onClose }) {
  if (!details) {
    return null;
  }

  return (
    <Modal title="Temporary Login Created" onClose={onClose} width={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card style={{ padding: 16, background: "#f8fafc" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Role</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{details.role}</div>
        </Card>
        <Card style={{ padding: 16, background: "#f8fafc" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Login Email</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>{details.email}</div>
        </Card>
        <Card style={{ padding: 16, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: 12, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Temporary Password</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#1d4ed8", letterSpacing: "0.04em", wordBreak: "break-word" }}>{details.temporaryPassword}</div>
        </Card>
        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
          Share this securely. The user will be forced to change it on first login before entering the dashboard.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn onClick={onClose}>Done</Btn>
        </div>
      </div>
    </Modal>
  );
}

function formatReceiptDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function buildReceiptNumber(id) {
  const safeId = String(id || "").trim();
  if (!safeId) {
    return "SALE";
  }

  return `SALE-${safeId.slice(-6).toUpperCase()}`;
}

function getReceiptDisplayDetails(receipt) {
  const customerName = String(receipt?.customerName || "").trim();
  const memberName = String(receipt?.memberName || "").trim();
  const normalizedCustomer = customerName.toLowerCase();
  const normalizedMember = memberName.toLowerCase();
  const hasDistinctMember = Boolean(memberName && normalizedMember !== normalizedCustomer);

  return {
    buyerName: customerName || memberName || "Walk-in Customer",
    memberName,
    hasDistinctMember
  };
}

function getReceiptEmailMessage(receiptEmail) {
  if (!receiptEmail || receiptEmail.status === "not-requested") {
    return "";
  }

  if (receiptEmail.status === "sent") {
    return `Receipt emailed to ${receiptEmail.to}.`;
  }

  if (receiptEmail.status === "skipped") {
    return "Receipt email was skipped because SMTP is not configured on the server.";
  }

  if (receiptEmail.status === "failed") {
    return `Receipt email could not be sent to ${receiptEmail.to}.`;
  }

  return "";
}

function escapeReceiptHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function printSaleReceipt(receipt, gymName) {
  if (typeof window === "undefined" || !receipt) {
    return;
  }

  const { buyerName, memberName, hasDistinctMember } = getReceiptDisplayDetails(receipt);

  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) {
    return;
  }

  const itemsMarkup = (Array.isArray(receipt.items) ? receipt.items : [])
    .map((item) => `
      <tr>
        <td>${escapeReceiptHtml(item.name)}</td>
        <td style="text-align:center;">${item.qty}</td>
        <td style="text-align:right;">${formatCurrencyValue(item.unitPrice)}</td>
        <td style="text-align:right;">${formatCurrencyValue(item.lineTotal)}</td>
      </tr>
    `)
    .join("");

  const notesMarkup = receipt.notes
    ? `<div class="notes"><strong>Notes:</strong> ${escapeReceiptHtml(receipt.notes)}</div>`
    : "";
  const memberMarkup = hasDistinctMember
    ? `<div><strong>Linked Member:</strong> ${escapeReceiptHtml(memberName)}</div>`
    : "";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${buildReceiptNumber(receipt.id)}</title>
        <style>
          body {
            font-family: Poppins, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            background: #ffffff;
          }
          .receipt {
            max-width: 360px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 6px 0 0;
            color: #475569;
            font-size: 13px;
          }
          .meta,
          .totals,
          .notes {
            margin-top: 14px;
            font-size: 13px;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 13px;
          }
          th,
          td {
            padding: 8px 0;
            border-bottom: 1px dashed #cbd5e1;
          }
          th {
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #64748b;
          }
          .totals {
            border-top: 2px solid #0f172a;
            padding-top: 12px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-top: 6px;
          }
          .grand-total {
            font-weight: 700;
            font-size: 15px;
          }
          .footer {
            margin-top: 24px;
            text-align: center;
            color: #64748b;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>${escapeReceiptHtml(gymName || "FitnessHub Gym")}</h1>
            <p>Sales Bill</p>
          </div>
          <div class="meta">
            <div><strong>Bill No:</strong> ${buildReceiptNumber(receipt.id)}</div>
            <div><strong>Date:</strong> ${formatReceiptDateTime(receipt.soldAt)}</div>
            <div><strong>Buyer:</strong> ${escapeReceiptHtml(buyerName)}</div>
            ${memberMarkup}
            <div><strong>Payment:</strong> ${escapeReceiptHtml(receipt.paymentMethod || "cash")}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Price</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsMarkup}</tbody>
          </table>
          <div class="totals">
            <div class="total-row"><span>Subtotal</span><span>${formatCurrencyValue(receipt.subtotal)}</span></div>
            <div class="total-row grand-total"><span>Total</span><span>${formatCurrencyValue(receipt.total)}</span></div>
          </div>
          ${notesMarkup}
          <div class="footer">Thank you for your purchase.</div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function SaleReceiptModal({ receipt, gymName, onClose }) {
  const isMobile = useIsMobile(640);

  if (!receipt) {
    return null;
  }

  const { buyerName, memberName, hasDistinctMember } = getReceiptDisplayDetails(receipt);

  return (
    <Modal title="Sale Bill" onClose={onClose} width={640} subtitle="Review the bill details below and print it for the customer.">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...responsiveGrid(isMobile, "1fr 1fr", "1fr"), gap: 12 }}>
          <InfoTile label="Bill Number" value={buildReceiptNumber(receipt.id)} tone="#2563eb" soft="#eff6ff" />
          <InfoTile label="Date" value={formatReceiptDateTime(receipt.soldAt)} tone="#16a34a" soft="#f0fdf4" />
          <InfoTile label="Buyer" value={buyerName} tone="#7c3aed" soft="#f5f3ff" />
          <InfoTile label="Payment" value={receipt.paymentMethod || "cash"} tone="#ea580c" soft="#fff7ed" />
        </div>
        <Card style={{ padding: 0 }}>
          <Table
            headers={["Item", "Qty", "Unit Price", "Line Total"]}
            rows={(Array.isArray(receipt.items) ? receipt.items : []).map((item) => [
              item.name,
              item.qty,
              formatCurrencyValue(item.unitPrice),
              formatCurrencyValue(item.lineTotal)
            ])}
          />
        </Card>
        <Card style={{ padding: 18, background: "#f8fafc" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "#334155" }}>
            {hasDistinctMember ? (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>Linked Member</span>
                <span style={{ fontWeight: 600 }}>{memberName}</span>
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 600 }}>{formatCurrencyValue(receipt.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTop: "1px solid #cbd5e1", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              <span>Total</span>
              <span>{formatCurrencyValue(receipt.total)}</span>
            </div>
          </div>
          {receipt.notes ? (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #e2e8f0", fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              <strong>Notes:</strong> {receipt.notes}
            </div>
          ) : null}
          {getReceiptEmailMessage(receipt.receiptEmail) ? (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #e2e8f0", fontSize: 13, color: receipt.receiptEmail?.status === "sent" ? "#15803d" : "#b45309", lineHeight: 1.6 }}>
              {getReceiptEmailMessage(receipt.receiptEmail)}
            </div>
          ) : null}
        </Card>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn onClick={() => printSaleReceipt(receipt, gymName)}>Print Bill</Btn>
        </div>
      </div>
    </Modal>
  );
}

function DashboardShell({ accent, title, subtitle, navItems, page, setPage, sidebar, topRight, children, isMobile = false }) {
  const visibleNavItems = navItems.filter((item) => !item.hiddenInNav);
  const groupedNavItems = visibleNavItems.reduce((groups, item) => {
    const key = item.section || "Workspace";
    const existing = groups.find((group) => group.label === key);
    if (existing) { existing.items.push(item); return groups; }
    groups.push({ label: key, items: [item] });
    return groups;
  }, []);
  const useNavGroups = groupedNavItems.length > 1 || groupedNavItems.some((group) => group.label !== "Workspace");

  const navBg        = "linear-gradient(180deg, #ffffff, #f8fafc)";
  const navText      = "#64748b";
  const navActiveText= accent;
  const navActiveBg  = `linear-gradient(135deg, ${accent}22, ${accent}12)`;
  const navHoverBg   = "#f1f5f9";
  const navGroupLabel= "#94a3b8";
  const sidebarBorder= "1px solid rgba(148,163,184,0.18)";
  const sidebarShadow= "10px 0 30px rgba(15,23,42,0.04)";

  function renderNavButton(item) {
    const isActive = page === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setPage(item.id)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "center" : "flex-start",
          gap: 10,
          padding: isMobile ? "10px 12px" : "10px 12px",
          borderRadius: 10,
          border: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
          cursor: "pointer",
          textAlign: "left",
          fontSize: 13,
          fontWeight: isActive ? 700 : 500,
          fontFamily: "var(--font)",
          width: isMobile ? "auto" : "100%",
          position: "relative",
          background: isActive ? navActiveBg : "transparent",
          color: isActive ? navActiveText : navText,
          transition: "background 0.15s, color 0.15s",
          boxShadow: isActive ? `inset 0 0 0 1px ${accent}22` : "none"
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = navHoverBg; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
      >
        {!isMobile && (
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, flexShrink: 0, background: isActive ? accent : "#cbd5e1", boxShadow: isActive ? `0 0 0 5px ${accent}14` : "none", transition: "all 0.2s ease" }} />
        )}
        <span style={{ flex: isMobile ? undefined : 1 }}>{item.label}</span>
        {item.count > 0 ? (
          <span style={{
            minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: isActive ? accent : "#e2e8f0",
            color: isActive ? "#ffffff" : "#475569",
            fontSize: 10, fontWeight: 800, lineHeight: 1
          }}>
            {item.count > 99 ? "99+" : item.count}
          </span>
        ) : null}
      </button>
    );
  }

  const currentNavItem = navItems.find((item) => item.id === page);

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", overflow: "hidden", background: "var(--bg)", fontFamily: "var(--font)" }}>

      {/* ── Sidebar ── */}
      <div style={{ width: isMobile ? "100%" : 248, background: navBg, borderRight: sidebarBorder, borderBottom: isMobile ? "1px solid var(--border)" : "none", display: "flex", flexDirection: "column", flexShrink: 0, minHeight: 0, overflowY: isMobile ? "visible" : "auto", boxShadow: isMobile ? "0 4px 16px rgba(15,23,42,0.06)" : sidebarShadow }}>

        {/* Brand block */}
        <div style={{ padding: isMobile ? "16px 16px 14px" : "26px 18px 18px", borderBottom: isMobile ? "1px solid var(--border)" : "none", flexShrink: 0 }}>
          <div style={{ padding: isMobile ? 0 : 18, borderRadius: isMobile ? 0 : 24, background: isMobile ? "transparent" : `linear-gradient(135deg, ${accent}14, rgba(255,255,255,0.95))`, border: isMobile ? "none" : `1px solid ${accent}18` }}>
            <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 900, letterSpacing: "-0.04em", color: accent }}>{title}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.12em" }}>{subtitle}</div>
          </div>
          {sidebar}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: isMobile ? "10px 10px 12px" : "10px 10px 16px", display: "flex", flexDirection: isMobile ? "row" : "column", gap: isMobile ? 4 : 2, overflowX: isMobile ? "auto" : "visible", overflowY: isMobile ? "visible" : "auto", scrollbarWidth: "none" }}>
          {isMobile ? visibleNavItems.map(renderNavButton) : (
            (useNavGroups ? groupedNavItems : [{ label: "", items: visibleNavItems }]).map((group) => (
              <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: group.label ? 8 : 0 }}>
                {group.label ? (
                  <div style={{ padding: "10px 12px 4px", fontSize: 10, fontWeight: 800, color: navGroupLabel, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    {group.label}
                  </div>
                ) : null}
                {group.items.map(renderNavButton)}
              </div>
            ))
          )}
        </nav>


      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Topbar */}
        <div style={{ height: isMobile ? "auto" : 58, padding: isMobile ? "12px 16px" : "0 28px", borderBottom: "1px solid var(--border)", background: "#ffffff", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: 10, flexShrink: 0, boxShadow: "0 1px 0 rgba(15,23,42,0.06)" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
              {currentNavItem?.label}
            </div>
            {currentNavItem?.description && !isMobile && (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{currentNavItem.description}</div>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>{topRight}</div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 12 : 28, background: "var(--bg)" }}>{children}</div>
      </div>
    </div>
  );
}

function RevenueBreakdown({ members, plans }) {
  const safeMembers = Array.isArray(members) ? members : [];
  const safePlans = Array.isArray(plans) ? plans : [];

  const totalRevenue = safeMembers.reduce((sum, member) => {
    const plan = safePlans.find((item) => item.name === member.plan);
    return sum + (plan?.price || 0);
  }, 0);

  return safePlans.map((plan) => {
    const count = safeMembers.filter((member) => member.plan === plan.name).length;
    const value = count * plan.price;
    return { ...plan, count, value, percent: totalRevenue ? (value / totalRevenue) * 100 : 0 };
  });
}

function lastMetricValue(values, suffix = "") {
  if (!Array.isArray(values) || values.length === 0) {
    return `0${suffix}`;
  }

  const last = values[values.length - 1];
  return `${last ?? 0}${suffix}`;
}

function metricDelta(values) {
  if (!Array.isArray(values) || values.length < 2) {
    return 0;
  }

  return Number(values[values.length - 1] || 0) - Number(values[0] || 0);
}

function metricValue(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  return Number(values[values.length - 1] || 0);
}

function targetProgress(current, target, goalType = "down") {
  if (current == null || target == null || !Number.isFinite(Number(current)) || !Number.isFinite(Number(target))) {
    return 0;
  }

  const currentValue = Number(current);
  const targetValue = Number(target);

  if (goalType === "up") {
    if (targetValue <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (currentValue / targetValue) * 100));
  }

  if (currentValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, ((currentValue - targetValue) / currentValue) * 100));
}

function matchesQuery(item, query, fields) {
  if (!query.trim()) {
    return true;
  }

  const normalized = query.trim().toLowerCase();
  return fields.some((field) => String(item[field] || "").toLowerCase().includes(normalized));
}

function getExpenseCategories(type = "expense", items = []) {
  const normalizedType = type === "income" ? "income" : type === "all" ? "all" : "expense";
  const baseOptions = normalizedType === "all"
    ? [...EXPENSE_CATEGORY_OPTIONS.expense, ...EXPENSE_CATEGORY_OPTIONS.income]
    : EXPENSE_CATEGORY_OPTIONS[normalizedType] || [];
  const existingOptions = items
    .filter((item) => normalizedType === "all" || (item.type || "expense") === normalizedType)
    .map((item) => String(item.category || "").trim())
    .filter(Boolean);

  return Array.from(new Set([...baseOptions, ...existingOptions]));
}

function paginateItems(items, page, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    totalPages,
    visibleItems: items.slice(start, start + pageSize)
  };
}

function Toolbar({ search, setSearch, searchPlaceholder, filters = [], action = null }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <Input
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 320 }}
      />
      {filters.map((filter) => (
        <Select
          key={filter.label}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          style={{ width: 180 }}
        >
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      ))}
      {action ? <div style={{ marginLeft: "auto" }}>{action}</div> : null}
    </div>
  );
}

function SearchableCategoryFilter({ value, onChange, options }) {
  const [inputValue, setInputValue] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  const filtered = React.useMemo(() => {
    const q = inputValue.toLowerCase();
    const all = ["all", ...options];
    return q ? all.filter((c) => c.toLowerCase().includes(q)) : all;
  }, [inputValue, options]);

  React.useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayLabel = value === "all" ? "All Categories" : value;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", background: "#fff", cursor: "pointer", minWidth: 160, fontSize: 13 }} onClick={() => setOpen((v) => !v)}>
        <span style={{ color: "var(--text)", flex: 1 }}>{displayLabel}</span>
        <span style={{ color: "var(--muted)", fontSize: 10 }}>&#9660;</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 100, background: "#fff", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 200, padding: 8 }}>
          <input
            autoFocus
            placeholder="Search category…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, marginBottom: 6, boxSizing: "border-box" }}
          />
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {filtered.map((cat) => (
              <div
                key={cat}
                onClick={() => { onChange(cat); setInputValue(""); setOpen(false); }}
                style={{ padding: "7px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, background: value === cat ? "#eff6ff" : "transparent", color: value === cat ? "#2563eb" : "var(--text)", fontWeight: value === cat ? 700 : 400 }}
                onMouseEnter={(e) => { if (value !== cat) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { if (value !== cat) e.currentTarget.style.background = "transparent"; }}
              >
                {cat === "all" ? "All Categories" : cat}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationControls({ page, totalPages, onPageChange, totalItems, label }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        {totalItems} {label} | Page {page} of {totalPages}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn small variant="ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Btn>
        <Btn small variant="ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Btn>
      </div>
    </div>
  );
}

function MacroPill({ label, value, tone = "#2563eb" }) {
  const isMobile = useIsMobile(640);
  return (
    <div style={{ padding: isMobile ? "9px 10px" : "10px 12px", borderRadius: 14, background: `${tone}12`, border: `1px solid ${tone}22`, minWidth: isMobile ? 0 : 82, width: isMobile ? "100%" : "auto" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: isMobile ? 14 : 15, fontWeight: 800, color: tone, lineHeight: 1.2 }}>{value}</div>
    </div>
  );
}

function WorkoutPlanCard({ plan, onAssign, onEdit, onDelete }) {
  const isMobile = useIsMobile(640);
  const badgeTone = plan.level === "Advanced" ? "#dc2626" : plan.level === "Intermediate" ? "#ea580c" : "#16a34a";

  return (
    <Card style={{ padding: 0, overflow: "hidden", border: "1px solid rgba(15, 23, 42, 0.08)", boxShadow: "0 18px 32px rgba(15, 23, 42, 0.06)" }}>
      <div style={{ padding: 18, background: "linear-gradient(135deg, #fff6e8, #ffffff 60%)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: `${badgeTone}14`, color: badgeTone, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {plan.level}
            </div>
            <div style={{ marginTop: 12, fontSize: 21, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827" }}>{plan.name}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{plan.category} focused routine built for {plan.duration}.</div>
          </div>
          <div style={{ display: "flex", gap: 6, width: isMobile ? "100%" : "auto" }}>
            <IconBtn title="Assign to Member" onClick={onAssign}><IcoAssign /></IconBtn>
            <IconBtn title="Edit" onClick={onEdit}><IcoEdit /></IconBtn>
            {onDelete ? <IconBtn title="Delete" danger onClick={onDelete}><IcoTrash /></IconBtn> : null}
          </div>
        </div>
      </div>
      <div style={{ padding: 18, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
        <MacroPill label="Duration" value={plan.duration} tone="#ea580c" />
        <MacroPill label="Days" value={`${plan.days} / week`} tone="#2563eb" />
        <MacroPill label="Track" value={plan.category} tone="#7c3aed" />
      </div>
    </Card>
  );
}

function MealPlanCard({ plan, onAssign, onEdit, onDelete }) {
  const isMobile = useIsMobile(640);
  const previewMeals = (plan.meals || []).slice(0, 3);

  return (
    <Card style={{ padding: 0, overflow: "hidden", border: "1px solid rgba(15, 23, 42, 0.08)", boxShadow: "0 18px 32px rgba(15, 23, 42, 0.06)" }}>
      <div style={{ padding: 18, background: "linear-gradient(135deg, #eefbf1, #ffffff 62%)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "rgba(22, 163, 74, 0.12)", color: "#15803d", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {plan.goal}
            </div>
            <div style={{ marginTop: 12, fontSize: 21, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827" }}>{plan.name}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              Structured for consistency with real foods and clear meal timing.
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, width: isMobile ? "100%" : "auto" }}>
            <IconBtn title="Assign to Member" onClick={onAssign}><IcoAssign /></IconBtn>
            <IconBtn title="Edit" onClick={onEdit}><IcoEdit /></IconBtn>
            {onDelete ? <IconBtn title="Delete" danger onClick={onDelete}><IcoTrash /></IconBtn> : null}
          </div>
        </div>
      </div>
      <div style={{ padding: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <MacroPill label="Calories" value={`${plan.calories} kcal`} tone="#16a34a" />
        <MacroPill label="Protein" value={`${plan.protein}g`} tone="#2563eb" />
        <MacroPill label="Carbs" value={`${plan.carbs}g`} tone="#ca8a04" />
        <MacroPill label="Fat" value={`${plan.fat}g`} tone="#dc2626" />
      </div>
      <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {previewMeals.map((meal) => (
          <div key={`${meal.time}-${meal.name}`} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{meal.name || "Meal slot"}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{meal.time || "Flexible"}</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
              {Array.isArray(meal.foods) && meal.foods.length ? meal.foods.join(", ") : "Foods not listed yet"}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExerciseTile({ exercise }) {
  const isMobile = useIsMobile(640);
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr auto auto auto", gap: 10, alignItems: "center", padding: isMobile ? "14px" : "12px 14px", borderRadius: 14, background: "#ffffff", border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.4 }}>{exercise.name}</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3,minmax(0,1fr))" : "unset", gap: 10 }}>
        <MacroPill label="Sets" value={exercise.sets} tone="#dc2626" />
        <MacroPill label="Reps" value={exercise.reps} tone="#2563eb" />
        <MacroPill label="Rest" value={exercise.rest} tone="#16a34a" />
      </div>
    </div>
  );
}

function MealTimelineItem({ meal }) {
  return (
    <div style={{ position: "relative", paddingLeft: 22 }}>
      <div style={{ position: "absolute", left: 3, top: 7, bottom: -16, width: 2, background: "linear-gradient(180deg, rgba(22,163,74,0.36), rgba(22,163,74,0.08))" }} />
      <div style={{ position: "absolute", left: 0, top: 4, width: 8, height: 8, borderRadius: 999, background: "#16a34a" }} />
      <div style={{ background: "#ffffff", border: "1px solid #dbe7d8", borderRadius: 16, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{meal.name || "Meal"}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>{meal.time || "Flexible"}</div>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
          {Array.isArray(meal.foods) && meal.foods.length ? meal.foods.join(", ") : "Foods not listed yet"}
        </div>
      </div>
    </div>
  );
}

function toPlanFeatures(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value || "";
}

function toMealLines(value) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((meal) => [meal.time || "", meal.name || "", Array.isArray(meal.foods) ? meal.foods.join(", ") : ""].join(" | "))
    .join("\n");
}

function toMealEntries(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ time: "", name: "", foods: "" }];
  }

  return value.map((meal) => ({
    time: meal.time || "",
    name: meal.name || "",
    foods: Array.isArray(meal.foods) ? meal.foods.join(", ") : ""
  }));
}

function sanitizeFilePart(value) {
  return String(value || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "report";
}

function formatCurrencyValue(value) {
  return `LKR ${Number(value || 0).toLocaleString()}`;
}

function normalizePaymentNumber(value, fallback = 0) {
  if (value == null || value === "") {
    return Number(fallback || 0);
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : Number(fallback || 0);
}

function deriveSubscriptionPaymentStatus(amountPaid, amountDue) {
  const paid = normalizePaymentNumber(amountPaid);
  const due = normalizePaymentNumber(amountDue);

  if (due <= 0 || paid >= due) {
    return "paid";
  }

  if (paid > 0) {
    return "partial";
  }

  return "unpaid";
}

function calculateRemainingBalance(amountPaid, amountDue) {
  const paid = normalizePaymentNumber(amountPaid);
  const due = normalizePaymentNumber(amountDue);
  return Math.max(0, due - paid);
}

function getPdfTheme(accent = [37, 99, 235]) {
  return {
    accent,
    navy: [17, 24, 39],
    slate: [51, 65, 85],
    ink: [15, 23, 42],
    muted: [100, 116, 139],
    line: [203, 213, 225],
    panel: [248, 250, 252],
    panelStrong: [241, 245, 249],
    white: [255, 255, 255]
  };
}

function addPdfHeader(doc, { title, subtitle, gymName, ownerName, location, generatedAt, accent = [37, 99, 235] }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const theme = getPdfTheme(accent);
  const margin = 28;
  const headerY = 28;
  const headerHeight = 96;
  const detailWidth = 196;
  const detailHeight = 74;
  const detailX = pageWidth - margin - detailWidth - 18;
  const detailY = headerY + 11;

  doc.setFillColor(...theme.white);
  doc.rect(0, 0, pageWidth, 220, "F");

  doc.setTextColor(...theme.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Prepared by FitnessHub reporting engine", margin, 18);

  doc.setFillColor(...theme.navy);
  doc.rect(margin, headerY, pageWidth - margin * 2, headerHeight, "F");
  doc.setFillColor(...theme.slate);
  doc.rect(margin, headerY + headerHeight - 2, pageWidth - margin * 2, 2, "F");

  doc.setFillColor(...theme.white);
  doc.roundedRect(detailX, detailY, detailWidth, detailHeight, 3, 3, "F");
  doc.setDrawColor(...theme.line);
  doc.roundedRect(detailX, detailY, detailWidth, detailHeight, 3, 3, "S");

  doc.setTextColor(...theme.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FITNESSHUB", margin + 18, headerY + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("GYM OPERATIONS REPORT", margin + 18, headerY + 44);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  doc.text(gymName || "FitnessHub Gym", margin + 18, headerY + 75);

  doc.setTextColor(...theme.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("REPORT DETAILS", detailX + 12, detailY + 16);
  doc.setDrawColor(...theme.line);
  doc.line(detailX + 12, detailY + 22, detailX + detailWidth - 12, detailY + 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Owner: ${ownerName || "N/A"}`, detailX + 12, detailY + 38);
  doc.text(`Location: ${location || "N/A"}`, detailX + 12, detailY + 52);
  doc.text(`Generated: ${generatedAt}`, detailX + 12, detailY + 66);

  const titleY = headerY + headerHeight + 24;
  doc.setTextColor(...theme.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, margin, titleY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...theme.muted);
  doc.text(subtitle, margin, titleY + 16);
  doc.setDrawColor(...theme.line);
  doc.line(margin, titleY + 28, pageWidth - margin, titleY + 28);
  doc.setTextColor(...theme.ink);

  return titleY + 42;
}

function addPdfSectionTitle(doc, title, startY, accent = [37, 99, 235], description = "") {
  const pageWidth = doc.internal.pageSize.getWidth();
  const theme = getPdfTheme(accent);

  doc.setDrawColor(...theme.line);
  doc.line(28, startY, pageWidth - 28, startY);
  doc.setTextColor(...theme.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, 28, startY + 16);
  if (description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.75);
    doc.setTextColor(...theme.muted);
    doc.text(description, 28, startY + 30);
  }

  return startY + (description ? 40 : 26);
}

function addPdfSummaryCards(doc, items, startY, accent = [37, 99, 235]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const theme = getPdfTheme(accent);
  const cols = pageWidth > 760 ? Math.min(4, items.length) : Math.min(2, items.length || 1);
  const gap = 10;
  const cardWidth = (pageWidth - 56 - gap * (cols - 1)) / cols;
  const cardHeight = 50;

  items.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 28 + (cardWidth + gap) * col;
    const y = startY + row * (cardHeight + gap);

    doc.setFillColor(...theme.panel);
    doc.setDrawColor(...theme.line);
    doc.rect(x, y, cardWidth, cardHeight, "FD");
    doc.setDrawColor(...theme.line);
    doc.line(x, y + 18, x + cardWidth, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.75);
    doc.setTextColor(...theme.muted);
    doc.text(String(item.label || "").toUpperCase(), x + 12, y + 12);
    doc.setFontSize(11);
    doc.setTextColor(...theme.ink);
    doc.text(String(item.value || "-"), x + 12, y + 34);
  });

  return startY + Math.ceil(items.length / cols) * (cardHeight + gap) - gap;
}

function getPdfTableConfig(doc, accent, startY, head, body) {
  const theme = getPdfTheme(accent);
  return {
    startY,
    head,
    body,
    theme: "plain",
    headStyles: {
      fillColor: theme.navy,
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 7
    },
    styles: {
      fontSize: 8.25,
      cellPadding: 6.5,
      textColor: theme.ink,
      lineColor: theme.line,
      lineWidth: 0.35,
      overflow: "linebreak"
    },
    bodyStyles: {
      fillColor: theme.white
    },
    alternateRowStyles: {
      fillColor: theme.panelStrong
    },
    margin: { left: 28, right: 28 },
    didParseCell: (hookData) => {
      if (hookData.section === "head") {
        hookData.cell.styles.lineWidth = 0;
      }
    }
  };
}

function finalizePdf(doc, filename) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFillColor(250, 251, 252);
    doc.rect(0, pageHeight - 28, pageWidth, 28, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(28, pageHeight - 22, pageWidth - 28, pageHeight - 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("FitnessHub | Confidential gym operations report", 28, pageHeight - 9);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 84, pageHeight - 9);
  }

  doc.save(filename);
}

function IconBtn({ onClick, title, children, danger, small }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: danger ? "#fee2e2" : "#f1f5f9",
        border: "none",
        borderRadius: 7,
        cursor: "pointer",
        padding: small ? "4px 6px" : "6px 8px",
        color: danger ? "#dc2626" : "#475569",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.15s, color 0.15s",
        lineHeight: 1
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? "#fecaca" : "#e2e8f0";
        e.currentTarget.style.color = danger ? "#b91c1c" : "#1e293b";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = danger ? "#fee2e2" : "#f1f5f9";
        e.currentTarget.style.color = danger ? "#dc2626" : "#475569";
      }}
    >
      {children}
    </button>
  );
}

/* ── SVG icon set ─────────────────────────────────────────────────────── */
const IcoView = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IcoEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcoKey = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="M21 2l-9.6 9.6"/>
    <path d="M15.5 7.5l3 3L22 7l-3-3"/>
  </svg>
);
const IcoSave = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IcoBan = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcoTag = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const IcoCalendar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoMail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IcoBackup = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);
const IcoWrench = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const IcoAlert = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IcoClock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoCoffee = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8h1a4 4 0 0 1 0 8h-1"/>
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
    <line x1="6" y1="2" x2="6" y2="4"/>
    <line x1="10" y1="2" x2="10" y2="4"/>
    <line x1="14" y1="2" x2="14" y2="4"/>
  </svg>
);
const IcoX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoAssign = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="19" y1="8" x2="19" y2="14"/>
    <line x1="22" y1="11" x2="16" y2="11"/>
  </svg>
);
const IcoCreditCard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

function DonutChart({ segments, size = 120, thickness = 20 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--muted)" }}>No data</div>
  );
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let cumulative = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
      {segments.filter(seg => seg.value > 0).map((seg, i) => {
        const len = (seg.value / total) * circ;
        const offset = circ * 0.25 - cumulative;
        cumulative += len;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={seg.color} strokeWidth={thickness}
            strokeDasharray={`${Math.max(0, len - 2)} ${circ - Math.max(0, len - 2)}`}
            strokeDashoffset={offset} strokeLinecap="butt" />
        );
      })}
      <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize={size > 100 ? 18 : 13} fontWeight={800} fill="#0f172a">{total}</text>
    </svg>
  );
}
function DualBarChart({ dataA, dataB, labels, colorA = "#2563eb", colorB = "#f59e0b", height = 100, labelA = "Revenue", labelB = "Expenses" }) {
  const max = Math.max(1, ...dataA, ...dataB);
  return (
    <div>
      <div style={{ display: "flex", gap: 4, height, alignItems: "flex-end" }}>
        {dataA.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
            <div style={{ display: "flex", gap: 2, width: "100%", flex: 1, alignItems: "flex-end" }}>
              <div style={{ flex: 1, background: colorA, borderRadius: "3px 3px 0 0", height: `${(v / max) * 100}%`, minHeight: v > 0 ? 3 : 0 }} />
              <div style={{ flex: 1, background: colorB, borderRadius: "3px 3px 0 0", height: `${((dataB[i] || 0) / max) * 100}%`, minHeight: (dataB[i] || 0) > 0 ? 3 : 0 }} />
            </div>
            {labels && <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{labels[i]}</div>}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: colorA, display: "inline-block" }} />{labelA}</span>
        <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: colorB, display: "inline-block" }} />{labelB}</span>
      </div>
    </div>
  );
}

const PLATFORM_INCOME_CATEGORIES = ["Subscription Fee", "Setup Fee", "Upgrade Fee", "Penalty", "Other Income"];
const PLATFORM_EXPENSE_CATEGORIES = ["Hosting", "Support", "Marketing", "Operations", "Software", "Salary", "Other Expense"];

function SuperAdminDash() {
  const { user, logout } = useAuth();
  const {
    data, error, loading,
    addGym, editGym, uploadGymLogo, suspendGym, reactivateGym, getGymDetails, resetOwnerPassword, editMyProfile,
    addGymOwner, removeGymOwner,
    addSubscriptionPlan, editSubscriptionPlan, removeSubscriptionPlan, assignGymSubscription,
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
  const emptyPfExpenseForm = React.useMemo(() => ({ id: "", type: "income", title: "", category: "", amount: "", gymId: "", gymName: "", paymentMethod: "cash", referenceNumber: "", status: "paid", entryDate: new Date().toISOString().slice(0, 10), notes: "" }), []);
  const [pfExpenseForm, setPfExpenseForm] = React.useState(emptyPfExpenseForm);
  const [pfExpenseError, setPfExpenseError] = React.useState("");
  const [pfExpenseSearch, setPfExpenseSearch] = React.useState("");
  const [pfExpenseTypeFilter, setPfExpenseTypeFilter] = React.useState("all");
  const [pfExpensePage, setPfExpensePage] = React.useState(1);
  const [platformExpenses, setPlatformExpenses] = React.useState([]);

  // Billing sort state
  const [billingSortBy, setBillingSortBy] = React.useState("revenue");

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
  const [bankTxPage, setBankTxPage] = React.useState(1);
  const [bankTxModal, setBankTxModal] = React.useState(null);
  const emptyBankTxForm = React.useMemo(() => ({ id: "", type: "credit", amount: "", description: "", category: "", gymId: "", gymName: "", paymentMethod: "bank-transfer", referenceNumber: "", bankName: "", accountNumber: "", transactionDate: new Date().toISOString().slice(0, 10), status: "completed", notes: "" }), []);
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
    if (page === "bank-transactions") {
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
  function openEditPfExpense(e) { setPfExpenseForm({ id: e._id || e.id, type: e.type, title: e.title, category: e.category, amount: String(e.amount), gymId: e.gymId || "", gymName: e.gymName || "", paymentMethod: e.paymentMethod || "cash", referenceNumber: e.referenceNumber || "", status: e.status || "paid", entryDate: e.entryDate ? e.entryDate.slice(0, 10) : "", notes: e.notes || "" }); setPfExpenseError(""); setPfExpenseModal("edit"); }
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
    setBankTxForm({ id: tx._id || tx.id, type: tx.type, amount: String(tx.amount), description: tx.description, category: tx.category || "", gymId: tx.gymId || "", gymName: tx.gymName || "", paymentMethod: tx.paymentMethod || "bank-transfer", referenceNumber: tx.referenceNumber || "", bankName: tx.bankName || "", accountNumber: tx.accountNumber || "", transactionDate: tx.transactionDate ? tx.transactionDate.slice(0, 10) : "", status: tx.status || "completed", notes: tx.notes || "" });
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
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("FitnessHub — Gym Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [["Gym", "Owner", "Location", "Plan", "Status", "Members", "Revenue", "Joined"]],
      body: filteredGyms.map((g) => [g.name, g.owner, g.location, g.plan, g.status, g.members, `LKR ${Number(g.revenue || 0).toLocaleString()}`, g.joined]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save(`gyms-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportSuperAdminGymsExcel() {
    downloadGymsExcel().catch(() => {});
  }

  function saXlsx(header, rows, sheet, filename) {
    const XLSX = window.__XLSX__;
    if (!XLSX) { alert("Excel export not available. Please refresh and try again."); return; }
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet);
    XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function saPdf(title, subtitle, headers, rows, landscape, filename) {
    const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
    doc.setFontSize(14); doc.text(`FitnessHub — ${title}`, 14, 18);
    doc.setFontSize(10); doc.text(`${subtitle} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    autoTable(doc, { startY: 38, head: [headers], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [37, 99, 235] } });
    doc.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportOwnersPdf() { saPdf("Owner Management", "All registered gym owners", ["Owner", "Email", "Gym", "Plan", "Gym Status", "Last Login"], filteredOwners.map((o) => [o.name || "", o.email || "", o.gymName || "", o.plan || "", o.gymStatus || "", o.lastLoginAt ? new Date(o.lastLoginAt).toLocaleDateString() : "Never"]), true, "owners"); }
  function exportOwnersExcel() { saXlsx(["Owner", "Email", "Gym", "Plan", "Gym Status", "Last Login"], filteredOwners.map((o) => [o.name || "", o.email || "", o.gymName || "", o.plan || "", o.gymStatus || "", o.lastLoginAt ? new Date(o.lastLoginAt).toLocaleDateString() : "Never"]), "Owners", "owners"); }

  function exportTrialsPdf() { saPdf("Trial Management", "Gyms currently on trial", ["Gym", "Owner", "Plan", "Days Left", "Trial Ends", "Status"], trials.map((t) => [t.name || "", t.owner || "", t.plan || "", String(t.daysLeft ?? ""), t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : "", t.status || ""]), true, "trials"); }
  function exportTrialsExcel() { saXlsx(["Gym", "Owner", "Plan", "Days Left", "Trial Ends", "Status"], trials.map((t) => [t.name || "", t.owner || "", t.plan || "", t.daysLeft ?? "", t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : "", t.status || ""]), "Trials", "trials"); }

  function exportAuditPdf() { saPdf("Platform Audit Log", "All recorded platform activity", ["Time", "Gym", "Actor", "Action", "Target", "Summary"], platformAudit.map((a) => [a.timestamp ? new Date(a.timestamp).toLocaleString() : "", a.gymName || "", a.actorName || "", a.action || "", a.targetName || "", a.summary || ""]), true, "audit-log"); }
  function exportAuditExcel() { saXlsx(["Time", "Gym", "Actor", "Action", "Target", "Summary"], platformAudit.map((a) => [a.timestamp ? new Date(a.timestamp).toLocaleString() : "", a.gymName || "", a.actorName || "", a.action || "", a.targetName || "", a.summary || ""]), "Audit Log", "audit-log"); }

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
    saPdf("Gym Health Report", "Operational health metrics across all gyms", ["Gym", "Owner", "Members", "Revenue (LKR)", "Check-Ins Today", "Plan", "Status"], gymHealthList.map((g) => [g.gymName || "", g.ownerName || "", String(g.memberCount || 0), Number(g.revenue || 0).toLocaleString(), String(g.checkInsToday || 0), g.plan || "", g.status || ""]), true, "gym-health");
  }
  function exportHealthExcel() {
    saXlsx(["Gym", "Owner", "Members", "Revenue (LKR)", "Check-Ins Today", "Plan", "Status"], gymHealthList.map((g) => [g.gymName || "", g.ownerName || "", g.memberCount || 0, g.revenue || 0, g.checkInsToday || 0, g.plan || "", g.status || ""]), "Gym Health", "gym-health");
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
      accent="#2563eb"
      title="FitnessHub"
      subtitle="Super Admin"
      navItems={[
        { id: "dashboard",         label: "Dashboard" },
        { id: "notifications",     label: "Notifications", count: notificationState.unreadCount, hiddenInNav: true },
        { id: "gyms",              label: "Gyms" },
        { id: "subscriptions",     label: "Subscriptions" },
        { id: "owners",            label: "Owner Management" },
        { id: "trials",            label: "Trial Management" },
        { id: "health",            label: "Gym Health" },
        { id: "audit",             label: "Platform Audit" },
        { id: "billing",           label: "Billing" },
        { id: "platform-finance",  label: "Income & Expenses" },
        { id: "bank",              label: "Bank Details" },
        { id: "bank-transactions", label: "Bank Transactions" },
        { id: "email-logs",        label: "Email Logs" },
        { id: "sms-logs",          label: "SMS Logs" },
        { id: "settings",          label: "Settings" }
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
          <NotificationBell count={notificationState.unreadCount} active={page === "notifications"} onClick={() => setPage("notifications")} />
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
                  <Btn variant="ghost" onClick={() => setPage("notifications")}>Check Alerts</Btn>
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
                  {gym.logoUrl ? <img src={gym.logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} /> : null}
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
          <Toolbar search={ownerSearch} setSearch={setOwnerSearch} searchPlaceholder="Search owners, gyms, emails, or plans" action={<div style={{ display: "flex", gap: 8 }}><SpreadsheetExportButton compact onClick={exportOwnersExcel} label="Owners" /><ReportExportButton compact onClick={exportOwnersPdf} label="Owners" /></div>} />
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
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <SpreadsheetExportButton compact onClick={exportTrialsExcel} label="Trials" />
                  <ReportExportButton compact onClick={exportTrialsPdf} label="Trials" />
                </div>
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
                  <div key={String(alert.gymId)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 12px", background: "#fff", borderRadius: 10, border: "1px solid #fde68a" }}>
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
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <SpreadsheetExportButton compact onClick={exportHealthExcel} label="Health" />
              <ReportExportButton compact onClick={exportHealthPdf} label="Health" />
            </div>
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
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <SpreadsheetExportButton compact onClick={exportAuditExcel} label="Audit" />
              <ReportExportButton compact onClick={exportAuditPdf} label="Audit" />
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
        const billingSorted = [...gyms].sort((a, b) => {
          if (billingSortBy === "revenue") return Number(b.revenue || 0) - Number(a.revenue || 0);
          if (billingSortBy === "plan") return (a.plan || "").localeCompare(b.plan || "");
          if (billingSortBy === "subscriptionEndsAt") return (a.subscriptionEndsAt || "").localeCompare(b.subscriptionEndsAt || "");
          if (billingSortBy === "name") return (a.name || "").localeCompare(b.name || "");
          return 0;
        });
        const today = new Date().toISOString().slice(0, 10);
        const overdueGyms = gyms.filter((g) => g.subscriptionEndsAt && g.subscriptionEndsAt < today && g.status === "active");
        const allBillingHistory = gyms.flatMap((g) => (g.subscriptionBillingHistory || [])).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 20);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...responsiveGrid(isMobile, "repeat(4,1fr)", "repeat(2,1fr)"), gap: 16 }}>
              <StatCard label="MRR" value={`LKR ${totalRevenue.toLocaleString()}`} accent="#16a34a" />
              <StatCard label="ARR" value={`LKR ${(totalRevenue * 12).toLocaleString()}`} accent="#2563eb" />
              <StatCard label="Avg per Gym" value={`LKR ${Math.round(totalRevenue / Math.max(gyms.length, 1)).toLocaleString()}`} accent="#dc2626" />
              <StatCard label="Overdue Renewals" value={overdueGyms.length} accent="#f59e0b" />
            </div>
            <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 20 }}>
              <Card>
                <SectionHeader title="Revenue Distribution" />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {topRevenueGyms.slice(0, 4).map((gym) => (
                    <div key={gym.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13 }}>{gym.name}</span>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>LKR {Number(gym.revenue || 0).toLocaleString()}</span>
                      </div>
                      <ProgressBar value={totalRevenue ? (Number(gym.revenue || 0) / totalRevenue) * 100 : 0} color="#16a34a" height={7} />
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionHeader title="Billing Notes" />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <InfoTile label="Trial Gyms" value={`${trialGyms.length} awaiting conversion`} tone="#f59e0b" soft="#fffbeb" />
                  <InfoTile label="Overdue Renewals" value={`${overdueGyms.length} gyms`} tone="#dc2626" soft="#fef2f2" />
                  <InfoTile label="Sub Ending This Week" value={`${subscriptionEndingAlerts.length} gyms`} tone="#f59e0b" soft="#fffbeb" />
                  <InfoTile label="Best Plan" value={[...planMix].sort((a, b) => b.count - a.count)[0]?.plan || "—"} tone="#2563eb" soft="#eff6ff" />
                </div>
              </Card>
            </div>
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
                headers={["Gym", "Plan", "Sub Plan", "Sub Started", "Sub Ends", "Revenue", "Status"]}
                rows={billingSorted.map((gym) => [
                  gym.name,
                  <Badge label={gym.plan} />,
                  gym.subscriptionPlanName ? <Badge label={gym.subscriptionPlanName} /> : <span style={{ fontSize: 11, color: "var(--muted)" }}>None</span>,
                  gym.subscriptionStartedAt || "—",
                  gym.subscriptionEndsAt
                    ? <span style={{ color: gym.subscriptionEndsAt < today ? "#dc2626" : "#16a34a", fontWeight: 600, fontSize: 12 }}>{gym.subscriptionEndsAt}</span>
                    : "—",
                  `LKR ${Number(gym.revenue || 0).toLocaleString()}`,
                  <Badge label={gym.status} type={gym.status} />
                ])}
              />
            </Card>
            {allBillingHistory.length > 0 && (
              <Card>
                <SectionHeader title="Recent Payment History" />
                <Table
                  headers={["Date", "Amount", "Method", "Note"]}
                  rows={allBillingHistory.map((entry) => [
                    entry.date || "—",
                    `LKR ${Number(entry.amount || 0).toLocaleString()}`,
                    entry.method || "manual",
                    entry.note || "—"
                  ])}
                />
              </Card>
            )}
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
                  <Input value={sysSettingsForm.systemName} onChange={(e) => setSysSettingsForm((p) => ({ ...p, systemName: e.target.value }))} placeholder="FitnessHub" />
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
                    <img src={sysLogoPreview || systemSettings.logoUrl} alt="Logo" style={{ marginTop: 8, height: 52, objectFit: "contain", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  )}
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Square image recommended · Min 128×128 px</div>
                </FormField>
                <FormField label="Login Page Hero Image">
                  <input type="file" accept="image/*" style={{ fontSize: 13 }} onChange={(e) => { const f = e.target.files[0]; if (f) { setSysHeroPreview(URL.createObjectURL(f)); handleSysHeroUpload(f); } }} />
                  {(sysHeroPreview || systemSettings?.heroImageUrl) && (
                    <img src={sysHeroPreview || systemSettings.heroImageUrl} alt="Hero" style={{ marginTop: 8, height: 52, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", width: "100%" }} />
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
                <InfoTile label="System Name" value={systemSettings?.systemName || "FitnessHub"} tone="#7c3aed" soft="#f5f3ff" />
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
        const filtered = bankTxList.filter((t) =>
          (bankTxTypeFilter === "all" || t.type === bankTxTypeFilter) &&
          (bankTxStatusFilter === "all" || t.status === bankTxStatusFilter) &&
          (!bankTxSearch || [t.description, t.gymName, t.referenceNumber, t.bankName].some((v) => (v || "").toLowerCase().includes(bankTxSearch.toLowerCase())))
        );
        const totalCredit = filtered.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount || 0), 0);
        const totalDebit = filtered.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount || 0), 0);
        const paged = paginateItems(filtered, bankTxPage);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))"), gap: 14 }}>
              <StatCard label="Total Entries" value={filtered.length} accent="#2563eb" />
              <StatCard label="Total Credits" value={`LKR ${totalCredit.toLocaleString()}`} accent="#16a34a" />
              <StatCard label="Total Debits" value={`LKR ${totalDebit.toLocaleString()}`} accent="#dc2626" />
            </div>
            <Card>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
                <Input placeholder="Search…" value={bankTxSearch} onChange={(e) => { setBankTxSearch(e.target.value); setBankTxPage(1); }} style={{ maxWidth: 220 }} />
                <Select value={bankTxTypeFilter} onChange={(e) => { setBankTxTypeFilter(e.target.value); setBankTxPage(1); }} style={{ maxWidth: 140 }}>
                  <option value="all">All Types</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </Select>
                <Select value={bankTxStatusFilter} onChange={(e) => { setBankTxStatusFilter(e.target.value); setBankTxPage(1); }} style={{ maxWidth: 160 }}>
                  <option value="all">All Statuses</option>
                  {["completed", "pending", "failed", "reversed"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </Select>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  <SpreadsheetExportButton compact onClick={exportBankTxExcel} label="Transactions" />
                  <ReportExportButton compact onClick={exportBankTxPdf} label="Transactions" />
                  <Btn small onClick={openCreateBankTx}><IcoPlus /> Record Transaction</Btn>
                </div>
              </div>
              {bankTxLoading ? <div style={{ fontSize: 14, color: "var(--muted)" }}>Loading…</div> : filtered.length === 0 ? (
                <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>No transactions found.</div>
              ) : (
                <Table
                  headers={["Date", "Type", "Description", "Gym", "Method", "Reference", "Amount", "Status", "Actions"]}
                  rows={paged.visibleItems.map((t) => [
                    t.transactionDate ? t.transactionDate.slice(0, 10) : "—",
                    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: t.type === "credit" ? "#dcfce7" : "#fee2e2", color: t.type === "credit" ? "#166534" : "#991b1b" }}>{t.type === "credit" ? "Credit" : "Debit"}</span>,
                    t.description,
                    t.gymName || "Platform",
                    t.paymentMethod || "—",
                    t.referenceNumber || "—",
                    <span style={{ fontWeight: 700, color: t.type === "credit" ? "#16a34a" : "#dc2626" }}>{t.type === "credit" ? "+" : "-"}LKR {Number(t.amount || 0).toLocaleString()}</span>,
                    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: t.status === "completed" ? "#dcfce7" : t.status === "failed" ? "#fee2e2" : "#fef9c3", color: t.status === "completed" ? "#166534" : t.status === "failed" ? "#991b1b" : "#92400e" }}>{t.status}</span>,
                    <div style={{ display: "flex", gap: 6 }}>
                      <IconBtn title="Edit" onClick={() => openEditBankTx(t)}><IcoEdit /></IconBtn>
                      <IconBtn title="Delete" danger onClick={() => deleteBankTxEntry(t._id || t.id)}><IcoTrash /></IconBtn>
                    </div>
                  ])}
                />
              )}
              <PaginationControls page={paged.page} totalPages={paged.totalPages} onPageChange={setBankTxPage} totalItems={filtered.length} label="transactions" />
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
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  <SpreadsheetExportButton compact onClick={exportEmailLogsExcel} label="Email Logs" />
                  <ReportExportButton compact onClick={exportEmailLogsPdf} label="Email Logs" />
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
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  <SpreadsheetExportButton compact onClick={exportSmsLogsExcel} label="SMS Logs" />
                  <ReportExportButton compact onClick={exportSmsLogsPdf} label="SMS Logs" />
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Category">
                <Input value={bankTxForm.category} onChange={(e) => setBankTxForm((p) => ({ ...p, category: e.target.value }))} placeholder="e.g. Subscription, Salary" />
              </FormField>
              <FormField label="Transaction Date *">
                <Input type="date" value={bankTxForm.transactionDate} onChange={(e) => setBankTxForm((p) => ({ ...p, transactionDate: e.target.value }))} />
              </FormField>
              <FormField label="Bank Name">
                <Input value={bankTxForm.bankName} onChange={(e) => setBankTxForm((p) => ({ ...p, bankName: e.target.value }))} />
              </FormField>
              <FormField label="Account Number">
                <Input value={bankTxForm.accountNumber} onChange={(e) => setBankTxForm((p) => ({ ...p, accountNumber: e.target.value }))} />
              </FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Payment Method">
                <Select value={bankTxForm.paymentMethod} onChange={(e) => setBankTxForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
                  {["cash", "bank-transfer", "cheque", "card", "other"].map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </FormField>
              <FormField label="Status">
                <Select value={bankTxForm.status} onChange={(e) => setBankTxForm((p) => ({ ...p, status: e.target.value }))}>
                  {["completed", "pending", "failed", "reversed"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </Select>
              </FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
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
                    {gymDetail.gym.logoUrl && <img src={gymDetail.gym.logoUrl} alt="Gym logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }} />}
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
      {page === "bank" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
      )}

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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <SpreadsheetExportButton compact onClick={exportPlatformFinanceExcel} label="Finance" />
                <ReportExportButton compact onClick={exportPlatformFinancePdf} label="Finance" />
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <FormField label="Plan Name *"><Input value={subPlanForm.name} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Pro Monthly" /></FormField>
              <FormField label="Price (LKR) *"><Input type="number" value={subPlanForm.price} onChange={(e) => setSubPlanForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="9900" /></FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Branch Code"><Input value={bankForm.branchCode} onChange={(e) => setBankForm((prev) => ({ ...prev, branchCode: e.target.value }))} /></FormField>
              <FormField label="SWIFT Code"><Input value={bankForm.swiftCode} onChange={(e) => setBankForm((prev) => ({ ...prev, swiftCode: e.target.value }))} /></FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Cheque Number *"><Input value={chequeForm.chequeNumber} onChange={(e) => setChequeForm((prev) => ({ ...prev, chequeNumber: e.target.value }))} /></FormField>
              <FormField label="Bank Name *"><Input value={chequeForm.bankName} onChange={(e) => setChequeForm((prev) => ({ ...prev, bankName: e.target.value }))} /></FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Amount (LKR) *"><Input type="number" value={chequeForm.amount} onChange={(e) => setChequeForm((prev) => ({ ...prev, amount: e.target.value }))} /></FormField>
              <FormField label="Issued Date *"><Input type="date" value={chequeForm.issuedDate} onChange={(e) => setChequeForm((prev) => ({ ...prev, issuedDate: e.target.value }))} /></FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Amount (LKR) *"><Input type="number" value={pfExpenseForm.amount} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, amount: e.target.value }))} /></FormField>
              <FormField label="Date *"><Input type="date" value={pfExpenseForm.entryDate} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, entryDate: e.target.value }))} /></FormField>
            </div>
            <FormField label="Related Gym">
              <Select value={pfExpenseForm.gymId} onChange={(e) => { const gym = gyms.find((g) => String(g.id) === e.target.value); setPfExpenseForm((prev) => ({ ...prev, gymId: e.target.value, gymName: gym ? gym.name : "" })); }}>
                <option value="">Platform (no specific gym)</option>
                {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </FormField>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
              <FormField label="Payment Method">
                <Select value={pfExpenseForm.paymentMethod} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                  {["cash", "bank-transfer", "cheque", "card", "other"].map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </FormField>
              <FormField label="Status">
                <Select value={pfExpenseForm.status} onChange={(e) => setPfExpenseForm((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </Select>
              </FormField>
            </div>
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

function GymOwnerDash() {
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
    addExpense,
    editExpense,
    addSupplement,
    editSupplement,
    addSale,
    addReturn,
    uploadOwnerGymLogo,
    refresh
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
  const [supplierList, setSupplierList] = React.useState([]);
  const [supplierLoading, setSupplierLoading] = React.useState(false);
  const [supplierModal, setSupplierModal] = React.useState(null);
  const [supplierForm, setSupplierForm] = React.useState({ id: "", name: "", contactName: "", phone: "", email: "", address: "", website: "", notes: "" });
  const [supplierViewItem, setSupplierViewItem] = React.useState(null);
  const [supplierProductModal, setSupplierProductModal] = React.useState(null);
  const [supplierProductForm, setSupplierProductForm] = React.useState({ supplementId: "", supplementName: "", supplierPrice: "", notes: "" });
  const [supplierError, setSupplierError] = React.useState("");
  const [attendanceSearch, setAttendanceSearch] = React.useState("");
  const [attendanceStatus, setAttendanceStatus] = React.useState("all");
  const [attendancePage, setAttendancePage] = React.useState(1);
  const [attendanceMemberQuery, setAttendanceMemberQuery] = React.useState("");
  const [attendanceTab, setAttendanceTab] = React.useState("members");
  const [attendanceDateFilter, setAttendanceDateFilter] = React.useState("today");
  const [attendanceDateFrom, setAttendanceDateFrom] = React.useState("");
  const [attendanceDateTo, setAttendanceDateTo] = React.useState("");
  const [attendanceLiveRecords, setAttendanceLiveRecords] = React.useState(null);
  const [coachAttendanceLiveRecords, setCoachAttendanceLiveRecords] = React.useState(null);
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
    hireDate: "", employmentType: "", salaryModel: "", shiftSchedule: "", specializations: "",
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
  const emptySupplementForm = React.useMemo(() => ({ id: "", name: "", sku: "", brand: "", category: "Protein", imageUrl: "", stockQty: "", unitPrice: "", buyingPrice: "", reorderLevel: 5, status: "in-stock", supplierName: "", sqn: "", grn: "", supplierPriceNote: "" }), []);
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
  const [returnError, setReturnError] = React.useState("");
  const [saleReceipt, setSaleReceipt] = React.useState(null);
  const [returnForm, setReturnForm] = React.useState({ saleId: "", reason: "", amount: "", supplementId: "", qty: 1 });
  const [attendanceMemberId, setAttendanceMemberId] = React.useState("");
  const [attendanceFile, setAttendanceFile] = React.useState(null);
  const [attendanceImportModal, setAttendanceImportModal] = React.useState(false);
  const [ownerMemberPopup, setOwnerMemberPopup] = React.useState(null);
  const [ownerCoachPopup, setOwnerCoachPopup] = React.useState(null);
  const [ownerPopupTab, setOwnerPopupTab] = React.useState("profile");
  const [gymLogoFile, setGymLogoFile] = React.useState(null);
  const [gymLogoUploading, setGymLogoUploading] = React.useState(false);
  const notificationState = useNotificationReadState(`owner-${user?.id}`, data ? (data.notifications || []) : null, data?.readNotificationIds);

  React.useEffect(() => setCoachPage(1), [coachSearch, coachStatus, coachSort]);
  React.useEffect(() => setMemberPage(1), [memberSearch, memberStatus, memberPlanFilter, memberPaymentFilter]);
  React.useEffect(() => setPlanPage(1), [planSearch]);
  React.useEffect(() => setEquipmentPage(1), [equipmentSearch, equipmentStatus, equipmentSort]);
  React.useEffect(() => setSupplementPage(1), [supplementSearch, supplementStatus, supplementCategory]);
  React.useEffect(() => setAttendancePage(1), [attendanceSearch, attendanceStatus]);
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
    mealPlans = []
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

  // Finance page computed data
  const totalRevenue = (financials.membershipCollected || 0) + (financials.posSalesTotal || 0) + (financials.otherIncomeTotal || 0);
  const netProfit = totalRevenue - (financials.expenseTotal || 0) - (financials.returnTotal || 0);
  const profitMarginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
  const revenueBreakdownSegments = [
    { label: "Memberships", value: financials.membershipCollected || 0, color: "#2563eb" },
    { label: "POS Sales", value: financials.posSalesTotal || 0, color: "#7c3aed" },
    { label: "Other Income", value: financials.otherIncomeTotal || 0, color: "#0891b2" },
  ];
  const expenseCategorySegments = topExpenseCats.map(([cat, val], i) => ({
    label: cat,
    value: val,
    color: ["#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"][i] || "#94a3b8"
  }));
  const paymentMethodMap = new Map();
  members.forEach(m => { if (m.paymentMethod) paymentMethodMap.set(m.paymentMethod, (paymentMethodMap.get(m.paymentMethod) || 0) + 1); });
  expenses.forEach(e => { if (e.paymentMethod) paymentMethodMap.set(e.paymentMethod, (paymentMethodMap.get(e.paymentMethod) || 0) + 1); });
  const paymentMethodBreakdown = [...paymentMethodMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxPaymentMethod = Math.max(1, ...paymentMethodBreakdown.map(([, v]) => v));
  const methodColors = { cash: "#16a34a", card: "#2563eb", "bank-transfer": "#0891b2", cheque: "#7c3aed", online: "#f59e0b", other: "#94a3b8" };
  const unpaidMembers = members
    .filter(m => m.paymentStatus !== "paid" || Number(m.remainingBalance || 0) > 0)
    .sort((a, b) => Number(b.remainingBalance || 0) - Number(a.remainingBalance || 0))
    .slice(0, 8);
  const recentExpenses = [...expenses].sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate)).slice(0, 6);
  const recentSalesForFinance = [...sales].sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt)).slice(0, 6);
  const posNetRevenue = (financials.posSalesTotal || 0) - (financials.returnTotal || 0);
  const posReturnRate = financials.posSalesTotal > 0 ? Math.round((financials.returnTotal / financials.posSalesTotal) * 100) : 0;
  const totalExpensesAndReturns = (financials.expenseTotal || 0) + (financials.returnTotal || 0);

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
      supplierName: supplementForm.supplierName || "",
      sqn: supplementForm.sqn || "",
      grn: supplementForm.grn || "",
      supplierPriceNote: supplementForm.supplierPriceNote || ""
    };

    if (supplementModal === "edit") {
      await editSupplement(supplementForm.id, payload);
    } else {
      await addSupplement({ gymId: user.gymId, ...payload });
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
    const wsData = [["Date", "Type", "Title", "Category", "Amount", "Payment Method", "Status", "Vendor", "Reference"]];
    filteredExpenses.forEach((item) => {
      wsData.push([item.expenseDate || "", item.type || "", item.title || "", item.category || "", item.amount || 0, item.paymentMethod || "", item.status || "", item.vendor || item.contactName || "", item.referenceNumber || ""]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
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
            <tr><th colspan="6" style="font-size:18px;background:#eff6ff;">${escapeCell(currentGym.name || "FitnessHub Gym")} Attendance Report</th></tr>
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
      gymName: currentGym.name || "FitnessHub Gym",
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
      gymName: currentGym.name || "FitnessHub Gym",
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
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const contentStartY = addPdfHeader(doc, {
        ...baseHeader,
        title: "Finance Summary Report",
        subtitle: "Cash flow indicators, sales, expenses, and payment health"
      });
      let nextY = addPdfSummaryCards(doc, [
        { label: "Monthly Revenue", value: formatCurrencyValue(financials.monthlyRevenue) },
        { label: "Net Revenue", value: formatCurrencyValue(financials.netRevenue) },
        { label: "POS Sales", value: formatCurrencyValue(financials.posSalesTotal) },
        { label: "Outstanding", value: formatCurrencyValue(financials.outstandingPayments) }
      ], contentStartY, [71, 85, 105]);
      nextY = addPdfSectionTitle(doc, "Financial Scorecard", nextY + 16, [71, 85, 105], "Core business figures for review, accounting, and management meetings.");
      autoTable(doc, getPdfTableConfig(
        doc,
        [71, 85, 105],
        nextY,
        [["Metric", "Value"]],
        [
          ["Membership Collected", formatCurrencyValue(financials.membershipCollected)],
          ["Outstanding Payments", formatCurrencyValue(financials.outstandingPayments)],
          ["Expense Total", formatCurrencyValue(financials.expenseTotal)],
          ["POS Sales Total", formatCurrencyValue(financials.posSalesTotal)],
          ["Return Total", formatCurrencyValue(financials.returnTotal)],
          ["Net Revenue", formatCurrencyValue(financials.netRevenue)],
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
    xlsxExport(
      ["Metric", "Value (LKR)"],
      [
        ["Monthly Revenue", financials.monthlyRevenue || 0],
        ["Net Revenue", financials.netRevenue || 0],
        ["Membership Collected", financials.membershipCollected || 0],
        ["Outstanding Payments", financials.outstandingPayments || 0],
        ["POS Sales Total", financials.posSalesTotal || 0],
        ["Return Total", financials.returnTotal || 0],
        ["Expense Total", financials.expenseTotal || 0],
        ["Paid Members", financials.paidMembers || 0],
        ["Non-Paid Members", financials.nonPaidMembers || 0]
      ],
      "Finance", "finance-summary"
    );
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
    addPdfHeader(doc, { gymName: currentGym.name || "FitnessHub Gym", ownerName: profile?.name || "", location: "", generatedAt: new Date().toISOString().slice(0, 10), accent: [71, 85, 105], title: "Membership Plans", subtitle: "Active plans offered to gym members" });
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
    addPdfHeader(doc, { gymName: currentGym.name || "FitnessHub Gym", ownerName: profile?.name || "", location: "", generatedAt: new Date().toISOString().slice(0, 10), accent: [71, 85, 105], title: "Supplier Register", subtitle: "All registered supplement suppliers" });
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
    addPdfHeader(doc, { gymName: currentGym.name || "FitnessHub Gym", ownerName: profile?.name || "", location: "", generatedAt: new Date().toISOString().slice(0, 10), accent: [71, 85, 105], title: "POS Sales Report", subtitle: "Sales transactions from the gym store" });
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
    addPdfHeader(doc, { gymName: currentGym.name || "FitnessHub Gym", ownerName: profile?.name || "", location: "", generatedAt: new Date().toISOString().slice(0, 10), accent: [71, 85, 105], title: "Returns Report", subtitle: "Customer returns and refunds" });
    autoTable(doc, getPdfTableConfig(doc, [71, 85, 105], 140, [["Date", "Member", "Supplement", "Qty", "Amount (LKR)", "Reason"]], returns.map((r) => [r.date ? new Date(r.date).toLocaleDateString() : "", r.memberName || "", r.supplementName || "", r.qty || 1, `LKR ${Number(r.amount || 0).toLocaleString()}`, r.reason || ""])));
    finalizePdf(doc, `returns-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <DashboardShell
      isMobile={isMobile}
      accent="#2563eb"
      title="FitnessHub"
      subtitle="Gym Owner"
      navItems={[
        { id: "dashboard", label: "Dashboard", section: "Overview" },
        { id: "notifications", label: "Notifications", count: notificationState.unreadCount, section: "Overview", hiddenInNav: true },
        { id: "attendance", label: "Attendance", section: "People" },
        { id: "coaches", label: "Coaches", section: "People" },
        { id: "members", label: "Members", section: "People" },
        { id: "plans", label: "Membership Plans", section: "People" },
        { id: "activity", label: "Coach Activity", section: "People" },
        { id: "finance", label: "Finance", section: "Operations" },
        { id: "expenses", label: "Income & Expenses", section: "Operations" },
        { id: "equipment", label: "Equipment", section: "Operations" },
        { id: "pos", label: "POS", section: "Operations" },
        { id: "returns", label: "Returns", section: "Operations" },
        { id: "announcements", label: "Announcements", section: "Operations" },
        { id: "settings", label: "Settings", section: "Operations" },
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
          <NotificationBell count={notificationState.unreadCount} active={page === "notifications"} onClick={() => setPage("notifications")} />
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
              <Card>
                <SectionHeader title="Gym Logo" />
                <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                  {currentGym?.logoUrl ? (
                    <img src={currentGym.logoUrl} alt="Gym logo" style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 12, border: "1px solid var(--border)", background: "#f8fafc" }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: 12, background: "#f1f5f9", border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--muted)", textAlign: "center" }}>No logo</div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input type="file" accept="image/*" id="gymLogoInput" style={{ display: "none" }} onChange={(e) => setGymLogoFile(e.target.files?.[0] || null)} />
                    <label htmlFor="gymLogoInput" style={{ cursor: "pointer", padding: "8px 16px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, fontWeight: 600, color: "#334155", display: "inline-block" }}>
                      {gymLogoFile ? gymLogoFile.name : "Choose Image"}
                    </label>
                    {gymLogoFile && (
                      <Btn small onClick={async () => { setGymLogoUploading(true); try { await uploadOwnerGymLogo(gymLogoFile); setGymLogoFile(null); } finally { setGymLogoUploading(false); } }} disabled={gymLogoUploading}>
                        {gymLogoUploading ? "Uploading..." : "Upload Logo"}
                      </Btn>
                    )}
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>PNG, JPG, SVG · Max 5MB</div>
                  </div>
                </div>
              </Card>
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
                        <SpreadsheetExportButton compact onClick={exportAttendanceExcel} label="Attendance" />
                        <ReportExportButton compact onClick={exportAttendancePdf} label="Attendance" />
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

              {attendanceTab === "coaches" && (
                <Card style={{ padding: 0 }}>
                  <Table
                    headers={["Coach", "Date", "Clock In", "Clock Out", "Break", "Work Time", "Status"]}
                    rows={(coachAttendanceLiveRecords || []).map((item) => [
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar initials={(item.coachName || "CO").slice(0, 2).toUpperCase()} size={30} />
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{item.coachName}</span>
                      </div>,
                      <span style={{ fontSize: 12 }}>{item.date ? new Date(item.date).toLocaleDateString() : ""}</span>,
                      <span style={{ fontSize: 12 }}>{item.clockIn ? new Date(item.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>,
                      <span style={{ fontSize: 12 }}>{item.clockOut ? new Date(item.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : <span style={{ color: "#16a34a" }}>Still in</span>}</span>,
                      <span style={{ fontSize: 12 }}>
                        {item.breakStart ? (
                          item.breakEnd
                            ? `${item.breakMinutes || 0} min`
                            : <span style={{ color: "#a16207" }}>On break</span>
                        ) : "—"}
                      </span>,
                      <span style={{ fontSize: 12, fontWeight: 600 }}>
                        {item.totalWorkMinutes ? `${Math.floor(item.totalWorkMinutes / 60)}h ${item.totalWorkMinutes % 60}m` : "—"}
                      </span>,
                      <Badge label={item.status === "clocked-out" ? "checked-out" : item.status === "clocked-in" ? "checked-in" : item.status} type={item.status === "clocked-out" ? "checked-out" : "checked-in"} />
                    ])}
                  />
                  {(coachAttendanceLiveRecords || []).length === 0 && (
                    <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>No coach attendance records for this period.</div>
                  )}
                </Card>
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
                    <SpreadsheetExportButton compact onClick={exportCoachesExcel} label="Coaches" />
                    <ReportExportButton compact onClick={() => exportOwnerReport("coaches")} label="Coaches" />
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
                      <IconBtn title="View" onClick={() => setCoachViewModal(coach)}><IcoView /></IconBtn>
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
                    <SpreadsheetExportButton compact onClick={exportMembersExcel} label="Members" />
                    <ReportExportButton compact onClick={() => exportOwnerReport("members")} label="Members" />
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
                      <IconBtn title="View" onClick={() => setMemberViewModal(member)}><IcoView /></IconBtn>
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
              <Toolbar search={planSearch} setSearch={setPlanSearch} searchPlaceholder="Search membership plans" action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><SpreadsheetExportButton compact onClick={exportPlansExcel} label="Plans" /><ReportExportButton compact onClick={exportPlansPdf} label="Plans" /><Btn small onClick={() => openPlanModal("create")}>+ Add Plan</Btn></div>} />

              {/* Summary tiles */}
              <div style={{ ...responsiveGrid(isMobile, "repeat(4,minmax(0,1fr))", "repeat(2,minmax(0,1fr))"), gap: 14 }}>
                <StatCard label="Total Plans" value={membershipPlans.length} accent="#2563eb" />
                <StatCard label="Total Subscribers" value={members.length} accent="#16a34a" />
                <StatCard label="Most Popular" value={mostPopularPlanName || "—"} accent="#7c3aed" />
                <StatCard label="Best Value / Day" value={bestValuePlanName || "—"} accent="#f59e0b" />
              </div>

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
                        <div key={plan.id} style={{ borderRadius: 18, overflow: "hidden", border: `1.5px solid ${plan.color}30`, boxShadow: `0 4px 24px ${plan.color}14`, position: "relative", background: "#fff", display: "flex", flexDirection: "column" }}>
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

          {page === "finance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* KPI Row */}
              <div style={{ ...responsiveGrid(isMobile, "repeat(6,1fr)", "repeat(3,1fr)"), gap: 14 }}>
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
                      { label: "Membership Fees Collected", value: financials.membershipCollected, color: "#16a34a" },
                      { label: "POS Sales", value: financials.posSalesTotal, color: "#2563eb" },
                      { label: "Other / Manual Income", value: financials.otherIncomeTotal || 0, color: "#0891b2" },
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
                      { label: "Operating Expenses", value: financials.expenseTotal, color: "#dc2626" },
                      { label: "POS Returns", value: financials.returnTotal, color: "#f59e0b" },
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

              {/* Expense Breakdown + Payment Methods */}
              <div style={{ ...responsiveGrid(isMobile, "1fr 1fr"), gap: 16 }}>
                <Card>
                  <SectionHeader title="Top Expense Categories" />
                  {topExpenseCats.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>No expense data recorded yet</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {topExpenseCats.map(([cat, val], i) => (
                        <div key={cat}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>{cat}</span>
                            <span style={{ color: "var(--muted)" }}>LKR {val.toLocaleString()}</span>
                          </div>
                          <div style={{ height: 7, borderRadius: 99, background: "var(--border)" }}>
                            <div style={{ height: 7, borderRadius: 99, width: `${Math.round((val / maxExpenseCat) * 100)}%`, background: expenseCategorySegments[i]?.color || "#94a3b8", transition: "width 0.5s" }} />
                          </div>
                        </div>
                      ))}
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                        <span>Total Expenses</span>
                        <span style={{ fontWeight: 700, color: "var(--text)" }}>LKR {financials.expenseTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </Card>
                <Card>
                  <SectionHeader title="Payment Methods Used" />
                  {paymentMethodBreakdown.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>No payment data available</div>
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
                    <SpreadsheetExportButton compact onClick={exportExpensesExcel} label="Export Excel" />
                    <ReportExportButton compact onClick={() => exportOwnerReport("finance")} label="Export PDF" />
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
                    <SpreadsheetExportButton compact onClick={exportEquipmentExcel} label="Equipment" />
                    <ReportExportButton compact onClick={() => exportOwnerReport("equipment")} label="Equipment" />
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

          {page === "suppliers" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ ...responsiveGrid(isMobile, "repeat(3,minmax(0,1fr))"), gap: 16 }}>
                <StatCard label="Total Suppliers" value={supplierList.length} accent="#2563eb" />
                <StatCard label="Products Linked" value={supplierList.reduce((s, sup) => s + (sup.products?.length || 0), 0)} accent="#7c3aed" />
                <StatCard label="Supplements with Supplier" value={supplements.filter((s) => s.supplierName).length} accent="#16a34a" />
              </div>
              <Toolbar
                search={supplierSearch}
                setSearch={setSupplierSearch}
                searchPlaceholder="Search suppliers by name, email"
                action={(
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <SpreadsheetExportButton compact onClick={exportSuppliersExcel} label="Suppliers" />
                    <ReportExportButton compact onClick={exportSuppliersPdf} label="Suppliers" />
                    <Btn small onClick={() => { setSupplierForm({ id: "", name: "", contactName: "", phone: "", email: "", address: "", website: "", notes: "" }); setSupplierError(""); setSupplierModal("create"); }}>+ Add Supplier</Btn>
                  </div>
                )}
              />
              {supplierLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading suppliers…</div>
              ) : (
                <Card style={{ padding: 0 }}>
                  <Table
                    headers={["Name", "Contact", "Phone", "Email", "Products", "Actions"]}
                    rows={supplierList.filter((s) => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()) || (s.email || "").toLowerCase().includes(supplierSearch.toLowerCase())).map((sup) => [
                      <span style={{ fontWeight: 700 }}>{sup.name}</span>,
                      sup.contactName || "—",
                      sup.phone || "—",
                      sup.email || "—",
                      <span style={{ fontWeight: 600 }}>{(sup.products || []).length}</span>,
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <IconBtn title="View" onClick={() => setSupplierViewItem(sup)}><IcoView /></IconBtn>
                        <IconBtn title="Edit" onClick={() => { setSupplierForm({ id: sup._id, name: sup.name, contactName: sup.contactName || "", phone: sup.phone || "", email: sup.email || "", address: sup.address || "", website: sup.website || "", notes: sup.notes || "" }); setSupplierError(""); setSupplierModal("edit"); }}><IcoEdit /></IconBtn>
                        <IconBtn title="Remove" danger onClick={() => removeSupplier(sup._id)}><IcoTrash /></IconBtn>
                      </div>
                    ])}
                  />
                </Card>
              )}
            </div>
          )}

          {page === "pos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Top toolbar */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {sales.length} total sales &bull; {salesToday.length} today
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <SpreadsheetExportButton compact onClick={exportSalesExcel} label="Sales" />
                  <ReportExportButton compact onClick={exportSalesPdf} label="Sales" />
                </div>
              </div>
              {/* Stat cards — 6 wide */}
              <div style={{ ...responsiveGrid(isMobile, "repeat(6,minmax(0,1fr))", "repeat(3,minmax(0,1fr))"), gap: 14 }}>
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
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 50, overflow: "hidden" }}>
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
                    <FormField label="Product">
                      <Select value={posForm.supplementId} onChange={(e) => setPosForm((prev) => ({ ...prev, supplementId: e.target.value }))}>
                        <option value="">Select product</option>
                        {supplements.map((item) => (
                          <option key={item.id} value={item.id} disabled={item.status === "out-of-stock"}>
                            {item.name} — LKR {Number(item.unitPrice || 0).toLocaleString()} {item.status === "out-of-stock" ? "(Out of stock)" : item.status === "low-stock" ? "(Low stock)" : ""}
                          </option>
                        ))}
                      </Select>
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
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <SpreadsheetExportButton compact onClick={exportReturnsExcel} label="Returns" />
                  <ReportExportButton compact onClick={exportReturnsPdf} label="Returns" />
                </div>
              </div>
              {/* Stat cards */}
              <div style={{ ...responsiveGrid(isMobile, "repeat(5,minmax(0,1fr))", "repeat(3,minmax(0,1fr))"), gap: 14 }}>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <FormField label="Original Sale">
                      <Select value={returnForm.saleId} onChange={(e) => { setReturnError(""); setReturnForm((prev) => ({ ...prev, saleId: e.target.value, supplementId: "", qty: 1, amount: "" })); }}>
                        <option value="">Select sale to return</option>
                        {sales.map((sale) => (
                          <option key={sale.id} value={sale.id}>
                            {sale.memberName || sale.customerName || "Walk-in"} — {sale.supplementName || "Product"} — LKR {Number(sale.total || 0).toLocaleString()} ({sale.soldAt ? new Date(sale.soldAt).toLocaleDateString() : "—"})
                          </option>
                        ))}
                      </Select>
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
                    <FormField label="Product Being Returned">
                      {(() => {
                        const selectedSale = sales.find((s) => String(s.id) === String(returnForm.saleId));
                        const saleItemIds = new Set((selectedSale?.items || []).map((i) => String(i.supplement)));
                        const returnableSupplements = selectedSale
                          ? supplements.filter((s) => saleItemIds.has(String(s.id)))
                          : supplements;
                        return (
                          <Select value={returnForm.supplementId} onChange={(e) => setReturnForm((prev) => ({ ...prev, supplementId: e.target.value }))}>
                            <option value="">{selectedSale ? "Select product from this sale" : "Select product"}</option>
                            {returnableSupplements.map((item) => (
                              <option key={item.id} value={item.id}>{item.name} — LKR {Number(item.unitPrice || 0).toLocaleString()}</option>
                            ))}
                          </Select>
                        );
                      })()}
                    </FormField>
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
                    <SpreadsheetExportButton compact onClick={exportAnnouncementsExcel} label="Announcements" />
                    <ReportExportButton compact onClick={() => exportOwnerReport("announcements")} label="Announcements" />
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
                  <FormField label="Salary / Commission Model"><Input value={coachForm.salaryModel} onChange={(e) => setCoachForm((prev) => ({ ...prev, salaryModel: e.target.value }))} /></FormField>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

          {equipmentModal && (
            <Modal title={equipmentModal === "edit" ? "Edit Equipment" : "Add Equipment"} onClose={() => setEquipmentModal(null)} width={720}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Stock Qty *"><Input type="number" min="0" value={supplementForm.stockQty} onChange={(e) => setSupplementForm((prev) => ({ ...prev, stockQty: e.target.value }))} /></FormField>
                <FormField label="Reorder Level"><Input type="number" min="0" value={supplementForm.reorderLevel} onChange={(e) => setSupplementForm((prev) => ({ ...prev, reorderLevel: e.target.value }))} /></FormField>
                <FormField label="Selling Price (LKR) *"><Input type="number" min="0" value={supplementForm.unitPrice} onChange={(e) => setSupplementForm((prev) => ({ ...prev, unitPrice: e.target.value }))} /></FormField>
                <FormField label="Buying Price (LKR)"><Input type="number" min="0" value={supplementForm.buyingPrice} onChange={(e) => setSupplementForm((prev) => ({ ...prev, buyingPrice: e.target.value }))} /></FormField>
                <FormField label="Supplier Name"><Input value={supplementForm.supplierName} onChange={(e) => setSupplementForm((prev) => ({ ...prev, supplierName: e.target.value }))} /></FormField>
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
            <Modal title={supplierModal === "edit" ? "Edit Supplier" : "Add Supplier"} onClose={() => setSupplierModal(null)} width={600}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Supplier Name *"><Input value={supplierForm.name} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} /></FormField>
                <FormField label="Contact Person"><Input value={supplierForm.contactName} onChange={(e) => setSupplierForm((p) => ({ ...p, contactName: e.target.value }))} /></FormField>
                <FormField label="Phone"><Input value={supplierForm.phone} onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))} /></FormField>
                <FormField label="Email"><Input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))} /></FormField>
                <FormField label="Website"><Input value={supplierForm.website} onChange={(e) => setSupplierForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://..." /></FormField>
              </div>
              <FormField label="Address"><Input value={supplierForm.address} onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))} /></FormField>
              <FormField label="Notes"><TextArea rows={2} value={supplierForm.notes} onChange={(e) => setSupplierForm((p) => ({ ...p, notes: e.target.value }))} /></FormField>
              {supplierError && <div style={{ fontSize: 12, color: "#dc2626" }}>{supplierError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveSupplier}>&#x2713; {supplierModal === "edit" ? "Save Changes" : "Add Supplier"}</Btn>
                <Btn variant="ghost" onClick={() => setSupplierModal(null)}>Cancel</Btn>
              </div>
            </Modal>
          )}

          {supplierViewItem && (
            <Modal title={`Supplier: ${supplierViewItem.name}`} onClose={() => setSupplierViewItem(null)} width={760}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                {supplierViewItem.contactName && <div><span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Contact</span><div style={{ fontWeight: 600 }}>{supplierViewItem.contactName}</div></div>}
                {supplierViewItem.phone && <div><span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Phone</span><div style={{ fontWeight: 600 }}>{supplierViewItem.phone}</div></div>}
                {supplierViewItem.email && <div><span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Email</span><div style={{ fontWeight: 600 }}>{supplierViewItem.email}</div></div>}
                {supplierViewItem.website && <div><span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Website</span><div style={{ fontWeight: 600 }}>{supplierViewItem.website}</div></div>}
                {supplierViewItem.address && <div style={{ gridColumn: "span 2" }}><span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Address</span><div style={{ fontWeight: 600 }}>{supplierViewItem.address}</div></div>}
                {supplierViewItem.notes && <div style={{ gridColumn: "span 2" }}><span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Notes</span><div style={{ fontSize: 13, color: "var(--muted)" }}>{supplierViewItem.notes}</div></div>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Linked Products ({(supplierViewItem.products || []).length})</div>
                <Btn small onClick={() => { setSupplierProductForm({ id: "", supplementId: "", supplementName: "", supplierPrice: "", notes: "" }); setSupplierError(""); setSupplierProductModal("add"); }}>&#x2B; Add Product</Btn>
              </div>
              {(supplierViewItem.products || []).length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>No products linked yet.</div>
              ) : (
                <Table
                  headers={["Supplement", "Supplier Price", "Last Updated", "Notes", "Actions"]}
                  rows={(supplierViewItem.products || []).map((p) => [
                    p.supplementName || (supplements.find((s) => String(s._id || s.id) === String(p.supplementId))?.name) || "—",
                    `LKR ${Number(p.supplierPrice || 0).toLocaleString()}`,
                    p.lastUpdated ? new Date(p.lastUpdated).toLocaleDateString() : "—",
                    p.notes || "—",
                    <div style={{ display: "flex", gap: 6 }}>
                      <IconBtn title="Edit" onClick={() => { setSupplierProductForm({ id: p._id, supplementId: String(p.supplementId || ""), supplementName: p.supplementName || "", supplierPrice: String(p.supplierPrice || ""), notes: p.notes || "" }); setSupplierError(""); setSupplierProductModal("edit"); }}><IcoEdit /></IconBtn>
                      <IconBtn title="Remove" danger onClick={() => removeSupplierProduct(supplierViewItem._id, p._id)}><IcoTrash /></IconBtn>
                    </div>
                  ])}
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
              <FormField label="Payment Method"><Input value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm((prev) => ({ ...prev, paymentMethod: e.target.value }))} placeholder="cash / card / bank-transfer / credit" /></FormField>
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

          {profileModal && (
            <Modal title="Edit Owner Profile" onClose={() => setProfileModal(false)} width={680}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Personal Info</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Address"><Input value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} /></FormField>
                <FormField label="City"><Input value={profileForm.city} onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))} /></FormField>
                <FormField label="Country"><Input value={profileForm.country} onChange={(e) => setProfileForm((prev) => ({ ...prev, country: e.target.value }))} /></FormField>
                <FormField label="Website"><Input value={profileForm.website} onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://..." /></FormField>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em", margin: "14px 0 6px" }}>Emergency Contact</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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

          {ownerMemberPopup && (
            <Modal title={`👁️ ${ownerMemberPopup.name}`} onClose={() => setOwnerMemberPopup(null)} width={900} subtitle="Full member profile">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                {["profile", "fitness", "membership", "attendance", "plans"].map((tab) => (
                  <Btn key={tab} small variant={ownerPopupTab === tab ? "default" : "ghost"} onClick={() => setOwnerPopupTab(tab)}>
                    {tab === "profile" ? "👤 Profile" : tab === "fitness" ? "💪 Fitness" : tab === "membership" ? "💳 Membership" : tab === "attendance" ? "📅 Attendance" : "📋 Plans"}
                  </Btn>
                ))}
              </div>
              {ownerPopupTab === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                    <InfoTile label="Name" value={ownerMemberPopup.name || "—"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Email" value={ownerMemberPopup.email || "—"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Phone" value={ownerMemberPopup.phone || "—"} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Gender" value={ownerMemberPopup.gender || "—"} tone="#ea580c" soft="#fff7ed" />
                    <InfoTile label="Date of Birth" value={ownerMemberPopup.dateOfBirth || "—"} tone="#f59e0b" soft="#fffbeb" />
                    <InfoTile label="Member ID" value={ownerMemberPopup.memberCode || "—"} tone="#0891b2" soft="#ecfeff" />
                    <InfoTile label="Coach" value={ownerMemberPopup.coach || "—"} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Join Source" value={ownerMemberPopup.joinSource || "—"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Member Tag" value={ownerMemberPopup.memberTag || "—"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Barcode" value={ownerMemberPopup.barcode || "—"} tone="#ea580c" soft="#fff7ed" />
                    <InfoTile label="Assigned Locker" value={ownerMemberPopup.assignedLocker || "—"} tone="#0891b2" soft="#ecfeff" />
                    <InfoTile label="Emergency Contact" value={ownerMemberPopup.emergencyContact || "—"} tone="#dc2626" soft="#fef2f2" />
                  </div>
                  {ownerMemberPopup.address && <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Address</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerMemberPopup.address}</div></div>}
                  {ownerMemberPopup.medicalNotes && <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}><div style={{ fontSize: 11, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Medical Notes</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerMemberPopup.medicalNotes}</div></div>}
                  {ownerMemberPopup.personalNotes && <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Personal Notes</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerMemberPopup.personalNotes}</div></div>}
                </div>
              )}
              {ownerPopupTab === "fitness" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                  <InfoTile label="Height" value={ownerMemberPopup.heightCm ? `${ownerMemberPopup.heightCm} cm` : "—"} tone="#ea580c" soft="#fff7ed" />
                  <InfoTile label="Current Weight" value={ownerMemberPopup.currentWeightKg ? `${ownerMemberPopup.currentWeightKg} kg` : "—"} tone="#dc2626" soft="#fef2f2" />
                  <InfoTile label="Target Weight" value={ownerMemberPopup.targetWeightKg ? `${ownerMemberPopup.targetWeightKg} kg` : "—"} tone="#16a34a" soft="#f0fdf4" />
                  <InfoTile label="BMI" value={ownerMemberPopup.bmi ? String(ownerMemberPopup.bmi) : "—"} tone="#0891b2" soft="#ecfeff" />
                  <InfoTile label="Body Fat %" value={ownerMemberPopup.bodyFatPercentage ? `${ownerMemberPopup.bodyFatPercentage}%` : "—"} tone="#7c3aed" soft="#f5f3ff" />
                  <InfoTile label="Target Body Fat" value={ownerMemberPopup.targetBodyFat ? `${ownerMemberPopup.targetBodyFat}%` : "—"} tone="#16a34a" soft="#f0fdf4" />
                  <InfoTile label="Waist to Hip Ratio" value={ownerMemberPopup.waistToHipRatio ? String(ownerMemberPopup.waistToHipRatio) : "—"} tone="#ea580c" soft="#fff7ed" />
                  <InfoTile label="Fitness Level" value={ownerMemberPopup.fitnessLevel || "—"} tone="#2563eb" soft="#eff6ff" />
                  <InfoTile label="Goal" value={ownerMemberPopup.goal || "—"} tone="#7c3aed" soft="#f5f3ff" />
                  <InfoTile label="Preferred Workout Time" value={ownerMemberPopup.preferredWorkoutTime || "—"} tone="#f59e0b" soft="#fffbeb" />
                  <InfoTile label="Chest (cm)" value={ownerMemberPopup.bodyMeasurements?.chestCm ? String(ownerMemberPopup.bodyMeasurements.chestCm) : "—"} tone="#0891b2" soft="#ecfeff" />
                  <InfoTile label="Waist (cm)" value={ownerMemberPopup.bodyMeasurements?.waistCm ? String(ownerMemberPopup.bodyMeasurements.waistCm) : "—"} tone="#0891b2" soft="#ecfeff" />
                  <InfoTile label="Arms (cm)" value={ownerMemberPopup.bodyMeasurements?.armsCm ? String(ownerMemberPopup.bodyMeasurements.armsCm) : "—"} tone="#0891b2" soft="#ecfeff" />
                  <InfoTile label="Thighs (cm)" value={ownerMemberPopup.bodyMeasurements?.thighsCm ? String(ownerMemberPopup.bodyMeasurements.thighsCm) : "—"} tone="#0891b2" soft="#ecfeff" />
                  <InfoTile label="Supplement Usage" value={ownerMemberPopup.supplementUsage || "—"} tone="#7c3aed" soft="#f5f3ff" />
                </div>
              )}
              {ownerPopupTab === "membership" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                    <InfoTile label="Plan" value={ownerMemberPopup.plan || "—"} tone="#f59e0b" soft="#fffbeb" />
                    <InfoTile label="Duration" value={ownerMemberPopup.subscriptionDurationMonths ? `${ownerMemberPopup.subscriptionDurationMonths} mo` : "—"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Expires" value={ownerMemberPopup.planExpiresAt || "—"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Payment Status" value={ownerMemberPopup.paymentStatus || "—"} tone={ownerMemberPopup.paymentStatus === "paid" ? "#16a34a" : "#dc2626"} soft={ownerMemberPopup.paymentStatus === "paid" ? "#f0fdf4" : "#fef2f2"} />
                    <InfoTile label="Amount Paid" value={ownerMemberPopup.amountPaid != null ? `LKR ${Number(ownerMemberPopup.amountPaid).toLocaleString()}` : "—"} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Amount Due" value={ownerMemberPopup.amountDue != null ? `LKR ${Number(ownerMemberPopup.amountDue).toLocaleString()}` : "—"} tone="#dc2626" soft="#fef2f2" />
                    <InfoTile label="Payment Method" value={ownerMemberPopup.paymentMethod || "—"} tone="#0891b2" soft="#ecfeff" />
                    <InfoTile label="Remaining Balance" value={ownerMemberPopup.remainingBalance != null ? `LKR ${Number(ownerMemberPopup.remainingBalance).toLocaleString()}` : "—"} tone="#ea580c" soft="#fff7ed" />
                  </div>
                  {Array.isArray(ownerMemberPopup.paymentHistory) && ownerMemberPopup.paymentHistory.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Payment History</div>
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
              {ownerPopupTab === "attendance" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(() => {
                    const memberAttendance = attendance.filter((a) => a.memberName === ownerMemberPopup.name || a.memberId === ownerMemberPopup.id);
                    return memberAttendance.length === 0
                      ? <EmptyState title="No attendance records" message="No check-in history found for this member." />
                      : memberAttendance.slice(0, 20).map((a) => (
                          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{a.date || new Date(a.checkInAt || "").toLocaleDateString()}</div>
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>In: {a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} · Out: {a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Still in"}</div>
                            </div>
                            <Badge label={a.status} type={a.status} />
                          </div>
                        ));
                  })()}
                </div>
              )}
              {ownerPopupTab === "plans" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
                  <InfoTile label="Workout Plan" value={ownerMemberPopup.assignedWorkoutPlanName || "Not assigned"} tone="#2563eb" soft="#eff6ff" />
                  <InfoTile label="Meal Plan" value={ownerMemberPopup.assignedMealPlanName || ownerMemberPopup.dietPlanName || "Not assigned"} tone="#16a34a" soft="#f0fdf4" />
                  <InfoTile label="Goal Target Date" value={ownerMemberPopup.goalTargetDate || "—"} tone="#f59e0b" soft="#fffbeb" />
                  <InfoTile label="Membership Freeze" value={ownerMemberPopup.membershipFreezeStatus || "—"} tone="#7c3aed" soft="#f5f3ff" />
                </div>
              )}
            </Modal>
          )}

          {ownerCoachPopup && (
            <Modal title={`👁️ ${ownerCoachPopup.name}`} onClose={() => setOwnerCoachPopup(null)} width={900} subtitle="Full coach profile">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                {["profile", "members", "attendance"].map((tab) => (
                  <Btn key={tab} small variant={ownerPopupTab === tab ? "default" : "ghost"} onClick={() => setOwnerPopupTab(tab)}>
                    {tab === "profile" ? "👤 Profile" : tab === "members" ? "👥 Members" : "📅 Attendance"}
                  </Btn>
                ))}
              </div>
              {ownerPopupTab === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                    <InfoTile label="Name" value={ownerCoachPopup.name || "—"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Email" value={ownerCoachPopup.email || "—"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Specialty" value={ownerCoachPopup.specialty || "—"} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Coach ID" value={ownerCoachPopup.coachCode || "—"} tone="#0891b2" soft="#ecfeff" />
                    <InfoTile label="Employee Code" value={ownerCoachPopup.employeeCode || "—"} tone="#ea580c" soft="#fff7ed" />
                    <InfoTile label="Date of Birth" value={ownerCoachPopup.dateOfBirth || "—"} tone="#f59e0b" soft="#fffbeb" />
                    <InfoTile label="Gender" value={ownerCoachPopup.gender || "—"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Employment Type" value={ownerCoachPopup.employmentType || "—"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Hire Date" value={ownerCoachPopup.hireDate || "—"} tone="#16a34a" soft="#f0fdf4" />
                    <InfoTile label="Salary Model" value={ownerCoachPopup.salaryModel || "—"} tone="#ea580c" soft="#fff7ed" />
                    <InfoTile label="Shift Schedule" value={ownerCoachPopup.shiftSchedule || "—"} tone="#0891b2" soft="#ecfeff" />
                    <InfoTile label="Years of Experience" value={ownerCoachPopup.yearsOfExperience != null ? String(ownerCoachPopup.yearsOfExperience) : "—"} tone="#f59e0b" soft="#fffbeb" />
                    <InfoTile label="Max Clients" value={ownerCoachPopup.maxClientCapacity != null ? String(ownerCoachPopup.maxClientCapacity) : "—"} tone="#7c3aed" soft="#f5f3ff" />
                    <InfoTile label="Available Hours" value={ownerCoachPopup.availableHours || "—"} tone="#2563eb" soft="#eff6ff" />
                    <InfoTile label="Emergency Contact" value={ownerCoachPopup.emergencyContact || "—"} tone="#dc2626" soft="#fef2f2" />
                  </div>
                  {ownerCoachPopup.address && <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Address</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerCoachPopup.address}</div></div>}
                  {ownerCoachPopup.certifications && <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}><div style={{ fontSize: 11, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Certifications</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerCoachPopup.certifications}</div></div>}
                  {ownerCoachPopup.bankPaymentDetails && <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Bank / Payment Details</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerCoachPopup.bankPaymentDetails}</div></div>}
                  {ownerCoachPopup.performanceNotes && <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Performance Notes</div><div style={{ fontSize: 14, color: "#334155" }}>{ownerCoachPopup.performanceNotes}</div></div>}
                </div>
              )}
              {ownerPopupTab === "members" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(() => {
                    const coachMembers = members.filter((m) => m.coach === ownerCoachPopup.name);
                    return coachMembers.length === 0
                      ? <EmptyState title="No members assigned" message="This coach has no members assigned yet." />
                      : (
                          <Table
                            headers={["Member", "Plan", "Payment", "Expires", "Goal"]}
                            rows={coachMembers.map((m) => [
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Avatar initials={(m.name || "MB").slice(0, 2).toUpperCase()} size={28} imageUrl={m.profileImageUrl || ""} /><span>{m.name}</span></div>,
                              m.plan || "—",
                              <Badge label={m.paymentStatus || "unpaid"} type={m.paymentStatus || "unpaid"} />,
                              m.planExpiresAt || "—",
                              m.goal || "—"
                            ])}
                          />
                        );
                  })()}
                </div>
              )}
              {ownerPopupTab === "attendance" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(() => {
                    const coachAttn = attendance.filter((a) => a.coachName === ownerCoachPopup.name);
                    return coachAttn.length === 0
                      ? <EmptyState title="No attendance records" message="No member attendance records logged by this coach." />
                      : coachAttn.slice(0, 20).map((a) => (
                          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{a.memberName || "Member"}</div>
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{a.date || new Date(a.checkInAt || "").toLocaleDateString()}</div>
                            </div>
                            <Badge label={a.status} type={a.status} />
                          </div>
                        ));
                  })()}
                </div>
              )}
            </Modal>
          )}

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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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

function CoachDash() {
  const { user, logout } = useAuth();
  const { data, error, addWorkoutPlan, editWorkoutPlan, removeWorkoutPlan, addMealPlan, editMealPlan, removeMealPlan, assignWorkoutPlan, unassignWorkoutPlan, assignMealPlan, unassignMealPlan, editMyProfile, checkInMember, clockOutMember, memberStartBreak, memberEndBreak, sendMessage, markMessagesRead, addMember, editMemberSubscription, coachClockIn, coachClockOut, coachStartBreak, coachEndBreak } = useDashboard();
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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet);
    XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function coPdf(title, headers, rows, landscape, filename) {
    const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
    doc.setFontSize(14); doc.text(`FitnessHub — ${title}`, 14, 18);
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    autoTable(doc, { startY: 38, head: [headers], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [22, 163, 74] } });
    doc.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
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

  return (
    <DashboardShell
      isMobile={isMobile}
      accent={coachAccent}
      title="FitnessHub"
      subtitle="Coach Portal"
      navItems={[
        { id: "dashboard", label: "Dashboard", section: "Overview" },
        { id: "notifications", label: "Notifications", count: notificationState.unreadCount, section: "Overview", hiddenInNav: true },
        { id: "members", label: "My Members", section: "Coaching" },
        { id: "workouts", label: "Workout Plans", section: "Coaching" },
        { id: "meals", label: "Meal Plans", section: "Coaching" },
        { id: "attendance", label: "Attendance", section: "Operations" },
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
            <div style={{ marginTop: 6, fontSize: 10, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Powered by FitnessHub</div>
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <NotificationBell count={notificationState.unreadCount} active={page === "notifications"} onClick={() => setPage("notifications")} />
          <Badge label={`${unread} unread`} type={unread ? "warning" : "default"} />
          <Badge label={`${checkedInCount} checked in`} type="checked-in" />
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
                      <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "#ffffff", border: "1px solid #e2e8f0" }}>
                        <Avatar initials={member.avatar} size={38} imageUrl={member.profileImageUrl || ""} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{member.name}</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{member.goal}</div>
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
                  <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Certifications</div>
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7 }}>{profile?.certifications || coach.certifications || "Not added yet"}</div>
                  </div>
                  <div style={{ marginTop: 12, padding: "16px 18px", borderRadius: 18, background: "#ffffff", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Bio</div>
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7 }}>{profile?.bio || "No bio added yet."}</div>
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
                  <SpreadsheetExportButton compact onClick={exportCoachMembersExcel} label="Members" />
                  <ReportExportButton compact onClick={exportCoachMembersPdf} label="Members" />
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
                action={<div style={{ display: "flex", gap: 8 }}><Btn small onClick={() => openWorkoutModal("create")}>+ Add Workout Plan</Btn><SpreadsheetExportButton compact onClick={exportWorkoutsExcel} label="Workouts" /><ReportExportButton compact onClick={exportWorkoutsPdf} label="Workouts" /></div>}
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
              <Toolbar search={mealSearch} setSearch={setMealSearch} searchPlaceholder="Search meal plans" action={<div style={{ display: "flex", gap: 8 }}><Btn small onClick={() => openMealModal("create")}>+ Add Meal Plan</Btn><SpreadsheetExportButton compact onClick={exportMealsExcel} label="Meals" /><ReportExportButton compact onClick={exportMealsPdf} label="Meals" /></div>} />
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
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <SpreadsheetExportButton compact onClick={exportCoachAttendanceExcel} label="Attendance" />
                  <ReportExportButton compact onClick={exportCoachAttendancePdf} label="Attendance" />
                </div>
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
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", maxHeight: 200, overflowY: "auto" }}>
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
                      <div style={{ padding: 18, borderTop: "1px solid var(--border)", background: "#ffffff" }}>
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
                  <div style={{ display: "flex", gap: 8 }}>
                    <SpreadsheetExportButton compact onClick={exportSalaryExcel} label="Salary" />
                    <ReportExportButton compact onClick={exportSalaryPdf} label="Salary" />
                  </div>
                </div>

                {/* Stat cards */}
                <div style={{ ...responsiveGrid(isMobile, "repeat(5,minmax(0,1fr))", "repeat(3,minmax(0,1fr))"), gap: 14 }}>
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
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

function MemberDash() {
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
  const workoutExercisesForDraft = Array.isArray(data?.myWorkoutPlan?.today?.exercises)
    ? data.myWorkoutPlan.today.exercises.filter(Boolean)
    : [];

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
    try {
      await updateMyWorkoutProgress({
        exercises: workoutLogDraft.map((entry) => ({
          done: Boolean(entry.done),
          loggedWeight: String(entry.loggedWeight || "").trim(),
          completionNotes: String(entry.completionNotes || "").trim()
        }))
      });
    } finally {
      setSavingWorkoutLog(false);
    }
  }

  return (
    <DashboardShell
      isMobile={isMobile}
      accent={memberAccent}
      title="FitnessHub"
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
            <div style={{ marginTop: 6, fontSize: 10, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Powered by FitnessHub</div>
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <NotificationBell count={notificationState.unreadCount} active={page === "notifications"} onClick={() => setPage("notifications")} />
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Coach: {coach?.name || "Not assigned"} | Gym: {profile?.gymName || "Not assigned"}</div>
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
                  <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 18, background: "#ffffff", border: "1px solid #d9f4ef" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Bio</div>
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7 }}>{profile?.bio || "No bio added yet."}</div>
                  </div>
                  <div style={{ marginTop: 12, padding: "16px 18px", borderRadius: 18, background: "#ffffff", border: "1px solid #d9f4ef" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Personal Notes</div>
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7 }}>{profile?.personalNotes || "No personal notes added yet."}</div>
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
              <div style={{ padding: isMobile ? 14 : 18, borderTop: "1px solid var(--border)", background: "#ffffff" }}>
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
                  <Btn small onClick={saveWorkoutLog} disabled={savingWorkoutLog} style={{ alignSelf: "flex-start" }}>
                    {savingWorkoutLog ? "Saving..." : "Save Progress"}
                  </Btn>
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
                    <div style={{ padding: isMobile ? 14 : 16, borderRadius: 18, background: "#ffffff", border: "1px solid #dbe4ee" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Log today&apos;s workout</div>
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
                <Card style={{ padding: "14px 20px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Workout History</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{history.length} session{history.length !== 1 ? "s" : ""} logged</div>
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
                  <SectionHeader title={myMealPlan.name} action={<Badge label={`${mealEntries.length} meals`} type="success" />} />
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
                  action={attendance.length > 0 ? <Badge label={`${attendance.length} sessions`} type="info" /> : null}
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
              <SectionHeader title="Payment History" />
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

export { SuperAdminDash, GymOwnerDash, CoachDash, MemberDash };
