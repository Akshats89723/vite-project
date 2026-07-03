import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../ThemeContext";
import { api } from "../api";

function Header({ clockStatus, setClockStatus, currentUser, onLogout, setCurrentTab }) {
  const [currentTime, setCurrentTime]         = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu]        = useState(false);
  const [notifications, setNotifications]      = useState([
    { id: 1, text: "Leave request submitted by Sophia Martinez", time: "10m ago", read: false, icon: "🏖️" },
    { id: 2, text: "Robert Downey applied for React Dev position", time: "1h ago",  read: false, icon: "🎯" },
    { id: 3, text: "Q3 Townhall starts in 2 hours",               time: "2h ago",  read: true,  icon: "📅" },
    { id: 4, text: "Evelyn's performance review is due Friday",   time: "3h ago",  read: true,  icon: "📈" },
  ]);

  const { theme, toggleTheme } = useTheme();
  const notifRef   = useRef(null);
  const userRef    = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = (e) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  const markOneRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (d) => d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  const hour = currentTime.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const displayName = currentUser?.name?.split(" ")[0] || "there";



  const toggleClock = async () => {
    const isDbConnected = localStorage.getItem("pc_token") && !localStorage.getItem("pc_token").startsWith("mock_token_");
    if (clockStatus.isClockedIn) {
      if (isDbConnected) {
        try {
          await api.attendance.clockOut();
          setClockStatus({ isClockedIn: false, time: null });
          window.dispatchEvent(new Event("pc:clock_change"));
        } catch (e) {
          console.error("Clock out failed:", e.message);
        }
      } else {
        setClockStatus({ isClockedIn: false, time: null });
        window.dispatchEvent(new Event("pc:clock_change"));
      }
    } else {
      if (isDbConnected) {
        try {
          const log = await api.attendance.clockIn({ status: "In-Office", notes: "Clocked in from Header" });
          setClockStatus({
            isClockedIn: true,
            time: log.clock_in,
          });
          window.dispatchEvent(new Event("pc:clock_change"));
        } catch (e) {
          console.error("Clock in failed:", e.message);
        }
      } else {
        setClockStatus({
          isClockedIn: true,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
        window.dispatchEvent(new Event("pc:clock_change"));
      }
    }
  };

  // ── Avatar initials fallback ─────────────────────────────────────────────
  const initials = (currentUser?.name || "U")
    .split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  const roleBadgeColor = {
    admin:    { bg: "rgba(168,85,247,0.15)", color: "#c084fc" },
    manager:  { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
    employee: { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  }[currentUser?.role] || { bg: "rgba(255,255,255,0.07)", color: "var(--text-muted)" };

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 0", borderBottom: "1px solid var(--glass-border)",
      marginBottom: "24px", position: "relative",
    }}>

      {/* Greeting */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
          {greeting}, {displayName}! 👋
        </h1>
        <p className="subtitle">{formatDate(currentTime)}</p>
      </div>

      {/* Right side utilities */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

        {/* Live clock */}
        <div style={{
          padding: "8px 12px", borderRadius: "8px",
          background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)",
          fontSize: "13px", fontFamily: "monospace", color: "var(--text-secondary)",
        }}>
          ⏱️ {formatTime(currentTime)}
        </div>

        {/* Clock In/Out */}
        <button
          onClick={toggleClock}
          className={`btn ${clockStatus.isClockedIn ? "btn-secondary" : "btn-primary"}`}
          style={{ padding: "8px 14px", fontSize: "13px", borderColor: clockStatus.isClockedIn ? "var(--success)" : "transparent" }}
        >
          {clockStatus.isClockedIn
            ? <><span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--success)", marginRight: "5px" }} />Clocked In ({clockStatus.time})</>
            : <>⏳ Clock In</>}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="btn btn-secondary"
          style={{ padding: "8px", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setShowNotifications(v => !v); setShowUserMenu(false); }}
            className="btn btn-secondary"
            style={{ padding: "8px", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: "-3px", right: "-3px",
                minWidth: "16px", height: "16px", borderRadius: "8px",
                background: "var(--accent-secondary)",
                fontSize: "9px", fontWeight: "700", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px",
              }}>{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="glass-panel" style={{
              position: "absolute", right: 0, top: "44px", width: "310px", zIndex: 50,
              padding: "14px", background: theme === "dark" ? "rgba(18,20,32,0.97)" : "rgba(255,255,255,0.97)",
              animation: "slideUp 0.2s ease-out",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                  Notifications {unreadCount > 0 && <span style={{ color: "var(--accent-secondary)", fontWeight: "700" }}>({unreadCount} new)</span>}
                </h4>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "11px", color: "var(--accent-primary)", fontFamily: "inherit",
                    fontWeight: "600",
                  }}>Mark all read</button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markOneRead(n.id)}
                    style={{
                      padding: "10px 12px",
                      background: n.read ? "transparent" : "rgba(168,85,247,0.07)",
                      border: `1px solid ${n.read ? "transparent" : "rgba(168,85,247,0.15)"}`,
                      borderRadius: "8px", cursor: "pointer",
                      display: "flex", gap: "10px", alignItems: "flex-start",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "rgba(168,85,247,0.07)"}
                  >
                    <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>{n.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "12px", color: n.read ? "var(--text-secondary)" : "var(--text-primary)", lineHeight: "1.4", fontWeight: n.read ? "400" : "500" }}>
                        {n.text}
                      </p>
                      <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px" }}>{n.time}</p>
                    </div>
                    {!n.read && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent-secondary)", flexShrink: 0, marginTop: "4px" }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setShowUserMenu(v => !v); setShowNotifications(false); }}
            style={{
              display: "flex", alignItems: "center", gap: "9px",
              padding: "6px 10px 6px 6px",
              background: showUserMenu ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
              border: "1px solid var(--glass-border)", borderRadius: "24px",
              cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--glass-border)"}
          >
            {/* Avatar */}
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="avatar" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "white" }}>
                {initials}
              </div>
            )}
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser?.name?.split(" ")[0]}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div className="glass-panel" style={{
              position: "absolute", right: 0, top: "46px", width: "240px", zIndex: 50,
              background: "rgba(18,20,32,0.97)", padding: "8px", animation: "slideUp 0.2s ease-out",
            }}>
              {/* User info */}
              <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid var(--glass-border)", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: "white" }}>
                      {initials}
                    </div>
                  )}
                  <div style={{ overflow: "hidden" }}>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser?.name}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser?.email}</p>
                  </div>
                </div>
                <div style={{ marginTop: "8px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "10px", textTransform: "uppercase", letterSpacing: "0.05em", ...roleBadgeColor }}>
                    {currentUser?.role}
                  </span>
                </div>
              </div>

              {/* Menu items */}
              {[
                { icon: "👤", label: "My Profile",        tab: "profile" },
                { icon: "⚙️", label: "Account Settings",  tab: "profile" },
              ].map(item => (
                <button key={item.label} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  width: "100%", padding: "9px 14px", background: "none",
                  border: "none", borderRadius: "8px", color: "var(--text-secondary)",
                  fontSize: "13px", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                  onClick={() => {
                    if (setCurrentTab) setCurrentTab(item.tab);
                    setShowUserMenu(false);
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}

              <div style={{ borderTop: "1px solid var(--glass-border)", marginTop: "6px", paddingTop: "6px" }}>
                <button
                  onClick={onLogout}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    width: "100%", padding: "9px 14px", background: "none",
                    border: "none", borderRadius: "8px",
                    color: "#f87171", fontSize: "13px", cursor: "pointer",
                    textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <span>🚪</span> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

export default Header;
