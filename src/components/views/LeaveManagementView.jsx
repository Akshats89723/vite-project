import React, { useState } from "react";

function LeaveManagementView({ leaves, onApproveLeave, onRejectLeave, onSubmitLeave }) {
  // Mock logged-in user balances (Evelyn Carter)
  const [userBalances, setUserBalances] = useState({
    annual: 12,
    sick: 8,
    casual: 5
  });

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [formData, setFormData] = useState({
    type: "Annual Leave",
    startDate: "",
    endDate: "",
    reason: ""
  });

  const handleApply = (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) return;

    // Calculate days diff
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const timeDiff = end.getTime() - start.getTime();
    let days = Math.round(timeDiff / (1000 * 3600 * 24)) + 1;
    if (days <= 0) days = 1;

    onSubmitLeave({
      id: `LR${String(leaves.length + 1).padStart(3, "0")}`,
      requester: "Evelyn Carter", // current user
      type: formData.type,
      startDate: formData.startDate,
      endDate: formData.endDate,
      days: days,
      status: "Pending",
      reason: formData.reason
    });

    setShowApplyModal(false);
    // Reset Form
    setFormData({
      type: "Annual Leave",
      startDate: "",
      endDate: "",
      reason: ""
    });
  };

  const getStatusBadge = (status) => {
    if (status === "Approved") return <span className="badge badge-success">✓ Approved</span>;
    if (status === "Rejected") return <span className="badge badge-danger">✕ Rejected</span>;
    return <span className="badge badge-warning">⏳ Pending</span>;
  };

  return (
    <div className="animate-fade-in">
      {/* Title Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Leave Manager</h2>
          <p className="subtitle">Log leave requests, preview allowances, and review team submittals.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
          ✍ Apply for Leave
        </button>
      </div>

      {/* Leave Balances Header Cards */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Annual Leaves</span>
            <span style={{ fontSize: "20px" }}>🏖️</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--text-primary)" }}>
            {userBalances.annual} <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-muted)" }}>/ 18 days left</span>
          </div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
            <div style={{ height: "100%", width: `${(userBalances.annual / 18) * 100}%`, background: "var(--accent-primary)", borderRadius: "2px" }}></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Sick Leaves</span>
            <span style={{ fontSize: "20px" }}>🤒</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--text-primary)" }}>
            {userBalances.sick} <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-muted)" }}>/ 12 days left</span>
          </div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
            <div style={{ height: "100%", width: `${(userBalances.sick / 12) * 100}%`, background: "var(--success)", borderRadius: "2px" }}></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Casual Leaves</span>
            <span style={{ fontSize: "20px" }}>⛺</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--text-primary)" }}>
            {userBalances.casual} <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-muted)" }}>/ 6 days left</span>
          </div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
            <div style={{ height: "100%", width: `${(userBalances.casual / 6) * 100}%`, background: "var(--warning)", borderRadius: "2px" }}></div>
          </div>
        </div>
      </div>

      {/* Grid: Request Approval vs General Logs */}
      <div className="dashboard-grid">
        
        {/* Left Side: Pending requests reviewer (Supervisor Dashboard) */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "16px" }}>
            Team Approvals Reviewer
          </h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {leaves.filter(l => l.status === "Pending").map((req) => (
              <div key={req.id} className="glass-panel" style={{ padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <h5 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{req.requester}</h5>
                    <p style={{ fontSize: "11px", color: "var(--accent-primary)", marginTop: "2px" }}>{req.type} • {req.days} days</p>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{req.startDate} to {req.endDate}</span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.45" }}>
                  <em>"{req.reason}"</em>
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                  <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px", borderColor: "var(--danger)", color: "#f87171" }} onClick={() => onRejectLeave(req.id)}>
                    Deny
                  </button>
                  <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "12px" }} onClick={() => onApproveLeave(req.id)}>
                    Approve
                  </button>
                </div>
              </div>
            ))}

            {leaves.filter(l => l.status === "Pending").length === 0 && (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0" }}>
                🎉 Great job! No pending submittals require your action.
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Simple Calendar Logs tracker */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "16px" }}>
            Corporate Absence Logs
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
            {leaves.map((req) => (
              <div key={req.id} style={{
                padding: "10px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{req.requester}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{req.type} ({req.days}d)</div>
                </div>
                <div>{getStatusBadge(req.status)}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Apply Leave Modal Form */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "18px", color: "var(--text-primary)", marginBottom: "16px" }}>Apply for Leave</h3>
            
            <form onSubmit={handleApply}>
              
              <div className="form-group">
                <label>Leave Category</label>
                <select
                  className="form-control"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Annual Leave">Annual Leave (18 days limit)</option>
                  <option value="Sick Leave">Sick Leave (12 days limit)</option>
                  <option value="Casual Leave">Casual Leave (6 days limit)</option>
                </select>
              </div>

              <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label>Start Date *</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label>End Date *</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reason / Cover Plan *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Travel arrangements or sick cover plans"
                  className="form-control"
                  style={{ resize: "none" }}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                ></textarea>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default LeaveManagementView;
