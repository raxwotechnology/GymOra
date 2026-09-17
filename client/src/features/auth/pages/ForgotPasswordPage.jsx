import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ForgotPasswordPage() {
  const { user, requestForgotPasswordOtp, resetPasswordWithOtp } = useAuth();
  const [requestForm, setRequestForm] = React.useState({ email: "" });
  const [resetForm, setResetForm] = React.useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [requesting, setRequesting] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function onRequestOtp(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setRequesting(true);
    const result = await requestForgotPasswordOtp(requestForm.email);
    setRequesting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(result.message);
    setResetForm((current) => ({ ...current, email: requestForm.email }));
  }

  async function onResetPassword(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setResetting(true);
    const result = await resetPasswordWithOtp(resetForm);
    setResetting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(result.message);
    setResetForm((current) => ({
      ...current,
      otp: "",
      newPassword: "",
      confirmPassword: ""
    }));
  }

  return (
    <div className="login-wrap">
      <div className="login-shell" style={{ maxWidth: 1160 }}>
        <section className="login-hero">
          <div className="login-hero-scene" />
          <div className="login-hero-content">
            <div className="login-badge">Forgot Password</div>
            <h1>
              RESET WITH
              <br />
              <span>EMAIL OTP.</span>
            </h1>
            <p>
              Coaches and members can request a one-time code, receive it by email, and use it to set a new password.
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

          <div className="login-form-stack">
            <div className="login-card-header">
              <h2>Reset Your Password</h2>
              <p>Enter your account email to receive a 6-digit OTP, then use that code below to create a new password.</p>
            </div>

            <form onSubmit={onRequestOtp} className="login-form-stack">
              <div className="login-field">
                <label>Email Address</label>
                <input
                  type="email"
                  value={requestForm.email}
                  onChange={(e) => {
                    const nextEmail = e.target.value;
                    setRequestForm({ email: nextEmail });
                    setResetForm((current) => ({ ...current, email: nextEmail }));
                  }}
                  placeholder="member@fitnesshub.com"
                  required
                />
              </div>

              <button type="submit" disabled={requesting}>
                {requesting ? "Sending OTP..." : "Send OTP"}
                <span className="login-arrow">&rarr;</span>
              </button>
            </form>

            <form onSubmit={onResetPassword} className="login-form-stack">
              <div className="login-field">
                <label>One-Time Password</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={resetForm.otp}
                  onChange={(e) => setResetForm((current) => ({ ...current, otp: e.target.value.replace(/\D/g, "") }))}
                  placeholder="Enter the 6-digit OTP"
                  required
                />
              </div>

              <div className="login-field">
                <label>New Password</label>
                <input
                  type="password"
                  value={resetForm.newPassword}
                  onChange={(e) => setResetForm((current) => ({ ...current, newPassword: e.target.value }))}
                  placeholder="Create a new password"
                  required
                />
              </div>

              <div className="login-field">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={resetForm.confirmPassword}
                  onChange={(e) => setResetForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                  placeholder="Repeat your new password"
                  required
                />
              </div>

              {error ? <div className="login-error">{error}</div> : null}
              {success ? <div className="login-success">{success}</div> : null}

              <button type="submit" disabled={resetting}>
                {resetting ? "Resetting..." : "Reset Password"}
                <span className="login-arrow">&rarr;</span>
              </button>
            </form>

            <Link to="/login" className="login-text-link" style={{ alignSelf: "center" }}>
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
