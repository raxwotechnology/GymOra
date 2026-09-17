import React from "react";

export function DonutChart({ segments, size = 120, thickness = 20 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--muted)" }}>No data</div>
  );
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let cumulative = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
      {segments.filter(seg => seg.value > 0).map((seg, i) => {
        const len = (seg.value / total) * circ;
        const offset = circ * 0.25 - cumulative;
        cumulative += len;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={seg.color} strokeWidth={thickness}
            strokeDasharray={`${Math.max(0, len - 2)} ${circ - Math.max(0, len - 2)}`}
            strokeDashoffset={offset} strokeLinecap="butt" />
        );
      })}
      <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize={size > 100 ? 18 : 13} fontWeight={800} fill="#0f172a">{total}</text>
    </svg>
  );
}

export function DualBarChart({ dataA, dataB, labels, colorA = "#2563eb", colorB = "#f59e0b", height = 100, labelA = "Revenue", labelB = "Expenses" }) {
  const max = Math.max(1, ...dataA, ...dataB);
  return (
    <div>
      <div style={{ display: "flex", gap: 4, height, alignItems: "flex-end" }}>
        {dataA.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
            <div style={{ display: "flex", gap: 2, width: "100%", flex: 1, alignItems: "flex-end" }}>
              <div style={{ flex: 1, background: colorA, borderRadius: "3px 3px 0 0", height: `${(v / max) * 100}%`, minHeight: v > 0 ? 3 : 0 }} />
              <div style={{ flex: 1, background: colorB, borderRadius: "3px 3px 0 0", height: `${((dataB[i] || 0) / max) * 100}%`, minHeight: (dataB[i] || 0) > 0 ? 3 : 0 }} />
            </div>
            {labels && <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{labels[i]}</div>}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: colorA, display: "inline-block" }} />{labelA}</span>
        <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: colorB, display: "inline-block" }} />{labelB}</span>
      </div>
    </div>
  );
}
