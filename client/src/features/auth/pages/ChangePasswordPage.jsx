import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleToPath } from "../utils/roleToPath";

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.mustChangePassword) {
    return <Navigate to={roleToPath(user.role)} replace />;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await changePassword(form);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate(roleToPath(result.user.role), { replace: true });
  }

  return (
    <div className="login-wrap">
      <div className="login-shell" style={{ maxWidth: 1100 }}>
        <section className="login-hero">
          <div className="login-hero-scene" />
          <div className="login-hero-content">
            <div className="login-badge">First Login Security</div>
            <h1>
              SET YOUR
              <br />
              <span>REAL PASSWORD.</span>
            </h1>
            <p>
              Your account was created by an administrator with a temporary password. Replace it now before entering the dashboard.
            </p>
          </div>
        </section>

        <div className="login-card">
          <div className="login-topbar">
            <div className="login-brandmark">
              <img src="/gymora-logo.png" alt="Gymora" className="login-brand-logo-img" />
              <div className="login-brand-name">Gymora</div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="login-form-stack">
            <div className="login-card-header">
              <h2>Change Password</h2>
              <p>Signed in as {user.email}. Choose a new password with at least 8 characters to continue.</p>
            </div>

            <div className="login-field">
              <label>Temporary Password</label>
              <input
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter your current temporary password"
                required
              />
            </div>

            <div className="login-field">
              <label>New Password</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Create a new password"
                required
              />
            </div>

            <div className="login-field">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Repeat your new password"
                required
              />
            </div>

            {error ? <div className="login-error">{error}</div> : null}

            <button type="submit" disabled={submitting}>
              {submitting ? "Updating..." : "Save New Password"}
              <span className="login-arrow">&rarr;</span>
            </button>

            <button type="button" className="login-text-link" onClick={logout} style={{ alignSelf: "center" }}>
              Sign out instead
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
