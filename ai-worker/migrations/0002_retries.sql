-- One free retry per charged AI result, used when the app rejects every suggestion as unsafe.
CREATE TABLE IF NOT EXISTS retries (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, task TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS retries_user ON retries (user_id);
