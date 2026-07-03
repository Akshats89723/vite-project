import React, { useState } from "react";
import { api } from "../../api";

function RecruitmentATSView({ candidates, onUpdateCandidateStage, onAddCandidate }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    role: "React Developer",
    score: 85,
    stage: "Applied",
    email: ""
  });

  const [modalTab, setModalTab] = useState("manual"); // "manual" | "ai"
  const [rawResumeText, setRawResumeText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  const handleParseResume = async () => {
    if (!rawResumeText.trim()) return;
    setIsParsing(true);
    setParseError("");
    try {
      const parsed = await api.candidates.parseResume(rawResumeText);
      setNewCandidate(prev => ({
        ...prev,
        name: parsed.name || prev.name,
        email: parsed.email || prev.email,
        role: parsed.role || prev.role,
        score: parsed.score || prev.score
      }));
      setModalTab("manual");
      setRawResumeText("");
    } catch (err) {
      setParseError(err.message || "Resume parsing failed.");
    } finally {
      setIsParsing(false);
    }
  };

  const columns = [
    { title: "Applied", color: "tag-blue", stage: "Applied" },
    { title: "Screened", color: "tag-purple", stage: "Screened" },
    { title: "Interviewing", color: "tag-orange", stage: "Interviewing" },
    { title: "Offered", color: "tag-green", stage: "Offered" }
  ];

  const handleCreateCandidate = (e) => {
    e.preventDefault();
    onAddCandidate({
      ...newCandidate,
      id: `CAN${String(candidates.length + 1).padStart(3, "0")}`,
      score: parseInt(newCandidate.score) || 80
    });
    setShowAddModal(false);
    // Reset Form
    setNewCandidate({
      name: "",
      role: "React Developer",
      score: 85,
      stage: "Applied",
      email: ""
    });
  };

  const getCandidateScoreColor = (score) => {
    if (score >= 90) return "#34d399";
    if (score >= 80) return "#c084fc";
    return "#fbbf24";
  };

  // Mock Active Job openings list
  const activeJobs = [
    { title: "React Developer", dept: "Engineering", type: "Full-Time", status: "Active" },
    { title: "UX Designer", dept: "Design", type: "Full-Time", status: "Active" },
    { title: "DevOps Engineer", dept: "Engineering", type: "Full-Time", status: "Active" },
    { title: "AI Ethicist", dept: "Research", type: "Contract", status: "Closed" }
  ];

  return (
    <div className="animate-fade-in">
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Recruitment (ATS)</h2>
          <p className="subtitle">Track applicant pipelines, update pipeline stages, and manage open positions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          ➕ Add Candidate
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="kanban-board" style={{ marginBottom: "32px" }}>
        {columns.map((column) => {
          const stageCandidates = candidates.filter(c => c.stage === column.stage);
          return (
            <div key={column.stage} className="kanban-column">
              <div className="kanban-column-header">
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className={`tag ${column.color}`}>{column.title}</span>
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: "600" }}>
                  {stageCandidates.length}
                </span>
              </div>

              {/* Candidate Cards list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", maxHeight: "450px", padding: "2px" }}>
                {stageCandidates.map((candidate) => (
                  <div key={candidate.id} className="candidate-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <h5 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{candidate.name}</h5>
                        <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{candidate.role}</p>
                      </div>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "2px 6px",
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${getCandidateScoreColor(candidate.score)}`,
                        borderRadius: "20px",
                        color: getCandidateScoreColor(candidate.score)
                      }}>
                        {candidate.score}
                      </span>
                    </div>

                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>{candidate.email}</p>

                    {/* Move controls dropdown */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", flex: 1 }}>Stage:</span>
                      <select
                        className="form-control"
                        value={candidate.stage}
                        onChange={(e) => onUpdateCandidateStage(candidate.id, e.target.value)}
                        style={{
                          fontSize: "11px",
                          padding: "4px 8px",
                          width: "120px",
                          background: "var(--bg-dark)",
                          borderRadius: "4px"
                        }}
                      >
                        <option value="Applied">Applied</option>
                        <option value="Screened">Screened</option>
                        <option value="Interviewing">Interviewing</option>
                        <option value="Offered">Offered</option>
                      </select>
                    </div>
                  </div>
                ))}

                {stageCandidates.length === 0 && (
                  <p style={{ textAlignment: "center", color: "var(--text-muted)", fontSize: "11px", padding: "16px", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: "6px" }}>
                    Drop files or add applicant
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Open Postings Summary section */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "16px" }}>
          Active Corporate Requisitions
        </h4>
        <div style={{ overflowX: "auto" }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Requisition Title</th>
                <th>Department</th>
                <th>Workplace Type</th>
                <th>Hiring Status</th>
              </tr>
            </thead>
            <tbody>
              {activeJobs.map((job, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: "600", color: "var(--text-primary)" }}>{job.title}</td>
                  <td>{job.dept}</td>
                  <td>{job.type}</td>
                  <td>
                    <span className={`tag ${job.status === "Active" ? "tag-green" : "tag-orange"}`}>
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Candidate Modal Form */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "18px", color: "var(--text-primary)", marginBottom: "16px" }}>Add Candidate</h3>
            
            {/* Modal Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--glass-border)", marginBottom: "16px" }}>
              <button 
                type="button"
                onClick={() => setModalTab("manual")}
                style={{
                  padding: "8px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: modalTab === "manual" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  color: modalTab === "manual" ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px"
                }}
              >
                Manual Details
              </button>
              <button 
                type="button"
                onClick={() => setModalTab("ai")}
                style={{
                  padding: "8px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: modalTab === "ai" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  color: modalTab === "ai" ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px"
                }}
              >
                🪄 Paste Resume (AI Parse)
              </button>
            </div>

            {modalTab === "ai" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {parseError && (
                  <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "12px" }}>
                    {parseError}
                  </div>
                )}
                <div className="form-group">
                  <label>Resume / CV Text Contents *</label>
                  <textarea
                    rows="8"
                    placeholder="Paste the candidate's plain resume text here. The AI will extract credentials, email contacts, and fit score."
                    className="form-control"
                    required
                    style={{ resize: "none" }}
                    value={rawResumeText}
                    onChange={(e) => setRawResumeText(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowAddModal(false)}
                    disabled={isParsing}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleParseResume}
                    disabled={isParsing || !rawResumeText.trim()}
                  >
                    {isParsing ? "Extracting..." : "Analyze Resume with AI"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateCandidate}>
                
                <div className="form-group">
                  <label>Applicant Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Contact Email *</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    value={newCandidate.email}
                    onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label>Applied Position</label>
                    <select
                      className="form-control"
                      value={newCandidate.role}
                      onChange={(e) => setNewCandidate({ ...newCandidate, role: e.target.value })}
                    >
                      <option value="React Developer">React Developer</option>
                      <option value="UX Designer">UX Designer</option>
                      <option value="DevOps Engineer">DevOps Engineer</option>
                    </select>
                  </div>
                  <div>
                    <label>Screening Score (0-100) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      className="form-control"
                      value={newCandidate.score}
                      onChange={(e) => setNewCandidate({ ...newCandidate, score: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Initial Pipeline Step</label>
                  <select
                    className="form-control"
                    value={newCandidate.stage}
                    onChange={(e) => setNewCandidate({ ...newCandidate, stage: e.target.value })}
                  >
                    <option value="Applied">Applied</option>
                    <option value="Screened">Screened</option>
                    <option value="Interviewing">Interviewing</option>
                    <option value="Offered">Offered</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Register Applicant
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default RecruitmentATSView;
