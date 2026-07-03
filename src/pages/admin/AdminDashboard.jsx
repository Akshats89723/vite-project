import React, { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { adminApi, authApi } from "../../api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("pc_token");
    if (!token) { setAuthed(false); setLoading(false); return; }
    authApi.me()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    Promise.all([adminApi.stats(), adminApi.orgs()])
      .then(([s, o]) => { setStats(s); setOrgs(o); })
      .catch(err => setError(err.message));
  }, [authed]);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)", color: "var(--text-muted)" }}>Loading...</div>;
  if (!authed) return <Navigate to="/login" replace />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-dark)", padding: "32px 40px", fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Platform Admin</h1>
        <Link to="/app/dashboard" style={{ color: "var(--accent-primary)", textDecoration: "none" }}>← Back to app</Link>
      </div>

      {error && <div style={{ padding: 12, borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", marginBottom: 20 }}>{error}</div>}

      {error.includes("Super-admin") && (
        <p style={{ color: "var(--text-secondary)" }}>Add your email to <code>SUPER_ADMIN_EMAILS</code> in server <code>.env</code>.</p>
      )}

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 32 }}>
          <StatCard label="Organizations" value={stats.total_orgs} />
          <StatCard label="Total users" value={stats.total_users} />
          {Object.entries(stats.by_plan || {}).map(([plan, count]) => (
            <StatCard key={plan} label={`${plan} plans`} value={count} />
          ))}
        </div>
      )}

      <div style={{ borderRadius: 16, border: "1px solid var(--glass-border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
              <th style={{ padding: "12px 16px" }}>Org</th>
              <th style={{ padding: "12px 16px" }}>Plan</th>
              <th style={{ padding: "12px 16px" }}>Members</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map(o => (
              <tr key={o.id} style={{ borderTop: "1px solid var(--glass-border)" }}>
                <td style={{ padding: "12px 16px" }}>{o.name}</td>
                <td style={{ padding: "12px 16px" }}>{o.plan_label || o.plan}</td>
                <td style={{ padding: "12px 16px" }}>{o.member_count}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{o.subscription_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ padding: 20, borderRadius: 12, background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800 }}>{value}</p>
    </div>
  );
}
