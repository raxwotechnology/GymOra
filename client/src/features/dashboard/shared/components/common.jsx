import React from "react";
import {
  Avatar,
  Badge,
  Card,
  SectionHeader,
  FormField,
  Input,
  Modal,
  Select,
  Btn,
  Table,
  resolveImageUrl
} from "../../../../components/shared";
import { useIsMobile, responsiveGrid } from "../lib/hooks";
import {
  buildAuditFields,
  formatCurrencyValue,
  formatReceiptDateTime,
  buildReceiptNumber,
  getReceiptDisplayDetails,
  getReceiptEmailMessage
} from "../lib/formatters";
import { printSaleReceipt } from "../lib/pdf";

export function EmptyState({ title, message }) {
  return (
    <Card style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{message}</div>
    </Card>
  );
}

export function MessageBubble({ message, isOwn = false, accent = "#2563eb", soft = "#eff6ff" }) {
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

export function ExportButtonGroup({ children, style: extraStyle }) {
  const isMobile = useIsMobile(640);
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 8, width: isMobile ? "100%" : "auto", ...extraStyle }}>
      {children}
    </div>
  );
}

export function ReportExportButton({ onClick, label = "Download PDF", compact = false }) {
  return (
    <Btn
      variant="outline"
      onClick={onClick}
      style={{
        flex: "1 1 auto",
        minWidth: compact ? 136 : 148,
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

export function SpreadsheetExportButton({ onClick, label = "Export Excel", compact = false }) {
  return (
    <Btn
      variant="outline"
      onClick={onClick}
      style={{
        flex: "1 1 auto",
        minWidth: compact ? 136 : 154,
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

export function ProfileRow({ label, value }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{value}</div>
    </div>
  );
}

export function AuditFieldList({ snapshot, emptyText }) {
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

export function ProfilePhotoField({ file, onChange, currentImageUrl = "", initials = "PR", color = "#2563eb" }) {
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

export function SupplementImageField({ file, onChange, currentImageUrl = "" }) {
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

export function InfoTile({ label, value, tone = "#2563eb" }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: "var(--radius-md)",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderLeft: `3px solid ${tone}`,
      boxShadow: "var(--shadow-sm)"
    }}>
      <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "var(--fw-medium)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: "var(--fs-md)", fontWeight: "var(--fw-bold)", color: "var(--text)", lineHeight: 1.3 }}>
        {value}
      </div>
    </div>
  );
}

const BANK_AVATAR_COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#16a34a", "#ea580c", "#db2777", "#4f46e5"];

export function BankAccountsPanel({ accounts = [], sortValue, onSortChange, onSelect, activeBank, isMobile, title = "Bank Accounts" }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <SectionHeader title={title} />
        <Select value={sortValue} onChange={(e) => onSortChange(e.target.value)} style={{ width: isMobile ? "100%" : 200 }}>
          <option value="name">Sort: Name (A-Z)</option>
          <option value="balance-desc">Sort: Balance (High-Low)</option>
          <option value="balance-asc">Sort: Balance (Low-High)</option>
          <option value="income-desc">Sort: Income (High-Low)</option>
        </Select>
      </div>
      {accounts.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>No bank accounts added yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: isMobile ? 12 : 18 }}>
          {accounts.map((d, i) => {
            const isActive = activeBank === d.bankName;
            const total = d.income + d.expense;
            const incomePct = total > 0 ? Math.round((d.income / total) * 100) : 50;
            const avatarColor = BANK_AVATAR_COLORS[i % BANK_AVATAR_COLORS.length];
            return (
              <div
                key={d._id || d.id}
                onClick={() => onSelect && onSelect(d, isActive)}
                style={{
                  padding: isMobile ? "14px 16px" : "20px 22px",
                  borderRadius: 16,
                  background: isActive ? "#eff6ff" : "var(--surface)",
                  border: `1.5px solid ${isActive ? "#2563eb" : d.isDefault ? "#93c5fd" : "var(--border)"}`,
                  boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
                  cursor: onSelect ? "pointer" : "default",
                  transition: "box-shadow 0.15s, transform 0.15s",
                  minWidth: 0,
                  overflow: "hidden"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14 }}>
                  <div style={{ width: isMobile ? 38 : 48, height: isMobile ? 38 : 48, flexShrink: 0, borderRadius: 12, background: avatarColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: isMobile ? 15 : 18 }}>
                    {(d.bankName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 800, fontSize: isMobile ? 14 : 16, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.bankName}</div>
                      {d.isDefault ? <Badge label="Default" /> : null}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.accountName} · A/C {d.accountNumber}</div>
                  </div>
                </div>

                <div style={{ marginTop: isMobile ? 12 : 18 }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Current Balance</div>
                  <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>LKR {Number(d.currentBalance || 0).toLocaleString()}</div>
                </div>

                <div style={{ marginTop: isMobile ? 10 : 16 }}>
                  <div style={{ display: "flex", height: 7, borderRadius: 999, overflow: "hidden", background: "#fee2e2" }}>
                    <div style={{ width: `${incomePct}%`, background: "#16a34a", transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: isMobile ? 11 : 13, fontWeight: 700, gap: 4, flexWrap: "wrap" }}>
                    <span style={{ color: "#16a34a" }}>↑ LKR {d.income.toLocaleString()} <span style={{ fontWeight: 500, color: "var(--muted)" }}>in</span></span>
                    <span style={{ color: "#dc2626" }}>↓ LKR {d.expense.toLocaleString()} <span style={{ fontWeight: 500, color: "var(--muted)" }}>out</span></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function ProfileMetric({ label, value, tone = "#2563eb", soft = "#eff6ff" }) {
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

export function ProfileSection({ title, description = "", children, action }) {
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

export function DetailStack({ items = [] }) {
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
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.5, wordBreak: "break-word" }}>
            {item.value}
          </div>
          {item.helper ? (
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.55, marginTop: 4, wordBreak: "break-word" }}>
              {item.helper}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ModalSectionBlock({ title, description = "", children, accent = "#2563eb" }) {
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

export function ModalFormGrid({ isMobile, children, columns = 2 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${columns}, minmax(0, 1fr))`, gap: 14 }}>
      {children}
    </div>
  );
}

export function Toolbar({ search, setSearch, searchPlaceholder, filters = [], action = null }) {
  const isMobile = useIsMobile(640);
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 8 : 12, flexWrap: isMobile ? "nowrap" : "wrap", alignItems: isMobile ? "stretch" : "center" }}>
      <Input
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: isMobile ? "100%" : 320 }}
      />
      {filters.map((filter) => (
        <Select
          key={filter.label}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          style={{ width: isMobile ? "100%" : 180 }}
        >
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      ))}
      {action ? (
        <div style={{ marginLeft: isMobile ? 0 : "auto", width: isMobile ? "100%" : "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {action}
        </div>
      ) : null}
    </div>
  );
}

export function SearchableCategoryFilter({ value, onChange, options }) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", background: "var(--surface)", cursor: "pointer", minWidth: 160, fontSize: 13 }} onClick={() => setOpen((v) => !v)}>
        <span style={{ color: "var(--text)", flex: 1 }}>{displayLabel}</span>
        <span style={{ color: "var(--muted)", fontSize: 10 }}>&#9660;</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 100, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 200, padding: 8 }}>
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

export function PaginationControls({ page, totalPages, onPageChange, totalItems, label }) {
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

export function TemporaryCredentialModal({ details, onClose }) {
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

export function SaleReceiptModal({ receipt, gymName, onClose }) {
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
