import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import PricingPage from "../pages/PricingPage";
import JoinPage from "../pages/JoinPage";
import AuthPage from "../pages/AuthPage";
import AppShell from "../pages/AppShell";
import BillingSuccessPage from "../pages/BillingSuccessPage";
import AdminDashboard from "../pages/admin/AdminDashboard";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<AuthPage defaultView="login" />} />
      <Route path="/register" element={<AuthPage defaultView="register" />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/app/billing/success" element={<BillingSuccessPage />} />
      <Route path="/app/:tab" element={<AppShell />} />
      <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
