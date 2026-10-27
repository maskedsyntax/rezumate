import { HttpError, intVar } from "./http";

export interface AccessStatus {
  subscriptionActive: boolean;
  subscriptionExpiresAt: number | null;
  monthlyRemaining: number;
  bonusRemaining: number;
  trialRemaining: number;
  totalRemaining: number;
}

export interface LedgerConfig {
  trialActions: number;
  proBonusActions: number;
  subscriptionMonthlyCap: number;
  dailyRequestLimit: number;
}

export function ledgerConfig(env: Env): LedgerConfig {
  return {
    trialActions: intVar(env.TRIAL_ACTIONS, 3),
    proBonusActions: intVar(env.PRO_BONUS_ACTIONS, 25),
    subscriptionMonthlyCap: intVar(env.SUBSCRIPTION_MONTHLY_CAP, 300),
    dailyRequestLimit: intVar(env.DAILY_REQUEST_LIMIT, 100),
  };
}

const monthKey = (now: number) => new Date(now).toISOString().slice(0, 7);
const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10);

export async function userExists(db: D1Database, userId: string): Promise<boolean> {
  return (await db.prepare("SELECT 1 FROM users WHERE id = ?").bind(userId).first()) !== null;
}

export async function createUser(db: D1Database, userId: string, trialRemaining: number, now = Date.now()): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO users (id, trial_remaining, created_at) VALUES (?, ?, ?)")
    .bind(userId, trialRemaining, now)
    .run();
}

export async function accessStatus(db: D1Database, userId: string, config: LedgerConfig, now = Date.now()): Promise<AccessStatus> {
  const [user, subscription, bonus, monthly] = await db.batch<Record<string, number | null>>([
    db.prepare("SELECT trial_remaining FROM users WHERE id = ?").bind(userId),
    db
      .prepare("SELECT MAX(expires_at) AS expires_at FROM subscriptions WHERE user_id = ? AND expires_at > ?")
      .bind(userId, now),
    db.prepare("SELECT COALESCE(SUM(bonus_remaining), 0) AS bonus FROM pro_grants WHERE user_id = ?").bind(userId),
    db
      .prepare("SELECT count FROM usage WHERE user_id = ? AND period = ? AND kind = 'ai'")
      .bind(userId, monthKey(now)),
  ]);

  const expiresAt = (subscription.results[0]?.expires_at as number | null) ?? null;
  const subscriptionActive = expiresAt !== null;
  const usedThisMonth = (monthly.results[0]?.count as number | undefined) ?? 0;
  const monthlyRemaining = subscriptionActive ? Math.max(0, config.subscriptionMonthlyCap - usedThisMonth) : 0;
  const bonusRemaining = (bonus.results[0]?.bonus as number | undefined) ?? 0;
  const trialRemaining = (user.results[0]?.trial_remaining as number | undefined) ?? 0;

  return {
    subscriptionActive,
    subscriptionExpiresAt: expiresAt,
    monthlyRemaining,
    bonusRemaining,
    trialRemaining,
    totalRemaining: monthlyRemaining + bonusRemaining + trialRemaining,
  };
}

/** Counts every AI request against a per-user daily limit, charged or not. */
export async function recordRequest(db: D1Database, userId: string, config: LedgerConfig, now = Date.now()): Promise<void> {
  const row = await db
    .prepare(
      "INSERT INTO usage (user_id, period, kind, count) VALUES (?, ?, 'req', 1) " +
        "ON CONFLICT (user_id, period, kind) DO UPDATE SET count = count + 1 RETURNING count",
    )
    .bind(userId, dayKey(now))
    .first<{ count: number }>();
  if ((row?.count ?? 0) > config.dailyRequestLimit) {
    throw new HttpError(429, "rate_limited", "Daily AI limit reached. Try again tomorrow.");
  }
}

/**
 * Spends one AI action: subscription allowance first, then the lifetime Pro grant,
 * then the free trial. Returns false if nothing was left to spend.
 */
export async function consumeAction(db: D1Database, userId: string, config: LedgerConfig, now = Date.now()): Promise<boolean> {
  const status = await accessStatus(db, userId, config, now);

  if (status.monthlyRemaining > 0) {
    await db
      .prepare(
        "INSERT INTO usage (user_id, period, kind, count) VALUES (?, ?, 'ai', 1) " +
          "ON CONFLICT (user_id, period, kind) DO UPDATE SET count = count + 1",
      )
      .bind(userId, monthKey(now))
      .run();
    return true;
  }

  if (status.bonusRemaining > 0) {
    const result = await db
      .prepare(
        "UPDATE pro_grants SET bonus_remaining = bonus_remaining - 1 WHERE original_transaction_id = " +
          "(SELECT original_transaction_id FROM pro_grants WHERE user_id = ? AND bonus_remaining > 0 LIMIT 1)",
      )
      .bind(userId)
      .run();
    if (result.meta.changes > 0) return true;
  }

  if (status.trialRemaining > 0) {
    const result = await db
      .prepare("UPDATE users SET trial_remaining = trial_remaining - 1 WHERE id = ? AND trial_remaining > 0")
      .bind(userId)
      .run();
    if (result.meta.changes > 0) return true;
  }

  return false;
}

/** Links a lifetime Pro purchase to this user, granting AI actions the first time it is seen. */
export async function linkProPurchase(db: D1Database, userId: string, originalTransactionId: string, config: LedgerConfig, now = Date.now()): Promise<void> {
  await db.batch([
    db
      .prepare(
        "INSERT OR IGNORE INTO pro_grants (original_transaction_id, user_id, bonus_remaining, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(originalTransactionId, userId, config.proBonusActions, now),
    db.prepare("UPDATE pro_grants SET user_id = ? WHERE original_transaction_id = ?").bind(userId, originalTransactionId),
  ]);
}

export async function linkSubscription(
  db: D1Database,
  userId: string,
  originalTransactionId: string,
  productId: string,
  expiresAt: number,
  now = Date.now(),
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO subscriptions (original_transaction_id, user_id, product_id, expires_at, updated_at) VALUES (?, ?, ?, ?, ?) " +
        "ON CONFLICT (original_transaction_id) DO UPDATE SET user_id = excluded.user_id, product_id = excluded.product_id, " +
        "expires_at = MAX(subscriptions.expires_at, excluded.expires_at), updated_at = excluded.updated_at",
    )
    .bind(originalTransactionId, userId, productId, expiresAt, now)
    .run();
}

export async function revokeTransaction(db: D1Database, originalTransactionId: string, now = Date.now()): Promise<void> {
  await db.batch([
    db.prepare("UPDATE subscriptions SET expires_at = ?, updated_at = ? WHERE original_transaction_id = ?").bind(0, now, originalTransactionId),
    db.prepare("UPDATE pro_grants SET bonus_remaining = 0 WHERE original_transaction_id = ?").bind(originalTransactionId),
  ]);
}

const RETRY_TTL_MS = 15 * 60 * 1000;

/** Issues a single-use token that lets the app ask again for free if it rejects this result. */
export async function issueRetry(db: D1Database, userId: string, task: string, now = Date.now()): Promise<string> {
  const token = crypto.randomUUID();
  await db.batch([
    db.prepare("DELETE FROM retries WHERE user_id = ? AND expires_at <= ?").bind(userId, now),
    db
      .prepare("INSERT INTO retries (token, user_id, task, expires_at) VALUES (?, ?, ?, ?)")
      .bind(token, userId, task, now + RETRY_TTL_MS),
  ]);
  return token;
}

export async function hasRetry(db: D1Database, userId: string, task: string, token: string, now = Date.now()): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM retries WHERE token = ? AND user_id = ? AND task = ? AND expires_at > ?")
    .bind(token, userId, task, now)
    .first();
  return row !== null;
}

/** Uses up a retry token. Returns false if it was already used (e.g. by a concurrent request). */
export async function consumeRetry(db: D1Database, userId: string, task: string, token: string, now = Date.now()): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM retries WHERE token = ? AND user_id = ? AND task = ? AND expires_at > ?")
    .bind(token, userId, task, now)
    .run();
  return result.meta.changes > 0;
}
