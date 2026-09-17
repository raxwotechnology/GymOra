import React from "react";
import { apiFetch } from "../../../../lib/api/client";

export function useIsMobile(breakpoint = 768) {
  const getMatch = React.useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth <= breakpoint;
  }, [breakpoint]);

  const [isMobile, setIsMobile] = React.useState(getMatch);

  React.useEffect(() => {
    const onResize = () => setIsMobile(getMatch());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [getMatch]);

  return isMobile;
}

export function responsiveGrid(isMobile, desktop, mobile = "1fr") {
  return { display: "grid", gridTemplateColumns: isMobile ? mobile : desktop };
}

export function useNotificationReadState(scopeKey, notifications, serverReadIds) {
  const storageKey = React.useMemo(() => `fitnesshub_read_notifications_${scopeKey || "guest"}`, [scopeKey]);
  const notificationsLoaded = notifications !== null;
  const notificationIds = React.useMemo(
    () => (Array.isArray(notifications) ? notifications.map((item) => String(item.id || "")) : []).filter(Boolean),
    [notifications]
  );

  const getInitialIds = React.useCallback(() => {
    const local = (() => {
      if (typeof window === "undefined") return [];
      try {
        const raw = window.localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    const server = Array.isArray(serverReadIds) ? serverReadIds : [];
    return Array.from(new Set([...local, ...server]));
  }, [storageKey, serverReadIds]);

  const [readIds, setReadIds] = React.useState(getInitialIds);
  const [serverSynced, setServerSynced] = React.useState(false);

  React.useEffect(() => {
    if (serverSynced || !Array.isArray(serverReadIds)) return;
    setReadIds((current) => Array.from(new Set([...current, ...serverReadIds])));
    setServerSynced(true);
  }, [serverReadIds, serverSynced]);

  React.useEffect(() => {
    if (!notificationsLoaded) return;
    setReadIds((current) => current.filter((id) => notificationIds.includes(id)));
  }, [notificationsLoaded, notificationIds]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !notificationsLoaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify(readIds));
  }, [storageKey, readIds, notificationsLoaded]);

  const persistToServer = React.useCallback((ids) => {
    apiFetch("/api/profile/me/notifications/read", {
      method: "PATCH",
      body: JSON.stringify({ ids }),
      headers: { "Content-Type": "application/json" }
    }).catch(() => {});
  }, []);

  const unreadIds = notificationIds.filter((id) => !readIds.includes(id));

  const markRead = React.useCallback((ids) => {
    const safeIds = (Array.isArray(ids) ? ids : [ids]).map((id) => String(id || "")).filter(Boolean);
    if (safeIds.length === 0) return;
    setReadIds((current) => Array.from(new Set([...current, ...safeIds])));
    persistToServer(safeIds);
  }, [persistToServer]);

  const markAllRead = React.useCallback(() => {
    if (notificationIds.length === 0) return;
    setReadIds((current) => Array.from(new Set([...current, ...notificationIds])));
    persistToServer(notificationIds);
  }, [notificationIds, persistToServer]);

  const isRead = React.useCallback((id) => readIds.includes(String(id || "")), [readIds]);

  return {
    unreadCount: unreadIds.length,
    isRead,
    markRead,
    markAllRead
  };
}
