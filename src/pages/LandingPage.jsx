import React from "react";
import { Link } from "react-router-dom";
import PricingCards from "../components/billing/PricingCards";

const features = [
  { icon: "👥", title: "Employee Directory", desc: "Centralized profiles, org charts, and contact info." },
  { icon: "🏖️", title: "Leave Management", desc: "Request, approve, and track balances in one place." },
  { icon: "📈", title: "Performance Tracking", desc: "Goals, reviews, and ratings for every team member." },
  { icon: "🎯", title: "Recruitment ATS", desc: "Pipeline candidates from Applied to Offered." },
  { icon: "🤖", title: "AI HR Assistant", desc: "Pep answers policy questions 24/7." },
  { icon: "🔒", title: "Multi-tenant & Secure", desc: "Org isolation, RBAC, audit logs, and invite flows." },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "var(--bg-dark)", fontFamily: "var(--font-sans)" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff" }}>H</div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>PeopleCore</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link to="/pricing" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 14 }}>Pricing</Link>
          <Link to="/login" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 14 }}>Sign In</Link>
          <Link to="/register" style={{ padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>Start Free Trial</Link>
        </div>
      </nav>

      <section style={{ textAlign: "center", padding: "80px 24px 60px", maxWidth: 800, margin: "0 auto" }}>
        <p style={{ color: "var(--accent-primary)", fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>HR SaaS for modern teams</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, lineHeight: 1.15, marginBottom: 20 }}>
          Run your entire HR stack in one place
        </h1>
        <p style={{ fontSize: 18, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 32 }}>
          PeopleCore gives startups and growing companies employee management, leave tracking, performance reviews, and an AI assistant — with multi-tenant security built in.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/register" style={{ padding: "14px 28px", borderRadius: 12, background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))", color: "#fff", textDecoration: "none", fontWeight: 700 }}>Start 14-day Pro trial</Link>
          <Link to="/pricing" style={{ padding: "14px 28px", borderRadius: 12, border: "1px solid var(--glass-border)", color: "var(--text-primary)", textDecoration: "none", fontWeight: 600 }}>View pricing</Link>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20, padding: "0 40px 60px", maxWidth: 1100, margin: "0 auto" }}>
        {features.map(f => (
          <div key={f.title} style={{ padding: 24, borderRadius: 16, background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      <section style={{ padding: "60px 40px", borderTop: "1px solid var(--glass-border)", textAlign: "center" }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32 }}>Simple, transparent pricing</h2>
        <PricingCards compact />
      </section>
    </div>
  );
}
