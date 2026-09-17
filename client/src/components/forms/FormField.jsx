import React from "react";

export function FormField({ label, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ display: "block", color: "var(--muted)", fontSize: 12, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
        fontFamily: "inherit" }}>{label}</label>
      {children}
    </div>
  );
}

export function Input({ ...props }) {
  return (
    <input {...props} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
      borderRadius: 14, padding: "13px 15px", color: "var(--text)", fontSize: 14, outline: "none",
      boxSizing: "border-box", boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.03)", transition: "border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease", ...props.style }} />
  );
}

export function TextArea({ rows = 4, ...props }) {
  return (
    <textarea
      {...props}
      rows={rows}
      style={{
        width: "100%",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "13px 15px",
        color: "var(--text)",
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.03)",
        resize: "vertical",
        fontFamily: "inherit",
        transition: "border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease",
        ...props.style
      }}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select {...props} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
      borderRadius: 14, padding: "13px 15px", color: "var(--text)", fontSize: 14, outline: "none",
      boxSizing: "border-box", boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.03)", transition: "border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease", ...props.style }}>
      {children}
    </select>
  );
}
