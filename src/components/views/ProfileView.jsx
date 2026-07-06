import React, { useState, useEffect } from "react";
import { profileApi } from "../../api";

// ── Password strength helper ──────────────────────────────────────────────────
function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: "Weak",   color: "var(--danger)"  };
  if (score <= 3) return { score, label: "Fair",   color: "var(--warning)" };
  return              { score, label: "Strong", color: "var(--success)"  };
}

// ── Inline alert ──────────────────────────────────────────────────────────────
function Alert({ type, message }) {
  if (!message) return null;
  const styles = {
    success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#34d399" },
    error:   { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  color: "#f87171" },
  }[type] || {};
  return (
    <div style={{
      padding: "10px 14px", borderRadius: "8px",
      background: styles.bg, border: `1px solid ${styles.border}`,
      color: styles.color, fontSize: "13px", marginTop: "12px",
    }}>
      {message}
    </div>
  );
}

// ── Plan badge ────────────────────────────────────────────────────────────────
function PlanBadge({ plan }) {
  const colors = {
    free:       { bg: "rgba(107,114,128,0.15)", color: "#9ca3af" },
    starter:    { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa" },
    pro:        { bg: "rgba(168,85,247,0.15)",  color: "#c084fc" },
    enterprise: { bg: "rgba(245,158,11,0.15)",  color: "#fbbf24" },
  }[plan?.toLowerCase()] || { bg: "rgba(255,255,255,0.07)", color: "var(--text-muted)" };
  return (
    <span style={{
      padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "700",
      textTransform: "uppercase", letterSpacing: "0.06em",
      background: colors.bg, color: colors.color,
    }}>
      {plan || "free"}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ProfileView({ currentUser, onUserUpdate }) {
  // ── Profile panel state ──────────────────────────────────────────────────
  const [profileName,   setProfileName]   = useState(currentUser?.name   || "");
  const [profileAvatar, setProfileAvatar] = useState(currentUser?.avatar || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { type, text }

  // ── Password panel state ─────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading,  setPwdLoading]  = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null); // { type, text }

  const strength = getPasswordStrength(newPwd);

  // Keep form in sync if parent re-fetches user
  useEffect(() => {
    setProfileName(currentUser?.name   || "");
    setProfileAvatar(currentUser?.avatar || "");
  }, [currentUser]);

  // ── Save profile ─────────────────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const updated = await profileApi.update({
        name:   profileName.trim(),
        avatar: profileAvatar.trim() || null,
      });
      onUserUpdate(prev => ({ ...prev, ...updated }));
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      await profileApi.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setPwdMsg({ type: "success", text: "Password changed successfully." });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      setPwdMsg({ type: "error", text: err.message || "Failed to change password." });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDownloadPayslip = (month) => {
    const token = localStorage.getItem("pc_token");
    const downloadUrl = profileApi.downloadPayslip(month);
    
    fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error("Could not download payslip");
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip_${month.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch(err => {
      alert("Error downloading payslip: " + err.message);
    });
  };

  const org = currentUser?.org || {};
  const seatsUsed  = org.seats_used  ?? org.seatsUsed  ?? 0;
  const seatsTotal = org.seats_total ?? org.seatsTotal ?? "∞";

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1000px" }}>
      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 className="h1-title" style={{ fontSize: "24px" }}>My Profile</h2>
        <p className="subtitle">Manage your account details and security settings.</p>
      </div>

      {/* Two-panel row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

        {/* ── Left: Profile info ──────────────────────────────────────────── */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "20px" }}>
            Profile Information
          </h3>

          {/* Avatar preview */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
            {profileAvatar ? (
              <img
                src={profileAvatar}
                alt="Avatar"
                onError={e => { e.target.style.display = "none"; }}
                style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent-primary)" }}
              />
            ) : (
              <div style={{
                width: "72px", height: "72px", borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px", fontWeight: "700", color: "#fff",
              }}>
                {(currentUser?.name || "U").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
              </div>
            )}
            <div>
              <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>{currentUser?.name}</p>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{currentUser?.email}</p>
              <span style={{
                display: "inline-block", marginTop: "5px",
                padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600",
                textTransform: "capitalize",
                background: currentUser?.role === "admin"   ? "rgba(168,85,247,0.15)" :
                             currentUser?.role === "manager" ? "rgba(59,130,246,0.15)"  : "rgba(16,185,129,0.15)",
                color:       currentUser?.role === "admin"   ? "#c084fc" :
                             currentUser?.role === "manager" ? "#60a5fa"  : "#34d399",
              }}>
                {currentUser?.role}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Display Name
              </label>
              <input
                type="text"
                className="form-control"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="form-group">
              <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Avatar URL
              </label>
              <input
                type="url"
                className="form-control"
                value={profileAvatar}
                onChange={e => setProfileAvatar(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                value={currentUser?.email || ""}
                readOnly
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                Email cannot be changed here.
              </p>
            </div>

            <Alert type={profileMsg?.type} message={profileMsg?.text} />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={profileLoading}
              style={{ marginTop: "16px", width: "100%", opacity: profileLoading ? 0.7 : 1 }}
            >
              {profileLoading ? "Saving…" : "Save Profile"}
            </button>
          </form>
        </div>

        {/* ── Right: Change password ───────────────────────────────────────── */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "20px" }}>
            Change Password
          </h3>

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Current Password
              </label>
              <input
                type="password"
                className="form-control"
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                placeholder="Enter current password"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                New Password
              </label>
              <input
                type="password"
                className="form-control"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                autoComplete="new-password"
              />
              {/* Strength bar */}
              {newPwd && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: "2px",
                      width: `${(strength.score / 5) * 100}%`,
                      background: strength.color,
                      transition: "width 0.3s ease, background 0.3s ease",
                    }} />
                  </div>
                  <p style={{ fontSize: "11px", color: strength.color, marginTop: "4px" }}>
                    Strength: {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Confirm New Password
              </label>
              <input
                type="password"
                className="form-control"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password"
                required
                autoComplete="new-password"
                style={{
                  borderColor: confirmPwd && confirmPwd !== newPwd
                    ? "var(--danger)"
                    : confirmPwd && confirmPwd === newPwd
                    ? "var(--success)"
                    : undefined,
                }}
              />
            </div>

            <Alert type={pwdMsg?.type} message={pwdMsg?.text} />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={pwdLoading}
              style={{ marginTop: "16px", width: "100%", opacity: pwdLoading ? 0.7 : 1 }}
            >
              {pwdLoading ? "Updating…" : "Change Password"}
            </button>
          </form>
        </div>
      </div>

      {/* ── Org info card ────────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: "20px 24px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Organization
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "32px", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Org Name</p>
            <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
              {org.name || "—"}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Plan</p>
            <PlanBadge plan={org.plan} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Seats</p>
            <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
              {seatsUsed} / {seatsTotal}
            </p>
          </div>
        </div>
      </div>

      {/* ── Salary & Payslips card ────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: "20px 24px", marginTop: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Salary & Payslips (Mewurk-like Payroll)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "30px", alignItems: "start" }}>
          {/* Salary Breakdown */}
          <div style={{ padding: "16px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)" }}>
            <h4 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>Monthly Salary Structure</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.06)", paddingBottom: "4px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Basic Salary (50%)</span>
                <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>$3,958.33</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.06)", paddingBottom: "4px" }}>
                <span style={{ color: "var(--text-secondary)" }}>House Rent Allowance (30%)</span>
                <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>$2,375.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.06)", paddingBottom: "4px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Special Allowance (20%)</span>
                <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>$1,583.33</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.06)", paddingBottom: "4px", color: "var(--danger)" }}>
                <span>Provident Fund (PF)</span>
                <span>-$475.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.06)", paddingBottom: "4px", color: "var(--danger)" }}>
                <span>Professional Tax (PT)</span>
                <span>-$150.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", fontWeight: "600", fontSize: "13px", color: "#c084fc" }}>
                <span>Net Take-Home Pay</span>
                <span>$7,291.66</span>
              </div>
            </div>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "12px" }}>
              * Breakdown calculated based on annual salary of $95,000.
            </p>
          </div>

          {/* Payslips Download */}
          <div>
            <h4 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>Recent Payslips</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {["June 2026", "May 2026", "April 2026"].map((month) => (
                <div key={month} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", borderRadius: "8px",
                  background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "20px" }}>📄</span>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>{month}</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>PDF Payslip</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadPayslip(month)}
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                  >
                    📥 Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileView;
