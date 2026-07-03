import React, { useState } from "react";

function EmployeeDirectoryView({ employees, onAddEmployee }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newEmp, setNewEmp] = useState({
    name: "",
    email: "",
    role: "",
    department: "Engineering",
    status: "Active",
    avatar: "",
    contact: "",
    manager: "Evelyn Carter",
    salary: "$90,000"
  });

  const handleCreateEmployee = (e) => {
    e.preventDefault();
    const avatarUrl = newEmp.avatar.trim() || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?w=150`;
    onAddEmployee({
      ...newEmp,
      id: `EMP${String(employees.length + 1).padStart(3, "0")}`,
      avatar: avatarUrl,
      joinDate: new Date().toISOString().split("T")[0],
      attendance: "100%",
      performanceRating: "5.0",
      goals: [
        { id: 1, title: "Complete security awareness training modules", done: false }
      ],
      reviews: []
    });
    setShowAddModal(false);
    // Reset Form
    setNewEmp({
      name: "",
      email: "",
      role: "",
      department: "Engineering",
      status: "Active",
      avatar: "",
      contact: "",
      manager: "Evelyn Carter",
      salary: "$90,000"
    });
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === "All" || emp.department === deptFilter;
    const matchesStatus = statusFilter === "All" || emp.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const departments = ["All", "Engineering", "Design", "Human Resources"];
  const statuses = ["All", "Active", "On Leave"];

  return (
    <div className="animate-fade-in">
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Employee Directory</h2>
          <p className="subtitle">View corporate directory logs, manage roles, and inspect profiles.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          ➕ Add Employee
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel" style={{
        padding: "16px",
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", flex: 1, minWidth: "260px", gap: "10px" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <select
              className="form-control"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ width: "160px" }}
            >
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: "120px" }}
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Grid vs List View Selector */}
          <div style={{ display: "flex", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                background: viewMode === "grid" ? "rgba(255,255,255,0.08)" : "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px 12px",
                color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-secondary)"
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                background: viewMode === "list" ? "rgba(255,255,255,0.08)" : "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px 12px",
                color: viewMode === "list" ? "var(--text-primary)" : "var(--text-secondary)"
              }}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout Render */}
      {viewMode === "grid" ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "20px"
        }}>
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className="glass-panel employee-card"
              style={{ cursor: "pointer", transition: "transform 0.2s" }}
              onClick={() => setSelectedEmp(emp)}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <img
                src={emp.avatar}
                alt={`${emp.name} Portrait`}
                className="avatar-large"
              />
              <span className={`tag ${emp.status === "Active" ? "tag-green" : "tag-orange"}`} style={{
                position: "absolute",
                top: "12px",
                right: "12px"
              }}>
                {emp.status}
              </span>
              <div>
                <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>{emp.name}</h4>
                <p className="subtitle" style={{ fontSize: "12px", marginTop: "2px" }}>{emp.role}</p>
                <div style={{ fontSize: "11px", color: "var(--accent-primary)", fontWeight: "600", marginTop: "4px" }}>
                  {emp.department}
                </div>
              </div>
              <div style={{
                width: "100%",
                paddingTop: "12px",
                borderTop: "1px solid var(--glass-border)",
                display: "flex",
                justifyContent: "space-around",
                fontSize: "12px",
                color: "var(--text-secondary)"
              }}>
                <div>⭐ {emp.performanceRating}</div>
                <div>⏱️ {emp.attendance}</div>
              </div>
            </div>
          ))}
          {filteredEmployees.length === 0 && (
            <p style={{ gridColumn: "1/-1", textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>No employee records match the search filter.</p>
          )}
        </div>
      ) : (
        /* List / Table Layout Render */
        <div className="glass-panel" style={{ overflowX: "auto" }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Department</th>
                <th>Manager</th>
                <th>Hired Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img src={emp.avatar} alt="mini aspect" className="avatar-small" />
                      <div>
                        <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{emp.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{emp.role}</div>
                      </div>
                    </div>
                  </td>
                  <td>{emp.department}</td>
                  <td>{emp.manager}</td>
                  <td>{emp.joinDate}</td>
                  <td>
                    <span className={`tag ${emp.status === "Active" ? "tag-green" : "tag-orange"}`}>{emp.status}</span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => setSelectedEmp(emp)}>
                      Profile
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>No records match filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Profile Detail Modal */}
      {selectedEmp && (
        <div className="modal-overlay" onClick={() => setSelectedEmp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <button
              onClick={() => setSelectedEmp(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                fontSize: "18px",
                color: "var(--text-secondary)",
                cursor: "pointer"
              }}
            >
              ✕
            </button>

            <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "20px" }}>
              <img src={selectedEmp.avatar} alt="Detailed portrait" className="avatar-large" style={{ width: "90px", height: "90px" }} />
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>{selectedEmp.name}</h3>
                <p className="subtitle">{selectedEmp.role} ({selectedEmp.id})</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <span className="tag tag-purple">{selectedEmp.department}</span>
                  <span className={`tag ${selectedEmp.status === "Active" ? "tag-green" : "tag-orange"}`}>{selectedEmp.status}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px", fontSize: "13px" }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Manager:</span>
                <span style={{ color: "var(--text-primary)", marginLeft: "6px" }}>{selectedEmp.manager}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Join Date:</span>
                <span style={{ color: "var(--text-primary)", marginLeft: "6px" }}>{selectedEmp.joinDate}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Contact:</span>
                <span style={{ color: "var(--text-primary)", marginLeft: "6px" }}>{selectedEmp.contact}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Email:</span>
                <span style={{ color: "var(--text-primary)", marginLeft: "6px" }}>{selectedEmp.email}</span>
              </div>
            </div>

            {/* Sub-panels tabs inside modal: Goals and Reviews */}
            <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "16px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "10px" }}>Performance Metrics</h4>
              <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
                <div className="glass-panel" style={{ flex: 1, padding: "10px", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Rating</div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--accent-secondary)", marginTop: "4px" }}>⭐ {selectedEmp.performanceRating}</div>
                </div>
                <div className="glass-panel" style={{ flex: 1, padding: "10px", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Attendance</div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--success)", marginTop: "4px" }}>{selectedEmp.attendance}</div>
                </div>
              </div>

              {/* Personal Goals Checklist */}
              <h4 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>Active Goals checklist</h4>
              <ul style={{ listStyle: "none", paddingLeft: 0, paddingBottom: "16px" }}>
                {selectedEmp.goals.map((g) => (
                  <li key={g.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", margin: "4px 0" }}>
                    <span style={{ color: g.done ? "var(--success)" : "var(--text-muted)" }}>{g.done ? "✓" : "○"}</span>
                    <span style={{ textDecoration: g.done ? "line-through" : "none", color: g.done ? "var(--text-secondary)" : "var(--text-primary)" }}>{g.title}</span>
                  </li>
                ))}
              </ul>

              {/* Peer Feedback */}
              <h4 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>Appraisal Feedback</h4>
              {selectedEmp.reviews.length > 0 ? (
                selectedEmp.reviews.map((r, i) => (
                  <div key={i} style={{ padding: "8px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "4px", fontSize: "11px", marginBottom: "8px" }}>
                    <strong>{r.reviewer} ({r.relation}) :</strong> "{r.comment}"
                  </div>
                ))
              ) : (
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>No evaluations filed for this review cycle.</p>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button className="btn btn-secondary" onClick={() => setSelectedEmp(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal Overlay */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "18px", color: "var(--text-primary)", marginBottom: "16px" }}>Hire New Employee</h3>
            <form onSubmit={handleCreateEmployee}>
              
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Corporate Email *</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label>Department</label>
                  <select
                    className="form-control"
                    value={newEmp.department}
                    onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Human Resources">Human Resources</option>
                  </select>
                </div>
                <div>
                  <label>Role / Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UX Designer"
                    className="form-control"
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newEmp.contact}
                    onChange={(e) => setNewEmp({ ...newEmp, contact: e.target.value })}
                  />
                </div>
                <div>
                  <label>Salary (Annual)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newEmp.salary}
                    onChange={(e) => setNewEmp({ ...newEmp, salary: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Avatar Portrait URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  className="form-control"
                  value={newEmp.avatar}
                  onChange={(e) => setNewEmp({ ...newEmp, avatar: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Hire
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeDirectoryView;
