import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { resolveImageUrl } from "../../../components/shared";
import { getPublicPlans, registerTrial, initiateRegistration, getRegistrationStatus } from "../api/publicApi";
import PlanCard from "../components/PlanCard";

const defaultDevUrl = "http://localhost:5000";
const isDev = import.meta.env.DEV;
const API_BASE = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : (isDev ? defaultDevUrl : "");

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      style={{
        padding: "3px 10px", fontSize: 11, borderRadius: 6, cursor: "pointer", fontWeight: 700,
        background: copied ? "#d1fae5" : "#f3f4f6",
        color: copied ? "#065f46" : "#374151",
        border: "1px solid " + (copied ? "#6ee7b7" : "#d1d5db"),
        transition: "all 0.15s", flexShrink: 0
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

const CYCLE_LABEL = { monthly: "/mo", quarterly: "/quarter", annual: "/yr" };
const PLAN_PALETTE = ["#16a34a", "#2563eb", "#7c3aed", "#f97316", "#0891b2", "#db2777"];

function getPopularPlanId(plans) {
  if (!plans || plans.length < 2) return null;
  return plans[1]._id;
}

export default function GetStartedPage() {
  const [sysSettings, setSysSettings] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ownerName: "", ownerEmail: "", gymName: "", location: "", phone: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [pendingOrderId, setPendingOrderId] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then((r) => r.json())
      .then(setSysSettings)
      .catch(() => {});
    getPublicPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  const systemName = sysSettings?.systemName || "Gymora";
  const tagline    = sysSettings?.tagline    || "Next Level Fitness ERP";
  const rawLogo    = sysSettings?.logoUrl    || "";
  const logoUrl    = rawLogo ? resolveImageUrl(rawLogo) : "/gymora-logo.png";

  function handleField(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function openTrialForm() {
    setSelectedPlan(null);
    setFormError("");
    setShowForm(true);
  }

  function openPaidForm(plan) {
    setSelectedPlan(plan);
    setFormError("");
    setShowForm(true);
  }

  function backToPlans() {
    setShowForm(false);
    setFormError("");
    setSelectedPlan(null);
  }

  async function pollForCredentials(orderId) {
    const MAX = 10;
    for (let i = 0; i < MAX; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const result = await getRegistrationStatus(orderId);
        if (result.status === "completed") {
          setCredentials({ email: result.email, temporaryPassword: result.temporaryPassword });
          setPendingOrderId(null);
          return;
        }
      } catch (_) {}
    }
    setPendingOrderId(null);
    setFormError("Payment received but account setup is taking longer than expected. Please contact support with order ID: " + orderId);
    setShowForm(true);
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      if (!selectedPlan) {
        const result = await registerTrial(form);
        setCredentials({ email: result.email, temporaryPassword: result.temporaryPassword });
        setShowForm(false);
        setForm({ ownerName: "", ownerEmail: "", gymName: "", location: "", phone: "" });
      } else {
        const data = await initiateRegistration({ ...form, planId: selectedPlan._id });
        setPendingOrderId(data.orderId);
        setShowForm(false);
        setForm({ ownerName: "", ownerEmail: "", gymName: "", location: "", phone: "" });

        window.payhere.onCompleted = () => pollForCredentials(data.orderId);
        window.payhere.onDismissed = () => {
          setPendingOrderId(null);
          setShowForm(true);
        };
        window.payhere.onError = () => {
          setPendingOrderId(null);
          setFormError("Payment failed. Please try again.");
          setShowForm(true);
        };

        window.payhere.startPayment({
          sandbox: import.meta.env.DEV,
          merchant_id: data.merchantId,
          return_url: window.location.href,
          cancel_url: window.location.href,
          notify_url: data.notifyUrl,
          order_id: data.orderId,
          items: selectedPlan.name,
          amount: data.amount,
          currency: data.currency,
          hash: data.hash,
          first_name: form.ownerName.split(" ")[0],
          last_name: form.ownerName.split(" ").slice(1).join(" ") || "-",
          email: form.ownerEmail,
          phone: form.phone || "",
          address: form.location,
          city: form.location,
          country: "Sri Lanka",
        });
      }
    } catch (err) {
      setFormError(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const accentColor = selectedPlan?.color || "#2563eb";

  const sortedPlans = [...plans].sort((a, b) => (Number(a.price) === 0 ? -1 : 0) - (Number(b.price) === 0 ? -1 : 0));
  const popularId = getPopularPlanId(sortedPlans);

  return (
    <div className="login-wrap">
      {!showForm && !credentials ? (
        <div className="pp-page" style={{ minHeight: "100vh" }}>
          <div className="pp-blob pp-blob-1" />
          <div className="pp-blob pp-blob-2" />
          <div className="pp-blob pp-blob-3" />

          {/* ── Hero ── */}
          <header style={heroStyle}>
            <img src={logoUrl} alt={systemName} style={logoStyle} />
            <div style={eyebrowStyle}>
              <span style={eyebrowDotStyle} />
              {systemName} Pricing
            </div>
            <h1 style={headlineStyle}>
              Plans that grow <span style={headlineAccentStyle}>with your gym</span>
            </h1>
            <p style={subtextStyle}>
              Choose a subscription plan and pay securely via PayHere.
            </p>
          </header>

          {/* ── Pricing grid ── */}
          <section className="pp-grid">
            {plansLoading ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: "#9ca3af", fontSize: 14 }}>
                Loading plans…
              </div>
            ) : sortedPlans.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: "#9ca3af", fontSize: 14 }}>
                No plans available right now.
              </div>
            ) : (
              sortedPlans.map((plan, idx) => (
                <PlanCard
                  key={plan._id}
                  plan={plan.color && plan.color !== "#2563eb" ? plan : { ...plan, color: PLAN_PALETTE[idx % PLAN_PALETTE.length] }}
                  isPopular={plan._id === popularId}
                  cycleLabel={CYCLE_LABEL[plan.billingCycle] || `/ ${plan.billingCycle || "month"}`}
                  onSelect={() => (Number(plan.price) === 0 ? openTrialForm() : openPaidForm(plan))}
                />
              ))
            )}
          </section>

          <div style={{ textAlign: "center", padding: "0 40px 64px", position: "relative" }}>
            <Link to="/login" className="pp-signin-link" style={{ fontSize: 13.5, color: "#475569", textDecoration: "none", fontWeight: 500 }}>
              Already have an account? <span style={{ color: "var(--accent, #2563eb)", fontWeight: 700 }}>Sign in</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="pp-page" style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "flex-start",
          padding: "0 16px 48px"
        }}>
          <div className="pp-blob pp-blob-1" />
          <div className="pp-blob pp-blob-2" />

          {/* ── Brand header ── */}
          <div style={{
            width: "100%", maxWidth: 560,
            display: "flex", justifyContent: "center",
            padding: "36px 0 0", position: "relative", zIndex: 1
          }}>
            <img src={logoUrl} alt={systemName} style={{ height: 84, width: "auto", objectFit: "contain" }} />
          </div>

          {/* ── Card ── */}
          <div style={{
            width: "100%", maxWidth: 560, marginTop: 24,
            background: "#fff", borderRadius: 20,
            boxShadow: "0 24px 60px -20px rgba(15,23,42,0.22)",
            border: "1px solid #eef1f6",
            padding: "36px 40px 40px",
            position: "relative", zIndex: 1, overflow: "hidden"
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accentColor }} />
            <div style={{ maxWidth: "100%" }}>

            {/* ── Registration form ── */}
            {showForm && !credentials && (
              <div className="pp-form-card">
                <button onClick={backToPlans} className="pp-back-btn" style={{ marginBottom: 18 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back to plans
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <h2 style={{ margin: 0 }}>{selectedPlan ? selectedPlan.name : "Free Trial"}</h2>
                  <span style={{
                    background: accentColor + "1a", color: accentColor,
                    font: "700 12px var(--font)", padding: "4px 10px", borderRadius: 9999
                  }}>
                    {selectedPlan ? `LKR ${Number(selectedPlan.price).toLocaleString()} / ${selectedPlan.billingCycle || "month"}` : "Free · 14 days"}
                  </span>
                </div>
                <p style={{ marginBottom: 22 }}>
                  {selectedPlan
                    ? "Pay securely via PayHere after filling this form."
                    : "Fill in your details and we'll create your gym account instantly — no card required."}
                </p>

                <form onSubmit={handleFormSubmit} className="login-form-stack">
                  <div className="login-field">
                    <label>Gym Name</label>
                    <input
                      name="gymName"
                      value={form.gymName}
                      onChange={handleField}
                      placeholder="e.g. Iron Forge Gym"
                      required
                    />
                  </div>
                  <div className="login-field">
                    <label>Your Full Name</label>
                    <input
                      name="ownerName"
                      value={form.ownerName}
                      onChange={handleField}
                      placeholder="e.g. Kamal Perera"
                      required
                    />
                  </div>
                  <div className="login-field">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="ownerEmail"
                      value={form.ownerEmail}
                      onChange={handleField}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="login-field">
                      <label>Phone <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleField}
                        placeholder="07X XXX XXXX"
                      />
                    </div>
                    <div className="login-field">
                      <label>Location</label>
                      <input
                        name="location"
                        value={form.location}
                        onChange={handleField}
                        placeholder="e.g. Colombo 05"
                        required
                      />
                    </div>
                  </div>

                  {formError && (
                    <div style={{
                      background: "#fef2f2", border: "1px solid #fecaca",
                      color: "#b91c1c", borderRadius: 8, padding: "10px 14px",
                      fontSize: 13, lineHeight: 1.5
                    }}>
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ background: selectedPlan ? accentColor : "#2563eb" }}
                  >
                    {submitting
                      ? "Please wait…"
                      : selectedPlan
                        ? `Pay LKR ${Number(selectedPlan.price).toLocaleString()} via PayHere`
                        : "Create My Gym"}
                  </button>

                  <p className="pp-hint" style={{ marginTop: 6 }}>
                    By registering you agree to our Terms of Use and Privacy Policy.
                  </p>
                </form>
              </div>
            )}

            {/* ── Pending payment / polling ── */}
            {pendingOrderId && !credentials && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
                  Verifying your payment…
                </h3>
                <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
                  Complete the payment in the PayHere window. We're checking your payment status automatically — this page will update once confirmed.
                </p>
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 16 }}>
                  Order ID: {pendingOrderId}
                </p>
              </div>
            )}

            {/* ── Credentials ── */}
            {credentials && (
              <div className="pp-form-card">
                <div style={{ marginBottom: 18 }}>
                  <h2>Your gym is live! 🎉</h2>
                  <p>Save these login credentials before closing this page.</p>
                </div>

                <div style={{
                  background: "#f0fdf4", border: "1px solid #bbf7d0",
                  borderRadius: 12, padding: "20px", marginBottom: 16
                }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
                      Email
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", fontFamily: "monospace" }}>
                        {credentials.email}
                      </span>
                      <CopyBtn text={credentials.email} />
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid #bbf7d0", paddingTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
                      Temporary Password
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", fontFamily: "monospace", wordBreak: "break-all" }}>
                        {credentials.temporaryPassword}
                      </span>
                      <CopyBtn text={credentials.temporaryPassword} />
                    </div>
                  </div>
                </div>

                <div style={{
                  background: "#fffbeb", border: "1px solid #fde68a",
                  borderRadius: 8, padding: "10px 14px",
                  fontSize: 13, color: "#92400e", lineHeight: 1.5, marginBottom: 16
                }}>
                  You'll be asked to set a new password on your first login.
                </div>

                <Link
                  to="/login"
                  style={{
                    display: "block", textAlign: "center",
                    background: "#2563eb", color: "#fff",
                    borderRadius: 10, padding: "13px 0",
                    fontSize: 15, fontWeight: 700, textDecoration: "none",
                    boxShadow: "0 6px 14px rgba(37,99,235,0.18)"
                  }}
                >
                  Go to Login →
                </Link>
              </div>
            )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const logoStyle = { height: 210, width: "auto", objectFit: "contain", display: "block", margin: "0 auto 12px", position: "relative", zIndex: 1 };
const heroStyle = { maxWidth: 680, margin: "0 auto", padding: "0px 40px 40px", textAlign: "center", position: "relative", zIndex: 1 };
const eyebrowStyle = {
  display: "inline-flex", alignItems: "center", gap: 8,
  font: "700 12px var(--font)", letterSpacing: ".12em", color: "var(--accent, #2563eb)",
  textTransform: "uppercase", marginBottom: 14,
  background: "#eff6ff", border: "1px solid #dbeafe",
  padding: "6px 14px", borderRadius: 9999,
};
const eyebrowDotStyle = { width: 6, height: 6, borderRadius: 9999, background: "var(--accent, #2563eb)" };
const headlineStyle = { font: "700 40px/1.2 var(--font)", color: "#0f172a", margin: "0 0 14px" };
const headlineAccentStyle = {
  background: "linear-gradient(90deg, #2563eb, #7c3aed)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};
const subtextStyle = { font: "400 16px/1.6 var(--font)", color: "#64748b", margin: 0 };

