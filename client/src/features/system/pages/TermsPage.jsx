import React from "react";
import { Link } from "react-router-dom";
import { resolveImageUrl } from "../../../components/shared";

export default function TermsPage() {
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
  const customTerms = settings?.termsOfUse;

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
            to="/privacy"
            style={{
              fontSize: "var(--fs-sm)",
              color: "var(--muted)",
              textDecoration: "none",
              fontWeight: "var(--fw-medium)"
            }}
          >
            Privacy Policy
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
              Legal Agreement
            </span>
            <h1 style={{
              fontSize: "var(--fs-2xl)",
              fontWeight: "var(--fw-bold)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2
            }}>
              Terms of Use
            </h1>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 6 }}>
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          {loading ? (
            <p style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>Loading Terms of Use...</p>
          ) : customTerms ? (
            <div style={{ fontSize: "var(--fs-sm)", lineHeight: 1.8, whiteSpace: "pre-wrap", color: "var(--text-secondary)" }}>
              {customTerms}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24, fontSize: "var(--fs-sm)", lineHeight: 1.75, color: "var(--text-secondary)" }}>
              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  1. Acceptance of Terms
                </h2>
                <p>
                  By accessing and using {systemName} (&quot;the Platform&quot;), including any associated software applications, mobile experiences, and services provided by {systemName}, you agree to be bound by these Terms of Use. If you do not agree to these terms, you must not access or use the Platform.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  2. Platform Description & User Accounts
                </h2>
                <p>
                  {systemName} provides gym management software facilitating memberships, coach scheduling, meal planning, attendance tracking, billing, and operational workflows. Users may access the service in designated roles including Platform Administrators, Gym Owners, Coaches/Staff, and Gym Members.
                </p>
                <p style={{ marginTop: 8 }}>
                  You are responsible for maintaining the confidentiality of your account credentials. You agree to notify your gym administration or {systemName} immediately of any unauthorized use of your account.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  3. Subscriptions & Billing
                </h2>
                <p>
                  Gym owners subscribe to {systemName} service plans. Subscription fees are billed periodically according to the selected plan. Member fees, dues, and payment policies are governed independently by each respective gym. {systemName} is not liable for disputes arising from transactions between gym facilities and their members.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  4. Acceptable Use & Conduct
                </h2>
                <p>
                  You agree not to engage in any activity that disrupts or interferes with the Platform, including introducing viruses or malicious code, attempting unauthorized access to server infrastructure, or transmitting inappropriate, fraudulent, or harassing content.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  5. Health & Fitness Disclaimers
                </h2>
                <p>
                  Workout plans, nutritional templates, and exercise guidance provided through {systemName} are intended for informational and operational purposes only and do not constitute medical advice. Members should consult qualified health professionals before initiating any physical training regimen.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  6. Termination & Suspension
                </h2>
                <p>
                  {systemName} reserves the right to suspend or terminate accounts that violate these Terms, breach security, or fail to fulfill subscription obligations.
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: "var(--fs-lg)", fontWeight: "var(--fw-semibold)", color: "var(--text)", marginBottom: 8 }}>
                  7. Contact Information
                </h2>
                <p>
                  For inquiries regarding these Terms of Use, please reach out to your gym administration or contact support through the {systemName} platform.
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
