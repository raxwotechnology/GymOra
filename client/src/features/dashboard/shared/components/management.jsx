import React from "react";
import { Card, Avatar, Badge, FormField, Input, Btn, SectionHeader } from "../../../../components/shared";
import { IconBtn, IcoEdit, IcoKey, IcoTrash } from "./icons";
import { InfoTile, ProfileMetric } from "./common";
import { useIsMobile, responsiveGrid } from "../lib/hooks";

export function MemberManagementCard({ member, onEdit, onResetPassword, onRemove }) {
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

export function AttendanceMemberLookupCard({ query, onQueryChange, members, selectedMemberId, onSelect, attendance, onSubmit }) {
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

export function SearchSelectCard({ label, query, onQueryChange, items, onSelect, selectedId, placeholder, emptyText = "No matches found.", renderMeta, maxItems = 6, scrollable = true }) {
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

export function SearchOnlyField({ label, value, onChange, placeholder }) {
  return (
    <FormField label={label}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </FormField>
  );
}

export function ProfileHeroCard({ title, subtitle, badge, accent = "#2563eb", soft = "#eff6ff", initials, imageUrl = "", children, action, highlights = [] }) {
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
