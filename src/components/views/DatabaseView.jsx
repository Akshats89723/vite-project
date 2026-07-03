import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";

const TABLE_META = {
  employees:     { icon: "👥", label: "Employees",     color: "#c084fc" },
  leaves:        { icon: "🌴", label: "Leaves",         color: "#34d399" },
  candidates:    { icon: "💼", label: "Candidates",     color: "#60a5fa" },
  chat_messages: { icon: "💬", label: "Chat Messages",  color: "#fb923c" },
};

function Badge({ children, color }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: "600",
      background: `${color}20`,
      color,
      border: `1px solid ${color}40`,
    }}>
      {children}
    </span>
  );
}

function TableGrid({ cols, rows }) {
  if (!cols.length) return <p style={{ color: "var(--text-muted)", padding: "20px", textAlign: "center" }}>Table is empty.</p>;

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "480px" }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "12.5px",
        color: "var(--text-primary)",
      }}>
        <thead>
          <tr style={{ position: "sticky", top: 0, background: "rgba(10,11,20,0.95)", zIndex: 1 }}>
            {cols.map(col => (
              <th key={col} style={{
                padding: "10px 14px",
                textAlign: "left",
                fontWeight: "600",
                color: "var(--text-secondary)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                whiteSpace: "nowrap",
                letterSpacing: "0.03em",
                fontSize: "11px",
                textTransform: "uppercase",
              }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {cols.map(col => {
                const val = row[col];
                const str = val === null || val === undefined ? "" : String(val);

                // Smart cell rendering
                let cell;
                if (col === "status" || col === "stage") {
                  const colorMap = {
                    Active: "#34d399", "On Leave": "#fb923c",
                    Pending: "#fbbf24", Approved: "#34d399", Rejected: "#f87171",
                    Applied: "#60a5fa", Screened: "#c084fc", Interviewing: "#fb923c", Offered: "#34d399",
                    user: "#60a5fa", bot: "#c084fc",
                  };
                  cell = <Badge color={colorMap[str] || "var(--text-muted)"}>{str || "—"}</Badge>;
                } else if (col === "avatar") {
                  cell = str
                    ? <img src={str} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", verticalAlign: "middle" }} />
                    : <span style={{ color: "var(--text-muted)" }}>—</span>;
                } else if (str.length > 60) {
                  cell = <span title={str} style={{ color: "var(--text-secondary)" }}>{str.slice(0, 58)}…</span>;
                } else {
                  cell = <span style={{ color: str ? "var(--text-primary)" : "var(--text-muted)" }}>{str || "—"}</span>;
                }

                return (
                  <td key={col} style={{ padding: "9px 14px", whiteSpace: "nowrap" }}>
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const MOCK_DB = {
  employees: {
    cols: ["id", "name", "email", "role", "department", "status", "performance_rating", "join_date"],
    rows: [
      { id: 1, name: "Evelyn Carter", email: "evelyn@company.com", role: "admin", department: "HR & Operations", status: "Active", performance_rating: 5, join_date: "2026-06-01" },
      { id: 2, name: "James Wilson", email: "james@company.com", role: "employee", department: "Engineering", status: "Active", performance_rating: 4, join_date: "2026-06-15" }
    ]
  },
  leaves: {
    cols: ["id", "user_id", "leave_type", "start_date", "end_date", "status", "reason"],
    rows: [
      { id: 10, user_id: 2, leave_type: "Casual", start_date: "2026-07-10", end_date: "2026-07-12", status: "Approved", reason: "Family event" }
    ]
  },
  candidates: {
    cols: ["id", "name", "email", "role", "score", "stage"],
    rows: [
      { id: "CAN001", name: "Robert Downey", email: "robert@rdj.com", role: "React Developer", score: 95, stage: "Interviewing" },
      { id: "CAN002", name: "Scarlett Johansson", email: "scarlett@avengers.org", role: "UX Designer", score: 92, stage: "Offered" }
    ]
  },
  chat_messages: {
    cols: ["id", "session_id", "sender", "text", "created_at"],
    rows: [
      { id: 201, session_id: "default", sender: "user", text: "What is WFH policy?", created_at: "2026-07-01 10:00:00" },
      { id: 202, session_id: "default", sender: "bot", text: "Hybrid model up to 3 days per week.", created_at: "2026-07-01 10:00:02" }
    ]
  },
  attendance_logs: {
    cols: ["id", "user_name", "date", "clock_in", "clock_out", "status", "notes"],
    rows: [
      { id: 301, user_name: "Evelyn Carter", date: "2026-07-01", clock_in: "09:02:15", clock_out: "18:05:12", status: "In-Office", notes: "Regular office hours" },
      { id: 302, user_name: "James Wilson", date: "2026-07-01", clock_in: "08:45:00", clock_out: "17:30:20", status: "Remote", notes: "Working from home" }
    ]
  }
};

function DatabaseView() {
  const [tables, setTables]       = useState([]);
  const [activeTable, setActiveTable] = useState(null);
  const [tableData, setTableData] = useState({ cols: [], rows: [] });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState("");
  const [rowCounts, setRowCounts] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);

  const isMockSession = (() => {
    const t = localStorage.getItem("pc_token");
    return t && t.startsWith("mock_token_");
  })();

  const loadTables = useCallback(async () => {
    if (isMockSession) {
      const mockList = Object.keys(MOCK_DB);
      setTables(mockList);
      const counts = {};
      mockList.forEach(name => {
        counts[name] = MOCK_DB[name].rows.length;
      });
      setRowCounts(counts);
      if (!activeTable && mockList.length) setActiveTable(mockList[0]);
      return;
    }

    try {
      const t = await api.db.tables();
      setTables(t);

      // Fetch row counts for all tables in parallel
      const counts = {};
      await Promise.all(t.map(async name => {
        try {
          const d = await api.db.query(name);
          counts[name] = d.rows.length;
        } catch { counts[name] = "?"; }
      }));
      setRowCounts(counts);

      if (!activeTable && t.length) setActiveTable(t[0]);
    } catch {
      const mockList = Object.keys(MOCK_DB);
      setTables(mockList);
      const counts = {};
      mockList.forEach(name => {
        counts[name] = MOCK_DB[name].rows.length;
      });
      setRowCounts(counts);
      if (!activeTable && mockList.length) setActiveTable(mockList[0]);
    }
  }, [activeTable, isMockSession]);

  const loadTable = useCallback(async (name) => {
    setLoading(true);
    setSearch("");
    setError(null);

    if (isMockSession) {
      setTableData(MOCK_DB[name] || { cols: [], rows: [] });
      setLastRefresh(new Date().toLocaleTimeString() + " (Mock)");
      setLoading(false);
      return;
    }

    try {
      const data = await api.db.query(name);
      setTableData(data);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      const isNetwork = e.message === "Failed to fetch" || e.message.includes("fetch") || e.message.includes("NetworkError");
      if (isNetwork) {
        setTableData(MOCK_DB[name] || { cols: [], rows: [] });
        setLastRefresh(new Date().toLocaleTimeString() + " (Mock)");
      } else {
        setError(e.message);
        setTableData({ cols: [], rows: [] });
      }
    }
    setLoading(false);
  }, [isMockSession]);

  useEffect(() => { loadTables(); }, [loadTables]);

  useEffect(() => {
    if (activeTable) loadTable(activeTable);
  }, [activeTable, loadTable]);

  const filteredRows = search
    ? tableData.rows.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
      )
    : tableData.rows;

  const meta = TABLE_META[activeTable] || { icon: "🗄", label: activeTable, color: "#94a3b8" };

  return (
    <div className="animate-fade-in" style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "24px", color: "var(--text-primary)", margin: 0 }}>Database Viewer</h2>
          <p className="subtitle" style={{ marginTop: "4px" }}>
            Live SQLite browser — <code style={{ fontSize: "11px", background: "rgba(255,255,255,0.07)", padding: "1px 6px", borderRadius: "4px" }}>server/hrdata.sqlite</code>
            {lastRefresh && <span style={{ marginLeft: "10px", color: "var(--text-muted)", fontSize: "11px" }}>Updated {lastRefresh}</span>}
          </p>
        </div>
        <button
          onClick={() => { loadTables(); if (activeTable) loadTable(activeTable); }}
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

      {error && (
        <div style={{
          padding: "14px 18px", borderRadius: "10px",
          background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
          color: "#f87171", fontSize: "13px", marginBottom: "16px"
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>

        {/* Sidebar — table list */}
        <div style={{
          width: "200px", flexShrink: 0,
          display: "flex", flexDirection: "column", gap: "6px"
        }}>
          <p style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "6px" }}>
            Tables ({tables.length})
          </p>
          {tables.map(name => {
            const m = TABLE_META[name] || { icon: "🗄", label: name, color: "#94a3b8" };
            const isActive = activeTable === name;
            return (
              <button
                key={name}
                onClick={() => setActiveTable(name)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none",
                  cursor: "pointer", textAlign: "left", fontSize: "13px",
                  background: isActive ? `${m.color}18` : "rgba(255,255,255,0.03)",
                  color: isActive ? m.color : "var(--text-secondary)",
                  borderLeft: isActive ? `3px solid ${m.color}` : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span>{m.icon}</span>
                  <span style={{ fontWeight: isActive ? 600 : 400 }}>{m.label}</span>
                </span>
                {rowCounts[name] !== undefined && (
                  <span style={{
                    fontSize: "10px", fontWeight: "700",
                    padding: "1px 6px", borderRadius: "10px",
                    background: isActive ? `${m.color}30` : "rgba(255,255,255,0.07)",
                    color: isActive ? m.color : "var(--text-muted)",
                  }}>
                    {rowCounts[name]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main table panel */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Table header bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 16px", borderRadius: "10px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)"
          }}>
            <span style={{ fontSize: "20px" }}>{meta.icon}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: "600", color: meta.color, fontSize: "15px" }}>{meta.label}</span>
              <span style={{ color: "var(--text-muted)", fontSize: "12px", marginLeft: "10px" }}>
                {filteredRows.length} {search ? "matching" : "total"} rows
                {tableData.cols.length > 0 && ` · ${tableData.cols.length} columns`}
              </span>
            </div>
            {/* Search */}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter rows..."
              style={{
                padding: "7px 12px", borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "white", fontSize: "12px", outline: "none", width: "180px"
              }}
            />
          </div>

          {/* Table content */}
          <div style={{
            flex: 1, borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(15,23,42,0.6)",
            overflow: "hidden"
          }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--text-muted)", gap: "10px" }}>
                <span style={{ fontSize: "18px", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                Loading...
              </div>
            ) : (
              <TableGrid cols={tableData.cols} rows={filteredRows} />
            )}
          </div>

          {/* Column pills */}
          {tableData.cols.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {tableData.cols.map(col => (
                <span key={col} style={{
                  padding: "3px 10px", borderRadius: "12px", fontSize: "11px",
                  background: "rgba(255,255,255,0.05)", color: "var(--text-muted)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  {col}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default DatabaseView;
