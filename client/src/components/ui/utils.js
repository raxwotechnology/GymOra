import React from "react";

export function resolveImageUrl(imageUrl = "") {
  if (!imageUrl) return "";
  const strUrl = String(imageUrl);
  if (strUrl.startsWith("http") || strUrl.startsWith("data:")) {
    return imageUrl;
  }
  // Only prefix with apiBase if it is a backend upload (starts with /uploads)
  if (!strUrl.startsWith("/uploads")) {
    return imageUrl;
  }
  const defaultDevUrl = "http://localhost:5000";
  const isDev = import.meta.env.DEV;
  const apiBase = import.meta.env.VITE_API_URL !== undefined 
    ? import.meta.env.VITE_API_URL 
    : (isDev ? defaultDevUrl : "");
  return `${apiBase}${imageUrl}`;
}

export function useSmallScreen(breakpoint = 640) {
  const getMatch = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  }, [breakpoint]);

  const [isSmallScreen, setIsSmallScreen] = React.useState(getMatch);

  React.useEffect(() => {
    const onResize = () => setIsSmallScreen(getMatch());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [getMatch]);

  return isSmallScreen;
}
