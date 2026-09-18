import React from "react";
import { useSmallScreen } from "./utils";

export function StatCard({ label, value, sub, accent = "#4a8cff", icon }) {
  const isSmallScreen = useSmallScreen();
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: isSmallScreen ? "var(--space-md) 18px" : "var(--space-lg) var(--space-lg)",
      display: "flex", flexDirection: "column", gap: "var(--space-xs)",
      position: "relative", overflow: "hidden",
      boxShadow: "var(--shadow-sm)"
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: accent, borderRadius: "2px 0 0 2px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          color: "var(--muted)", fontSize: "var(--fs-xs)",
          fontWeight: "var(--fw-semibold)", textTransform: "uppercase", letterSpacing: "0.09em"
        }}>{label}</span>
        {icon && <span style={{ fontSize: 18, opacity: 0.45 }}>{icon}</span>}
      </div>
      <div style={{
        color: "var(--text)",
        fontSize: isSmallScreen ? "var(--fs-xl)" : "var(--fs-3xl)",
        fontWeight: "var(--fw-bold)", lineHeight: 1.1, letterSpacing: "-0.02em"
      }}>{value}</div>
      {sub && <div style={{ color: "var(--muted)", fontSize: "var(--fs-xs)" }}>{sub}</div>}
    </div>
  );
}

export function SectionHeader({ title, action }) {
  const isSmallScreen = useSmallScreen();
  return (
    <div style={{
      display: "flex",
      flexDirection: isSmallScreen ? "column" : "row",
      alignItems: isSmallScreen ? "flex-start" : "center",
      justifyContent: "space-between",
      gap: isSmallScreen ? "var(--space-sm)" : 0,
      marginBottom: "var(--space-md)"
    }}>
      <div style={{
        fontSize: "var(--fs-lg)",
        fontWeight: "var(--fw-bold)",
        color: "var(--text)",
        letterSpacing: "-0.01em"
      }}>{title}</div>
      {action}
    </div>
  );
}

export function Card({ children, style: s }) {
  const isSmallScreen = useSmallScreen();
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: isSmallScreen ? "var(--space-md)" : "var(--space-lg)",
      boxShadow: "var(--shadow-sm)",
      ...s
    }}>
      {children}
    </div>
  );
}

