import React from "react";

export function Badge({ label, type = "default" }) {
  const colors = {
    active:         { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
    inactive:       { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
    trial:          { bg: "#fef9c3", color: "#a16207", border: "#fde047" },
    suspended:      { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
    good:           { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
    maintenance:    { bg: "#fef9c3", color: "#a16207", border: "#fde047" },
    replace:        { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
    paid:           { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
    partial:        { bg: "#fef3c7", color: "#b45309", border: "#fcd34d" },
    unpaid:         { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
    "checked-in":   { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
    "checked-out":  { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
    "in-stock":     { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
    "low-stock":    { bg: "#fef3c7", color: "#b45309", border: "#fcd34d" },
    "out-of-stock": { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
    pending:        { bg: "#fef3c7", color: "#b45309", border: "#fcd34d" },
    refunded:       { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc" },
    default:        { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
    info:           { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
    warning:        { bg: "#fef9c3", color: "#a16207", border: "#fde047" },
    success:        { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
    expired:        { bg: "#fce7f3", color: "#be185d", border: "#f9a8d4" },
  };
  const c = colors[type] || colors.default;
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semibold)",
      padding: "3px 10px", borderRadius: "var(--radius-full)",
      textTransform: "capitalize", letterSpacing: "0.04em",
      display: "inline-flex", alignItems: "center",
      whiteSpace: "nowrap", lineHeight: 1.4,
      border: `1px solid ${c.border || c.bg}`,
      maxWidth: "100%"
    }}>
      {label}
    </span>
  );
}

