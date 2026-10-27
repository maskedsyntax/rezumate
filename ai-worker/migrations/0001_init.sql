-- One row per app install. id is the install UUID the app keeps in its keychain.
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, trial_remaining INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);

-- Lifetime Pro purchases. Each purchase grants AI actions once; the grant moves with the
-- purchase when it is restored on another install.
CREATE TABLE IF NOT EXISTS pro_grants (original_transaction_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, bonus_remaining INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS pro_grants_user ON pro_grants (user_id);

-- AI subscriptions, refreshed whenever the app syncs its App Store entitlements.
CREATE TABLE IF NOT EXISTS subscriptions (original_transaction_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, product_id TEXT NOT NULL, expires_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS subscriptions_user ON subscriptions (user_id);

-- Counters: kind 'ai' per month (subscription cap) and 'req' per day (rate limit).
CREATE TABLE IF NOT EXISTS usage (user_id TEXT NOT NULL, period TEXT NOT NULL, kind TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, period, kind));
