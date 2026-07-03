import React, { useState } from "react";
import { policies } from "../../mockData";

function downloadPolicyText(policy) {
  const text = `${policy.title}\n${"-".repeat(policy.title.length)}\nCategory: ${policy.category}\n\n${policy.summary}`;
  const blob = new Blob([text], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `${policy.title.replace(/\s+/g,"_")}.txt`;
  a.click(); URL.revokeObjectURL(url);
}

function PolicyHubView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [activePolicyId, setActivePolicyId] = useState(null);

  const categories = ["All", "General", "Leave", "Security", "Benefits"];

  const filteredPolicies = policies.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCat === "All" || p.category === selectedCat;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-fade-in">
      {/* Title info */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Corporate Policy Hub</h2>
        <p className="subtitle">Reference company regulations, hybrid setup logs, compliance directives, and benefits.</p>
      </div>

      {/* Filter Row */}
      <div className="glass-panel" style={{
        padding: "16px",
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "24px"
      }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search policy articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: "300px" }}
        />

        <div style={{ display: "flex", gap: "8px" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className="btn btn-secondary"
              style={{
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "20px",
                background: selectedCat === cat ? "rgba(255,255,255,0.08)" : "transparent",
                borderColor: selectedCat === cat ? "var(--accent-primary)" : "var(--glass-border)",
                color: selectedCat === cat ? "var(--text-primary)" : "var(--text-secondary)"
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Policies grid content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filteredPolicies.map((p) => {
          const isExpanded = activePolicyId === p.id;
          return (
            <PolicyCard
              key={p.id}
              policy={p}
              isExpanded={isExpanded}
              onToggle={() => setActivePolicyId(isExpanded ? null : p.id)}
            />
          );
        })}

        {filteredPolicies.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>No matching policy guidelines found.</p>
        )}
      </div>
    </div>
  );
}

function PolicyCard({ policy, isExpanded, onToggle }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/app/policies#${policy.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that deny clipboard
      const ta = document.createElement("textarea");
      ta.value = link; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: "20px", cursor: "pointer",
        transition: "border-color 0.2s",
        borderLeft: `4px solid ${getCategoryColor(policy.category)}`,
      }}
      onClick={onToggle}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>{policy.title}</h4>
          <span className="subtitle" style={{ fontSize: "11px", textTransform: "uppercase" }}>
            Category: {policy.category}
          </span>
        </div>
        <div style={{ fontSize: "16px", color: "var(--text-muted)" }}>
          {isExpanded ? "▲" : "▼"}
        </div>
      </div>

      {isExpanded && (
        <div
          style={{
            marginTop: "16px", paddingTop: "16px",
            borderTop: "1px solid var(--glass-border)",
            animation: "fadeIn 0.3s forwards",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
            {policy.summary}
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
            <button
              className="btn btn-secondary"
              style={{ padding: "6px 14px", fontSize: "12px" }}
              onClick={(e) => { e.stopPropagation(); downloadPolicyText(policy); }}
            >
              📂 Download as .txt
            </button>
            <button
              className="btn btn-secondary"
              style={{
                padding: "6px 14px", fontSize: "12px",
                borderColor: copied ? "var(--success)" : "var(--glass-border)",
                color: copied ? "var(--success)" : "var(--text-primary)",
                transition: "all 0.3s",
              }}
              onClick={handleCopy}
            >
              {copied ? "✅ Copied!" : "🔗 Copy Link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getCategoryColor(category) {
  switch (category) {
    case "General":  return "var(--info)";
    case "Leave":    return "var(--success)";
    case "Security": return "var(--danger)";
    case "Benefits": return "var(--warning)";
    default:         return "var(--accent-primary)";
  }
}

export default PolicyHubView;

