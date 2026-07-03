import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-dark)", fontFamily: "var(--font-sans)", padding: "24px",
      }}>
        <div style={{
          maxWidth: "480px", width: "100%", padding: "36px 32px", borderRadius: "20px",
          background: "rgba(20,22,35,0.9)", border: "1px solid rgba(239,68,68,0.25)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", textAlign: "center" }}>⚠️</div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#f87171", textAlign: "center", marginBottom: "10px" }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center", lineHeight: "1.6", marginBottom: "24px" }}>
            An unexpected error occurred in this section. Your data is safe.
          </p>
          <div style={{
            padding: "12px 16px", borderRadius: "10px",
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
            marginBottom: "24px",
          }}>
            <p style={{ fontSize: "11px", color: "#f87171", fontFamily: "monospace", wordBreak: "break-all", lineHeight: "1.6" }}>
              {this.state.error?.message || "Unknown error"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                flex: 1, padding: "11px", borderRadius: "10px",
                background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))",
                border: "none", color: "white", fontWeight: "700", fontSize: "14px",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = "/"}
              style={{
                flex: 1, padding: "11px", borderRadius: "10px",
                background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)",
                color: "var(--text-primary)", fontWeight: "600", fontSize: "14px",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Go Home
            </button>
          </div>
        </div>
        <style>{`@keyframes slideUp { from { transform: translateY(24px); opacity:0; } to { transform: translateY(0); opacity:1; } }`}</style>
      </div>
    );
  }
}
