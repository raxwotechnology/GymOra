import React from "react";
import { Link } from "react-router-dom";
import { resolveImageUrl } from "../../../components/shared";

export default function PrivacyPage() {
  const [settings, setSettings] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const isDev = import.meta.env.DEV;
    const base = import.meta.env.VITE_API_URL !== undefined
      ? import.meta.env.VITE_API_URL
      : (isDev ? "http://localhost:5000" : "");
    fetch(`${base}/api/settings`)
      .then((r) => r.json())
      .then((d) => setSettings(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const systemName = settings?.systemName || "Gymora";
  const rawLogoUrl = settings?.logoUrl || "";
  const logoUrl = rawLogoUrl ? resolveImageUrl(rawLogoUrl) : "/gymora-logo.png";
  const customPrivacy = settings?.privacyPolicy;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      fontFamily: "var(--font)",
      color: "var(--text)",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Top navigation header */}
      <header style={{
        height: 64,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={logoUrl}
            alt={systemName}
            style={{ height: 36, objectFit: "contain" }}
          />
          <span style={{ fontSize: "var(--fs-md)", fontWeight: "var(--fw-bold)", color: "var(--text)" }}>
            {systemName}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            to="/terms"
            style={{
              fontSize: "var(--fs-sm)",
              color: "var(--muted)",
              textDecoration: "none",
              fontWeight: "var(--fw-medium)"
            }}
          >
            Terms of Use
          </Link>
          <Link
            to="/login"
            style={{
              fontSize: "var(--fs-sm)",
              color: "#ffffff",
              background: "var(--accent)",
              padding: "7px 16px",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              fontWeight: "var(--fw-semibold)"
            }}
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Content body */}
      <main style={{
        flex: 1,
        maxWidth: 860,
        width: "100%",
        margin: "0 auto",
        padding: "40px 20px 60px"
      }}>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "36px 40px",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 20, marginBottom: 28 }}>
            <span style={{
              display: "inline-block",
              fontSize: "var(--fs-xs)",
              fontWeight: "var(--fw-heavy)",
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 8
            }}>
              Privacy &amp; Data Protection
            </span>
            <h1 style={{
              fontSize: "var(--fs-2xl)",
              fontWeight: "var(--fw-bold)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2
            }}>
              Privacy Policy
            </h1>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 6 }}>
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          {loading ? (
            <p style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>Loading Privacy Policy...</p>
          ) : customPrivacy ? (
            <div style={{ fontSize: "var(--fs-sm)", lineHeight: 1.8, whiteSpace: "pre-wrap", color: "var(--text-secondary)" }}>
              {customPrivacy}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24, fontSize: "var(--fs-sm)", lineHeight: 1.75, color: "var(--text-secondary)" }}>
              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  1. Information We Collect
                </h2>
                <p>
                  When you use {systemName}, we collect information necessary to provide gym management and fitness tracking services:
                </p>
                <ul style={{ paddingLeft: 20, marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  <li><strong>Account Information:</strong> Name, email address, phone number, credentials, role, and profile photo.</li>
                  <li><strong>Gym Operations Data:</strong> Membership plans, attendance check-ins, workout schedules, meal logs, and coach notes.</li>
                  <li><strong>Financial &amp; Transaction Details:</strong> Subscription tier records, membership payments, invoices, and expense entries. (Note: sensitive card details are processed via secure payment gateways and are never stored on our servers).</li>
                  <li><strong>Technical Data:</strong> IP addresses, browser types, device information, and session tokens.</li>
                </ul>
              </section>

              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  2. How We Use Your Information
                </h2>
                <p>
                  The data collected is utilized to:
                </p>
                <ul style={{ paddingLeft: 20, marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  <li>Authenticate users and enforce role-based access control.</li>
                  <li>Facilitate gym operations including member check-ins, coach assignments, and workout routines.</li>
                  <li>Generate accurate financial and operational reports for gym owners.</li>
                  <li>Transmit notifications, alerts, receipts, and system announcements.</li>
                  <li>Maintain platform integrity, prevent fraudulent activities, and diagnose technical problems.</li>
                </ul>
              </section>

              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  3. Data Ownership &amp; Sharing
                </h2>
                <p>
                  Gym owners retain ownership of their operational data. {systemName} does not sell, rent, or trade your personal information to third-party advertisers. Data is only shared with third-party service providers (such as hosting, email delivery, and cloud infrastructure) strictly as required to operate the service.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  4. Data Security &amp; Retention
                </h2>
                <p>
                  We implement robust industry-standard safeguards including encrypted transmissions (HTTPS/TLS), password hashing (bcrypt), and authenticated JWT tokens. We retain account and operational data for as long as your gym maintains an active subscription or as necessary to comply with applicable legal obligations.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  5. Your Rights &amp; Choices
                </h2>
                <p>
                  You have the right to inspect, update, or correct your personal profile information at any time via your account settings. For full account deletion requests or inquiries regarding data stored by a specific gym, please contact your gym management.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  6. Contact Us
                </h2>
                <p>
                  If you have any questions or concerns regarding our privacy practices or data processing, please reach out to the {systemName} support team or your gym administrator.
                </p>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: "center",
        padding: "24px 16px",
        fontSize: "var(--fs-xs)",
        color: "var(--muted)",
        borderTop: "1px solid var(--border)",
        background: "var(--surface)"
      }}>
        &copy; {new Date().getFullYear()} {systemName}. All rights reserved.
      </footer>
    </div>
  );
}
