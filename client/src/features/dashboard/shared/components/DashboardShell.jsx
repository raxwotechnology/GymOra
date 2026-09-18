import React from "react";
import { Card, Badge, Btn } from "../../../../components/shared";

export function DashboardStatus({ error }) {
  return (
    <div style={{ padding: 32, color: error ? "#dc2626" : "var(--muted)" }}>
      {error || "Loading dashboard..."}
    </div>
  );
}

export function NotificationCard({ item, isRead = false, onMarkRead }) {
  return (
    <Card style={{ opacity: isRead ? 0.72 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{item.title}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{item.body}</div>
          {item.date && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>{item.date}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <Badge label={isRead ? "read" : String(item.type || "info").replace("-", " ")} type={isRead ? "default" : (item.severity || "info")} />
          {!isRead && onMarkRead ? <Btn small variant="ghost" onClick={onMarkRead}>Mark Read</Btn> : null}
        </div>
      </div>
    </Card>
  );
}

export function NotificationBell({ count = 0, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `Open notifications (${count} unread)` : "Open notifications"}
      style={{
        position: "relative",
        width: 38,
        height: 38,
        padding: 0,
        border: "none",
        background: "transparent",
        color: active ? "#2563eb" : "#475569",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5c-.9 0-1.6.7-1.6 1.6v.6A5.7 5.7 0 0 0 7.2 11v3.1c0 1.2-.5 2.4-1.4 3.2l-.5.5c-.2.2-.3.5-.2.8.1.3.4.4.7.4h12.4c.3 0 .6-.1.7-.4.1-.3 0-.6-.2-.8l-.5-.5a4.4 4.4 0 0 1-1.4-3.2V11a5.7 5.7 0 0 0-3.2-5.2v-.6c0-.9-.7-1.6-1.6-1.6Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M9.8 19.1a2.7 2.7 0 0 0 4.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {count > 0 ? (
        <span style={{
          position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, padding: "0 6px",
          borderRadius: 999, background: "#dc2626", color: "#ffffff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, lineHeight: 1, boxShadow: "0 0 0 2px #ffffff"
        }}>
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="18" height="2" rx="1" fill="currentColor" />
      <rect x="2" y="10" width="18" height="2" rx="1" fill="currentColor" />
      <rect x="2" y="15" width="18" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

export function DashboardShell({ accent, title, subtitle, logoUrl, navItems, page, setPage, sidebar, topRight, children, isMobile = false }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const visibleNavItems = navItems.filter((item) => !item.hiddenInNav);
  const groupedNavItems = visibleNavItems.reduce((groups, item) => {
    const key = item.section || "Workspace";
    const existing = groups.find((group) => group.label === key);
    if (existing) { existing.items.push(item); return groups; }
    groups.push({ label: key, items: [item] });
    return groups;
  }, []);
  const useNavGroups = groupedNavItems.length > 1 || groupedNavItems.some((group) => group.label !== "Workspace");

  const navBg         = "#ffffff";
  const navText       = "var(--muted)";
  const navActiveText = accent;
  const navActiveBg   = `linear-gradient(135deg, ${accent}18, ${accent}0c)`;
  const navHoverBg    = "var(--border-light)";
  const navGroupLabel = "var(--muted-light)";
  const sidebarBorder = "1px solid var(--border)";
  const sidebarShadow = "2px 0 16px rgba(15,23,42,0.04)";

  function renderNavButton(item) {
    const isActive = page === item.id;
    return (
      <button
        key={item.id}
        onClick={() => { setPage(item.id); setDrawerOpen(false); }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "flex-start",
          gap: "var(--space-sm)", padding: "9px 12px", borderRadius: "var(--radius-sm)",
          border: "none", whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer",
          textAlign: "left",
          fontSize: "var(--fs-sm)",
          fontWeight: isActive ? "var(--fw-semibold)" : "var(--fw-medium)",
          fontFamily: "var(--font)",
          width: "100%", position: "relative",
          background: isActive ? navActiveBg : "transparent",
          color: isActive ? navActiveText : navText,
          transition: "background 0.15s, color 0.15s",
          boxShadow: isActive ? `inset 0 0 0 1px ${accent}20` : "none"
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = navHoverBg; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
      >
        <span aria-hidden="true" style={{
          width: 7, height: 7, borderRadius: "var(--radius-full)", flexShrink: 0,
          background: isActive ? accent : "#cbd5e1",
          boxShadow: isActive ? `0 0 0 4px ${accent}18` : "none",
          transition: "all 0.2s ease"
        }} />
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.count > 0 ? (
          <span style={{
            minWidth: 18, height: 18, padding: "0 5px", borderRadius: "var(--radius-full)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: isActive ? accent : "#e2e8f0", color: isActive ? "#ffffff" : "var(--muted)",
            fontSize: "var(--fs-xs)", fontWeight: "var(--fw-bold)", lineHeight: 1
          }}>
            {item.count > 99 ? "99+" : item.count}
          </span>
        ) : null}
      </button>
    );
  }

  const currentNavItem = navItems.find((item) => item.id === page);

  /* ── Sidebar content (shared between desktop sidebar & mobile drawer) ── */
  const sidebarContent = (
    <>
      {/* Brand block */}
      <div style={{ padding: "12px 10px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {logoUrl ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 0" }}>
            <div style={{ width: "100%", minHeight: 52, maxHeight: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src={logoUrl} alt={title}
                style={{ maxWidth: "100%", maxHeight: 60, width: "auto", height: "auto", objectFit: "contain", display: "block" }}
              />
            </div>
            {subtitle && (
              <div style={{
                fontSize: "var(--fs-xs)", color: "var(--muted-light)",
                marginTop: 4, marginBottom: 2,
                textTransform: "uppercase", letterSpacing: "0.12em",
                fontWeight: "var(--fw-medium)"
              }}>{subtitle}</div>
            )}
          </div>
        ) : (
          <div style={{
            padding: "14px 16px", borderRadius: "var(--radius-xl)",
            background: `linear-gradient(135deg, ${accent}10, rgba(255,255,255,0.95))`,
            border: `1px solid ${accent}18`
          }}>
            <div style={{
              fontSize: "var(--fs-xl)", fontWeight: "var(--fw-black)",
              letterSpacing: "-0.04em", color: accent, lineHeight: 1.1
            }}>{title}</div>
            {subtitle && (
              <div style={{
                fontSize: "var(--fs-xs)", color: "var(--muted)",
                marginTop: 4, textTransform: "uppercase", letterSpacing: "0.12em",
                fontWeight: "var(--fw-medium)"
              }}>{subtitle}</div>
            )}
          </div>
        )}
        {sidebar && <div style={{ paddingTop: 10 }}>{sidebar}</div>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 8px 16px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", scrollbarWidth: "none" }}>
        {(useNavGroups ? groupedNavItems : [{ label: "", items: visibleNavItems }]).map((group) => (
          <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: group.label ? 6 : 0 }}>
            {group.label ? (
              <div style={{
                padding: "8px 12px 3px",
                fontSize: "var(--fs-xs)", fontWeight: "var(--fw-heavy)",
                color: navGroupLabel, letterSpacing: "0.12em", textTransform: "uppercase"
              }}>
                {group.label}
              </div>
            ) : null}
            {group.items.map(renderNavButton)}
          </div>
        ))}
      </nav>
    </>
  );


  return (
    <div style={{ display: "flex", flexDirection: "row", height: "100vh", overflow: "hidden", background: "var(--bg)", fontFamily: "var(--font)" }}>

      {/* ── Desktop sidebar ── */}
      {!isMobile && (
        <div style={{ width: 248, background: navBg, borderRight: sidebarBorder, display: "flex", flexDirection: "column", flexShrink: 0, minHeight: 0, overflowY: "auto", boxShadow: sidebarShadow }}>
          {sidebarContent}
        </div>
      )}

      {/* ── Mobile drawer overlay ── */}
      {isMobile && drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 998, backdropFilter: "blur(2px)" }}
          />
          {/* Drawer */}
          <div style={{
            position: "fixed", top: 0, left: 0, height: "100vh", width: 280,
            background: navBg, borderRight: sidebarBorder,
            boxShadow: "4px 0 32px rgba(15,23,42,0.18)",
            display: "flex", flexDirection: "column", zIndex: 999,
            overflowY: "auto", animation: "slideInLeft 0.22s ease"
          }}>
            {/* Drawer close button */}
            <button
              onClick={() => setDrawerOpen(false)}
              style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, border: "none", background: "rgba(100,116,139,0.1)", borderRadius: 8, cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            {sidebarContent}
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Topbar */}
        <div style={{ height: 56, padding: "0 16px", borderBottom: "1px solid var(--border)", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexShrink: 0, boxShadow: "0 1px 0 rgba(15,23,42,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {/* Hamburger on mobile */}
            {isMobile && (
              <button
                onClick={() => setDrawerOpen(true)}
                style={{ width: 38, height: 38, border: "none", background: "transparent", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: 8, flexShrink: 0 }}
                aria-label="Open menu"
              >
                <HamburgerIcon />
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: "var(--fs-md)", fontWeight: "var(--fw-semibold)",
                color: "var(--text)", letterSpacing: "-0.01em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}>
                {currentNavItem?.label}
              </div>
              {currentNavItem?.description && !isMobile && (
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 1 }}>{currentNavItem.description}</div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "nowrap", gap: 8, alignItems: "center", flexShrink: 0 }}>{topRight}</div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "var(--space-md)" : "var(--space-xl)", background: "var(--bg)" }}>
          {children}
        </div>
      </div>


      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
