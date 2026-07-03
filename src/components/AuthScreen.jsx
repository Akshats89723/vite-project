import React, { useState } from "react";
import { authApi } from "../api";

// ── Shared input component ────────────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, required, hint, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div style={{ marginBottom: "18px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "7px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          style={{
            width: "100%", padding: "12px 16px",
            paddingRight: isPassword ? "46px" : "16px",
            background: "rgba(10,11,16,0.7)",
            border: "1px solid var(--glass-border)",
            borderRadius: "10px",
            color: "var(--text-primary)",
            fontSize: "14px",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
          onFocus={e => { e.target.style.borderColor = "var(--accent-primary)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-glow)"; }}
          onBlur={e  => { e.target.style.borderColor = "var(--glass-border)";  e.target.style.boxShadow = "none"; }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            style={{
              position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: "16px", padding: "4px",
            }}
            tabIndex={-1}
          >
            {show ? "🙈" : "👁"}
          </button>
        )}
      </div>
      {hint && <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "5px" }}>{hint}</p>}
    </div>
  );
}

// ── Alert box ─────────────────────────────────────────────────────────────────
function Alert({ type, children }) {
  const styles = {
    error:   { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   color: "#f87171" },
    success: { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)",  color: "#34d399" },
    info:    { bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.3)",  color: "#60a5fa" },
  }[type] || {};
  return (
    <div style={{
      padding: "12px 16px", borderRadius: "10px", marginBottom: "18px",
      background: styles.bg, border: `1px solid ${styles.border}`,
      color: styles.color, fontSize: "13px", lineHeight: "1.45",
    }}>
      {children}
    </div>
  );
}

// ── Submit button ─────────────────────────────────────────────────────────────
function SubmitBtn({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: "100%", padding: "13px",
        background: loading ? "rgba(168,85,247,0.4)" : "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))",
        border: "none", borderRadius: "10px",
        color: "white", fontWeight: "700", fontSize: "15px",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        boxShadow: loading ? "none" : "0 4px 20px rgba(168,85,247,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        fontFamily: "inherit",
      }}
    >
      {loading && <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
      {children}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "22px 0" }}>
      <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }} />
      <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{text}</span>
      <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }} />
    </div>
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────

function LoginView({ onSuccess, onForgot, onRegister }) {
  const [form, setForm]     = useState({ email: "evelyn@company.com", password: "Admin@123" });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError(""); setLoading(true);
    try {
      const { token, user } = await authApi.login({ email: form.email, password: form.password });
      localStorage.setItem("pc_token", token);
      localStorage.setItem("pc_user",  JSON.stringify(user));
      onSuccess(user);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>🏢</div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>Welcome back</h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Sign in to PeopleCore HR Suite</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Field label="Email address" type="email" value={form.email} onChange={set("email")} placeholder="you@company.com" required autoComplete="email" />
      <Field label="Password" type="password" value={form.password} onChange={set("password")} placeholder="Enter your password" required autoComplete="current-password" />

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-10px", marginBottom: "20px" }}>
        <button type="button" onClick={onForgot} style={{ background: "none", border: "none", color: "var(--accent-primary)", fontSize: "13px", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
          Forgot password?
        </button>
      </div>

      <SubmitBtn loading={loading}>{loading ? "Signing in..." : "Sign In"}</SubmitBtn>

      <Divider text="Don't have an account?" />

      <button type="button" onClick={onRegister} style={{
        width: "100%", padding: "12px",
        background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)",
        borderRadius: "10px", color: "var(--text-primary)", fontWeight: "600",
        fontSize: "14px", cursor: "pointer", fontFamily: "inherit",
        transition: "all 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-primary)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--glass-border)"}
      >
        Create Account
      </button>

      <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "20px" }}>
        Demo: evelyn@company.com / Admin@123
      </p>
    </form>
  );
}

function RegisterView({ onSuccess, onLogin }) {
  const [form, setForm]     = useState({ name: "", email: "", orgName: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    if (form.password.length < 8) return setError("Password must be at least 8 characters");
    setLoading(true);
    try {
      const { token, user } = await authApi.register({
        name: form.name, email: form.email,
        password: form.password, orgName: form.orgName || undefined,
      });
      localStorage.setItem("pc_token", token);
      localStorage.setItem("pc_user",  JSON.stringify(user));
      onSuccess(user);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return null;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength ?? 0];
  const strengthColor = ["", "#f87171", "#fbbf24", "#60a5fa", "#34d399"][strength ?? 0];

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>✨</div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>Create account</h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Join PeopleCore HR Suite</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Field label="Full name" value={form.name} onChange={set("name")} placeholder="Your full name" required autoComplete="name" />
      <Field label="Work email" type="email" value={form.email} onChange={set("email")} placeholder="you@company.com" required autoComplete="email" />
      <Field label="Organization name" value={form.orgName} onChange={set("orgName")} placeholder="Acme Corp (optional)" autoComplete="organization" />
      <Field label="Password" type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" required autoComplete="new-password" />

      {/* Password strength bar */}
      {form.password && (
        <div style={{ marginTop: "-10px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: i <= strength ? strengthColor : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
            ))}
          </div>
          <span style={{ fontSize: "11px", color: strengthColor }}>{strengthLabel}</span>
        </div>
      )}

      <Field label="Confirm password" type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat your password" required autoComplete="new-password" />

      <SubmitBtn loading={loading}>{loading ? "Creating account..." : "Create Account"}</SubmitBtn>

      <Divider text="Already have an account?" />

      <button type="button" onClick={onLogin} style={{
        width: "100%", padding: "12px",
        background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)",
        borderRadius: "10px", color: "var(--text-primary)", fontWeight: "600",
        fontSize: "14px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-primary)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--glass-border)"}
      >
        Sign In Instead
      </button>
    </form>
  );
}

function ForgotPasswordView({ onBack }) {
  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [resetToken, setResetToken] = useState("");
  const [sent, setSent]     = useState(false);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await authApi.forgotPassword({ email });
      setResetToken(data.resetToken || "");
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>📬</div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>Check your inbox</h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>A reset code has been generated for <strong style={{ color: "var(--text-primary)" }}>{email}</strong></p>
        </div>

        <Alert type="info">
          <strong>Local dev mode:</strong> In production this code would be emailed. Your code is shown below.
        </Alert>

        {resetToken && (
          <div style={{
            padding: "18px", borderRadius: "12px", textAlign: "center",
            background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)",
            marginBottom: "20px"
          }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your reset code</p>
            <p style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "10px", color: "var(--accent-primary)", fontFamily: "monospace" }}>{resetToken}</p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>Expires in 15 minutes</p>
          </div>
        )}

        <ResetPasswordView email={email} onBack={onBack} prefillToken={resetToken} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>🔐</div>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>Forgot password?</h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Enter your email and we'll send you a reset code</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />

      <SubmitBtn loading={loading}>{loading ? "Sending..." : "Send Reset Code"}</SubmitBtn>

      <button type="button" onClick={onBack} style={{
        width: "100%", marginTop: "12px", padding: "12px",
        background: "none", border: "1px solid var(--glass-border)",
        borderRadius: "10px", color: "var(--text-secondary)",
        fontSize: "14px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--glass-border)"}
      >
        ← Back to Sign In
      </button>
    </form>
  );
}

function ResetPasswordView({ onBack, prefillToken = "" }) {
  const [form, setForm]     = useState({ token: prefillToken, password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [done, setDone]     = useState(false);

  const set = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    if (form.password.length < 8) return setError("Password must be at least 8 characters");
    setLoading(true);
    try {
      await authApi.resetPassword({ token: form.token, newPassword: form.password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "14px" }}>🎉</div>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "10px" }}>Password updated!</h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "24px" }}>Your password has been reset successfully.</p>
        <button onClick={onBack} style={{
          padding: "12px 32px", borderRadius: "10px",
          background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))",
          border: "none", color: "white", fontWeight: "700", fontSize: "14px",
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 4px 20px rgba(168,85,247,0.35)",
        }}>
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert type="error">{error}</Alert>}

      <Field label="Reset code" value={form.token} onChange={set("token")} placeholder="6-digit code" required />
      <Field label="New password" type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" required hint="Min 8 chars, include uppercase, number & symbol for strength" />
      <Field label="Confirm new password" type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat new password" required />

      <SubmitBtn loading={loading}>{loading ? "Updating..." : "Reset Password"}</SubmitBtn>
    </form>
  );
}

// ── Main AuthScreen ───────────────────────────────────────────────────────────

export default function AuthScreen({ onLogin, defaultView = "login" }) {
  const [view, setView] = useState(defaultView); // login | register | forgot

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-dark)",
      backgroundImage: `
        radial-gradient(at 0% 0%,   rgba(139,92,246,0.18) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(236,72,153,0.12) 0px, transparent 50%),
        radial-gradient(at 50% 100%,rgba(59,130,246,0.1)  0px, transparent 50%)
      `,
      padding: "20px",
      fontFamily: "var(--font-sans)",
    }}>

      {/* Decorative blobs */}
      <div style={{ position: "fixed", top: "-120px", left: "-120px", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,0.12),transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-100px", right: "-100px", width: "350px", height: "350px", borderRadius: "50%", background: "radial-gradient(circle,rgba(236,72,153,0.10),transparent 70%)", pointerEvents: "none" }} />

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "440px",
        background: "rgba(20,22,35,0.85)",
        backdropFilter: "blur(24px)",
        border: "1px solid var(--glass-border)",
        borderRadius: "20px",
        padding: "36px 32px",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        position: "relative",
        zIndex: 1,
      }}>

        {/* Brand header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "30px", paddingBottom: "20px", borderBottom: "1px solid var(--glass-border)" }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "8px",
            background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "800", fontSize: "16px", color: "#fff", flexShrink: 0,
          }}>H</div>
          <div>
            <p style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-primary)", lineHeight: 1 }}>PeopleCore</p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Virtual HR Suite</p>
          </div>
        </div>

        {/* View content with key-driven re-mount for animation */}
        <div key={view} style={{ animation: "fadeIn 0.25s ease forwards" }}>
          {view === "login"    && <LoginView    onSuccess={onLogin} onForgot={() => setView("forgot")} onRegister={() => setView("register")} />}
          {view === "register" && <RegisterView onSuccess={onLogin} onLogin={() => setView("login")} />}
          {view === "forgot"   && <ForgotPasswordView onBack={() => setView("login")} />}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
