import React from "react";
import { useSmallScreen } from "./utils";

export function StatCard({ label, value, sub, accent = "#4a8cff", icon }) {
  const isSmallScreen = useSmallScreen();
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
      padding: isSmallScreen ? "16px 18px" : "20px 24px", display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: accent, borderRadius: "2px 0 0 2px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        {icon && <span style={{ fontSize: 18, opacity: 0.5 }}>{icon}</span>}
      </div>
      <div style={{ color: "var(--text)", fontSize: isSmallScreen ? 22 : 28, fontWeight: 700, lineHeight: 1.05 }}>{value}</div>
      {sub && <div style={{ color: "var(--muted)", fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

export function SectionHeader({ title, action }) {
  const isSmallScreen = useSmallScreen();
  return (
    <div style={{ display: "flex", flexDirection: isSmallScreen ? "column" : "row", alignItems: isSmallScreen ? "flex-start" : "center", justifyContent: "space-between", gap: isSmallScreen ? 10 : 0, marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{title}</div>
      {action}
    </div>
  );
}

export function Card({ children, style: s }) {
  const isSmallScreen = useSmallScreen();
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: isSmallScreen ? 16 : 24, ...s }}>
      {children}
    </div>
  );
}
