-- Анти-чит: журнал аномалий (§16.2). Матч-результат при срабатывании правила
-- РЕГИСТРИРУЕТСЯ (для аудита), но не приносит наград/прогресса — «тихое»
-- удержание вместо бана, чтобы не злить ложные срабатывания.
CREATE TABLE IF NOT EXISTS anomaly_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  reason TEXT NOT NULL,     -- rate_cap | too_fast | winrate
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_anomaly_user ON anomaly_flags(user_id, ts);
