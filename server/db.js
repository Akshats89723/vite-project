import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, "hrdata.sqlite");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");  // enforce FK constraints

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  -- ── Organizations (tenants) ──────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS organizations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    slug       TEXT UNIQUE NOT NULL COLLATE NOCASE,
    plan       TEXT NOT NULL DEFAULT 'free',   -- free | pro | enterprise
    max_seats  INTEGER NOT NULL DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- ── Users ────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS users (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id             INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    email              TEXT NOT NULL COLLATE NOCASE,
    password_hash      TEXT NOT NULL,
    role               TEXT NOT NULL DEFAULT 'employee'
                         CHECK(role IN ('admin','manager','employee')),
    avatar             TEXT,
    reset_token        TEXT,
    reset_token_expiry INTEGER,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, org_id)
  );

  -- ── Employees ─────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS employees (
    id                 TEXT NOT NULL,
    org_id             INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    email              TEXT NOT NULL,
    role               TEXT,
    department         TEXT,
    status             TEXT DEFAULT 'Active',
    avatar             TEXT,
    join_date          TEXT,
    contact            TEXT,
    manager            TEXT,
    attendance         TEXT,
    performance_rating TEXT,
    salary             TEXT,
    PRIMARY KEY (id, org_id)
  );

  -- ── Leaves ────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS leaves (
    id         TEXT NOT NULL,
    org_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requester  TEXT NOT NULL,
    type       TEXT,
    start_date TEXT,
    end_date   TEXT,
    days       INTEGER,
    status     TEXT DEFAULT 'Pending'
                 CHECK(status IN ('Pending','Approved','Rejected')),
    reason     TEXT,
    PRIMARY KEY (id, org_id)
  );

  -- ── Candidates ────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS candidates (
    id     TEXT NOT NULL,
    org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name   TEXT NOT NULL,
    role   TEXT,
    score  INTEGER,
    stage  TEXT DEFAULT 'Applied'
             CHECK(stage IN ('Applied','Screened','Interviewing','Offered','Rejected')),
    email  TEXT,
    PRIMARY KEY (id, org_id)
  );

  -- ── Chat messages ─────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS chat_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session    TEXT NOT NULL DEFAULT 'default',
    sender     TEXT NOT NULL CHECK(sender IN ('user','bot')),
    text       TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- ── Audit log ─────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action     TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_id  TEXT,
    detail     TEXT,
    ip         TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- ── Refresh tokens ───────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT UNIQUE NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_refresh_token ON refresh_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_refresh_user  ON refresh_tokens(user_id);

  -- ── Goals ─────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS goals (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    emp_id     TEXT NOT NULL,
    title      TEXT NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emp_id, org_id) REFERENCES employees(id, org_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_goals_emp ON goals(emp_id, org_id);

  -- ── Reviews ───────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    emp_id     TEXT NOT NULL,
    reviewer   TEXT NOT NULL,
    relation   TEXT NOT NULL DEFAULT 'Peer',
    rating     INTEGER NOT NULL DEFAULT 5,
    comment    TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_reviews_emp ON reviews(emp_id, org_id);

  -- ── Leave balances ────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS leave_balances (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id       INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_email   TEXT NOT NULL,
    annual_used  INTEGER NOT NULL DEFAULT 0,
    sick_used    INTEGER NOT NULL DEFAULT 0,
    casual_used  INTEGER NOT NULL DEFAULT 0,
    year         INTEGER NOT NULL DEFAULT (strftime('%Y', 'now')),
    UNIQUE(org_id, user_email, year)
  );
  CREATE INDEX IF NOT EXISTS idx_lb_org_email ON leave_balances(org_id, user_email);

  -- ── Notifications ─────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    body       TEXT,
    type       TEXT NOT NULL DEFAULT 'info',
    read       INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);

  -- ── Invite tokens ─────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS invite_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT UNIQUE NOT NULL,
    role       TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('admin','manager','employee')),
    email      TEXT,
    used       INTEGER NOT NULL DEFAULT 0,
    used_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_invite_token ON invite_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_invite_org   ON invite_tokens(org_id);

  -- ── Attendance logs ───────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS attendance_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       TEXT NOT NULL,
    clock_in   TEXT,
    clock_out  TEXT,
    status     TEXT DEFAULT 'In-Office' CHECK(status IN ('In-Office','Remote','On-Site')),
    notes      TEXT,
    UNIQUE(org_id, user_id, date)
  );
  CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance_logs(org_id);

  -- ── Expenses (Mewurk-like module) ──────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS expenses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester  TEXT NOT NULL,
    amount     REAL NOT NULL,
    category   TEXT NOT NULL CHECK(category IN ('Travel', 'Meals', 'Hardware', 'Software', 'L&D', 'Other')),
    date       TEXT NOT NULL,
    status     TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')),
    notes      TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
  CREATE INDEX IF NOT EXISTS idx_expenses_org  ON expenses(org_id);

  -- ── Indexes ───────────────────────────────────────────────────────────────
  CREATE INDEX IF NOT EXISTS idx_users_org        ON users(org_id);
  CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
  CREATE INDEX IF NOT EXISTS idx_employees_org    ON employees(org_id);
  CREATE INDEX IF NOT EXISTS idx_leaves_org       ON leaves(org_id);
  CREATE INDEX IF NOT EXISTS idx_candidates_org   ON candidates(org_id);
  CREATE INDEX IF NOT EXISTS idx_chat_org_session ON chat_messages(org_id, session);
  CREATE INDEX IF NOT EXISTS idx_audit_org        ON audit_log(org_id);
`);

// ── SaaS schema migrations (safe to re-run) ───────────────────────────────────

const SAAS_COLUMNS = [
  "ALTER TABLE organizations ADD COLUMN stripe_customer_id TEXT",
  "ALTER TABLE organizations ADD COLUMN stripe_subscription_id TEXT",
  "ALTER TABLE organizations ADD COLUMN razorpay_customer_id TEXT",
  "ALTER TABLE organizations ADD COLUMN razorpay_subscription_id TEXT",
  "ALTER TABLE organizations ADD COLUMN subscription_status TEXT DEFAULT 'active'",
  "ALTER TABLE organizations ADD COLUMN trial_ends_at INTEGER",
  "ALTER TABLE organizations ADD COLUMN current_period_end INTEGER",
  "ALTER TABLE organizations ADD COLUMN ai_messages_used INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE organizations ADD COLUMN ai_usage_month TEXT",
  "ALTER TABLE organizations ADD COLUMN settings TEXT",
  "ALTER TABLE organizations ADD COLUMN webhook_url TEXT",
  "ALTER TABLE organizations ADD COLUMN webhook_secret TEXT",
];

for (const sql of SAAS_COLUMNS) {
  try { db.exec(sql); } catch { /* column exists */ }
}

// ── Organizations ─────────────────────────────────────────────────────────────

export const orgQueries = {
  byId:   db.prepare("SELECT * FROM organizations WHERE id=?"),
  bySlug: db.prepare("SELECT * FROM organizations WHERE slug=? COLLATE NOCASE"),
  byStripeCustomer: db.prepare("SELECT * FROM organizations WHERE stripe_customer_id=?"),
  byRazorpaySubscription: db.prepare("SELECT * FROM organizations WHERE razorpay_subscription_id=?"),
  listAll: db.prepare("SELECT * FROM organizations ORDER BY created_at DESC"),
  insert: db.prepare(`
    INSERT INTO organizations (name, slug, plan, max_seats, subscription_status, trial_ends_at)
    VALUES (@name, @slug, @plan, @max_seats, @subscription_status, @trial_ends_at)
  `),
  count:  db.prepare("SELECT COUNT(*) as c FROM organizations"),
  updatePlan: db.prepare("UPDATE organizations SET plan=@plan, max_seats=@max_seats WHERE id=@id"),
  updateBilling: db.prepare(`
    UPDATE organizations SET
      plan=@plan, max_seats=@max_seats,
      stripe_customer_id=@stripe_customer_id,
      stripe_subscription_id=@stripe_subscription_id,
      subscription_status=@subscription_status,
      current_period_end=@current_period_end
    WHERE id=@id
  `),
  updateRazorpayBilling: db.prepare(`
    UPDATE organizations SET
      plan=@plan, max_seats=@max_seats,
      razorpay_customer_id=@razorpay_customer_id,
      razorpay_subscription_id=@razorpay_subscription_id,
      subscription_status=@subscription_status,
      current_period_end=@current_period_end
    WHERE id=@id
  `),
  startTrial: db.prepare(`
    UPDATE organizations SET
      plan=@plan, max_seats=@max_seats,
      subscription_status='trialing',
      trial_ends_at=@trial_ends_at,
      stripe_subscription_id=NULL,
      razorpay_subscription_id=NULL,
      current_period_end=NULL
    WHERE id=@id
  `),
  updateSubscriptionStatus: db.prepare("UPDATE organizations SET subscription_status=? WHERE id=?"),
  resetAiUsage: db.prepare("UPDATE organizations SET ai_messages_used=0, ai_usage_month=? WHERE id=?"),
  incrementAiUsage: db.prepare(`
    UPDATE organizations SET
      ai_messages_used = CASE WHEN ai_usage_month=? THEN ai_messages_used + 1 ELSE 1 END,
      ai_usage_month = ?
    WHERE id=?
  `),
  expiredTrials: db.prepare(`
    SELECT * FROM organizations
    WHERE trial_ends_at IS NOT NULL AND trial_ends_at < ?
      AND subscription_status = 'trialing'
      AND stripe_subscription_id IS NULL
      AND razorpay_subscription_id IS NULL
  `),
  delete: db.prepare("DELETE FROM organizations WHERE id=?"),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const userQueries = {
  byEmail:         db.prepare("SELECT * FROM users WHERE email=? COLLATE NOCASE AND org_id=?"),
  byEmailAnyOrg:   db.prepare("SELECT * FROM users WHERE email=? COLLATE NOCASE LIMIT 1"),
  byId:            db.prepare("SELECT id,org_id,name,email,role,avatar,created_at FROM users WHERE id=?"),
  byOrgId:         db.prepare("SELECT id,org_id,name,email,role,avatar,created_at FROM users WHERE org_id=?"),
  byResetToken:    db.prepare("SELECT * FROM users WHERE reset_token=?"),
  insert:          db.prepare(`
    INSERT INTO users (org_id, name, email, password_hash, role, avatar)
    VALUES (@org_id, @name, @email, @password_hash, @role, @avatar)
  `),
  setResetToken:   db.prepare("UPDATE users SET reset_token=@token, reset_token_expiry=@expiry WHERE id=@id"),
  clearResetToken: db.prepare("UPDATE users SET reset_token=NULL, reset_token_expiry=NULL WHERE id=?"),
  updatePassword:  db.prepare("UPDATE users SET password_hash=? WHERE id=?"),
  updateProfile:   db.prepare("UPDATE users SET name=@name, avatar=@avatar WHERE id=@id"),
  count:           db.prepare("SELECT COUNT(*) as c FROM users"),
  countByOrg:      db.prepare("SELECT COUNT(*) as c FROM users WHERE org_id=?"),
};

// ── Employees ─────────────────────────────────────────────────────────────────

export const empQueries = {
  allByOrg:   db.prepare("SELECT * FROM employees WHERE org_id=?"),
  byId:       db.prepare("SELECT * FROM employees WHERE id=? AND org_id=?"),
  insert:     db.prepare(`
    INSERT OR IGNORE INTO employees
      (id,org_id,name,email,role,department,status,avatar,join_date,contact,manager,attendance,performance_rating,salary)
    VALUES
      (@id,@org_id,@name,@email,@role,@department,@status,@avatar,@join_date,@contact,@manager,@attendance,@performance_rating,@salary)
  `),
  update:     db.prepare(`
    UPDATE employees SET status=@status, attendance=@attendance,
      performance_rating=@performance_rating WHERE id=@id AND org_id=@org_id
  `),
};

// ── Leaves ────────────────────────────────────────────────────────────────────

export const leaveQueries = {
  allByOrg:     db.prepare("SELECT * FROM leaves WHERE org_id=? ORDER BY start_date DESC"),
  byId:         db.prepare("SELECT * FROM leaves WHERE id=? AND org_id=?"),
  insert:       db.prepare(`
    INSERT INTO leaves (id,org_id,requester,type,start_date,end_date,days,status,reason)
    VALUES (@id,@org_id,@requester,@type,@start_date,@end_date,@days,@status,@reason)
  `),
  updateStatus: db.prepare("UPDATE leaves SET status=? WHERE id=? AND org_id=?"),
};

// ── Candidates ────────────────────────────────────────────────────────────────

export const candQueries = {
  allByOrg:    db.prepare("SELECT * FROM candidates WHERE org_id=?"),
  insert:      db.prepare(`
    INSERT INTO candidates (id,org_id,name,role,score,stage,email)
    VALUES (@id,@org_id,@name,@role,@score,@stage,@email)
  `),
  updateStage: db.prepare("UPDATE candidates SET stage=? WHERE id=? AND org_id=?"),
};

// ── Chat ──────────────────────────────────────────────────────────────────────

export const chatQueries = {
  insert:  db.prepare("INSERT INTO chat_messages (org_id,user_id,session,sender,text) VALUES (?,?,?,?,?)"),
  history: db.prepare(`
    SELECT id,sender,text,created_at FROM chat_messages
    WHERE org_id=? AND session=? ORDER BY created_at ASC LIMIT 100
  `),
  clear:   db.prepare("DELETE FROM chat_messages WHERE org_id=? AND session=?"),
};

// ── Audit log ─────────────────────────────────────────────────────────────────

export const auditQueries = {
  insert: db.prepare(`
    INSERT INTO audit_log (org_id,user_id,action,entity,entity_id,detail,ip)
    VALUES (@org_id,@user_id,@action,@entity,@entity_id,@detail,@ip)
  `),
  byOrg: db.prepare(`
    SELECT a.*, u.name as user_name FROM audit_log a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.org_id=? ORDER BY a.created_at DESC LIMIT 200
  `),
};

// ── Refresh tokens ────────────────────────────────────────────────────────────

export const refreshTokenQueries = {
  insert:   db.prepare("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)"),
  byToken:  db.prepare("SELECT * FROM refresh_tokens WHERE token=?"),
  delete:   db.prepare("DELETE FROM refresh_tokens WHERE token=?"),
  deleteByUser: db.prepare("DELETE FROM refresh_tokens WHERE user_id=?"),
};

// ── Goals ─────────────────────────────────────────────────────────────────────

export const goalQueries = {
  allByEmp:  db.prepare("SELECT * FROM goals WHERE emp_id=? AND org_id=? ORDER BY created_at ASC"),
  insert:    db.prepare("INSERT INTO goals (org_id, emp_id, title, done) VALUES (@org_id, @emp_id, @title, @done)"),
  toggle:    db.prepare("UPDATE goals SET done=? WHERE id=? AND org_id=?"),
  delete:    db.prepare("DELETE FROM goals WHERE id=? AND org_id=?"),
};

// ── Reviews ───────────────────────────────────────────────────────────────────

export const reviewQueries = {
  allByEmp: db.prepare("SELECT * FROM reviews WHERE emp_id=? AND org_id=? ORDER BY created_at ASC"),
  insert:   db.prepare("INSERT INTO reviews (org_id, emp_id, reviewer, relation, rating, comment) VALUES (@org_id, @emp_id, @reviewer, @relation, @rating, @comment)"),
};

// ── Leave balances ────────────────────────────────────────────────────────────

export const leaveBalanceQueries = {
  get: db.prepare("SELECT * FROM leave_balances WHERE org_id=? AND user_email=? AND year=strftime('%Y','now')"),
  upsert: db.prepare(`
    INSERT INTO leave_balances (org_id, user_email, annual_used, sick_used, casual_used)
      VALUES (@org_id, @user_email, @annual_used, @sick_used, @casual_used)
    ON CONFLICT(org_id, user_email, year)
      DO UPDATE SET
        annual_used  = annual_used  + @annual_used,
        sick_used    = sick_used    + @sick_used,
        casual_used  = casual_used  + @casual_used
  `),
};

// ── Notifications ─────────────────────────────────────────────────────────────

export const notifQueries = {
  forUser:  db.prepare("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50"),
  unread:   db.prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0"),
  insert:   db.prepare("INSERT INTO notifications (org_id, user_id, title, body, type) VALUES (@org_id, @user_id, @title, @body, @type)"),
  markRead: db.prepare("UPDATE notifications SET read=1 WHERE user_id=? AND read=0"),
  markOne:  db.prepare("UPDATE notifications SET read=1 WHERE id=? AND user_id=?"),
};

// ── Invite tokens ────────────────────────────────────────────────────────────

export const inviteQueries = {
  byToken:   db.prepare("SELECT * FROM invite_tokens WHERE token=?"),
  byOrg:     db.prepare("SELECT i.*, u.name as created_by_name FROM invite_tokens i LEFT JOIN users u ON i.created_by=u.id WHERE i.org_id=? ORDER BY i.created_at DESC"),
  insert:    db.prepare(`INSERT INTO invite_tokens (org_id,created_by,token,role,email,expires_at) VALUES (@org_id,@created_by,@token,@role,@email,@expires_at)`),
  markUsed:  db.prepare("UPDATE invite_tokens SET used=1, used_by=@used_by WHERE token=@token"),
  delete:    db.prepare("DELETE FROM invite_tokens WHERE id=? AND org_id=?"),
};

// ── Expenses ─────────────────────────────────────────────────────────────────

export const expenseQueries = {
  byOrg: db.prepare("SELECT * FROM expenses WHERE org_id=? ORDER BY date DESC"),
  byUser: db.prepare("SELECT * FROM expenses WHERE org_id=? AND user_id=? ORDER BY date DESC"),
  insert: db.prepare(`
    INSERT INTO expenses (org_id, user_id, requester, amount, category, date, status, notes)
    VALUES (@org_id, @user_id, @requester, @amount, @category, @date, @status, @notes)
  `),
  updateStatus: db.prepare("UPDATE expenses SET status=? WHERE id=? AND org_id=?"),
};

// ── Seed helper (per-org) ─────────────────────────────────────────────────────

export function seedOrgData(orgId, employees, leaves, candidates) {
  const existing = db.prepare("SELECT COUNT(*) as c FROM employees WHERE org_id=?").get(orgId).c;
  if (existing > 0) return;

  const seedAll = db.transaction(() => {
    for (const e of employees) {
      empQueries.insert.run({
        id: e.id, org_id: orgId, name: e.name, email: e.email, role: e.role,
        department: e.department, status: e.status, avatar: e.avatar,
        join_date: e.joinDate, contact: e.contact, manager: e.manager,
        attendance: e.attendance, performance_rating: e.performanceRating, salary: e.salary,
      });
    }
    for (const l of leaves) {
      leaveQueries.insert.run({
        id: l.id, org_id: orgId, requester: l.requester, type: l.type,
        start_date: l.startDate, end_date: l.endDate, days: l.days,
        status: l.status, reason: l.reason,
      });
    }
    for (const c of candidates) {
      candQueries.insert.run({
        id: c.id, org_id: orgId, name: c.name, role: c.role,
        score: c.score, stage: c.stage, email: c.email,
      });
    }

    // Seed some demo expenses
    const adminUser = db.prepare("SELECT id FROM users WHERE org_id=? LIMIT 1").get(orgId);
    if (adminUser) {
      const expenses = [
        { amount: 150.00, category: "Meals", date: "2026-07-01", status: "Approved", notes: "Client dinner at Bistro" },
        { amount: 1200.00, category: "Hardware", date: "2026-07-03", status: "Pending", notes: "External 4K Monitor upgrade" },
        { amount: 45.50, category: "Travel", date: "2026-07-05", status: "Pending", notes: "Uber ride to client office" }
      ];
      for (const exp of expenses) {
        expenseQueries.insert.run({
          org_id: orgId,
          user_id: adminUser.id,
          requester: "Evelyn Carter",
          amount: exp.amount,
          category: exp.category,
          date: exp.date,
          status: exp.status,
          notes: exp.notes
        });
      }
    }
  });
  seedAll();
  console.log(`✅ Demo data seeded for org #${orgId}`);
}

// ── Attendance logs ─────────────────────────────────────────────────────────

export const attendanceQueries = {
  getToday: db.prepare("SELECT * FROM attendance_logs WHERE org_id=? AND user_id=? AND date=?"),
  insert: db.prepare(`
    INSERT INTO attendance_logs (org_id, user_id, date, clock_in, status, notes)
    VALUES (@org_id, @user_id, @date, @clock_in, @status, @notes)
  `),
  updateClockOut: db.prepare(`
    UPDATE attendance_logs SET clock_out=@clock_out WHERE org_id=@org_id AND user_id=@user_id AND date=@date
  `),
  getHistory: db.prepare(`
    SELECT a.*, u.name as user_name FROM attendance_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.org_id=? AND a.user_id=? ORDER BY a.date DESC LIMIT 100
  `),
  getHistoryAll: db.prepare(`
    SELECT a.*, u.name as user_name FROM attendance_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.org_id=? ORDER BY a.date DESC LIMIT 200
  `),
};

export default db;

