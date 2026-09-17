import React from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleToPath } from "../utils/roleToPath";
import { resolveImageUrl } from "../../../components/shared";

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginForm, setLoginForm] = React.useState({ email: "", password: "" });
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [sysSettings, setSysSettings] = React.useState(null);

  React.useEffect(() => {
    const defaultDevUrl = "http://localhost:5000";
    const isDev = import.meta.env.DEV;
    const base = import.meta.env.VITE_API_URL !== undefined 
      ? import.meta.env.VITE_API_URL 
      : (isDev ? defaultDevUrl : "");
    fetch(`${base}/api/settings`)
      .then((r) => r.json())
      .then((d) => setSysSettings(d))
      .catch(() => {});
  }, []);

  if (user) {
    return <Navigate to={user.mustChangePassword ? "/change-password" : roleToPath(user.role)} replace />;
  }

  const fromPath = location.state?.from;
  const systemName = sysSettings?.systemName || "Gymora";
  const tagline = sysSettings?.tagline || "Next Level Fitness ERP";
  const rawLogoUrl = sysSettings?.logoUrl || "";
  const logoUrl = rawLogoUrl ? resolveImageUrl(rawLogoUrl) : "/gymora-logo.png";

  async function onLoginSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    const result = await login(loginForm.email, loginForm.password, remember);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (fromPath && fromPath !== "/login") {
      navigate(fromPath, { replace: true });
      return;
    }

    navigate(result.user.mustChangePassword ? "/change-password" : roleToPath(result.user.role), { replace: true });
  }

  const privacyPolicy = sysSettings?.privacyPolicy;
  const termsOfUse = sysSettings?.termsOfUse;
  const helpCenter = sysSettings?.helpCenter;

  return (
    <div className="login-wrap">
      <div className="login-shell">
        <section className="login-hero">
          <div className="login-hero-scene" />

          <div className="login-hero-content">
            <div className="login-badge">{tagline}</div>
            <h1>
              ELEVATE YOUR GYM.
              <br />
              <span>MANAGE SMARTER.</span>
            </h1>
            <p>
              One connected platform for members, coaching, meal plans, attendance, and every gym operation — built for modern fitness teams.
            </p>

            <div className="login-quote">
              <div className="login-quote-bar" />
              <div>
                <strong>Purpose-built for fitness professionals.</strong>
                <span>Track performance, streamline operations, and keep every role perfectly aligned.</span>
              </div>
            </div>

            <div className="login-hero-stats">
              <div className="login-hero-stat">
                <span className="login-hero-stat-value">All-in-One</span>
                <span className="login-hero-stat-label">Platform</span>
              </div>
              <div className="login-hero-stat">
                <span className="login-hero-stat-value">Real-Time</span>
                <span className="login-hero-stat-label">Analytics</span>
              </div>
              <div className="login-hero-stat">
                <span className="login-hero-stat-value">24 / 7</span>
                <span className="login-hero-stat-label">Access</span>
              </div>
            </div>
          </div>
        </section>

        <div className="login-card">
          <div className="login-brand-header">
            {logoUrl ? (
              <img src={logoUrl} alt={systemName} className="login-brand-logo-img" />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="login-brand-icon">{systemName.charAt(0).toUpperCase()}</div>
                <span className="login-brand-name" style={{ color: "#f8fafc" }}>{systemName}</span>
              </div>
            )}
          </div>

          <div className="login-card-inner">
          <form onSubmit={onLoginSubmit} className="login-form-stack">
            <div className="login-card-header">
              <h2>Welcome Back</h2>
              <p>Member and staff accounts are created by the gym owner. Sign in with the email assigned to you by your gym.</p>
            </div>

            <div className="login-field">
              <label>Email Address</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="member@fitnesshub.com"
                required
              />
            </div>

            <div className="login-field">
              <div className="login-label-row">
                <label>Password</label>
                <Link to="/forgot-password" className="login-text-link">Forgot password?</Link>
              </div>
              <div className="login-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
                  style={{ paddingRight: 46 }}
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <label className="login-checkbox">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Maintain session for 30 days</span>
            </label>

            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}

            <button type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
              <span className="login-arrow">&rarr;</span>
            </button>
          </form>
          </div>
          <footer className="login-page-footer">
            <div className="login-footer-links">
              {privacyPolicy
                ? <a href="#privacy" onClick={(e) => { e.preventDefault(); window.open("", "_blank"); alert(privacyPolicy); }}>Privacy Policy</a>
                : <span>Privacy Policy</span>
              }
              {termsOfUse
                ? <a href="#terms" onClick={(e) => { e.preventDefault(); alert(termsOfUse); }}>Terms of Use</a>
                : <span>Terms of Use</span>
              }
              {helpCenter
                ? <a href="#help" onClick={(e) => { e.preventDefault(); alert(helpCenter); }}>Help Center</a>
                : <span>Help Center</span>
              }
              <Link to="/get-started">Register your gym</Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
