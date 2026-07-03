import React from "react";
import { announcements } from "../../mockData";

function DashboardView({ employees, leaves, candidates, setTab, clockStatus }) {
  const employeeCount = employees.length;
  const onLeaveCount = employees.filter(e => e.status === "On Leave").length;
  const pendingLeavesCount = leaves.filter(l => l.status === "Pending").length;
  const openJobsCount = 4; // Mock openings count

  // Custom SVG Chart Data (Weekly Attendance percent: Mon: 94%, Tue: 97%, Wed: 98%, Thu: 96%, Fri: 92%)
  const chartPoints = [
    { day: "Mon", val: 94 },
    { day: "Tue", val: 97 },
    { day: "Wed", val: 98 },
    { day: "Thu", val: 96 },
    { day: "Fri", val: 92 }
  ];

  // SVG Chart sizing & coordinates
  const width = 500;
  const height = 150;
  const paddingX = 40;
  const paddingY = 20;

  // Map data to coordinates
  const coords = chartPoints.map((pt, index) => {
    const x = paddingX + (index * (width - 2 * paddingX)) / (chartPoints.length - 1);
    // scale 80-100% to graph height
    const yTarget = height - paddingY - ((pt.val - 80) * (height - 2 * paddingY)) / 20;
    return { x, y: yTarget, day: pt.day, val: pt.val };
  });

  const pathD = coords.reduce((acc, crd, index) => {
    return index === 0 ? `M ${crd.x} ${crd.y}` : `${acc} L ${crd.x} ${crd.y}`;
  }, "");

  const areaD = coords.reduce((acc, crd, index) => {
    if (index === 0) return `M ${crd.x} ${crd.y}`;
    if (index === coords.length - 1) {
      return `${acc} L ${crd.x} ${crd.y} L ${crd.x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;
    }
    return `${acc} L ${crd.x} ${crd.y}`;
  }, "");

  return (
    <div className="animate-fade-in">
      {/* Title */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Dashboard</h2>
        <p className="subtitle">Real-time indicators and operational summary of your workplace.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
            👥
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Workforce</div>
            <div className="stat-value">{employeeCount}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
            🌴
          </div>
          <div className="stat-info">
            <div className="stat-label">On Leave Today</div>
            <div className="stat-value">{onLeaveCount}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: "rgba(236, 72, 153, 0.15)", color: "#f472b6" }}>
            💼
          </div>
          <div className="stat-info">
            <div className="stat-label">Active Job Openings</div>
            <div className="stat-value">{openJobsCount}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
            📬
          </div>
          <div className="stat-info">
            <div className="stat-label">Pending Approvals</div>
            <div className="stat-value">{pendingLeavesCount}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Visuals & Feed */}
      <div className="dashboard-grid">
        
        {/* Left Side: Analytics Graph & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Chart Panel */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h4 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "var(--text-primary)" }}>
              Weekly Attendance Analysis
            </h4>
            <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
              <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", minWidth: "350px" }}>
                {/* Horizontal Guide lines */}
                <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <line x1={paddingX} y1={height/2} x2={width - paddingX} y2={height/2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.1)" />

                {/* Y-axis values */}
                <text x={paddingX - 10} y={paddingY + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">100%</text>
                <text x={paddingX - 10} y={height/2 + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">90%</text>
                <text x={paddingX - 10} y={height - paddingY + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">80%</text>

                {/* Shaded Area */}
                <path d={areaD} fill="url(#grad)" opacity="0.15" />

                {/* Line Path */}
                <path d={pathD} fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" />

                {/* Linear Gradient definition */}
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-primary)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>

                {/* Circle Dots & Value tags */}
                {coords.map((crd, idx) => (
                  <g key={idx}>
                    <circle cx={crd.x} cy={crd.y} r="5" fill="var(--accent-secondary)" stroke="var(--bg-dark)" strokeWidth="2" />
                    <text x={crd.x} y={crd.y - 10} fill="var(--text-primary)" fontSize="9" textAnchor="middle" fontWeight="bold">
                      {crd.val}%
                    </text>
                    <text x={crd.x} y={height - paddingY + 14} fill="var(--text-secondary)" fontSize="10" textAnchor="middle">
                      {crd.day}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h4 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "var(--text-primary)" }}>
              Quick Workflows
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <div 
                className="glass-panel" 
                style={{ padding: "16px", cursor: "pointer", transition: "var(--transition-fast)", border: "1px solid rgba(255,255,255,0.05)" }}
                onClick={() => setTab("leaves")}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}
              >
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>📅</div>
                <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)" }}>Apply for Leave</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>File a sick or annual request</div>
              </div>

              <div 
                className="glass-panel" 
                style={{ padding: "16px", cursor: "pointer", transition: "var(--transition-fast)", border: "1px solid rgba(255,255,255,0.05)" }}
                onClick={() => setTab("employees")}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}
              >
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>📂</div>
                <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)" }}>Team Members</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Browse directories & profiles</div>
              </div>

              <div 
                className="glass-panel" 
                style={{ padding: "16px", cursor: "pointer", transition: "var(--transition-fast)", border: "1px solid rgba(255,255,255,0.05)" }}
                onClick={() => setTab("policies")}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}
              >
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>📚</div>
                <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)" }}>Corporate Handbook</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Read alignment and benefits FAQ</div>
              </div>

              <div 
                className="glass-panel" 
                style={{ padding: "16px", cursor: "pointer", transition: "var(--transition-fast)", border: "1px solid rgba(255,255,255,0.05)" }}
                onClick={() => setTab("chatbot")}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}
              >
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>💬</div>
                <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)" }}>Ask AI Assistant</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Draft leaves and clear checklist issues</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Announcements Feed & Schedule status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Clock In Alert Indicator */}
          <div className="glass-panel" style={{
            padding: "20px",
            background: clockStatus.isClockedIn ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
            border: clockStatus.isClockedIn ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(245, 158, 11, 0.2)"
          }}>
            <h4 style={{ fontSize: "15px", fontWeight: "600", color: varNameColor(clockStatus.isClockedIn) }}>
              {clockStatus.isClockedIn ? "✓ Signed In" : "⚠ Not Signed In"}
            </h4>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px", lineHeight: "1.4" }}>
              {clockStatus.isClockedIn 
                ? `You clocked in at ${clockStatus.time}. Have a productive day at PeopleCore!`
                : "Remember to tap the 'Clock In' button in the corporate header bar to log your hours for today."}
            </p>
          </div>

          {/* Announcements Feed */}
          <div className="glass-panel" style={{ padding: "20px", flex: 1 }}>
            <h4 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "var(--text-primary)" }}>
              Broadcast Announcements
            </h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {announcements.map((item) => (
                <div key={item.id} style={{
                  padding: "12px",
                  borderLeft: `3px solid var(--${item.type})`,
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "4px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{item.title}</span>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{item.date}</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4" }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// Utility to switch color values
function varNameColor(isClocked) {
  return isClocked ? "#34d399" : "#fbbf24";
}

export default DashboardView;
