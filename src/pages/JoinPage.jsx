import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { authApi, inviteApi } from "../api";

function Field({ label, type = "text", value, onChange, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase" }}>{label}</label>
      <input type={type} value={value} onChange={onChange} required={required} style={{ width: "100%", padding: "12px 14px", background: "rgba(10,11,16,0.7)", border: "1px solid var(--glass-border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }} />
    </div>
  );
}

export default function JoinPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

  useEffect(() => {
    if (!token) { setError("Invalid invite link."); setLoading(false); return; }
    inviteApi.validate(token)
      .then(data => { setInvite(data); if (data.email) setForm(f => ({ ...f, email: data.email })); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [token]);

  const set = (k) => (e) => setForm(v => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (form.password !== form.confirm) return setError("Passwords do not match");
    setError("");
    setSubmitting(true);
    try {
      const { token: jwt, user } = await authApi.join({
        name: form.name, email: form.email, password: form.password, inviteToken: token,
      });
      localStorage.setItem("pc_token", jwt);
      localStorage.setItem("pc_user", JSON.stringify(user));
      navigate("/app/dashboard");
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)", color: "var(--text-muted)" }}>
        Validating invite...
      </div>
    );
  }

  if (!invite && error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center", padding: 32, borderRadius: 16, border: "1px solid var(--glass-border)", background: "var(--bg-card)" }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>🔗</p>
          <h2 style={{ marginBottom: 12 }}>Invite unavailable</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>{error}</p>
          <Link to="/login" style={{ color: "var(--accent-primary)" }}>Go to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440, padding: 32, borderRadius: 20, border: "1px solid var(--glass-border)", background: "rgba(20,22,35,0.9)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>🎉</p>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Join {invite.org.name}</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>You've been invited as <strong>{invite.role}</strong></p>
        </div>

        {error && <div style={{ padding: 12, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <Field label="Full name" value={form.name} onChange={set("name")} required />
          <Field label="Email" type="email" value={form.email} onChange={set("email")} required />
          <Field label="Password" type="password" value={form.password} onChange={set("password")} required />
          <Field label="Confirm password" type="password" value={form.confirm} onChange={set("confirm")} required />
          <button type="submit" disabled={submitting} style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))", color: "#fff", fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
            {submitting ? "Joining..." : "Accept & Join"}
          </button>
        </form>
      </div>
    </div>
  );
}
