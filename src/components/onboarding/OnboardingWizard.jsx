import React, { useState } from "react";

const STEPS = [
  { title: "Welcome to PeopleCore!", body: "Your organization is set up. Let's get your team onboarded in a few quick steps.", icon: "🎉" },
  { title: "Invite your team", body: "Go to Team & Invites to send invite links to managers and employees.", icon: "👥" },
  { title: "Add employees", body: "Import or add employee records in the Employee Directory.", icon: "📋" },
  { title: "Set up policies", body: "Review the Policy Hub and customize settings for your org.", icon: "📖" },
];

export default function OnboardingWizard({ onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%", padding: 32, borderRadius: 20, background: "rgba(20,22,35,0.98)", border: "1px solid var(--glass-border)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "var(--accent-primary)" : "rgba(255,255,255,0.1)" }} />
          ))}
        </div>
        <p style={{ fontSize: 40, marginBottom: 12 }}>{current.icon}</p>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{current.title}</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 28 }}>{current.body}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onSkip} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>Skip</button>
          <button
            onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            {isLast ? "Invite team" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
