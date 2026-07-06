import React, { useState, useMemo, useRef, useEffect } from "react";

function OrgNode({ employee, tree, onSelect, selectedId, highlightedId }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const reports = tree[employee.name] || [];
  const hasReports = reports.length > 0;
  const isSelected = selectedId === employee.id;
  const isHighlighted = highlightedId === employee.id;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      margin: "0 6px",
      position: "relative"
    }}>
      {/* Node element */}
      <div 
        onClick={() => onSelect(employee)}
        style={{
          padding: "8px 10px",
          borderRadius: "10px",
          background: isSelected 
            ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"
            : "var(--bg-card)",
          border: isHighlighted 
            ? "2px solid var(--accent-secondary)" 
            : isSelected 
              ? "1px solid transparent"
              : "1px solid var(--glass-border)",
          boxShadow: isHighlighted ? "0 0 15px rgba(192, 132, 252, 0.4)" : "var(--shadow-sm)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          width: "145px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          zIndex: 2,
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.borderColor = "var(--accent-primary)";
        }}
        onMouseLeave={(e) => {
          if (!isSelected && !isHighlighted) e.currentTarget.style.borderColor = "var(--glass-border)";
        }}
      >
        <img 
          src={employee.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(employee.name)}`}
          alt={employee.name}
          style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <h5 style={{ 
            fontSize: "11px", 
            fontWeight: "600", 
            color: "#fff", 
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>{employee.name}</h5>
          <p style={{ 
            fontSize: "9px", 
            color: isSelected ? "rgba(255,255,255,0.8)" : "var(--text-secondary)", 
            margin: "1px 0 0",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>{employee.role}</p>
          <div style={{
            fontSize: "8px",
            fontWeight: "700",
            color: isSelected ? "#fff" : "var(--accent-primary)",
            marginTop: "2px",
            textTransform: "uppercase",
            letterSpacing: "0.02em"
          }}>{employee.department}</div>
        </div>

        {hasReports && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: "50%",
              width: "14px",
              height: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              fontSize: "8px",
              padding: 0,
            }}
          >
            {isCollapsed ? "+" : "-"}
          </button>
        )}
      </div>

      {/* Children connector lines */}
      {hasReports && !isCollapsed && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          position: "relative"
        }}>
          {/* Vertical line down from parent */}
          <div style={{ width: "2px", height: "24px", background: "rgba(255,255,255,0.15)" }}></div>
          
          {/* Children container */}
          <div style={{ 
            display: "flex", 
            justifyContent: "safe center", 
            position: "relative",
          }}>
            {/* Map each report */}
            {reports.map((child, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === reports.length - 1;
              return (
                <div key={child.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                  {/* Split horizontal line connectors */}
                  {reports.length > 1 && (
                    <div style={{
                      display: "flex",
                      width: "100%",
                      height: "2px",
                      position: "absolute",
                      top: 0
                    }}>
                      <div style={{ flex: 1, borderTop: isFirst ? "none" : "2px solid rgba(255,255,255,0.15)" }} />
                      <div style={{ flex: 1, borderTop: isLast ? "none" : "2px solid rgba(255,255,255,0.15)" }} />
                    </div>
                  )}

                  {/* Vertical connector above child node */}
                  <div style={{ width: "2px", height: "16px", background: "rgba(255,255,255,0.15)", zIndex: 1 }}></div>
                  <OrgNode 
                    employee={child} 
                    tree={tree} 
                    onSelect={onSelect}
                    selectedId={selectedId}
                    highlightedId={highlightedId}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChartView({ employees }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmp, setSelectedEmp] = useState(null);
  const containerRef = useRef(null);

  // Auto-center the tree scrollbar when it mounts or updates
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      setTimeout(() => {
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;
        if (scrollWidth > clientWidth) {
          container.scrollLeft = (scrollWidth - clientWidth) / 2;
        }
      }, 100); // 100ms delay to ensure the DOM layout is completed
    }
  }, [employees]);

  // Group employees by manager and identify root nodes
  const { tree, roots } = useMemo(() => {
    const treeMap = {};
    const rootNodes = [];
    
    // Create map of manager name -> list of reports
    employees.forEach(emp => {
      const mgr = emp.manager ? emp.manager.trim() : "";
      if (mgr) {
        if (!treeMap[mgr]) treeMap[mgr] = [];
        treeMap[mgr].push(emp);
      }
    });

    // Check who is root (manager name is empty, manager is self, or manager is not in employee names list)
    const empNames = new Set(employees.map(e => e.name));
    employees.forEach(emp => {
      const mgr = emp.manager ? emp.manager.trim() : "";
      if (!mgr || mgr === emp.name || !empNames.has(mgr)) {
        rootNodes.push(emp);
      }
    });

    return { tree: treeMap, roots: rootNodes };
  }, [employees]);

  // Find match for search highlighting
  const highlightedEmp = useMemo(() => {
    if (!searchTerm.trim()) return null;
    return employees.find(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, employees]);

  const handleSelectNode = (employee) => {
    setSelectedEmp(employee);
  };

  return (
    <div className="animate-fade-in" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Organization Chart</h2>
          <p className="subtitle">Interactive tree visualizer of reporting structure and hierarchies.</p>
        </div>
      </div>

      {/* Control bar */}
      <div className="glass-panel" style={{ padding: "16px", display: "flex", gap: "16px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "260px" }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search team member to highlight..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {highlightedEmp && (
          <span className="badge badge-success" style={{ padding: "8px 12px" }}>
            ✓ Highlighted: {highlightedEmp.name}
          </span>
        )}
      </div>

      {/* Layout workspace */}
      <div style={{ display: "flex", gap: "24px", flex: 1, minHeight: "450px", flexWrap: "wrap-reverse" }}>
        
        {/* Left Side: Hierarchy tree */}
        <div className="glass-panel" ref={containerRef} style={{ 
          flex: 2, 
          padding: "24px", 
          overflowX: "auto", 
          overflowY: "auto",
          minWidth: "350px",
          background: "rgba(10, 11, 16, 0.4)",
          border: "1px solid var(--glass-border)",
          position: "relative",
          maxHeight: "650px",
          display: "block"
        }}>
          {roots.length === 0 ? (
            <p style={{ color: "var(--text-muted)", marginTop: "40px", textAlign: "center" }}>No employee hierarchy root found.</p>
          ) : (
            <div style={{ 
              display: "flex",
              justifyContent: "safe center",
              width: "100%",
              minWidth: "max-content",
              padding: "10px 0"
            }}>
              <div style={{ display: "flex", gap: "12px", justifyContent: "safe center" }}>
                {roots.map(root => (
                  <OrgNode 
                    key={root.id} 
                    employee={root} 
                    tree={tree} 
                    onSelect={handleSelectNode}
                    selectedId={selectedEmp?.id}
                    highlightedId={highlightedEmp?.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Detail inspector panel */}
        <div style={{ flex: "1 1 300px" }}>
          <div className="glass-panel" style={{ padding: "24px", height: "100%", minHeight: "260px" }}>
            {selectedEmp ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <img 
                    src={selectedEmp.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedEmp.name)}`}
                    alt={selectedEmp.name}
                    style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", margin: 0 }}>{selectedEmp.name}</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0" }}>{selectedEmp.role}</p>
                    <span className="tag tag-purple" style={{ marginTop: "6px", display: "inline-block" }}>{selectedEmp.department}</span>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Employee ID:</span>
                    <span style={{ color: "var(--text-primary)", marginLeft: "8px", fontWeight: "500" }}>{selectedEmp.id}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Corporate Email:</span>
                    <a href={`mailto:${selectedEmp.email}`} style={{ color: "var(--accent-primary)", marginLeft: "8px", textDecoration: "none" }}>{selectedEmp.email}</a>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Reporting Manager:</span>
                    <span style={{ color: "var(--text-primary)", marginLeft: "8px", fontWeight: "500" }}>{selectedEmp.manager || "None"}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Workplace Status:</span>
                    <span className={`tag ${selectedEmp.status === "Active" ? "tag-green" : "tag-orange"}`} style={{ marginLeft: "8px" }}>
                      {selectedEmp.status}
                    </span>
                  </div>
                  {selectedEmp.joinDate && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Joined On:</span>
                      <span style={{ color: "var(--text-primary)", marginLeft: "8px" }}>{selectedEmp.joinDate}</span>
                    </div>
                  )}
                </div>

                {/* Direct Reports short list */}
                {tree[selectedEmp.name] && tree[selectedEmp.name].length > 0 && (
                  <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "16px" }}>
                    <h4 style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                      Direct Reports ({tree[selectedEmp.name].length})
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {tree[selectedEmp.name].map(r => (
                        <div 
                          key={r.id} 
                          onClick={() => setSelectedEmp(r)}
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "8px", 
                            padding: "6px 10px", 
                            background: "rgba(255,255,255,0.02)", 
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        >
                          <img 
                            src={r.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.name)}`}
                            alt={r.name}
                            style={{ width: "24px", height: "24px", borderRadius: "50%" }}
                          />
                          <div>
                            <span style={{ fontWeight: "600", color: "#fff" }}>{r.name}</span>
                            <span style={{ color: "var(--text-secondary)", marginLeft: "6px" }}>({r.role})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "200px", color: "var(--text-muted)", textAlign: "center" }}>
                <span>🔍</span>
                <p style={{ fontSize: "13px", marginTop: "8px" }}>Select a node in the org tree to inspect candidate reports, credentials, and records.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
