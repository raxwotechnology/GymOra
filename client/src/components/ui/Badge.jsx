import React from "react";

export function Badge({ label, type = "default" }) {
  const colors = {
    active: { bg: "#dcfce7", color: "#16a34a" },
    inactive: { bg: "#fee2e2", color: "#dc2626" },
    trial: { bg: "#fef9c3", color: "#ca8a04" },
    suspended: { bg: "#fee2e2", color: "#dc2626" },
    good: { bg: "#dcfce7", color: "#16a34a" },
    maintenance: { bg: "#fef9c3", color: "#ca8a04" },
    replace: { bg: "#fee2e2", color: "#dc2626" },
    paid: { bg: "#dcfce7", color: "#16a34a" },
    partial: { bg: "#fef3c7", color: "#d97706" },
    unpaid: { bg: "#fee2e2", color: "#dc2626" },
    "checked-in": { bg: "#dbeafe", color: "#2563eb" },
    "checked-out": { bg: "#dcfce7", color: "#16a34a" },
    "in-stock": { bg: "#dcfce7", color: "#16a34a" },
    "low-stock": { bg: "#fef3c7", color: "#d97706" },
    "out-of-stock": { bg: "#fee2e2", color: "#dc2626" },
    pending: { bg: "#fef3c7", color: "#d97706" },
    refunded: { bg: "#e0f2fe", color: "#0284c7" },
    default: { bg: "#dbeafe", color: "#2563eb" },
    info: { bg: "#dbeafe", color: "#2563eb" },
    warning: { bg: "#fef9c3", color: "#ca8a04" },
    success: { bg: "#dcfce7", color: "#16a34a" }
  };
  const c = colors[type] || colors.default;
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 600,
      padding: "3px 10px", borderRadius: 20, textTransform: "capitalize", letterSpacing: "0.04em",
      display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", lineHeight: 1.35, maxWidth: "100%" }}>
      {label}
    </span>
  );
}
