import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { billingApi } from "../../api";

const FALLBACK_PLANS = [
  { id: "free", label: "Free", price_monthly: 0, max_seats: 10, ai_limit: 50, ats: false, audit: false },
  { id: "pro", label: "Pro", price_monthly: 29, max_seats: 50, ai_limit: 500, ats: true, audit: true },
  { id: "enterprise", label: "Enterprise", price_monthly: 99, max_seats: 500, ai_limit: "Unlimited", ats: true, audit: true },
];

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PricingCards({ compact = false }) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockData, setMockData] = useState(null);

  useEffect(() => {
    billingApi.plans()
      .then(d => {
        setPlans(d.plans);
        setStripeEnabled(d.stripe_enabled);
        setRazorpayEnabled(d.razorpay_enabled);
      })
      .catch(() => {
        // Backend offline - keep fallback plans, assume razorpay is available
        setRazorpayEnabled(true);
      });
  }, []);

  const handleSelect = async (id) => {
    const isLoggedIn = Boolean(localStorage.getItem("pc_token"));
    if (!isLoggedIn) {
      navigate("/register");
      return;
    }

    if (id === "free") {
      navigate("/app/billing");
      return;
    }

    setActionLoading(id);
    try {
      if (razorpayEnabled) {
        const res = await billingApi.razorpayCheckout(id);
        if (res.is_mock) {
          setMockData({
            plan: id,
            amount: id === "pro" ? 29 : 99,
            subscriptionId: res.subscription_id,
          });
          setShowMockModal(true);
          setActionLoading("");
          return;
        }

        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error("Failed to load Razorpay SDK. Please check your network connection.");
        }

        const options = {
          key: res.key_id,
          subscription_id: res.subscription_id,
          name: "PeopleCore",
          description: `Upgrade to ${id.toUpperCase()}`,
          handler: function (response) {
            navigate(`/app/billing/success?gateway=razorpay&payment_id=${response.razorpay_payment_id}&subscription_id=${response.razorpay_subscription_id}`);
          },
          prefill: {
            name: res.name,
            email: res.email,
          },
          theme: {
            color: "#a855f7",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else if (stripeEnabled) {
        const { url } = await billingApi.checkout(id);
        window.location.href = url;
      } else {
        navigate("/app/billing");
      }
    } catch (err) {
      alert(err.message || "Failed to initiate payment. Please contact support.");
    } finally {
      setActionLoading("");
    }
  };

  const handleSimulateSuccess = async () => {
    if (!mockData) return;
    setActionLoading("simulate");
    try {
      await billingApi.simulateRazorpaySuccess(mockData.plan, mockData.subscriptionId);
      setShowMockModal(false);
      navigate(`/app/billing/success?gateway=razorpay&subscription_id=${mockData.subscriptionId}`);
    } catch (err) {
      alert(err.message || "Failed to simulate payment.");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(auto-fit,minmax(220px,1fr))" : "repeat(auto-fit,minmax(260px,1fr))", gap: 20, maxWidth: compact ? 900 : 1000, margin: "0 auto" }}>
      {plans.map(p => (
        <div key={p.id} style={{
          padding: compact ? 20 : 28, borderRadius: 16,
          background: p.id === "pro" ? "rgba(168,85,247,0.08)" : "var(--bg-card)",
          border: p.id === "pro" ? "1px solid rgba(168,85,247,0.35)" : "1px solid var(--glass-border)",
          position: "relative",
        }}>
          {p.id === "pro" && (
            <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", padding: "4px 12px", borderRadius: 10, background: "var(--accent-primary)", color: "#fff", fontSize: 11, fontWeight: 700 }}>POPULAR</span>
          )}
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{p.label}</h3>
          <p style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
            ${p.price_monthly}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)" }}>/mo</span>
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 2 }}>
            <li>✓ {p.max_seats} seats</li>
            <li>✓ {p.ai_limit} AI messages/mo</li>
            <li>{p.ats ? "✓" : "✗"} Recruitment ATS</li>
            <li>{p.audit ? "✓" : "✗"} Audit log</li>
          </ul>
          {compact ? (
            <button
              onClick={() => handleSelect(p.id)}
              disabled={!!actionLoading}
              style={{
                display: "block", width: "100%", textAlign: "center", padding: "10px 0",
                borderRadius: 10, border: "1px solid var(--glass-border)", background: "transparent",
                color: "var(--text-primary)", fontWeight: 600, fontSize: 14, cursor: "pointer",
                fontFamily: "inherit"
              }}
            >
              {actionLoading === p.id ? "Opening..." : "Get started"}
            </button>
          ) : (
            <button onClick={() => handleSelect(p.id)} disabled={!!actionLoading} style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: p.id === "pro" ? "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))" : "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
              {actionLoading === p.id ? "Opening..." : (p.id === "free" ? "Start free" : "Start trial")}
            </button>
          )}
        </div>
      ))}

      {showMockModal && mockData && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16, width: "100%", maxWidth: 400, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ background: "#0f766e", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Razorpay Checkout (Simulated)</span>
              <button onClick={() => setShowMockModal(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 20 }}>×</button>
            </div>
            
            <div style={{ padding: 24, textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 4 }}>SUBSCRIPTION ID: {mockData.subscriptionId}</p>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                {mockData.plan.toUpperCase()} Plan
              </h3>
              <p style={{ fontSize: 32, fontWeight: 800, color: "#10b981", marginBottom: 16 }}>
                ${mockData.amount}.00<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)" }}> / mo</span>
              </p>

              {/* QR Code SVG */}
              <svg width="150" height="150" viewBox="0 0 100 100" style={{ margin: "20px auto", display: "block", background: "#fff", padding: 10, borderRadius: 8 }}>
                <rect x="0" y="0" width="100" height="100" fill="#fff" />
                <rect x="5" y="5" width="25" height="25" fill="#000" />
                <rect x="10" y="10" width="15" height="15" fill="#fff" />
                <rect x="13" y="13" width="9" height="9" fill="#000" />
                
                <rect x="70" y="5" width="25" height="25" fill="#000" />
                <rect x="75" y="10" width="15" height="15" fill="#fff" />
                <rect x="78" y="13" width="9" height="9" fill="#000" />
                
                <rect x="5" y="70" width="25" height="25" fill="#000" />
                <rect x="10" y="75" width="15" height="15" fill="#fff" />
                <rect x="13" y="78" width="9" height="9" fill="#000" />

                <rect x="40" y="10" width="10" height="5" fill="#000" />
                <rect x="55" y="15" width="5" height="15" fill="#000" />
                <rect x="35" y="25" width="15" height="5" fill="#000" />
                <rect x="45" y="35" width="15" height="15" fill="#000" />
                <rect x="70" y="45" width="10" height="10" fill="#000" />
                <rect x="25" y="55" width="15" height="5" fill="#000" />
                <rect x="10" y="45" width="5" height="10" fill="#000" />
                <rect x="50" y="65" width="20" height="5" fill="#000" />
                <rect x="80" y="70" width="10" height="15" fill="#000" />
                <rect x="35" y="80" width="15" height="15" fill="#000" />
                <rect x="65" y="85" width="10" height="5" fill="#000" />
              </svg>

              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24, lineHeight: "1.5", padding: "0 10px" }}>
                Scan this simulated QR code with any UPI app to authorize the subscription mandate.
              </p>

              <button 
                onClick={handleSimulateSuccess} 
                disabled={actionLoading === "simulate"}
                style={{ 
                  width: "100%", padding: "12px", borderRadius: 10, border: "none", 
                  background: "#10b981", color: "#fff", fontWeight: 700, 
                  fontSize: 15, cursor: "pointer", transition: "0.2s" 
                }}
                onMouseEnter={e => e.target.style.background = "#059669"}
                onMouseLeave={e => e.target.style.background = "#10b981"}
              >
                {actionLoading === "simulate" ? "Verifying..." : "Simulate Payment Success"}
              </button>
              
              <button 
                onClick={() => setShowMockModal(false)}
                style={{ 
                  width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--glass-border)", 
                  background: "transparent", color: "var(--text-secondary)", fontWeight: 600, 
                  fontSize: 14, cursor: "pointer", marginTop: 12 
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
