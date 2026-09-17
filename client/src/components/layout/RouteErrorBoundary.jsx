import React from "react";

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Route render failed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: "100vh", background: "#f8fafc", padding: 24, fontFamily: "var(--font, sans-serif)" }}>
          <div style={{ maxWidth: 720, margin: "40px auto", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 24, boxShadow: "0 18px 34px rgba(15, 23, 42, 0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              Screen Error
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a", marginBottom: 10 }}>
              This dashboard could not render.
            </div>
            <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 18 }}>
              The app hit a client-side error while loading this screen. Refresh once, and if it still happens, the error details below will help us fix it quickly.
            </div>
            <div style={{ marginBottom: 14, padding: 14, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: 13, lineHeight: 1.6 }}>
              <strong>Error:</strong> {String(this.state.error?.message || this.state.error || "Unknown render error")}
            </div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.6, color: "#334155", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16 }}>
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
