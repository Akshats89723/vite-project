import React, { useState } from "react";

function PerformanceTrackerView({ employees, onToggleGoal, onAddGoal, onSubmitReview }) {
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || "");
  const [newGoalText, setNewGoalText] = useState("");
  
  // Feedback Form State
  const [feedback, setFeedback] = useState({
    reviewer: "Evelyn Carter", // current user
    relation: "Manager",
    rating: 5,
    comment: ""
  });

  const selectedEmp = employees.find(e => e.id === selectedEmpId);

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoalText.trim() || !selectedEmpId) return;

    onAddGoal(selectedEmpId, newGoalText.trim());
    setNewGoalText("");
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!feedback.comment.trim() || !selectedEmpId) return;

    onSubmitReview(selectedEmpId, {
      reviewer: feedback.reviewer,
      relation: feedback.relation,
      rating: parseInt(feedback.rating),
      comment: feedback.comment
    });

    setFeedback({
      reviewer: "Evelyn Carter",
      relation: "Manager",
      rating: 5,
      comment: ""
    });
  };

  const getKPIColor = (rating) => {
    const num = parseFloat(rating);
    if (num >= 4.5) return "var(--success)";
    if (num >= 4.0) return "var(--accent-primary)";
    return "var(--warning)";
  };

  return (
    <div className="animate-fade-in">
      {/* Title */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Performance Board</h2>
        <p className="subtitle">Track milestones, align objectives, and submit reviews for your workforce.</p>
      </div>

      {/* Selector Container */}
      <div className="glass-panel" style={{ padding: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "600" }}>Focus Member:</span>
          <select
            className="form-control"
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            style={{ width: "260px" }}
          >
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedEmp ? (
        <div className="dashboard-grid">
          
          {/* Left panel: Milestones & KPI details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* KPI Cards & Goals checklist widget */}
            <div className="glass-panel" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>Milestones Alignment</h4>
                <div style={{
                  padding: "4px 10px",
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${getKPIColor(selectedEmp.performanceRating)}`,
                  borderRadius: "12px",
                  color: getKPIColor(selectedEmp.performanceRating),
                  fontSize: "12px",
                  fontWeight: "600"
                }}>
                  Index Index: ⭐ {selectedEmp.performanceRating}
                </div>
              </div>

              {/* Goals checklist */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {selectedEmp.goals.map((goal) => (
                  <div key={goal.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "6px"
                  }}>
                    <input
                      type="checkbox"
                      checked={goal.done}
                      onChange={() => onToggleGoal(selectedEmp.id, goal.id)}
                      style={{
                        cursor: "pointer",
                        width: "16px",
                        height: "16px",
                        accentColor: "var(--accent-primary)"
                      }}
                    />
                    <span style={{
                      fontSize: "13px",
                      textDecoration: goal.done ? "line-through" : "none",
                      color: goal.done ? "var(--text-secondary)" : "var(--text-primary)"
                    }}>
                      {goal.title}
                    </span>
                  </div>
                ))}

                {selectedEmp.goals.length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>No goals initialized for this month.</p>
                )}
              </div>

              {/* Add Goal Forms */}
              <form onSubmit={handleAddGoal} style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  required
                  placeholder="Draft new milestone goal target..."
                  className="form-control"
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: "10px 16px" }}>
                  Add Target
                </button>
              </form>
            </div>

            {/* Appraisal Peer Log Reviewer */}
            <div className="glass-panel" style={{ padding: "20px" }}>
              <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "16px" }}>
                Appraisal Logs ({selectedEmp.name})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selectedEmp.reviews.map((rev, i) => (
                  <div key={i} className="glass-panel" style={{ padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                      <strong>{rev.reviewer} <span style={{ color: "var(--text-muted)" }}>({rev.relation})</span></strong>
                      <span style={{ color: "var(--warning)", fontWeight: "600" }}>⭐ {rev.rating}/5</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      "{rev.comment}"
                    </p>
                  </div>
                ))}

                {selectedEmp.reviews.length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: "12px", textAlign: "center", padding: "12px" }}>No reviews logged for this evaluation cycle.</p>
                )}
              </div>
            </div>

          </div>

          {/* Right panel: Submit evaluation files */}
          <div className="glass-panel" style={{ padding: "20px", height: "fit-content" }}>
            <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "16px" }}>
              Log Peer Evaluation
            </h4>
            <form onSubmit={handleReviewSubmit}>
              
              <div className="form-group">
                <label>Reviewer Relation</label>
                <select
                  className="form-control"
                  value={feedback.relation}
                  onChange={(e) => setFeedback({ ...feedback, relation: e.target.value })}
                >
                  <option value="Manager">Manager</option>
                  <option value="Peer">Peer / Colleague</option>
                  <option value="Direct Report">Direct Report</option>
                </select>
              </div>

              <div className="form-group">
                <label>Performance Rating Score</label>
                <select
                  className="form-control"
                  value={feedback.rating}
                  onChange={(e) => setFeedback({ ...feedback, rating: parseInt(e.target.value) })}
                >
                  <option value="5">⭐⭐⭐⭐⭐ Excellent (5/5)</option>
                  <option value="4">⭐⭐⭐⭐ Good (4/5)</option>
                  <option value="3">⭐⭐⭐ Satisfactory (3/5)</option>
                  <option value="2">⭐⭐ Needs Improvement (2/5)</option>
                  <option value="1">⭐ Unsatisfactory (1/5)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Appraisal Commentary *</label>
                <textarea
                  rows="4"
                  required
                  placeholder={`Write feedback comments about ${selectedEmp.name}'s alignment, delivery, and culture...`}
                  className="form-control"
                  style={{ resize: "none" }}
                  value={feedback.comment}
                  onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                Submit Appraisal Review
              </button>

            </form>
          </div>

        </div>
      ) : (
        <p style={{ color: "var(--text-muted)" }}>Please set up an employee directory first.</p>
      )}

    </div>
  );
}

export default PerformanceTrackerView;
