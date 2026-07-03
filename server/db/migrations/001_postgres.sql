-- PostgreSQL schema for PeopleCore (docker-compose init)
-- App currently uses SQLite by default; use this when migrating to Postgres.

CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  max_seats INTEGER NOT NULL DEFAULT 10,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'active',
  trial_ends_at BIGINT,
  current_period_end BIGINT,
  ai_messages_used INTEGER NOT NULL DEFAULT 0,
  ai_usage_month TEXT,
  settings TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('admin','manager','employee')),
  avatar TEXT,
  reset_token TEXT,
  reset_token_expiry BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, org_id)
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
