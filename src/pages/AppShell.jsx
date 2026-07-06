import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import DashboardView from "../components/views/DashboardView";
import EmployeeDirectoryView from "../components/views/EmployeeDirectoryView";
import LeaveManagementView from "../components/views/LeaveManagementView";
import PerformanceTrackerView from "../components/views/PerformanceTrackerView";
import RecruitmentATSView from "../components/views/RecruitmentATSView";
import PolicyHubView from "../components/views/PolicyHubView";
import AIChatbotView from "../components/views/AIChatbotView";
import DatabaseView from "../components/views/DatabaseView";
import ProfileView from "../components/views/ProfileView";
import TeamView from "../components/views/TeamView";
import AuditLogView from "../components/views/AuditLogView";
import OrgChartView from "../components/views/OrgChartView";
import AttendanceView from "../components/views/AttendanceView";
import ExpenseClaimsView from "../components/views/ExpenseClaimsView";
import BillingPage from "./BillingPage";

import { api, authApi } from "../api";
import { initialEmployees, initialLeaves, initialCandidates } from "../mockData";

const VALID_TABS = new Set([
  "dashboard", "employees", "leaves", "performance", "ats", "policies",
  "chatbot", "database", "profile", "team", "audit", "billing", "org-chart", "attendance", "expenses"
]);

export default function AppShell() {
  const navigate = useNavigate();
  const { tab = "dashboard" } = useParams();
  const currentTab = VALID_TABS.has(tab) ? tab : "dashboard";

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [employees, setEmployees] = useState(initialEmployees);
  const [leaves, setLeaves] = useState(initialLeaves);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [dbConnected, setDbConnected] = useState(false);
  const [clockStatus, setClockStatus] = useState({ isClockedIn: false, time: null });
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem("pc_onboarded"));

  const setTab = useCallback((t) => navigate(`/app/${t}`), [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("pc_token");
    if (!token) { setAuthLoading(false); return; }
    authApi.me()
      .then(user => { setCurrentUser(user); setAuthLoading(false); })
      .catch(() => {
        localStorage.removeItem("pc_token");
        localStorage.removeItem("pc_refresh");
        localStorage.removeItem("pc_user");
        setAuthLoading(false);
      });
  }, []);

  useEffect(() => {
    const handler = () => handleLogout();
    window.addEventListener("pc:logout", handler);
    return () => window.removeEventListener("pc:logout", handler);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([
      api.employees.list(),
      api.leaves.list(),
      api.candidates.list().catch(() => []),
    ])
      .then(async ([emps, lvs, cands]) => {
        const empIds = emps.map(e => e.id);
        const [goalsResults, reviewsResults] = await Promise.all([
          Promise.all(empIds.map(id => api.goals.list(id).catch(() => []))),
          Promise.all(empIds.map(id => api.reviews.list(id).catch(() => []))),
        ]);
        setEmployees(emps.map((e, i) => ({
          ...mapEmployee(e),
          goals: goalsResults[i] || [],
          reviews: reviewsResults[i] || [],
        })));
        setLeaves(lvs.map(mapLeave));
        setCandidates(cands);
        setDbConnected(true);
      })
      .catch(() => console.warn("Backend offline — using mockData"));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !dbConnected) return;
    api.attendance.today()
      .then(log => {
        if (log && log.clock_in) {
          setClockStatus({
            isClockedIn: !log.clock_out,
            time: log.clock_in,
          });
        } else {
          setClockStatus({ isClockedIn: false, time: null });
        }
      })
      .catch(err => console.warn("Could not load clock status:", err.message));
  }, [currentUser, dbConnected]);

  function mapEmployee(e) {
    return {
      ...e,
      joinDate: e.join_date ?? e.joinDate,
      performanceRating: e.performance_rating ?? e.performanceRating,
      goals: e.goals ?? [],
      reviews: e.reviews ?? [],
    };
  }
  function mapLeave(l) {
    return { ...l, startDate: l.start_date ?? l.startDate, endDate: l.end_date ?? l.endDate };
  }

  const handleLogout = () => {
    const refreshToken = localStorage.getItem("pc_refresh");
    if (refreshToken) authApi.logout({ refreshToken }).catch(() => {});
    localStorage.removeItem("pc_token");
    localStorage.removeItem("pc_refresh");
    localStorage.removeItem("pc_user");
    setCurrentUser(null);
    setDbConnected(false);
    setEmployees(initialEmployees);
    setLeaves(initialLeaves);
    setCandidates(initialCandidates);
    navigate("/login");
  };

  const handleApproveLeave = async (id) => {
    setLeaves(prev => prev.map(l => {
      if (l.id === id) {
        setEmployees(e => e.map(emp => emp.name === l.requester ? { ...emp, status: "On Leave" } : emp));
        return { ...l, status: "Approved" };
      }
      return l;
    }));
    if (dbConnected) await api.leaves.setStatus(id, "Approved").catch(console.error);
  };
  const handleRejectLeave = async (id) => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: "Rejected" } : l));
    if (dbConnected) await api.leaves.setStatus(id, "Rejected").catch(console.error);
  };
  const handleSubmitLeave = async (r) => {
    const leaveReq = { ...r, requester: currentUser?.name || r.requester };
    setLeaves(prev => [leaveReq, ...prev]);
    if (dbConnected) await api.leaves.create(leaveReq).catch(console.error);
  };

  const handleToggleGoal = async (empId, goalId) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      const goals = emp.goals.map(g => g.id === goalId ? { ...g, done: !g.done } : g);
      const rating = (3.5 + (goals.filter(g => g.done).length / Math.max(goals.length, 1)) * 1.5).toFixed(1);
      return { ...emp, goals, performanceRating: String(rating) };
    }));
    if (dbConnected) await api.goals.toggle(empId, goalId).catch(console.error);
  };
  const handleAddGoal = async (empId, title) => {
    if (dbConnected) {
      try {
        const newGoal = await api.goals.add(empId, { title });
        setEmployees(prev => prev.map(emp => {
          if (emp.id !== empId) return emp;
          const goals = [...emp.goals, { id: newGoal.id, title: newGoal.title, done: false }];
          const rating = (3.5 + (goals.filter(g => g.done).length / Math.max(goals.length, 1)) * 1.5).toFixed(1);
          return { ...emp, goals, performanceRating: String(rating) };
        }));
        return;
      } catch { /* local fallback */ }
    }
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      const nextId = emp.goals.length ? Math.max(...emp.goals.map(g => g.id)) + 1 : 1;
      const goals = [...emp.goals, { id: nextId, title, done: false }];
      const rating = (3.5 + (goals.filter(g => g.done).length / Math.max(goals.length, 1)) * 1.5).toFixed(1);
      return { ...emp, goals, performanceRating: String(rating) };
    }));
  };
  const handleSubmitReview = async (empId, review) => {
    if (dbConnected) await api.reviews.add(empId, review).catch(() => {});
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      const reviews = [...emp.reviews, review];
      const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
      return { ...emp, reviews, performanceRating: String(avg) };
    }));
  };

  const handleUpdateCandidateStage = async (id, stage) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, stage } : c));
    if (dbConnected) await api.candidates.setStage(id, stage).catch(console.error);
  };
  const handleAddCandidate = async (cand) => {
    setCandidates(prev => [...prev, cand]);
    if (dbConnected) await api.candidates.create(cand).catch(console.error);
  };

  const renderView = () => {
    switch (currentTab) {
      case "dashboard":   return <DashboardView employees={employees} leaves={leaves} candidates={candidates} setTab={setTab} clockStatus={clockStatus} />;
      case "employees":   return <EmployeeDirectoryView employees={employees} onAddEmployee={e => setEmployees(p => [...p, e])} />;
      case "leaves":      return <LeaveManagementView leaves={leaves} onApproveLeave={handleApproveLeave} onRejectLeave={handleRejectLeave} onSubmitLeave={handleSubmitLeave} />;
      case "performance": return <PerformanceTrackerView employees={employees} onToggleGoal={handleToggleGoal} onAddGoal={handleAddGoal} onSubmitReview={handleSubmitReview} />;
      case "ats":         return <RecruitmentATSView candidates={candidates} onUpdateCandidateStage={handleUpdateCandidateStage} onAddCandidate={handleAddCandidate} />;
      case "policies":    return <PolicyHubView />;
      case "chatbot":     return <AIChatbotView clockStatus={clockStatus} setClockStatus={setClockStatus} />;
      case "database":    return <DatabaseView />;
      case "profile":     return <ProfileView currentUser={currentUser} onUserUpdate={setCurrentUser} />;
      case "team":        return <TeamView currentUser={currentUser} />;
      case "audit":       return <AuditLogView />;
      case "billing":     return <BillingPage currentUser={currentUser} />;
      case "org-chart":   return <OrgChartView employees={employees} />;
      case "attendance":  return <AttendanceView employees={employees} currentUser={currentUser} dbConnected={dbConnected} clockStatus={clockStatus} setClockStatus={setClockStatus} />;
      case "expenses":    return <ExpenseClaimsView currentUser={currentUser} dbConnected={dbConnected} />;
      default:            return null;
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)", color: "var(--text-muted)", flexDirection: "column", gap: "14px" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid rgba(168,85,247,0.2)", borderTopColor: "var(--accent-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "14px" }}>Loading PeopleCore...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;

  if (!VALID_TABS.has(tab)) return <Navigate to="/app/dashboard" replace />;

  const showOnboarding = currentUser?.role === "admin" && !onboarded;
  const dismissOnboarding = (goTeam = false) => {
    localStorage.setItem("pc_onboarded", "1");
    setOnboarded(true);
    if (goTeam) setTab("team");
  };

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} setCurrentTab={setTab} dbConnected={dbConnected} currentUser={currentUser} />
      <main className="main-content">
        <Header clockStatus={clockStatus} setClockStatus={setClockStatus} currentUser={currentUser} onLogout={handleLogout} setCurrentTab={setTab} />
        <div style={{ flex: 1 }}>{renderView()}</div>
      </main>
      {showOnboarding && (
        <OnboardingWizard onComplete={() => dismissOnboarding(true)} onSkip={() => dismissOnboarding(false)} />
      )}
    </div>
  );
}
