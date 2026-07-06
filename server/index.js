import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { randomBytes } from "crypto";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  orgQueries, userQueries, empQueries, leaveQueries,
  candQueries, chatQueries, auditQueries, inviteQueries, seedOrgData,
  refreshTokenQueries, goalQueries, reviewQueries, leaveBalanceQueries, notifQueries,
  attendanceQueries, expenseQueries,
} from "./db.js";
import db from "./db.js";
import { getAIResponse, getActiveEngine } from "./ai.js";
import { initialEmployees, initialLeaves, initialCandidates } from "../src/mockData.js";
import { sendPasswordReset, sendInvite, sendWelcome } from "./email/index.js";
import { createBillingRouter, handleStripeWebhook, handleRazorpayWebhook } from "./routes/billing.js";
import { createAdminRouter } from "./routes/admin.js";
import { createGdprRouter } from "./routes/gdpr.js";
import { requireFeature, checkSeatLimit } from "./middleware/requirePlan.js";
import { checkAiQuota, incrementAiUsage } from "./middleware/checkAiQuota.js";
import { effectiveMaxSeats, TRIAL_DAYS, getPlanConfig } from "./billing/plans.js";
import { mountStatic } from "./static.js";
import { runTrialExpiryJob } from "./jobs/trialExpiry.js";
import { generatePayslipPdf } from "./billing/payslip.js";
import {
  validate, registerSchema, loginSchema, forgotSchema, resetSchema,
  updateEmployeeSchema, createLeaveSchema, updateLeaveStatusSchema,
  createCandidateSchema, updateCandidateStageSchema, chatMessageSchema,
  updateProfileSchema, changePasswordSchema, createInviteSchema, joinByInviteSchema,
  createExpenseSchema, updateExpenseStatusSchema,
} from "./validators.js";

// ── Config (from .env) ────────────────────────────────────────────────────────

const PORT            = parseInt(process.env.PORT  || "3001", 10);
const CLIENT_ORIGIN   = process.env.CLIENT_ORIGIN  || "http://localhost:5173";
const JWT_SECRET      = process.env.JWT_SECRET;
const JWT_EXPIRY      = process.env.JWT_EXPIRY     || "8h";   // access token TTL
const REFRESH_EXPIRY  = 7 * 24 * 60 * 60 * 1000;             // 7 days in ms
const IS_DEV          = (process.env.NODE_ENV || "development") === "development";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET missing or too short in .env (min 32 chars)");
  process.exit(1);
}

// ── Express setup ─────────────────────────────────────────────────────────────

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));  // adds X-Frame-Options, HSTS, etc.
app.use(cors({ origin: IS_DEV ? true : CLIENT_ORIGIN, credentials: true }));

// Stripe webhook needs raw body (before express.json)
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), (req, res) => {
  handleStripeWebhook(req, res, audit);
});

// Razorpay webhook needs raw body (before express.json)
app.post("/api/billing/razorpay/webhook", express.raw({ type: "application/json" }), (req, res) => {
  handleRazorpayWebhook(req, res, audit);
});

app.use(express.json({ limit: "50kb" }));           // prevent oversized payloads

// Trust proxy (needed for rate-limit IP detection behind nginx/cloud)
app.set("trust proxy", 1);

// ── Rate limiters ─────────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,
  message: { error: "Too many attempts. Please wait 15 minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,
  message: { error: "Too many password reset requests. Try again in 1 hour." },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,
  message: { error: "Chat rate limit exceeded. Slow down a bit." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 200,
  message: { error: "Too many requests. Please slow down." },
});

app.use("/api/", apiLimiter);

// ── Auth middleware ───────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch (e) {
    const msg = e.name === "TokenExpiredError"
      ? "Session expired. Please sign in again."
      : "Invalid token. Please sign in again.";
    res.status(401).json({ error: msg });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}. Your role: ${req.user.role}`
      });
    next();
  };
}

// ── Audit helper ──────────────────────────────────────────────────────────────

function audit(req, action, entity, entityId = null, detail = null) {
  try {
    auditQueries.insert.run({
      org_id:    req.user?.org_id || null,
      user_id:   req.user?.id     || null,
      action,
      entity,
      entity_id: entityId ? String(entityId) : null,
      detail:    detail ? JSON.stringify(detail) : null,
      ip:        req.ip,
    });
  } catch { /* audit failures must never break the main request */ }
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function issueTokens(user) {
  const payload = { id: user.id, org_id: user.org_id, email: user.email, role: user.role };
  const accessToken  = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  const refreshToken = randomBytes(48).toString("hex");
  const expiresAt    = Date.now() + REFRESH_EXPIRY;
  refreshTokenQueries.insert.run(user.id, refreshToken, expiresAt);
  return { accessToken, refreshToken };
}

function notify(orgId, userId, title, body, type = "info") {
  try {
    notifQueries.insert.run({ org_id: orgId, user_id: userId, title, body, type });
  } catch { /* non-critical */ }
}

// ── Slug generator ─────────────────────────────────────────────────────────────

function makeSlug(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

// ── Bootstrap: seed demo org + admin on first run ─────────────────────────────

async function bootstrap() {
  const orgCount = orgQueries.count.get().c;
  if (orgCount > 0) return;  // already bootstrapped

  // Create demo organization
  const orgResult = orgQueries.insert.run({
    name:      "PeopleCore Demo",
    slug:      "peoplecore-demo",
    plan:      "pro",
    max_seats: 50,
    subscription_status: "active",
    trial_ends_at: null,
  });
  const orgId = orgResult.lastInsertRowid;

  // Create admin user
  const hash = await bcrypt.hash("Admin@123", 12);
  userQueries.insert.run({
    org_id:        orgId,
    name:          "Evelyn Carter",
    email:         "evelyn@company.com",
    password_hash: hash,
    role:          "admin",
    avatar:        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
  });

  // Seed demo HR data scoped to this org
  seedOrgData(orgId, initialEmployees, initialLeaves, initialCandidates);

  // Auto-generate matching login credentials for all seeded employees
  for (const emp of initialEmployees) {
    if (emp.email.toLowerCase().trim() === "evelyn@company.com") continue;
    const hashVal = await bcrypt.hash("User@123", 12);
    userQueries.insert.run({
      org_id:        orgId,
      name:          emp.name,
      email:         emp.email.toLowerCase().trim(),
      password_hash: hashVal,
      role:          emp.role.toLowerCase().includes("manager") || emp.role.toLowerCase().includes("director") ? "manager" : "employee",
      avatar:        emp.avatar,
    });
  }

  console.log("🏢 Demo org created: PeopleCore Demo (slug: peoplecore-demo)");
  console.log("👤 Admin: evelyn@company.com / Admin@123");
}
bootstrap();

// ── ─────────────────────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Register — creates a new organization + admin user
app.post("/api/auth/register", authLimiter, validate(registerSchema), async (req, res) => {
  const { name, email, password, orgName, orgSlug } = req.body;

  // Ensure email not already taken (globally — users can't share emails across orgs)
  const existing = userQueries.byEmailAnyOrg.get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: "An account with this email already exists." });

  // Determine org slug
  const rawSlug = orgSlug || makeSlug(orgName || name + "-org");
  const finalSlug = rawSlug + (orgQueries.bySlug.get(rawSlug) ? `-${Date.now()}` : "");

  // Create organization
  const orgResult = orgQueries.insert.run({
    name:      orgName || `${name}'s Organization`,
    slug:      finalSlug,
    plan:      "pro",
    max_seats: getPlanConfig("pro").max_seats,
    subscription_status: "trialing",
    trial_ends_at: Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
  });
  const orgId = orgResult.lastInsertRowid;

  // Create user as admin of their org (role always 'admin' on self-registration)
  const hash = await bcrypt.hash(password, 12);
  const userResult = userQueries.insert.run({
    org_id:        orgId,
    name:          name.trim(),
    email:         email.toLowerCase(),
    password_hash: hash,
    role:          "admin",
    avatar:        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
  });

  const user = userQueries.byId.get(userResult.lastInsertRowid);
  const org  = orgQueries.byId.get(orgId);

  const { accessToken, refreshToken } = issueTokens({ ...user, org_id: orgId });

  audit({ user: { id: user.id, org_id: orgId }, ip: req.ip }, "register", "user", user.id);
  sendWelcome({ email: user.email, name: user.name, orgName: org.name }).catch(() => {});
  res.status(201).json({ token: accessToken, refreshToken, user: { ...user, org } });
});

// Login
app.post("/api/auth/login", authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = userQueries.byEmailAnyOrg.get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid email or password." });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    audit({ user: null, ip: req.ip }, "login_failed", "user", null, { email });
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const org = orgQueries.byId.get(user.org_id);
  const { accessToken, refreshToken } = issueTokens(user);

  const { password_hash, reset_token, reset_token_expiry, ...safeUser } = user;
  audit({ user: { id: user.id, org_id: user.org_id }, ip: req.ip }, "login", "user", user.id);
  res.json({ token: accessToken, refreshToken, user: { ...safeUser, org } });
});

// Get current user
app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = userQueries.byId.get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  const org = orgQueries.byId.get(req.user.org_id);
  res.json({ ...user, org });
});

// Refresh access token
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Refresh token required." });

  const stored = refreshTokenQueries.byToken.get(refreshToken);
  if (!stored)                     return res.status(401).json({ error: "Invalid refresh token." });
  if (Date.now() > stored.expires_at) {
    refreshTokenQueries.delete.run(refreshToken);
    return res.status(401).json({ error: "Refresh token expired. Please sign in again." });
  }

  const user = userQueries.byId.get(stored.user_id);
  if (!user) return res.status(401).json({ error: "User not found." });

  // Rotate refresh token
  refreshTokenQueries.delete.run(refreshToken);
  const { accessToken, refreshToken: newRefresh } = issueTokens(user);
  res.json({ token: accessToken, refreshToken: newRefresh });
});

// Logout — invalidate refresh token
app.post("/api/auth/logout", requireAuth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokenQueries.delete.run(refreshToken);
  audit(req, "logout", "user", req.user.id);
  res.json({ ok: true });
});

// Forgot password
app.post("/api/auth/forgot-password", forgotLimiter, validate(forgotSchema), (req, res) => {
  const { email } = req.body;
  const user = userQueries.byEmailAnyOrg.get(email.toLowerCase());

  // Always respond identically to prevent email enumeration
  if (!user) return res.json({ message: "If that email exists, a reset code has been sent." });

  const token  = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 15 * 60 * 1000;
  userQueries.setResetToken.run({ token, expiry, id: user.id });

  sendPasswordReset({ email, code: token }).catch(err => console.warn("Email send failed:", err.message));

  if (IS_DEV) {
    console.log(`🔑 Password reset code for ${email}: ${token}`);
    return res.json({
      message:    "If that email exists, a reset code has been sent.",
      resetToken: token,
      note:       "Dev mode: code also returned in response.",
    });
  }

  res.json({ message: "If that email exists, a reset code has been sent." });
});

// Reset password
app.post("/api/auth/reset-password", authLimiter, validate(resetSchema), async (req, res) => {
  const { token, newPassword } = req.body;

  const user = userQueries.byResetToken.get(token);
  if (!user)                          return res.status(400).json({ error: "Invalid or expired reset code." });
  if (Date.now() > user.reset_token_expiry) return res.status(400).json({ error: "Reset code has expired. Please request a new one." });

  const hash = await bcrypt.hash(newPassword, 12);
  userQueries.updatePassword.run(hash, user.id);
  userQueries.clearResetToken.run(user.id);

  audit({ user: { id: user.id, org_id: user.org_id }, ip: req.ip }, "password_reset", "user", user.id);
  res.json({ message: "Password updated successfully. You can now sign in." });
});

// ── ─────────────────────────────────────────────────────────────────────────
// ORGANIZATION
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/org", requireAuth, (req, res) => {
  const org = orgQueries.byId.get(req.user.org_id);
  if (!org) return res.status(404).json({ error: "Organization not found." });
  res.json(org);
});

app.get("/api/org/members", requireAuth, requireRole("admin", "manager"), (req, res) => {
  res.json(userQueries.byOrgId.all(req.user.org_id));
});

// ── ─────────────────────────────────────────────────────────────────────────
// HEALTH / STATUS
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/status", async (req, res) => {
  const engine = await getActiveEngine();
  res.json({
    ok:        true,
    engine,
    timestamp: new Date().toISOString(),
    env:       IS_DEV ? "development" : "production",
  });
});

// ── ─────────────────────────────────────────────────────────────────────────
// CHAT  (org-scoped, auth required)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/chat/history", requireAuth, (req, res) => {
  const session = (req.query.session || "default").slice(0, 100);
  res.json(chatQueries.history.all(req.user.org_id, session));
});

app.post("/api/chat/message", requireAuth, chatLimiter, checkAiQuota, validate(chatMessageSchema), async (req, res) => {
  const { message, session = "default" } = req.body;
  const { org_id, id: userId } = req.user;
  const org = orgQueries.byId.get(org_id);

  chatQueries.insert.run(org_id, userId, session, "user", message);

  const history = chatQueries.history.all(org_id, session).slice(-20);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const fullReply = await getAIResponse(message, history, res, org);
    if (fullReply) {
      chatQueries.insert.run(org_id, null, session, "bot", fullReply);
      incrementAiUsage(org_id);
    }
  } catch (err) {
    console.error("AI error:", err);
    res.write(`data: ${JSON.stringify({ error: "AI engine error", done: true })}\n\n`);
  }
  res.end();
});

app.delete("/api/chat/history", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const session = (req.query.session || "default").slice(0, 100);
  chatQueries.clear.run(req.user.org_id, session);
  audit(req, "clear_chat", "chat_messages", null, { session });
  res.json({ ok: true });
});

// ── ─────────────────────────────────────────────────────────────────────────
// EMPLOYEES  (org-scoped)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/employees", requireAuth, (req, res) => {
  res.json(empQueries.allByOrg.all(req.user.org_id));
});

app.post("/api/employees", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const e = req.body;
  empQueries.insert.run({
    id: e.id, org_id: req.user.org_id, name: e.name, email: e.email,
    role: e.role, department: e.department, status: e.status || "Active",
    avatar: e.avatar, join_date: e.joinDate || e.join_date, contact: e.contact,
    manager: e.manager, attendance: e.attendance || "100%",
    performance_rating: e.performanceRating || e.performance_rating || "5.0",
    salary: e.salary,
  });
  audit(req, "create_employee", "employees", e.id);
  res.status(201).json(empQueries.byId.get(e.id, req.user.org_id));
});

app.patch("/api/employees/:id", requireAuth, requireRole("admin", "manager"), validate(updateEmployeeSchema), (req, res) => {
  const { status, attendance, performance_rating } = req.body;
  empQueries.update.run({ id: req.params.id, org_id: req.user.org_id, status, attendance, performance_rating });
  audit(req, "update_employee", "employees", req.params.id, req.body);
  res.json(empQueries.byId.get(req.params.id, req.user.org_id));
});

// ── ─────────────────────────────────────────────────────────────────────────
// LEAVES  (org-scoped)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/leaves", requireAuth, (req, res) => {
  res.json(leaveQueries.allByOrg.all(req.user.org_id));
});

app.post("/api/leaves", requireAuth, validate(createLeaveSchema), (req, res) => {
  const l = req.body;
  const start = l.start_date || l.startDate;
  const end   = l.end_date   || l.endDate;
  // Use the current user's name as requester (not a hardcoded value)
  const user = userQueries.byId.get(req.user.id);
  const requester = l.requester || user?.name || "Unknown";
  leaveQueries.insert.run({
    id: l.id, org_id: req.user.org_id, requester,
    type: l.type, start_date: start, end_date: end,
    days: l.days, status: l.status || "Pending", reason: l.reason,
  });
  audit(req, "submit_leave", "leaves", l.id);

  // Update leave balance
  try {
    const delta = { annual_used: 0, sick_used: 0, casual_used: 0 };
    if (l.type === "Annual Leave") delta.annual_used = l.days || 1;
    else if (l.type === "Sick Leave") delta.sick_used = l.days || 1;
    else delta.casual_used = l.days || 1;
    leaveBalanceQueries.upsert.run({ org_id: req.user.org_id, user_email: user?.email || "", ...delta });
  } catch { /* non-critical */ }

  // Notify managers
  try {
    const managers = db.prepare("SELECT id FROM users WHERE org_id=? AND role IN ('admin','manager')").all(req.user.org_id);
    for (const m of managers) {
      notifQueries.insert.run({ org_id: req.user.org_id, user_id: m.id, title: "Leave Request", body: `${requester} submitted a ${l.type} request`, type: "info" });
    }
  } catch { /* non-critical */ }

  res.status(201).json(leaveQueries.byId.get(l.id, req.user.org_id));
});

app.patch("/api/leaves/:id/status", requireAuth, requireRole("admin", "manager"), validate(updateLeaveStatusSchema), (req, res) => {
  leaveQueries.updateStatus.run(req.body.status, req.params.id, req.user.org_id);
  audit(req, `leave_${req.body.status.toLowerCase()}`, "leaves", req.params.id);

  // Notify the leave requester
  try {
    const leave = leaveQueries.byId.get(req.params.id, req.user.org_id);
    if (leave) {
      const requesterUser = db.prepare("SELECT id FROM users WHERE org_id=? AND name=? COLLATE NOCASE LIMIT 1").get(req.user.org_id, leave.requester);
      if (requesterUser) {
        notifQueries.insert.run({
          org_id: req.user.org_id, user_id: requesterUser.id,
          title: `Leave ${req.body.status}`,
          body: `Your ${leave.type} request has been ${req.body.status.toLowerCase()}`,
          type: req.body.status === "Approved" ? "success" : "warning",
        });
      }
    }
  } catch { /* non-critical */ }

  res.json(leaveQueries.byId.get(req.params.id, req.user.org_id));
});

// ── ─────────────────────────────────────────────────────────────────────────
// EXPENSES (Mewurk-like module)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/expenses", requireAuth, (req, res) => {
  try {
    const isAdminOrManager = ["admin", "manager"].includes(req.user.role);
    if (isAdminOrManager) {
      res.json(expenseQueries.byOrg.all(req.user.org_id));
    } else {
      res.json(expenseQueries.byUser.all(req.user.org_id, req.user.id));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expenses", requireAuth, validate(createExpenseSchema), (req, res) => {
  const { amount, category, date, notes } = req.body;
  try {
    const user = userQueries.byId.get(req.user.id);
    const result = expenseQueries.insert.run({
      org_id: req.user.org_id,
      user_id: req.user.id,
      requester: user?.name || "Unknown",
      amount,
      category,
      date,
      status: "Pending",
      notes: notes || null
    });

    audit(req, "create_expense", "expenses", result.lastInsertRowid, { amount, category });

    // Notify managers/admins of the new claim
    try {
      const managers = db.prepare("SELECT id FROM users WHERE org_id=? AND role IN ('admin','manager')").all(req.user.org_id);
      for (const m of managers) {
        if (m.id !== req.user.id) {
          notifQueries.insert.run({
            org_id: req.user.org_id,
            user_id: m.id,
            title: "New Expense Claim",
            body: `${user?.name || "An employee"} submitted a $${amount} claim for ${category}`,
            type: "info"
          });
        }
      }
    } catch { /* non-critical */ }

    res.status(201).json(db.prepare("SELECT * FROM expenses WHERE id=?").get(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/expenses/:id/status", requireAuth, requireRole("admin", "manager"), validate(updateExpenseStatusSchema), (req, res) => {
  const { status } = req.body;
  try {
    const expense = db.prepare("SELECT * FROM expenses WHERE id=? AND org_id=?").get(req.params.id, req.user.org_id);
    if (!expense) return res.status(404).json({ error: "Expense claim not found." });

    expenseQueries.updateStatus.run(status, req.params.id, req.user.org_id);
    audit(req, `expense_${status.toLowerCase()}`, "expenses", req.params.id);

    // Notify employee
    try {
      notifQueries.insert.run({
        org_id: req.user.org_id,
        user_id: expense.user_id,
        title: `Expense Claim ${status}`,
        body: `Your claim of $${expense.amount} for ${expense.category} has been ${status.toLowerCase()}`,
        type: status === "Approved" ? "success" : "warning"
      });
    } catch { /* non-critical */ }

    res.json(db.prepare("SELECT * FROM expenses WHERE id=?").get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ─────────────────────────────────────────────────────────────────────────
// PAYSLIP RECEIPT GENERATION
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/payslips/download/:month", requireAuth, async (req, res) => {
  const { month } = req.params;
  try {
    const user = userQueries.byId.get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const org = orgQueries.byId.get(req.user.org_id);

    // Try to find matching employee metadata in employees table to get salary & role details
    let employee = db.prepare("SELECT * FROM employees WHERE org_id=? AND email=? LIMIT 1").get(req.user.org_id, user.email);
    if (!employee) {
      // If not found in employees, create a mock configuration
      employee = {
        id: `EMP${String(user.id).padStart(3, "0")}`,
        role: user.role === "admin" ? "Engineering Manager" : user.role === "manager" ? "HR Lead" : "Senior Developer",
        department: user.role === "admin" ? "Engineering" : "Operations",
        salary: "$95,000",
      };
    }

    const pdfBuffer = await generatePayslipPdf({
      orgName: org?.name || "PeopleCore Organization",
      employeeName: user.name,
      employeeId: employee.id,
      role: employee.role,
      department: employee.department,
      salary: employee.salary,
      month: month,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=payslip_${month.replace(/\s+/g, "_")}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation failed:", err);
    res.status(500).json({ error: "Failed to generate payslip PDF" });
  }
});

// ── ─────────────────────────────────────────────────────────────────────────
// CANDIDATES  (org-scoped)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/candidates", requireAuth, ...requireFeature("ats"), (req, res) => {
  res.json(candQueries.allByOrg.all(req.user.org_id));
});

app.post("/api/candidates", requireAuth, requireRole("admin", "manager"), ...requireFeature("ats"), validate(createCandidateSchema), (req, res) => {
  const c = req.body;
  candQueries.insert.run({
    id: c.id, org_id: req.user.org_id, name: c.name,
    role: c.role, score: c.score, stage: c.stage || "Applied", email: c.email,
  });
  audit(req, "add_candidate", "candidates", c.id);
  res.status(201).json(c);
});

app.patch("/api/candidates/:id/stage", requireAuth, requireRole("admin", "manager"), ...requireFeature("ats"), validate(updateCandidateStageSchema), (req, res) => {
  candQueries.updateStage.run(req.body.stage, req.params.id, req.user.org_id);
  audit(req, "update_candidate_stage", "candidates", req.params.id, { stage: req.body.stage });
  res.json({ id: req.params.id, stage: req.body.stage });
});

// ── ─────────────────────────────────────────────────────────────────────────
// GOALS  (org-scoped, per employee)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/employees/:id/goals", requireAuth, (req, res) => {
  res.json(goalQueries.allByEmp.all(req.params.id, req.user.org_id));
});

app.post("/api/employees/:id/goals", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title is required." });
  const result = goalQueries.insert.run({ org_id: req.user.org_id, emp_id: req.params.id, title: title.trim(), done: 0 });
  audit(req, "add_goal", "goals", result.lastInsertRowid, { emp_id: req.params.id });
  res.status(201).json(db.prepare("SELECT * FROM goals WHERE id=?").get(result.lastInsertRowid));
});

app.patch("/api/employees/:empId/goals/:goalId/toggle", requireAuth, (req, res) => {
  const goal = db.prepare("SELECT * FROM goals WHERE id=? AND org_id=?").get(req.params.goalId, req.user.org_id);
  if (!goal) return res.status(404).json({ error: "Goal not found." });
  goalQueries.toggle.run(goal.done ? 0 : 1, req.params.goalId, req.user.org_id);
  res.json(db.prepare("SELECT * FROM goals WHERE id=?").get(req.params.goalId));
});

// ── ─────────────────────────────────────────────────────────────────────────
// REVIEWS  (org-scoped, per employee)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/employees/:id/reviews", requireAuth, (req, res) => {
  res.json(reviewQueries.allByEmp.all(req.params.id, req.user.org_id));
});

app.post("/api/employees/:id/reviews", requireAuth, (req, res) => {
  const { reviewer, relation, rating, comment } = req.body;
  if (!comment?.trim()) return res.status(400).json({ error: "Comment is required." });
  const result = reviewQueries.insert.run({
    org_id: req.user.org_id, emp_id: req.params.id,
    reviewer: reviewer || "Anonymous", relation: relation || "Peer",
    rating: Math.min(5, Math.max(1, parseInt(rating) || 5)), comment: comment.trim(),
  });
  audit(req, "submit_review", "reviews", result.lastInsertRowid, { emp_id: req.params.id });
  res.status(201).json(db.prepare("SELECT * FROM reviews WHERE id=?").get(result.lastInsertRowid));
});

// ── ─────────────────────────────────────────────────────────────────────────
// LEAVE BALANCES
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/leaves/balance", requireAuth, (req, res) => {
  const user = userQueries.byId.get(req.user.id);
  const balance = leaveBalanceQueries.get.get(req.user.org_id, user?.email || "") || {
    annual_used: 0, sick_used: 0, casual_used: 0
  };
  res.json({
    annual_total: 18, annual_used: balance.annual_used, annual_remaining: 18 - balance.annual_used,
    sick_total: 12,   sick_used: balance.sick_used,     sick_remaining: 12 - balance.sick_used,
    casual_total: 6,  casual_used: balance.casual_used, casual_remaining: 6 - balance.casual_used,
  });
});

// ── ─────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/notifications", requireAuth, (req, res) => {
  const items  = notifQueries.forUser.all(req.user.id);
  const unread = notifQueries.unread.get(req.user.id)?.c || 0;
  res.json({ items, unread });
});

app.patch("/api/notifications/read", requireAuth, (req, res) => {
  notifQueries.markRead.run(req.user.id);
  res.json({ ok: true });
});

app.patch("/api/notifications/:id/read", requireAuth, (req, res) => {
  notifQueries.markOne.run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ── ─────────────────────────────────────────────────────────────────────────
// AUDIT LOG  (admin only)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/audit", requireAuth, requireRole("admin"), ...requireFeature("audit"), (req, res) => {
  res.json(auditQueries.byOrg.all(req.user.org_id));
});

// ── ─────────────────────────────────────────────────────────────────────────
// DB VIEWER  (admin only, explicit allowlist — no regex sanitize)
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_TABLES = new Set([
  "organizations", "users", "employees", "leaves",
  "candidates", "chat_messages", "audit_log",
]);

app.get("/api/db/tables", requireAuth, requireRole("admin"), (req, res) => {
  if (!IS_DEV) return res.status(404).json({ error: "Not available in production." });
  res.json([...ALLOWED_TABLES]);
});

app.get("/api/db/table/:name", requireAuth, requireRole("admin"), (req, res) => {
  if (!IS_DEV) return res.status(404).json({ error: "Not available in production." });
  const name = req.params.name;
  if (!ALLOWED_TABLES.has(name))
    return res.status(400).json({ error: "Table not allowed." });

  // Scope all tables to org_id where applicable (not organizations table itself)
  const hasOrgId = !["organizations"].includes(name);
  try {
    let rows;
    if (hasOrgId) {
      rows = db.prepare(`SELECT * FROM ${name} WHERE org_id=? ORDER BY rowid DESC LIMIT 200`)
                .all(req.user.org_id);
    } else {
      // Admin can only see their own org record
      rows = db.prepare(`SELECT * FROM ${name} WHERE id=?`).all(req.user.org_id);
    }
    const cols = rows.length ? Object.keys(rows[0]) : 
      db.prepare(`PRAGMA table_info(${name})`).all().map(r => r.name);
    res.json({ cols, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ─────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

// GET my profile
app.get("/api/profile", requireAuth, (req, res) => {
  const user = userQueries.byId.get(req.user.id);
  const org  = orgQueries.byId.get(req.user.org_id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ ...user, org });
});

// PATCH update profile (name, avatar)
app.patch("/api/profile", requireAuth, validate(updateProfileSchema), (req, res) => {
  const { name, avatar } = req.body;
  const current = userQueries.byId.get(req.user.id);
  userQueries.updateProfile.run({
    id:     req.user.id,
    name:   name   || current.name,
    avatar: avatar !== undefined ? avatar : current.avatar,
  });
  audit(req, "update_profile", "users", req.user.id);
  res.json(userQueries.byId.get(req.user.id));
});

// POST change password
app.post("/api/profile/change-password", requireAuth, validate(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(400).json({ error: "Current password is incorrect." });
  const hash = await bcrypt.hash(newPassword, 12);
  userQueries.updatePassword.run(hash, req.user.id);
  audit(req, "change_password", "users", req.user.id);
  res.json({ message: "Password changed successfully." });
});

// ── ─────────────────────────────────────────────────────────────────────────
// INVITES
// ─────────────────────────────────────────────────────────────────────────────

// GET list invites (admin/manager)
app.get("/api/invites", requireAuth, requireRole("admin", "manager"), (req, res) => {
  res.json(inviteQueries.byOrg.all(req.user.org_id));
});

// POST create invite link
app.post("/api/invites", requireAuth, requireRole("admin", "manager"), checkSeatLimit, validate(createInviteSchema), async (req, res) => {
  const { role = "employee", email = "" } = req.body;
  const org = orgQueries.byId.get(req.user.org_id);
  const currentSeats = userQueries.countByOrg.get(req.user.org_id).c;
  const maxSeats = effectiveMaxSeats(org);
  if (currentSeats >= maxSeats) {
    return res.status(403).json({
      error: `Seat limit reached. Your ${org.plan} plan allows ${maxSeats} members. Upgrade to add more.`,
      code: "SEAT_LIMIT_REACHED",
      plan: org.plan,
      max_seats: maxSeats,
      current_seats: currentSeats,
    });
  }
  const token = randomBytes(24).toString("hex");
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  inviteQueries.insert.run({
    org_id: req.user.org_id, created_by: req.user.id,
    token, role, email: email || null, expires_at: expires,
  });
  const inviteUrl = `${CLIENT_ORIGIN}/join?token=${token}`;
  if (email) {
    sendInvite({ email, orgName: org.name, inviteUrl, role }).catch(() => {});
  }
  audit(req, "create_invite", "invite_tokens", null, { role, email });
  res.status(201).json({ token, role, expires_at: expires, invite_url: inviteUrl });
});

// DELETE revoke invite
app.delete("/api/invites/:id", requireAuth, requireRole("admin", "manager"), (req, res) => {
  inviteQueries.delete.run(req.params.id, req.user.org_id);
  audit(req, "revoke_invite", "invite_tokens", req.params.id);
  res.json({ ok: true });
});

// GET validate invite token (public — used on join page)
app.get("/api/invites/validate/:token", (req, res) => {
  const invite = inviteQueries.byToken.get(req.params.token);
  if (!invite) return res.status(404).json({ error: "Invalid invite link." });
  if (invite.used) return res.status(410).json({ error: "This invite has already been used." });
  if (Date.now() > invite.expires_at) return res.status(410).json({ error: "This invite link has expired." });
  const org = orgQueries.byId.get(invite.org_id);
  res.json({ valid: true, org: { name: org.name, slug: org.slug }, role: invite.role, email: invite.email });
});

// POST join via invite token
app.post("/api/auth/join", authLimiter, validate(joinByInviteSchema), async (req, res) => {
  const { name, email, password, inviteToken } = req.body;
  const invite = inviteQueries.byToken.get(inviteToken);
  if (!invite || invite.used)         return res.status(400).json({ error: "Invalid or already-used invite." });
  if (Date.now() > invite.expires_at) return res.status(400).json({ error: "Invite link has expired." });

  // If invite was for a specific email, enforce it
  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase())
    return res.status(400).json({ error: `This invite was sent to ${invite.email}.` });

  // Check seat limit
  const org = orgQueries.byId.get(invite.org_id);
  const currentSeats = userQueries.countByOrg.get(invite.org_id).c;
  const maxSeats = effectiveMaxSeats(org);
  if (currentSeats >= maxSeats)
    return res.status(403).json({ error: `Organization has reached its seat limit (${maxSeats}).`, code: "SEAT_LIMIT_REACHED" });

  const existing = userQueries.byEmail.get(email.toLowerCase(), invite.org_id);
  if (existing) return res.status(409).json({ error: "An account with this email already exists in this organization." });

  const hash = await bcrypt.hash(password, 12);
  const result = userQueries.insert.run({
    org_id: invite.org_id, name: name.trim(),
    email: email.toLowerCase(), password_hash: hash,
    role: invite.role,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
  });

  inviteQueries.markUsed.run({ used_by: result.lastInsertRowid, token: inviteToken });

  const user  = userQueries.byId.get(result.lastInsertRowid);
  const { accessToken, refreshToken } = issueTokens({ ...user, org_id: invite.org_id });
  audit({ user: { id: user.id, org_id: invite.org_id }, ip: req.ip }, "join_via_invite", "users", user.id);
  res.status(201).json({ token: accessToken, refreshToken, user: { ...user, org } });
});

// ── Attendance logs endpoints ────────────────────────────────────────────────
app.get("/api/attendance/today", requireAuth, (req, res) => {
  const dateStr = new Date().toISOString().split("T")[0];
  try {
    const row = attendanceQueries.getToday.get(req.user.org_id, req.user.id, dateStr);
    res.json(row || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/attendance/clock-in", requireAuth, (req, res) => {
  const dateStr = new Date().toISOString().split("T")[0];
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const { status = "In-Office", notes = "" } = req.body;
  try {
    const existing = attendanceQueries.getToday.get(req.user.org_id, req.user.id, dateStr);
    if (existing) return res.status(400).json({ error: "Already clocked in today." });

    attendanceQueries.insert.run({
      org_id: req.user.org_id,
      user_id: req.user.id,
      date: dateStr,
      clock_in: timeStr,
      status,
      notes,
    });
    const created = attendanceQueries.getToday.get(req.user.org_id, req.user.id, dateStr);
    audit(req, "clock_in", "attendance_logs", created.id, { status });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/attendance/clock-out", requireAuth, (req, res) => {
  const dateStr = new Date().toISOString().split("T")[0];
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  try {
    const existing = attendanceQueries.getToday.get(req.user.org_id, req.user.id, dateStr);
    if (!existing) return res.status(400).json({ error: "Not clocked in today yet." });
    if (existing.clock_out) return res.status(400).json({ error: "Already clocked out today." });

    attendanceQueries.updateClockOut.run({
      org_id: req.user.org_id,
      user_id: req.user.id,
      date: dateStr,
      clock_out: timeStr,
    });
    const updated = attendanceQueries.getToday.get(req.user.org_id, req.user.id, dateStr);
    audit(req, "clock_out", "attendance_logs", updated.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/attendance/history", requireAuth, (req, res) => {
  try {
    const isAdminOrManager = ["admin", "manager"].includes(req.user.role);
    const rows = isAdminOrManager
      ? attendanceQueries.getHistoryAll.all(req.user.org_id)
      : attendanceQueries.getHistory.all(req.user.org_id, req.user.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Resume parser endpoint ───────────────────────────────────────────────────
app.post("/api/candidates/parse-resume", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText?.trim()) {
    return res.status(400).json({ error: "Resume text is required." });
  }

  const engine = await getActiveEngine();
  if (engine === "openai" || engine === "ollama") {
    const prompt = `Analyze the following resume text and extract candidate information. You MUST respond with a raw JSON object (and absolutely nothing else, no markdown fences, no wrappers, just raw JSON) matching this exact format:
{
  "name": "Candidate Full Name (or Unknown)",
  "email": "Candidate Email Address (or empty string)",
  "role": "Match the candidate's core expertise against exactly one of these: 'React Developer', 'UX Designer', 'DevOps Engineer'",
  "score": a suitability score integer between 40 and 100 based on their experience quality
}

Resume Text:
${resumeText}`;

    try {
      let parsedJson = null;
      if (engine === "openai") {
        const key = process.env.OPENAI_API_KEY;
        const apiRes = await fetch(`${process.env.OPENAI_BASE || "https://api.openai.com/v1"}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL || "gpt-4o-mini",
            messages: [
              { role: "system", content: "You extract candidate details in strict JSON." },
              { role: "user", content: prompt }
            ],
            temperature: 0.1
          }),
        });
        if (apiRes.ok) {
          const body = await apiRes.json();
          let content = body.choices?.[0]?.message?.content?.trim() || "";
          if (content.startsWith("```json")) content = content.slice(7);
          if (content.startsWith("```")) content = content.slice(3);
          if (content.endsWith("```")) content = content.slice(0, -3);
          parsedJson = JSON.parse(content.trim());
        }
      } else if (engine === "ollama") {
        const apiRes = await fetch(`${process.env.OLLAMA_BASE || "http://127.0.0.1:11434"}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: process.env.OLLAMA_MODEL || "llama3.2",
            messages: [
              { role: "system", content: "You extract candidate details in strict JSON." },
              { role: "user", content: prompt }
            ],
            stream: false,
            options: { temperature: 0.1 }
          }),
        });
        if (apiRes.ok) {
          const body = await apiRes.json();
          let content = body.message?.content?.trim() || "";
          if (content.startsWith("```json")) content = content.slice(7);
          if (content.startsWith("```")) content = content.slice(3);
          if (content.endsWith("```")) content = content.slice(0, -3);
          parsedJson = JSON.parse(content.trim());
        }
      }

      if (parsedJson && parsedJson.name) {
        return res.json(parsedJson);
      }
    } catch (e) {
      console.warn("AI resume parsing failed, running regex fallback:", e.message);
    }
  }

  // Regex fallback in case of no AI or parser failures
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9_-]+)/;
  const emailMatch = resumeText.match(emailRegex);
  const email = emailMatch ? emailMatch[0] : "";

  const lines = resumeText.split("\\n").map(l => l.trim()).filter(Boolean);
  let name = "Unknown Candidate";
  if (lines.length > 0) {
    const candidateName = lines[0].replace(/[^a-zA-Z\\s]/g, "").trim();
    if (candidateName && candidateName.length > 2 && candidateName.split(/\\s+/).length <= 4) {
      name = candidateName;
    }
  }

  let role = "React Developer";
  const lowerText = resumeText.toLowerCase();
  if (lowerText.includes("ux") || lowerText.includes("design") || lowerText.includes("figma") || lowerText.includes("ui")) {
    role = "UX Designer";
  } else if (lowerText.includes("devops") || lowerText.includes("aws") || lowerText.includes("docker") || lowerText.includes("kubernetes") || lowerText.includes("ci/cd")) {
    role = "DevOps Engineer";
  }

  let score = 75;
  const keywords = ["senior", "lead", "years experience", "architect", "expert", "bachelor", "master", "typescript", "react", "redux"];
  let matches = 0;
  keywords.forEach(kw => {
    if (lowerText.includes(kw)) matches++;
  });
  score = Math.min(100, 70 + matches * 3);

  res.json({ name, email, role, score });
});

// ── SaaS routes ───────────────────────────────────────────────────────────────

app.use("/api/billing", createBillingRouter({ requireAuth, requireRole, audit, CLIENT_ORIGIN }));
app.use("/api/admin", createAdminRouter({ requireAuth, audit }));
app.use("/api/gdpr", createGdprRouter({ requireAuth, requireRole, audit }));

// ── 404 & error handlers ──────────────────────────────────────────────────────

app.use((req, res) => res.status(404).json({ error: "Route not found." }));

app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: IS_DEV ? err.message : "Internal server error." });
});

// ── Start ─────────────────────────────────────────────────────────────────────

runTrialExpiryJob();
setInterval(runTrialExpiryJob, 60 * 60 * 1000);

if (!IS_DEV) mountStatic(app);

createServer(app).listen(PORT, () => {
  console.log(`\n🚀 PeopleCore API  →  http://localhost:${PORT}`);
  console.log(`🌐 CORS origin     →  ${CLIENT_ORIGIN}`);
  getActiveEngine().then(engine => {
    console.log(`🤖 AI engine       →  ${engine}`);
    console.log(`💾 Database        →  SQLite (server/hrdata.sqlite)`);
    console.log(`🔒 Security        →  Helmet + Rate limiting + Zod validation`);
    console.log(`🏢 Multi-tenancy   →  org_id scoping on all tables`);
    console.log(`💳 Billing         →  Stripe: ${process.env.STRIPE_SECRET_KEY ? "enabled" : "not configured"}, Razorpay: ${process.env.RAZORPAY_KEY_ID ? "enabled" : "not configured"}\n`);
  });
});
