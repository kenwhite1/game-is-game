-- Экономика v1: аудируемый ledger монет + серия (streak).
-- coin_ledger: каждое изменение баланса — строка с причиной (§16 из библии).
CREATE TABLE IF NOT EXISTS coin_ledger (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  delta         INTEGER NOT NULL,
  reason        TEXT    NOT NULL,
  ref           TEXT,
  balance_after INTEGER NOT NULL,
  ts            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_ledger_user ON coin_ledger(user_id, id DESC);

-- Серия: играешь хотя бы раз в день => серия +1. streak_last — день (МСК, YYYY-MM-DD).
ALTER TABLE users ADD COLUMN streak_current INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN streak_best    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN streak_last    TEXT;
ALTER TABLE users ADD COLUMN streak_freezes INTEGER NOT NULL DEFAULT 0;
