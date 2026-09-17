import React from "react";

export function MiniChart({ data, color = "#2563eb", height = 60, labels }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div style={{ width: "100%", height }} />;
  }
  const min = Math.min(...data), max = Math.max(...data);
  const w = 300, h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 20) + 10;
    const y = h - ((v - min) / (max - min || 1)) * (h - 16) - 8;
    return `${x},${y}`;
  }).join(" ");
  const area = `10,${h} ` + pts + ` ${w - 10},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function BarChart({ data, labels, color = "#2563eb", height = 100 }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>
        No chart data yet
      </div>
    );
  }
  const max = Math.max(1, ...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
            <div style={{ width: "100%", height: `${(v / max) * 100}%`, background: color,
              borderRadius: "4px 4px 0 0", opacity: i === data.length - 1 ? 1 : 0.5, minHeight: 4 }} />
          </div>
          {labels && <div style={{ fontSize: 10, color: "var(--muted)" }}>{labels[i]}</div>}
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({ value, color = "#4a8cff", height = 6 }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
    </div>
  );
}

export function RingStat({ value, max, color = "#4a8cff", label, size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / max) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x={size/2} y={size/2+6} textAnchor="middle" fill={color} fontSize={16} fontWeight={700}>{value}</text>
      </svg>
      <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>{label}</div>
    </div>
  );
}
