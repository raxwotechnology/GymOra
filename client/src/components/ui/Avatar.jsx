import React from "react";
import { resolveImageUrl } from "./utils";

export function Avatar({ initials, size = 36, color = "#2563eb", imageUrl = "" }) {
  const colors = { SR:"#2563eb",LN:"#16a34a",AD:"#dc2626",RW:"#7c3aed",EP:"#2563eb",MJ:"#16a34a",
    TB:"#2563eb",JW:"#dc2626",OH:"#16a34a",CM:"#7c3aed",NG:"#dc2626",AT:"#6b7280",KP:"#2563eb",LC:"#16a34a",AR:"#111827" };
  const bg = colors[initials] || color;
  const resolvedUrl = resolveImageUrl(imageUrl);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "#fff", flexShrink: 0, letterSpacing: "0.02em", overflow: "hidden" }}>
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={initials || "Profile"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(event) => {
            event.currentTarget.style.display = "none";
            const fallback = event.currentTarget.nextSibling;
            if (fallback) fallback.style.display = "flex";
          }}
        />
      ) : null}
      <span style={{ display: imageUrl ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
        {initials}
      </span>
    </div>
  );
}
