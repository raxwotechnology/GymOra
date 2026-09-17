import React from "react";
import { useSmallScreen } from "./utils";

export function Btn({ children, variant = "primary", onClick, small, disabled, danger, style: extraStyle, type = "button" }) {
  const isSmallScreen = useSmallScreen();
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const resolvedVariant = danger ? "danger" : variant;
  const buttonHeight = small ? 36 : isSmallScreen ? 42 : 44;
  const base = {
    appearance: "none",
    borderRadius: small ? 10 : 12,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    fontSize: small ? 12 : 14,
    minHeight: buttonHeight,
    padding: small ? "8px 13px" : isSmallScreen ? "11px 15px" : "12px 17px",
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
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
      boxShadow: hovered && !disabled ? "0 8px 18px rgba(37, 99, 235, 0.18)" : "0 4px 10px rgba(37, 99, 235, 0.12)"
    },
    success: {
      background: hovered && !disabled ? "#15803d" : "#16a34a",
      color: "#ffffff",
      border: "1px solid transparent",
      boxShadow: hovered && !disabled ? "0 8px 18px rgba(22, 163, 74, 0.18)" : "0 4px 10px rgba(22, 163, 74, 0.11)"
    },
    danger: {
      background: hovered && !disabled ? "#dc2626" : "#ef4444",
      color: "#ffffff",
      border: "1px solid transparent",
      boxShadow: hovered && !disabled ? "0 8px 18px rgba(220, 38, 38, 0.18)" : "0 4px 10px rgba(220, 38, 38, 0.12)"
    },
    ghost: {
      background: hovered && !disabled ? "#f1f5f9" : "#ffffff",
      color: "#0f172a",
      border: "1px solid #dbe4f0",
      boxShadow: "none"
    },
    outline: {
      background: hovered && !disabled ? "#f8fafc" : "#ffffff",
      color: "#334155",
      border: "1px solid #cbd5e1",
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
        boxShadow: focused ? `${variants[resolvedVariant].boxShadow === "none" ? "" : `${variants[resolvedVariant].boxShadow}, `}0 0 0 4px rgba(59, 130, 246, 0.14)` : variants[resolvedVariant].boxShadow,
        ...extraStyle
      }}
    >
      {children}
    </button>
  );
}
