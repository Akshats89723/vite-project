import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1.2;
      });
    }, 30);

    const t = setTimeout(() => navigate("/app/billing"), 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(t);
    };
  }, [navigate]);

  return (
    <div style={{ 
      minHeight: "100vh", 
      width: "100%", 
      flex: 1, 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: "var(--bg-dark)",
      padding: 20
    }}>
      <div className="glass-panel" style={{ 
        padding: "48px 32px", 
        maxWidth: 460, 
        width: "100%", 
        textAlign: "center",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #10b981, #059669)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: "0 0 30px rgba(16,185,129,0.35)",
          fontSize: 36,
          color: "#fff",
          fontWeight: "bold"
        }}>
          ✓
        </div>
        
        <h1 style={{ 
          fontSize: 26, 
          fontWeight: 800, 
          marginBottom: 12, 
          background: "linear-gradient(135deg, #fff 30%, var(--text-secondary))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          Payment Successful!
        </h1>
        
        <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 32, lineHeight: 1.5 }}>
          Thank you for your purchase. We are activating your subscription features and updating your organization plan.
        </p>

        <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ width: `${Math.min(progress, 100)}%`, height: "100%", background: "linear-gradient(90deg, #10b981, #34d399)", borderRadius: 3, transition: "width 0.03s linear" }} />
        </div>
        
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
          Redirecting you to the billing dashboard...
        </p>
      </div>
    </div>
  );
}
