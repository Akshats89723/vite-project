import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../api";

// ── Relative time helper ──────────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (secs  <  60) return "just now";
  if (mins  <  60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours <  24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days  <  30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

// ── Action badge ──────────────────────────────────────────────────────────────
const ACTION_STYLES = {
  login:          { bg: "rgba(59,130,246,0.15)",   color: "#60a5fa",  label: "Login"          },
  logout:         { bg: "rgba(107,114,128,0.12)",  color: "#9ca3af",  label: "Logout"         },
  create:         { bg: "rgba(16,185,129,0.15)",   color: "#34d399",  label: "Create"         },
  update:         { bg: "rgba(245,158,11,0.15)",   color: "#fbbf24",  label: "Update"         },
  delete:         { bg: "rgba(239,68,68,0.15)",    color: "#f87171",  label: "Delete"         },
  password_reset: { bg: "rgba(168,85,247,0.15)",   color: "#c084fc",  label: "Pwd Reset"      },
  invite_created: { bg: "rgba(168,85,247,0.12)",   color: "#a78bfa",  label: "Invite"         },
  invite_used:    { bg: "rgba(16,185,129,0.12)",   color: "#6ee7b7",  label: "Invite Used"    },
  register:       { bg: "rgba(16,185,129,0.15)",   color: "#34d399",  label: "Register"       },
};

function getActionStyle(action) {
  if (!action) return { bg: "rgba(255,255,255,0.07)", color: "var(--text-muted)", label: action || "—" };
  const key = action.toLowerCase().replace(/[\s-]/g, "_");
  return ACTION_STYLES[key] || { bg: "rgba(255,255,255,0.07)", color: "var(--text-secondary)", label: action };
}

function ActionBadge({ action }) {
  const s = getActionStyle(action);
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: "10px",
      fontSize: "11px", fontWeight: "600",
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function AuditLogView() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  const timerRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    setError(null);
    try {
      const data = await api.audit.list();
      const list = Array.isArray(data) ? data : data.logs || data.entries || [];
      setLogs(list);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || "Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + 30-second auto-refresh
  useEffect(() => {
    fetchLogs();
    timerRef.current = setInterval(fetchLogs, 30_000);
    return () => clearInterval(timerRef.current);
  }, [fetchLogs]);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = search.trim()
    ? logs.filter(l => {
        const q = search.toLowerCase();
        return (
          (l.user_name  || l.userName  || "").toLowerCase().includes(q) ||
          (l.action     || "").toLowerCase().includes(q) ||
          (l.entity     || "").toLowerCase().includes(q) ||
          (l.ip         || "").toLowerCase().includes(q)
        );
      })
    : logs;

  const thStyle = {
    padding: "10px 14px", textAlign: "left", fontWeight: "600",
    color: "var(--text-secondary)", borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em",
    position: "sticky", top: 0, background: "rgba(10,11,20,0.97)", zIndex: 1,
    whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "9px 14px", fontSize: "13px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  };

  return (
    <div className="animate-fade-in" style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "24px", color: "var(--text-primary)", margin: 0 }}>Audit Log</h2>
          <p className="subtitle" style={{ marginTop: "4px" }}>
            All recorded system events
            {lastRefresh && (
              <span style={{ marginLeft: "10px", color: "var(--text-muted)", fontSize: "11px" }}>
                · Auto-refreshes every 30s · Last updated {lastRefresh}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchLogs(); }}
          style={{
            padding: "8px 16px", borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: "14px 18px", borderRadius: "10px",
          background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
          color: "#f87171", fontSize: "13px", marginBottom: "16px",
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="glass-panel" style={{ padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by user, action, entity or IP…"
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            color: "var(--text-primary)", fontSize: "14px", fontFamily: "inherit",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px" }}
          >
            ×
          </button>
        )}
        <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {filtered.length} {search ? "matching" : "total"} event{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{
        flex: 1, borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(15,23,42,0.6)",
        overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--text-muted)", gap: "10px" }}>
            <span style={{ fontSize: "18px", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
            Loading audit log…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--text-muted)", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "32px" }}>🔍</span>
            <p style={{ fontSize: "14px" }}>{search ? "No matching events found." : "No audit events yet."}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 320px)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Entity</th>
                  <th style={thStyle}>Details</th>
                  <th style={thStyle}>IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const userName  = log.user_name  || log.userName  || log.user || "—";
                  const timestamp = log.created_at || log.timestamp || log.time;
                  const details   = typeof log.details === "object"
                    ? JSON.stringify(log.details)
                    : (log.details || "—");
                  return (
                    <tr
                      key={log.id || i}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <span
                          title={timestamp ? new Date(timestamp).toLocaleString() : ""}
                          style={{ color: "var(--text-secondary)", cursor: "default" }}
                        >
                          {relativeTime(timestamp)}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: "var(--text-primary)", fontWeight: 500 }}>
                        {userName}
                      </td>
                      <td style={tdStyle}>
                        <ActionBadge action={log.action} />
                      </td>
                      <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                        {log.entity || "—"}
                      </td>
                      <td style={{ ...tdStyle, color: "var(--text-muted)", maxWidth: "280px" }}>
                        <span title={details.length > 60 ? details : undefined}>
                          {details.length > 60 ? details.slice(0, 58) + "…" : details}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: "var(--text-muted)", fontFamily: "monospace", fontSize: "12px" }}>
                        {log.ip || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default AuditLogView;
