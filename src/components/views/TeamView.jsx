import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const BASE = import.meta.env?.VITE_API_BASE || `http://${window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname}:3001/api`;

function authFetch(path, options = {}) {
  const token = localStorage.getItem("pc_token");
  return fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `${options.method || "GET"} ${path} → ${res.status}`);
    }
    return res.json();
  });
}

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    admin:    { bg: "rgba(168,85,247,0.15)", color: "#c084fc" },
    manager:  { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa" },
    employee: { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  };
  const s = map[role?.toLowerCase()] || { bg: "rgba(255,255,255,0.07)", color: "var(--text-muted)" };
  return (
    <span style={{
      padding: "2px 9px", borderRadius: "10px", fontSize: "11px", fontWeight: "600",
      textTransform: "capitalize", background: s.bg, color: s.color,
    }}>
      {role || "—"}
    </span>
  );
}

// ── Seat usage bar ────────────────────────────────────────────────────────────
function SeatBar({ used, total, onUpgrade }) {
  if (!total) return null;
  const pct = Math.min((used / total) * 100, 100);
  const color = pct >= 90 ? "var(--danger)" : pct >= 70 ? "var(--warning)" : "var(--success)";
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Seat Usage</span>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
          {used} / {total} seats used
        </span>
      </div>
      <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px", transition: "width 0.4s ease" }} />
      </div>
      {pct >= 100 && (
        <div style={{
          marginTop: "12px", padding: "12px 16px", borderRadius: "10px",
          background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)",
          color: "#c084fc", fontSize: "13px",
        }}>
          🚀 You've reached your seat limit.{" "}
          <button type="button" onClick={onUpgrade} style={{ background: "none", border: "none", color: "#c084fc", fontWeight: 700, cursor: "pointer", padding: 0, font: "inherit" }}>
            Upgrade your plan
          </button>
        </div>
      )}
    </div>
  );
}

// ── Inline alert ──────────────────────────────────────────────────────────────
function Alert({ type, message, onClose }) {
  if (!message) return null;
  const styles = {
    success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#34d399" },
    error:   { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  color: "#f87171" },
  }[type] || {};
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", borderRadius: "8px",
      background: styles.bg, border: `1px solid ${styles.border}`,
      color: styles.color, fontSize: "13px", marginBottom: "12px",
    }}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>×</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const MOCK_MEMBERS = [
  { id: 1, name: "Evelyn Carter", email: "evelyn@company.com", role: "admin", created_at: "2026-06-01" },
  { id: 2, name: "James Wilson", email: "james@company.com", role: "employee", created_at: "2026-06-15" }
];
const MOCK_INVITES = [
  { id: 101, role: "employee", email: "candidate1@company.com", expires_at: "2026-07-15", used_at: null },
  { id: 102, role: "manager", email: null, expires_at: "2026-07-20", used_at: null }
];

function TeamView({ currentUser }) {
  const navigate = useNavigate();
  const [members, setMembers]   = useState([]);
  const [invites, setInvites]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [alert,   setAlert]     = useState(null); // { type, text }

  // Create invite form
  const [newRole,  setNewRole]  = useState("employee");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState(null);

  const seatsUsed  = currentUser?.org?.seats_used  ?? currentUser?.org?.seatsUsed  ?? 0;
  const seatsTotal = currentUser?.org?.seats_total ?? currentUser?.org?.seatsTotal ?? 0;

  const isMockSession = (() => {
    const t = localStorage.getItem("pc_token");
    return t && t.startsWith("mock_token_");
  })();

  const showAlert = (type, text) => {
    setAlert({ type, text });
    setTimeout(() => setAlert(null), 5000);
  };

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    if (isMockSession) {
      setMembers(MOCK_MEMBERS);
      return;
    }
    try {
      const data = await authFetch("/org/members");
      setMembers(Array.isArray(data) ? data : data.members || []);
    } catch (err) {
      console.warn("Could not load members:", err.message);
      setMembers(MOCK_MEMBERS);
    }
  }, [isMockSession]);

  const fetchInvites = useCallback(async () => {
    if (isMockSession) {
      setInvites(MOCK_INVITES);
      return;
    }
    try {
      const data = await authFetch("/invites");
      setInvites(Array.isArray(data) ? data : data.invites || []);
    } catch (err) {
      console.warn("Could not load invites:", err.message);
      setInvites(MOCK_INVITES);
    }
  }, [isMockSession]);

  useEffect(() => {
    Promise.all([fetchMembers(), fetchInvites()]).finally(() => setLoading(false));
  }, [fetchMembers, fetchInvites]);

  // ── Create invite ────────────────────────────────────────────────────────
  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const body = { role: newRole };
      if (newEmail.trim()) body.email = newEmail.trim();

      if (isMockSession) {
        const mockCreated = {
          id: Date.now(),
          role: newRole,
          email: newEmail.trim() || null,
          token: `mock_invite_${Date.now()}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          used_at: null
        };
        setInvites(prev => [mockCreated, ...prev]);
        setNewEmail("");
        showAlert("success", "Invite link created successfully (Mock Offline).");
        return;
      }

      try {
        const created = await authFetch("/invites", { method: "POST", body: JSON.stringify(body) });
        setInvites(prev => [created, ...prev]);
        setNewEmail("");
        showAlert("success", "Invite link created successfully.");
      } catch (err) {
        const isNetwork = err.message === "Failed to fetch" || err.message.includes("fetch") || err.message.includes("NetworkError");
        if (isNetwork) {
          const mockCreated = {
            id: Date.now(),
            role: newRole,
            email: newEmail.trim() || null,
            token: `mock_invite_${Date.now()}`,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            used_at: null
          };
          setInvites(prev => [mockCreated, ...prev]);
          setNewEmail("");
          showAlert("success", "Invite link created successfully (Mock Offline).");
        } else {
          throw err;
        }
      }
    } catch (err) {
      showAlert("error", err.message || "Failed to create invite.");
    } finally {
      setCreating(false);
    }
  };

  // ── Revoke invite ────────────────────────────────────────────────────────
  const handleRevoke = async (id) => {
    try {
      if (isMockSession || id > 1000000000000 || String(id).startsWith("1")) {
        setInvites(prev => prev.filter(i => i.id !== id));
        showAlert("success", "Invite revoked (Mock Offline).");
        return;
      }
      try {
        await authFetch(`/invites/${id}`, { method: "DELETE" });
        setInvites(prev => prev.filter(i => i.id !== id));
        showAlert("success", "Invite revoked.");
      } catch (err) {
        const isNetwork = err.message === "Failed to fetch" || err.message.includes("fetch") || err.message.includes("NetworkError");
        if (isNetwork) {
          setInvites(prev => prev.filter(i => i.id !== id));
          showAlert("success", "Invite revoked (Mock Offline).");
        } else {
          throw err;
        }
      }
    } catch (err) {
      showAlert("error", err.message || "Failed to revoke invite.");
    }
  };

  // ── Copy invite link ─────────────────────────────────────────────────────
  const handleCopyLink = (invite) => {
    const link = invite.link || `${window.location.origin}/join?token=${invite.token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // ── Format date ──────────────────────────────────────────────────────────
  const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  };

  const thStyle = {
    padding: "10px 14px", textAlign: "left", fontWeight: "600",
    color: "var(--text-secondary)", borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em",
  };
  const tdStyle = { padding: "10px 14px", fontSize: "13px", color: "var(--text-primary)", borderBottom: "1px solid rgba(255,255,255,0.04)" };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1100px" }}>
      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 className="h1-title" style={{ fontSize: "24px" }}>Team & Invites</h2>
        <p className="subtitle">Manage your organization members and invite links.</p>
      </div>

      <Alert type={alert?.type} message={alert?.text} onClose={() => setAlert(null)} />

      {/* Seat usage */}
      <div className="glass-panel" style={{ padding: "20px 24px", marginBottom: "20px" }}>
        <SeatBar used={seatsUsed} total={seatsTotal} onUpgrade={() => navigate("/app/billing")} />

        {/* Create invite form */}
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "14px" }}>
          Create Invite Link
        </h3>
        <form onSubmit={handleCreateInvite} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "5px" }}>Role</label>
            <select
              className="form-control"
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              style={{ appearance: "none" }}
            >
              <option value="employee">Employee</option>
              {(currentUser?.role === "admin" || currentUser?.role === "manager") && (
                <option value="manager">Manager</option>
              )}
              {currentUser?.role === "admin" && (
                <option value="admin">Admin</option>
              )}
            </select>
          </div>
          <div style={{ flex: "2 1 260px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "5px" }}>Email (optional)</label>
            <input
              type="email"
              className="form-control"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Restrict to specific email"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating || (seatsTotal > 0 && seatsUsed >= seatsTotal)}
            style={{ flexShrink: 0, opacity: creating ? 0.7 : 1 }}
          >
            {creating ? "Creating…" : "Generate Invite"}
          </button>
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

        {/* ── Members table ───────────────────────────────────────────────── */}
        <div className="glass-panel" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "14px" }}>
            Members
            <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--text-muted)", fontWeight: 400 }}>
              ({members.length})
            </span>
          </h3>
          {loading ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>Loading…</p>
          ) : members.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>No members found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                          {m.avatar ? (
                            <img src={m.avatar} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <div style={{
                              width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                              background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "11px", fontWeight: "700", color: "#fff",
                            }}>
                              {(m.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "500" }}>{m.name}</p>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}><RoleBadge role={m.role} /></td>
                      <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>{fmtDate(m.created_at || m.joinDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Invites table ───────────────────────────────────────────────── */}
        <div className="glass-panel" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "14px" }}>
            Invite Links
            <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--text-muted)", fontWeight: 400 }}>
              ({invites.length})
            </span>
          </h3>
          {loading ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>Loading…</p>
          ) : invites.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>No invites yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Expires</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => {
                    const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
                    const isUsed    = !!inv.used_at || inv.used;
                    return (
                      <tr key={inv.id}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={tdStyle}><RoleBadge role={inv.role} /></td>
                        <td style={{ ...tdStyle, color: "var(--text-secondary)", fontSize: "12px" }}>
                          {inv.email || <em style={{ color: "var(--text-muted)" }}>Any</em>}
                        </td>
                        <td style={{ ...tdStyle, color: isExpired ? "var(--danger)" : "var(--text-secondary)", fontSize: "12px" }}>
                          {fmtDate(inv.expires_at)}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600",
                            background: isUsed    ? "rgba(16,185,129,0.12)" :
                                        isExpired ? "rgba(239,68,68,0.12)"  : "rgba(245,158,11,0.12)",
                            color:      isUsed    ? "#34d399" :
                                        isExpired ? "#f87171"  : "#fbbf24",
                          }}>
                            {isUsed ? "Used" : isExpired ? "Expired" : "Active"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {!isUsed && !isExpired && (
                              <button
                                onClick={() => handleCopyLink(inv)}
                                title="Copy link"
                                style={{
                                  padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--glass-border)",
                                  background: copiedId === inv.id ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                                  color: copiedId === inv.id ? "#34d399" : "var(--text-secondary)",
                                  cursor: "pointer", fontSize: "11px", fontWeight: "600", transition: "all 0.15s",
                                }}
                              >
                                {copiedId === inv.id ? "✓ Copied" : "Copy"}
                              </button>
                            )}
                            {!isUsed && (
                              <button
                                onClick={() => handleRevoke(inv.id)}
                                title="Revoke invite"
                                style={{
                                  padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.3)",
                                  background: "rgba(239,68,68,0.07)", color: "#f87171",
                                  cursor: "pointer", fontSize: "11px", fontWeight: "600", transition: "all 0.15s",
                                }}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamView;
