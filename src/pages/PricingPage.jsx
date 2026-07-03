import React from "react";
import { Link } from "react-router-dom";
import PricingCards from "../components/billing/PricingCards";

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "var(--bg-dark)", fontFamily: "var(--font-sans)" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid var(--glass-border)" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff" }}>H</div>
          <span style={{ fontWeight: 700 }}>PeopleCore</span>
        </Link>
        <Link to="/register" style={{ padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))", color: "#fff", textDecoration: "none", fontWeight: 600 }}>Start Free Trial</Link>
      </nav>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 24px" }}>
        <h1 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, marginBottom: 12 }}>Choose your plan</h1>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 48 }}>14-day Pro trial on signup. No credit card required to start.</p>
        <PricingCards />
      </div>
    </div>
  );
}
