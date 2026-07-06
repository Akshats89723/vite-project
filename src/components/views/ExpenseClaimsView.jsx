import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";

// ── Role badge ────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    approved: { bg: "rgba(16,185,129,0.12)", color: "#34d399" },
    rejected: { bg: "rgba(239,68,68,0.12)",  color: "#f87171" },
    pending:  { bg: "rgba(245,158,11,0.12)",  color: "#fbbf24" },
  };
  const s = map[status?.toLowerCase()] || { bg: "rgba(255,255,255,0.07)", color: "var(--text-muted)" };
  return (
    <span style={{
      padding: "3px 9px", borderRadius: "10px", fontSize: "11px", fontWeight: "600",
      textTransform: "capitalize", background: s.bg, color: s.color,
    }}>
      {status || "Pending"}
    </span>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ title, amount, icon, color }) {
  return (
    <div className="glass-panel" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", flex: "1 1 200px" }}>
      <div style={{
        width: "42px", height: "42px", borderRadius: "8px",
        background: `rgba(${color}, 0.12)`, color: `rgb(${color})`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px"
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</p>
        <h4 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", marginTop: "4px" }}>
          ${parseFloat(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h4>
      </div>
    </div>
  );
}

function ExpenseClaimsView({ currentUser, dbConnected }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my-claims"); // "my-claims" | "approvals"

  // Form State
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Travel");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const isManagerOrAdmin = ["admin", "manager"].includes(currentUser?.role);

  // ── Fetch Claims ─────────────────────────────────────────────────────────
  const fetchClaims = useCallback(async () => {
    try {
      if (dbConnected) {
        const data = await api.expenses.list();
        setClaims(data);
      } else {
        // Fallback mock data in offline/mock mode
        const mockClaims = [
          { id: 1, requester: "Liam Foster", amount: 150.00, category: "Meals", date: "2026-07-01", status: "Approved", notes: "Client dinner at Bistro" },
          { id: 2, requester: "Evelyn Carter", amount: 1200.00, category: "Hardware", date: "2026-07-03", status: "Pending", notes: "External 4K Monitor upgrade" },
          { id: 3, requester: "Liam Foster", amount: 45.50, category: "Travel", date: "2026-07-05", status: "Pending", notes: "Uber ride to client office" }
        ];
        setClaims(mockClaims);
      }
    } catch (err) {
      console.error("Failed to fetch expense claims:", err);
    } finally {
      setLoading(false);
    }
  }, [dbConnected]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // ── Submit Claim ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Please enter a valid positive amount.");
      return;
    }

    setSubmitting(true);
    try {
      const claimBody = {
        amount: parsedAmount,
        category,
        date,
        notes: notes.trim() || undefined
      };

      if (dbConnected) {
        const newClaim = await api.expenses.create(claimBody);
        setClaims(prev => [newClaim, ...prev]);
      } else {
        const mockNew = {
          id: Date.now(),
          requester: currentUser?.name || "Evelyn Carter",
          amount: parsedAmount,
          category,
          date,
          status: "Pending",
          notes: notes.trim() || "No notes"
        };
        setClaims(prev => [mockNew, ...prev]);
      }

      // Reset Form
      setAmount("");
      setCategory("Travel");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    } catch (err) {
      setFormError(err.message || "Failed to submit claim.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Approve/Reject Claim ──────────────────────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    try {
      if (dbConnected) {
        const updated = await api.expenses.setStatus(id, newStatus);
        setClaims(prev => prev.map(c => c.id === id ? updated : c));
      } else {
        setClaims(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  // ── Metrics calculations ──────────────────────────────────────────────────
  const filteredClaims = activeTab === "approvals"
    ? claims.filter(c => c.status === "Pending")
    : claims.filter(c => c.requester === currentUser?.name);

  const totalClaimed = claims.reduce((s, c) => s + c.amount, 0);
  const totalApproved = claims.filter(c => c.status === "Approved").reduce((s, c) => s + c.amount, 0);
  const totalPending = claims.filter(c => c.status === "Pending").reduce((s, c) => s + c.amount, 0);

  const thStyle = {
    padding: "10px 14px", textAlign: "left", fontWeight: "600",
    color: "var(--text-secondary)", borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em",
  };
  const tdStyle = { padding: "10px 14px", fontSize: "13px", color: "var(--text-primary)", borderBottom: "1px solid rgba(255,255,255,0.04)" };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1100px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 className="h1-title" style={{ fontSize: "24px" }}>Expense & Travel Claims</h2>
        <p className="subtitle">Submit business expense reimbursements and track reviews.</p>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        <SummaryCard title="Total Submitted" amount={totalClaimed} icon="🧾" color="124, 58, 237" />
        <SummaryCard title="Total Approved" amount={totalApproved} icon="✅" color="16, 185, 129" />
        <SummaryCard title="Pending Review" amount={totalPending} icon="⏳" color="245, 158, 11" />
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "20px", alignItems: "start" }}>
        
        {/* Form Panel */}
        <div className="glass-panel" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "16px" }}>
            File Reimbursement Claim
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "5px" }}>Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 75.50"
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "5px" }}>Category</label>
              <select
                className="form-control"
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ appearance: "none" }}
              >
                <option value="Travel">✈️ Travel & Lodging</option>
                <option value="Meals">🍽️ Meals & Entertainment</option>
                <option value="Hardware">💻 Hardware & Equipment</option>
                <option value="Software">🔌 Software Subscriptions</option>
                <option value="L&D">📚 Learning & Development</option>
                <option value="Other">🏷️ Other</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "5px" }}>Date of Expense</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "5px" }}>Description / Purpose</label>
              <textarea
                className="form-control"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Explain what the expense covers..."
                rows="3"
                style={{ resize: "none" }}
              />
            </div>

            {formError && (
              <p style={{ color: "var(--danger)", fontSize: "12px", marginBottom: "12px" }}>⚠️ {formError}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: "100%", opacity: submitting ? 0.75 : 1 }}
            >
              {submitting ? "Submitting Claim..." : "Submit Claim"}
            </button>
          </form>
        </div>

        {/* List Panel */}
        <div className="glass-panel" style={{ padding: "20px 24px" }}>
          
          {/* Tabs header */}
          <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
            <button
              onClick={() => setActiveTab("my-claims")}
              style={{
                background: "none", border: "none", padding: "10px 4px", fontSize: "13px",
                color: activeTab === "my-claims" ? "#c084fc" : "var(--text-muted)",
                borderBottom: activeTab === "my-claims" ? "2px solid var(--accent-primary)" : "none",
                fontWeight: activeTab === "my-claims" ? "600" : "400", cursor: "pointer"
              }}
            >
              📁 My Claims
            </button>
            {isManagerOrAdmin && (
              <button
                onClick={() => setActiveTab("approvals")}
                style={{
                  background: "none", border: "none", padding: "10px 4px", fontSize: "13px",
                  color: activeTab === "approvals" ? "#c084fc" : "var(--text-muted)",
                  borderBottom: activeTab === "approvals" ? "2px solid var(--accent-primary)" : "none",
                  fontWeight: activeTab === "approvals" ? "600" : "400", cursor: "pointer"
                }}
              >
                📥 Pending Reviews ({claims.filter(c => c.status === "Pending").length})
              </button>
            )}
          </div>

          {loading ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "30px 0" }}>Loading claims...</p>
          ) : filteredClaims.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "30px 0" }}>
              {activeTab === "approvals" ? "No pending claims to review." : "You haven't submitted any expense claims yet."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {activeTab === "approvals" && <th style={thStyle}>Employee</th>}
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Status</th>
                    {activeTab === "approvals" && <th style={thStyle}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim) => (
                    <tr
                      key={claim.id}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.01)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {activeTab === "approvals" && (
                        <td style={{ ...tdStyle, fontWeight: "500" }}>{claim.requester}</td>
                      )}
                      <td style={{ ...tdStyle, fontWeight: "600" }}>${claim.amount.toFixed(2)}</td>
                      <td style={tdStyle}>{claim.category}</td>
                      <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>{claim.date}</td>
                      <td style={{ ...tdStyle, color: "var(--text-secondary)", fontSize: "12px", maxWidth: "160px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={claim.notes}>
                        {claim.notes || <em style={{ color: "var(--text-muted)" }}>None</em>}
                      </td>
                      <td style={tdStyle}><StatusBadge status={claim.status} /></td>
                      {activeTab === "approvals" && (
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => handleStatusChange(claim.id, "Approved")}
                              style={{
                                padding: "4px 8px", border: "1px solid rgba(16,185,129,0.3)",
                                background: "rgba(16,185,129,0.08)", color: "#34d399",
                                borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "600"
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(claim.id, "Rejected")}
                              style={{
                                padding: "4px 8px", border: "1px solid rgba(239,68,68,0.3)",
                                background: "rgba(239,68,68,0.08)", color: "#f87171",
                                borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "600"
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExpenseClaimsView;
