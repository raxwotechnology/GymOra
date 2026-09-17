import React from "react";
import { useSmallScreen } from "./utils";

export function Table({ headers, rows }) {
  const isSmallScreen = useSmallScreen();

  if (isSmallScreen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row, ri) => {
          const middleCells = row.slice(1, row.length > 2 ? row.length - 1 : undefined);
          return (
            <div key={ri} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px" }}>
              {/* First cell — full width (avatar+name, gym name, etc.) */}
              <div style={{ paddingBottom: 6, marginBottom: 6, borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                  {headers[0]}
                </div>
                <div style={{ fontSize: 12, color: "var(--text)" }}>{row[0]}</div>
              </div>

              {/* Middle cells — 2-column grid; orphan last cell spans both columns */}
              {middleCells.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 12px", marginBottom: row.length > 2 ? 6 : 0 }}>
                  {middleCells.map((cell, ci) => {
                    const isOrphan = ci === middleCells.length - 1 && middleCells.length % 2 !== 0;
                    return (
                      <div key={ci + 1} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, gridColumn: isOrphan ? "1 / -1" : "auto" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {headers[ci + 1]}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis" }}>{cell}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Last cell — full width (actions, status) */}
              {row.length > 2 && (
                <div style={{ paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
                    {headers[row.length - 1]}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text)" }}>{row[row.length - 1]}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "8px 12px", textAlign: "left", color: "var(--muted)",
                fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em",
                borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "9px 12px", color: "var(--text)", fontSize: 13, verticalAlign: "middle" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
