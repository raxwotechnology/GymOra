import React from "react";
import { useSmallScreen } from "./utils";

export function Btn({ children, variant = "primary", onClick, small, disabled, danger, style: extraStyle, type = "button" }) {
  const isSmallScreen = useSmallScreen();
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const resolvedVariant = danger ? "danger" : variant;
  const buttonHeight = small ? 34 : isSmallScreen ? 40 : 42;
  const base = {
    appearance: "none",
    borderRadius: small ? "var(--radius-sm)" : "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: "var(--fw-semibold)",
    fontSize: small ? "var(--fs-xs)" : "var(--fs-sm)",
    minHeight: buttonHeight,
    padding: small ? "6px 12px" : isSmallScreen ? "10px 14px" : "11px 16px",
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    whiteSpace: "nowrap",
    userSelect: "none",
    letterSpacing: "0.01em",
    transition: "transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, border-color 0.16s ease, color 0.16s ease, opacity 0.16s ease",
    opacity: disabled ? 0.55 : 1
  };
  const variants = {
    primary: {
      background: hovered && !disabled ? "#1d4ed8" : "#2563eb",
      color: "#ffffff",
      border: "1px solid transparent",
      boxShadow: hovered && !disabled ? "0 6px 16px rgba(37, 99, 235, 0.22)" : "0 2px 8px rgba(37, 99, 235, 0.14)"
    },
    success: {
      background: hovered && !disabled ? "#15803d" : "#16a34a",
      color: "#ffffff",
      border: "1px solid transparent",
      boxShadow: hovered && !disabled ? "0 6px 16px rgba(22, 163, 74, 0.22)" : "0 2px 8px rgba(22, 163, 74, 0.14)"
    },
    danger: {
      background: hovered && !disabled ? "#dc2626" : "#ef4444",
      color: "#ffffff",
      border: "1px solid transparent",
      boxShadow: hovered && !disabled ? "0 6px 16px rgba(220, 38, 38, 0.22)" : "0 2px 8px rgba(220, 38, 38, 0.14)"
    },
    ghost: {
      background: hovered && !disabled ? "#f1f5f9" : "transparent",
      color: "#334155",
      border: "1px solid var(--border)",
      boxShadow: "none"
    },
    outline: {
      background: hovered && !disabled ? "#f8fafc" : "#ffffff",
      color: "#334155",
      border: "1px solid var(--border)",
      boxShadow: "none"
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...base,
        ...variants[resolvedVariant],
        transform: hovered && !disabled ? "translateY(-1px)" : "translateY(0)",
        boxShadow: focused ? `${variants[resolvedVariant].boxShadow === "none" ? "" : `${variants[resolvedVariant].boxShadow}, `}0 0 0 3px rgba(59, 130, 246, 0.18)` : variants[resolvedVariant].boxShadow,
        ...extraStyle
      }}
    >
      {children}
    </button>
  );
}

