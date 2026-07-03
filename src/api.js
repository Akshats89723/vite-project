/**
 * api.js — PeopleCore REST client
 * All requests automatically include the JWT from localStorage.
 * Handles silent token refresh via refresh tokens.
 * Falls back to mock authentication when the backend is unavailable.
 */

const BASE = import.meta.env?.VITE_API_BASE || `http://${window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname}:3001/api`;

// ── Mock auth (offline fallback) ───────────────────────────────────────────────
const MOCK_USERS = [
  { id: 1, name: "Evelyn Carter",  email: "evelyn@company.com",  password: "Admin@123",  role: "admin",    orgId: 1, orgName: "Demo Corp", avatar: null },
  { id: 2, name: "James Wilson",   email: "james@company.com",   password: "Admin@123",  role: "employee", orgId: 1, orgName: "Demo Corp", avatar: null },
];

function makeMockToken(userId) {
  return `mock_token_${userId}_${Date.now()}`;
}

function isMockToken(token) {
  return token && token.startsWith("mock_token_");
}

function getMockUserId(token) {
  if (!isMockToken(token)) return null;
  const parts = token.split("_");
  return parseInt(parts[2], 10) || null;
}

function getToken()        { return localStorage.getItem("pc_token"); }
function getRefreshToken() { return localStorage.getItem("pc_refresh"); }

let isRefreshing = false;
let refreshQueue = [];

function drainQueue(newToken, error) {
  refreshQueue.forEach(fn => fn(newToken, error));
  refreshQueue = [];
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    // Refresh failed — force logout
    localStorage.removeItem("pc_token");
    localStorage.removeItem("pc_refresh");
    localStorage.removeItem("pc_user");
    window.dispatchEvent(new Event("pc:logout"));
    throw new Error("Session expired");
  }

  const data = await res.json();
  localStorage.setItem("pc_token",   data.token);
  localStorage.setItem("pc_refresh", data.refreshToken);
  return data.token;
}

async function req(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res = await fetch(`${BASE}${path}`, { headers, ...options });

  // Silent refresh on 401
  if (res.status === 401 && getRefreshToken()) {
    if (isRefreshing) {
      // Queue this request until refresh completes
      const newToken = await new Promise((resolve, reject) => {
        refreshQueue.push((tok, err) => err ? reject(err) : resolve(tok));
      });
      res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    } else {
      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        drainQueue(newToken, null);
        res = await fetch(`${BASE}${path}`, {
          ...options,
          headers: { ...headers, Authorization: `Bearer ${newToken}` },
        });
      } catch (err) {
        drainQueue(null, err);
        throw err;
      } finally {
        isRefreshing = false;
      }
    }
  }

  // If still 401 after refresh attempt — hard logout
  if (res.status === 401) {
    localStorage.removeItem("pc_token");
    localStorage.removeItem("pc_refresh");
    localStorage.removeItem("pc_user");
    window.dispatchEvent(new Event("pc:logout"));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API ${options.method || "GET"} ${path} → ${res.status}`);
  }

  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (body) => {
    try {
      const data = await req("/auth/login", { method: "POST", body: JSON.stringify(body) });
      if (data.refreshToken) localStorage.setItem("pc_refresh", data.refreshToken);
      return data;
    } catch (err) {
      // Network/backend unavailable — try mock auth
      if (err.message === "Failed to fetch" || err.message.includes("fetch")) {
        const mockUser = MOCK_USERS.find(
          u => u.email.toLowerCase() === body.email.toLowerCase() && u.password === body.password
        );
        if (!mockUser) throw new Error("Invalid email or password");
        const { password, ...safeUser } = mockUser;
        const token = makeMockToken(safeUser.id);
        return { token, user: safeUser };
      }
      throw err;
    }
  },
  register: async (body) => {
    try {
      const data = await req("/auth/register", { method: "POST", body: JSON.stringify(body) });
      if (data.refreshToken) localStorage.setItem("pc_refresh", data.refreshToken);
      return data;
    } catch (err) {
      // Network/backend unavailable — create a local mock account
      if (err.message === "Failed to fetch" || err.message.includes("fetch")) {
        const exists = MOCK_USERS.find(u => u.email.toLowerCase() === body.email.toLowerCase());
        if (exists) throw new Error("An account with this email already exists");
        const newUser = {
          id: Date.now(),
          name: body.name,
          email: body.email,
          role: "admin",
          orgName: body.orgName || "My Company",
          orgId: Date.now(),
          avatar: null,
        };
        const token = makeMockToken(newUser.id);
        // Store mock user so authApi.me can retrieve it
        localStorage.setItem("pc_mock_user", JSON.stringify(newUser));
        return { token, user: newUser };
      }
      throw err;
    }
  },
  join: async (body) => {
    try {
      const data = await req("/auth/join", { method: "POST", body: JSON.stringify(body) });
      if (data.refreshToken) localStorage.setItem("pc_refresh", data.refreshToken);
      return data;
    } catch (err) {
      if (err.message === "Failed to fetch" || err.message.includes("fetch")) {
        throw new Error("Cannot join — backend is offline. Please try again later.");
      }
      throw err;
    }
  },
  me: async () => {
    const token = getToken();
    // If this is a mock token, serve user from localStorage without hitting API
    if (isMockToken(token)) {
      const userId = getMockUserId(token);
      // Check built-in mock users first
      const builtIn = MOCK_USERS.find(u => u.id === userId);
      if (builtIn) {
        const { password, ...safeUser } = builtIn;
        return safeUser;
      }
      // Fall back to a registered mock user stored in localStorage
      const stored = localStorage.getItem("pc_mock_user");
      if (stored) {
        try { return JSON.parse(stored); } catch { /* ignore */ }
      }
      // Also try pc_user as last resort
      const pcUser = localStorage.getItem("pc_user");
      if (pcUser) {
        try { return JSON.parse(pcUser); } catch { /* ignore */ }
      }
      throw new Error("User not found");
    }
    return req("/auth/me");
  },
  logout: async (body) => {
    const token = getToken();
    if (isMockToken(token)) {
      localStorage.removeItem("pc_mock_user");
      return {};
    }
    return req("/auth/logout", { method: "POST", body: JSON.stringify(body || {}) });
  },
  forgotPassword: (body) => req("/auth/forgot-password", { method: "POST", body: JSON.stringify(body) }),
  resetPassword:  (body) => req("/auth/reset-password",  { method: "POST", body: JSON.stringify(body) }),
};

// ── Profile ────────────────────────────────────────────────────────────────────
export const profileApi = {
  get:            ()     => req("/profile"),
  update:         (body) => req("/profile",                 { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body) => req("/profile/change-password", { method: "POST",  body: JSON.stringify(body) }),
};

// ── Invites ────────────────────────────────────────────────────────────────────
export const inviteApi = {
  list:     ()      => req("/invites"),
  create:   (body)  => req("/invites",                    { method: "POST",   body: JSON.stringify(body) }),
  revoke:   (id)    => req(`/invites/${id}`,              { method: "DELETE" }),
  validate: (token) => req(`/invites/validate/${token}`),
};

// ── Organization ───────────────────────────────────────────────────────────────
export const orgApi = {
  get:        ()     => req("/org"),
  members:    ()     => req("/org/members"),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifApi = {
  list:     ()    => req("/notifications"),
  markAll:  ()    => req("/notifications/read",    { method: "PATCH" }),
  markOne:  (id)  => req(`/notifications/${id}/read`, { method: "PATCH" }),
};

// ── HR Data ────────────────────────────────────────────────────────────────────
export const api = {
  employees: {
    list:   ()           => req("/employees"),
    create: (body)       => req("/employees",    { method: "POST",  body: JSON.stringify(body) }),
    update: (id, body)   => req(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },

  goals: {
    list:   (empId)            => req(`/employees/${empId}/goals`),
    add:    (empId, body)      => req(`/employees/${empId}/goals`,           { method: "POST",  body: JSON.stringify(body) }),
    toggle: (empId, goalId)    => req(`/employees/${empId}/goals/${goalId}/toggle`, { method: "PATCH" }),
  },

  reviews: {
    list:   (empId)       => req(`/employees/${empId}/reviews`),
    add:    (empId, body) => req(`/employees/${empId}/reviews`, { method: "POST",  body: JSON.stringify(body) }),
  },

  leaves: {
    list:      ()              => req("/leaves"),
    balance:   ()              => req("/leaves/balance"),
    create:    (body)          => req("/leaves",              { method: "POST",  body: JSON.stringify(body) }),
    setStatus: (id, status)    => req(`/leaves/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  },

  candidates: {
    list:     ()              => req("/candidates"),
    create:   (body)          => req("/candidates",              { method: "POST",  body: JSON.stringify(body) }),
    setStage: (id, stage)     => req(`/candidates/${id}/stage`,  { method: "PATCH", body: JSON.stringify({ stage }) }),
    parseResume: (resumeText) => req("/candidates/parse-resume", { method: "POST",  body: JSON.stringify({ resumeText }) }),
  },

  attendance: {
    today:    ()              => req("/attendance/today"),
    clockIn:  (body)          => req("/attendance/clock-in",  { method: "POST", body: JSON.stringify(body) }),
    clockOut: ()              => req("/attendance/clock-out", { method: "POST", body: JSON.stringify({}) }),
    history:  ()              => req("/attendance/history"),
  },

  audit: {
    list: () => req("/audit"),
  },

  db: {
    tables: ()        => req("/db/tables"),
    query:  (table)   => req(`/db/table/${encodeURIComponent(table)}`),
  },
};

// ── Billing ────────────────────────────────────────────────────────────────────
export const billingApi = {
  plans:        ()           => req("/billing/plans"),
  subscription: ()           => req("/billing/subscription"),
  checkout:     (plan)       => req("/billing/checkout", { method: "POST", body: JSON.stringify({ plan }) }),
  razorpayCheckout: (plan)   => req("/billing/razorpay/checkout", { method: "POST", body: JSON.stringify({ plan }) }),
  simulateRazorpaySuccess: (plan, subscriptionId) => req("/billing/razorpay/simulate-success", { method: "POST", body: JSON.stringify({ plan, subscriptionId }) }),
  startTrial:   (plan)       => req("/billing/start-trial", { method: "POST", body: JSON.stringify({ plan }) }),
  portal:       ()           => req("/billing/portal", { method: "POST", body: JSON.stringify({}) }),
};

// ── Admin (super-admin) ───────────────────────────────────────────────────────
export const adminApi = {
  stats: () => req("/admin/stats"),
  orgs:  () => req("/admin/orgs"),
};

// ── GDPR ──────────────────────────────────────────────────────────────────────
export const gdprApi = {
  export: ()     => req("/gdpr/export"),
  deleteOrg: ()  => req("/gdpr/org", { method: "DELETE", body: JSON.stringify({ confirm: "DELETE" }) }),
};
