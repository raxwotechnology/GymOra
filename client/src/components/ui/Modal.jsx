import React from "react";

export function Modal({ title, onClose, children, width = 520, subtitle = "", tone }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const bodyRef = React.useRef(null);
  const value = String(title || "").toLowerCase();
  const resolvedTone = tone || (
    value.includes("delete") || value.includes("remove") || value.includes("suspend") || value.includes("reject") ? "danger"
      : value.includes("assign") ? "assign"
      : value.includes("edit") || value.includes("update") ? "edit"
      : value.includes("add") || value.includes("new") || value.includes("create") ? "create"
      : "default"
  );
  const resolvedSubtitle = subtitle || (
    resolvedTone === "create" ? "Fill in the details below to create this item cleanly and consistently."
      : resolvedTone === "edit" ? "Review the current details, update what changed, and save when ready."
      : resolvedTone === "assign" ? "Choose the right record and confirm the assignment for this member."
      : resolvedTone === "danger" ? "Double-check this action before continuing, because it affects existing data."
      : "Review the details below and continue when everything looks right."
  );
  const toneStyles = {
    default: { edge: "#2563eb", headerBg: "linear-gradient(135deg, rgba(239, 246, 255, 0.92), rgba(255,255,255,0.98))", chipBg: "#dbeafe", chipColor: "#1d4ed8", chipLabel: "Review" },
    create: { edge: "#16a34a", headerBg: "linear-gradient(135deg, rgba(240, 253, 244, 0.96), rgba(255,255,255,0.98))", chipBg: "#dcfce7", chipColor: "#15803d", chipLabel: "Create" },
    edit: { edge: "#2563eb", headerBg: "linear-gradient(135deg, rgba(239, 246, 255, 0.94), rgba(255,255,255,0.98))", chipBg: "#dbeafe", chipColor: "#1d4ed8", chipLabel: "Edit" },
    assign: { edge: "#7c3aed", headerBg: "linear-gradient(135deg, rgba(245, 243, 255, 0.96), rgba(255,255,255,0.98))", chipBg: "#ede9fe", chipColor: "#6d28d9", chipLabel: "Assign" },
    danger: { edge: "#dc2626", headerBg: "linear-gradient(135deg, rgba(254, 242, 242, 0.96), rgba(255,255,255,0.98))", chipBg: "#fee2e2", chipColor: "#b91c1c", chipLabel: "Careful" }
  };
  const headerTone = toneStyles[resolvedTone] || toneStyles.default;

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [title, subtitle]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.58)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 1000,
      display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 20 }}>
      <div style={{ background: "linear-gradient(180deg, #ffffff, #f8fafc)", border: "1px solid rgba(148, 163, 184, 0.18)", borderRadius: 28,
        width: isMobile ? "100%" : width, maxWidth: isMobile ? "100%" : "min(96vw, 1100px)", maxHeight: isMobile ? "94vh" : "90vh", overflow: "hidden",
        padding: 0, boxShadow: "0 32px 80px rgba(15, 23, 42, 0.22)", display: "flex", flexDirection: "column",
        borderBottomLeftRadius: isMobile ? 0 : 28, borderBottomRightRadius: isMobile ? 0 : 28 }}>
        <div style={{ padding: isMobile ? "18px 18px 16px" : "26px 28px 18px", borderBottom: "1px solid rgba(226, 232, 240, 0.9)", background: `${headerTone.headerBg}, radial-gradient(circle at top right, rgba(255,255,255,0.95), transparent 48%)`, borderTop: `4px solid ${headerTone.edge}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", minHeight: 28, padding: "0 12px", borderRadius: 999, background: headerTone.chipBg, color: headerTone.chipColor, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                {headerTone.chipLabel}
              </div>
              <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1.15 }}>{title}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, maxWidth: 520, lineHeight: 1.6 }}>{resolvedSubtitle}</div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 40, height: 40, borderRadius: 14, border: "1px solid rgba(148, 163, 184, 0.18)", background: "rgba(255,255,255,0.92)", color: "#475569", cursor: "pointer", fontSize: 18, lineHeight: 1, boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)" }}
            >
              ×
            </button>
          </div>
        </div>
        <div ref={bodyRef} style={{ padding: isMobile ? 18 : 24, overflowY: "auto", minHeight: 0, flex: 1, overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.92))" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
