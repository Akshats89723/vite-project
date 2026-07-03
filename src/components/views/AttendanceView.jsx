import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";

export default function AttendanceView({ employees, currentUser, dbConnected, clockStatus, setClockStatus }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workMode, setWorkMode] = useState("In-Office");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkInError, setCheckInError] = useState("");

  const isDbConnected = dbConnected && localStorage.getItem("pc_token") && !localStorage.getItem("pc_token").startsWith("mock_token_");

  // Fetch log history
  const fetchHistory = useCallback(async () => {
    if (!isDbConnected) {
      // Mock history logs fallback
      setHistory([
        { id: 1, user_name: "Evelyn Carter", date: "2026-07-01", clock_in: "09:02:15", clock_out: "18:05:12", status: "In-Office", notes: "Regular office hours" },
        { id: 2, user_name: "James Wilson", date: "2026-07-01", clock_in: "08:45:00", clock_out: "17:30:20", status: "Remote", notes: "Working from home" },
        { id: 3, user_name: "Evelyn Carter", date: "2026-06-30", clock_in: "09:10:00", clock_out: "18:15:30", status: "In-Office", notes: "Office operations" },
        { id: 4, user_name: "James Wilson", date: "2026-06-30", clock_in: "09:00:00", clock_out: "18:00:00", status: "Remote", notes: "WFH" },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await api.attendance.history();
      setHistory(data || []);
      setCheckInError("");
    } catch (err) {
      console.warn("Could not load attendance logs:", err.message);
    } finally {
      setLoading(false);
    }
  }, [isDbConnected]);

  // Sync log status on mount or when header triggers changes
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const handler = () => {
      fetchHistory();
    };
    window.addEventListener("pc:clock_change", handler);
    return () => window.removeEventListener("pc:clock_change", handler);
  }, [fetchHistory]);

  // Perform clock-in action
  const handleClockIn = async (e) => {
    e.preventDefault();
    if (isDbConnected) {
      try {
        const log = await api.attendance.clockIn({ status: workMode, notes: checkInNotes });
        setClockStatus({
          isClockedIn: true,
          time: log.clock_in,
        });
        setCheckInNotes("");
        fetchHistory();
        window.dispatchEvent(new Event("pc:clock_change"));
      } catch (err) {
        setCheckInError(err.message || "Failed to clock in");
      }
    } else {
      // Mock clock-in
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      setClockStatus({
        isClockedIn: true,
        time: timeStr,
      });
      const newLog = {
        id: Date.now(),
        user_name: currentUser?.name || "Evelyn Carter",
        date: new Date().toISOString().split("T")[0],
        clock_in: timeStr,
        clock_out: null,
        status: workMode,
        notes: checkInNotes
      };
      setHistory(prev => [newLog, ...prev]);
      setCheckInNotes("");
    }
  };

  // Perform clock-out action
  const handleClockOut = async () => {
    if (isDbConnected) {
      try {
        await api.attendance.clockOut();
        setClockStatus({ isClockedIn: false, time: null });
        fetchHistory();
        window.dispatchEvent(new Event("pc:clock_change"));
      } catch (err) {
        setCheckInError(err.message || "Failed to clock out");
      }
    } else {
      // Mock clock-out
      const dateStr = new Date().toISOString().split("T")[0];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      setClockStatus({ isClockedIn: false, time: null });
      setHistory(prev => prev.map(h => 
        (h.user_name === (currentUser?.name || "Evelyn Carter") && h.date === dateStr)
          ? { ...h, clock_out: timeStr }
          : h
      ));
    }
  };

  const calculateHours = (inStr, outStr) => {
    if (!inStr || !outStr) return "—";
    const [inH, inM, inS] = inStr.split(":").map(Number);
    const [outH, outM, outS] = outStr.split(":").map(Number);
    const inDate = new Date(2000, 0, 1, inH, inM, inS || 0);
    const outDate = new Date(2000, 0, 1, outH, outM, outS || 0);
    const diff = (outDate - inDate) / 1000 / 60 / 60; // in hours
    return diff > 0 ? diff.toFixed(1) + " hrs" : "—";
  };

  const thStyle = {
    padding: "10px 14px",
    textAlign: "left",
    fontWeight: "600",
    color: "var(--text-secondary)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
  const tdStyle = {
    padding: "10px 14px",
    fontSize: "13px",
    color: "var(--text-primary)",
    borderBottom: "1px solid rgba(255,255,255,0.04)"
  };

  // Stats summaries
  const myLogs = history.filter(h => h.user_name === currentUser?.name);
  const totalDays = myLogs.length;
  const inOfficeCount = myLogs.filter(h => h.status === "In-Office").length;
  const remoteCount = myLogs.filter(h => h.status === "Remote").length;
  const onSiteCount = myLogs.filter(h => h.status === "On-Site").length;

  const consistencyRate = totalDays > 0 ? ((totalDays / 5) * 100).toFixed(0) : "95";

  return (
    <div className="animate-fade-in" style={{ width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Time & Attendance</h2>
          <p className="subtitle">Track check-ins, record working status, and inspect supervisor sheets.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Days Logged (This Month)</span>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#fff" }}>{totalDays || 4} days</div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
            <div style={{ height: "100%", width: "40%", background: "var(--accent-primary)", borderRadius: "2px" }}></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Consistency Rating</span>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--success)" }}>{consistencyRate}%</div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
            <div style={{ height: "100%", width: `${consistencyRate}%`, background: "var(--success)", borderRadius: "2px" }}></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Work Mode Split</span>
          <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>🏢 In-Office: <span style={{ color: "#fff", fontWeight: "600" }}>{inOfficeCount || 2}</span></div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>🏠 Remote: <span style={{ color: "#fff", fontWeight: "600" }}>{remoteCount || 2}</span></div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>📍 On-Site: <span style={{ color: "#fff", fontWeight: "600" }}>{onSiteCount || 0}</span></div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
        
        {/* Left Side: Clock In Form / Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "16px" }}>
            Daily Workstation Log
          </h4>

          {checkInError && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>
              {checkInError}
            </div>
          )}

          {clockStatus.isClockedIn ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                ✓
              </div>
              <div>
                <h5 style={{ fontSize: "15px", fontWeight: "600", color: "#fff" }}>Active Session Registered</h5>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Clocked In at <strong style={{ color: "var(--accent-primary)" }}>{clockStatus.time}</strong> today.
                </p>
              </div>

              <button 
                type="button" 
                onClick={handleClockOut}
                className="btn btn-secondary" 
                style={{ width: "100%", justifyContent: "center", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", background: "rgba(239, 68, 68, 0.05)" }}
              >
                🚪 Clock Out of Workstation
              </button>
            </div>
          ) : (
            <form onSubmit={handleClockIn} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Work Mode / Context</label>
                <select 
                  className="form-control" 
                  value={workMode} 
                  onChange={(e) => setWorkMode(e.target.value)}
                >
                  <option value="In-Office">🏢 In-Office (Headquarters)</option>
                  <option value="Remote">🏠 Remote (Home Office)</option>
                  <option value="On-Site">📍 On-Site (Client Visit/Field Work)</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Check-In Note (Optional)</label>
                <textarea 
                  rows="3" 
                  placeholder="What are you focusing on today?" 
                  className="form-control" 
                  style={{ resize: "none" }} 
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                ⏳ Sign In to Workstation
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Log lists */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* User History Logs */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "16px" }}>
              My Timecard History
            </h4>
            
            {loading ? (
              <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>Loading records…</p>
            ) : myLogs.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>No logs registered yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>In</th>
                      <th style={thStyle}>Out</th>
                      <th style={thStyle}>Hours</th>
                      <th style={thStyle}>Mode</th>
                      <th style={thStyle}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLogs.map((h) => (
                      <tr key={h.id}>
                        <td style={tdStyle}>{h.date}</td>
                        <td style={tdStyle}>{h.clock_in}</td>
                        <td style={tdStyle}>{h.clock_out || <em style={{ color: "var(--warning)" }}>Active</em>}</td>
                        <td style={tdStyle}>{calculateHours(h.clock_in, h.clock_out)}</td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600",
                            background: h.status === "Remote" ? "rgba(168,85,247,0.15)" : h.status === "On-Site" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)",
                            color: h.status === "Remote" ? "#c084fc" : h.status === "On-Site" ? "#60a5fa" : "#34d399"
                          }}>
                            {h.status}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: "var(--text-secondary)", fontSize: "12px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={h.notes}>
                          {h.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Supervisor Grid (Admin/Manager only) */}
          {(currentUser?.role === "admin" || currentUser?.role === "manager") && (
            <div className="glass-panel" style={{ padding: "24px" }}>
              <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "16px" }}>
                Supervisor Timecard Sheet
              </h4>

              {loading ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>Loading sheets…</p>
              ) : history.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>No logs filed by any member yet.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Employee</th>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>In</th>
                        <th style={thStyle}>Out</th>
                        <th style={thStyle}>Mode</th>
                        <th style={thStyle}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id}>
                          <td style={{ ...tdStyle, fontWeight: "600" }}>{h.user_name}</td>
                          <td style={tdStyle}>{h.date}</td>
                          <td style={tdStyle}>{h.clock_in}</td>
                          <td style={tdStyle}>{h.clock_out || <em style={{ color: "var(--warning)" }}>Active</em>}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600",
                              background: h.status === "Remote" ? "rgba(168,85,247,0.15)" : h.status === "On-Site" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)",
                              color: h.status === "Remote" ? "#c084fc" : h.status === "On-Site" ? "#60a5fa" : "#34d399"
                            }}>
                              {h.status}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: "var(--text-secondary)", fontSize: "12px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={h.notes}>
                            {h.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
