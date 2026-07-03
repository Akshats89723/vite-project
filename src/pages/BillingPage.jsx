import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { billingApi } from "../api";

function PlanBadge({ plan }) {
  const colors = {
    free: { bg: "rgba(255,255,255,0.07)", color: "var(--text-muted)" },
    pro: { bg: "rgba(168,85,247,0.15)", color: "#c084fc" },
    enterprise: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  };
  const s = colors[plan?.toLowerCase()] || colors.free;
  return (
    <span style={{ padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, textTransform: "uppercase", background: s.bg, color: s.color }}>{plan || "free"}</span>
  );
}
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

export default function BillingPage({ currentUser }) {
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockData, setMockData] = useState(null);

  const isMockSession = (() => {
    const t = localStorage.getItem("pc_token");
    return t && t.startsWith("mock_token_");
  })();

  const isAdmin = currentUser?.role === "admin";

  const MOCK_SUB = {
    plan: "free",
    plan_label: "Free",
    max_seats: 5,
    current_seats: 2,
    subscription_status: "active",
    trial_ends_at: null,
    current_period_end: null,
    ai_messages_used: 0,
    ai_limit: 50,
    stripe_enabled: false,
    has_stripe_customer: false,
    razorpay_enabled: true,
    has_razorpay_customer: false,
  };

  useEffect(() => {
    if (isMockSession) {
      setSub(MOCK_SUB);
      setLoading(false);
      return;
    }
    billingApi.subscription()
      .then(setSub)
      .catch(err => {
        // If the backend is offline, show mock data silently
        const isNetworkError = err.message === "Failed to fetch" || err.message.includes("fetch") || err.message.includes("NetworkError");
        if (isNetworkError) {
          setSub(MOCK_SUB);
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckout = async (plan) => {
    setActionLoading(plan);
    setError("");
    try {
      const { url } = await billingApi.checkout(plan);
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setActionLoading("");
    }
  };

  const handleRazorpayCheckout = async (plan) => {
    setActionLoading(`rzp-${plan}`);
    setError("");
    try {
      const res = await billingApi.razorpayCheckout(plan);

      if (res.is_mock) {
        setMockData({
          plan,
          amount: plan === "pro" ? 29 : 99,
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
        description: `Upgrade to ${plan.toUpperCase()}`,
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
    } catch (err) {
      setError(err.message);
      setActionLoading("");
    }
  };

  const handleSimulateSuccess = async () => {
    if (!mockData) return;
    setActionLoading("rzp-simulate");
    try {
      await billingApi.simulateRazorpaySuccess(mockData.plan, mockData.subscriptionId);
      setShowMockModal(false);
      navigate(`/app/billing/success?gateway=razorpay&subscription_id=${mockData.subscriptionId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading("");
    }
  };

  const handlePortal = async () => {
    setActionLoading("portal");
    try {
      const { url } = await billingApi.portal();
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setActionLoading("");
    }
  };

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Loading billing...</div>;

  const seatPct = sub ? Math.min((sub.current_seats / sub.max_seats) * 100, 100) : 0;
  const aiPct = sub?.ai_limit > 0 ? Math.min((sub.ai_messages_used / sub.ai_limit) * 100, 100) : 0;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Billing & Plan</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 28 }}>Manage your subscription and usage.</p>

      {error && <div style={{ padding: 12, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", marginBottom: 20, fontSize: 13 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20, marginBottom: 32 }}>
        <div style={{ padding: 24, borderRadius: 16, background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>Current Plan</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <PlanBadge plan={sub?.plan} />
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{sub?.plan_label}</span>
          </div>
          {sub?.trial_ends_at && sub.plan !== "free" && (
            <p style={{ fontSize: 13, color: "var(--warning)" }}>Trial ends {new Date(sub.trial_ends_at).toLocaleDateString()}</p>
          )}
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Status: {sub?.subscription_status}</p>
        </div>

        <div style={{ padding: 24, borderRadius: 16, background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>Seats</p>
          <p style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{sub?.current_seats} / {sub?.max_seats}</p>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)" }}>
            <div style={{ height: "100%", width: `${seatPct}%`, background: seatPct >= 90 ? "var(--danger)" : "var(--accent-primary)", borderRadius: 3 }} />
          </div>
        </div>

        <div style={{ padding: 24, borderRadius: 16, background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>AI Messages (this month)</p>
          <p style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            {sub?.ai_messages_used} {sub?.ai_limit > 0 ? `/ ${sub.ai_limit}` : ""}
          </p>
          {sub?.ai_limit > 0 && (
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)" }}>
              <div style={{ height: "100%", width: `${aiPct}%`, background: aiPct >= 90 ? "var(--danger)" : "var(--success)", borderRadius: 3 }} />
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div style={{ padding: 24, borderRadius: 16, background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Upgrade or manage</h2>
          {!sub?.stripe_enabled && !sub?.razorpay_enabled ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Billing is not configured on this server. Enable Stripe or Razorpay in <code>.env</code>.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {sub?.stripe_enabled && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Pay with Stripe</h3>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {(sub?.plan !== "pro" || sub?.subscription_status === "trialing") && (
                      <button onClick={() => handleCheckout("pro")} disabled={!!actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                        {actionLoading === "pro" ? "Redirecting..." : "Upgrade to Pro — $29/mo"}
                      </button>
                    )}
                    {(sub?.plan !== "enterprise" || sub?.subscription_status === "trialing") && (
                      <button onClick={() => handleCheckout("enterprise")} disabled={!!actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-primary)", fontWeight: 600, cursor: "pointer" }}>
                        {actionLoading === "enterprise" ? "Redirecting..." : "Enterprise — $99/mo"}
                      </button>
                    )}
                    {sub?.has_stripe_customer && (
                      <button onClick={handlePortal} disabled={!!actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
                        {actionLoading === "portal" ? "Opening..." : "Manage subscription"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {sub?.razorpay_enabled && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Pay with Razorpay</h3>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {(sub?.plan !== "pro" || sub?.subscription_status === "trialing") && (
                      <button onClick={() => handleRazorpayCheckout("pro")} disabled={!!actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                        {actionLoading === "rzp-pro" ? "Opening Razorpay..." : "Upgrade to Pro — $29/mo"}
                      </button>
                    )}
                    {(sub?.plan !== "enterprise" || sub?.subscription_status === "trialing") && (
                      <button onClick={() => handleRazorpayCheckout("enterprise")} disabled={!!actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-primary)", fontWeight: 600, cursor: "pointer" }}>
                        {actionLoading === "rzp-enterprise" ? "Opening Razorpay..." : "Enterprise — $99/mo"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={() => navigate("/pricing")} style={{ marginTop: 16, background: "none", border: "none", color: "var(--accent-primary)", cursor: "pointer", fontSize: 13 }}>Compare all plans →</button>
        </div>
      )}

      {!isAdmin && (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Contact your organization admin to change the plan.</p>
      )}

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
                disabled={actionLoading === "rzp-simulate"}
                style={{ 
                  width: "100%", padding: "12px", borderRadius: 10, border: "none", 
                  background: "#10b981", color: "#fff", fontWeight: 700, 
                  fontSize: 15, cursor: "pointer", transition: "0.2s" 
                }}
                onMouseEnter={e => e.target.style.background = "#059669"}
                onMouseLeave={e => e.target.style.background = "#10b981"}
              >
                {actionLoading === "rzp-simulate" ? "Verifying..." : "Simulate Payment Success"}
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
