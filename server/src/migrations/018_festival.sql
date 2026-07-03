-- События и Event Tokens (§12). Баланс токенов на игрока/событие; клеймы
-- событийных квестов и общей цели; общий счётчик прогресса события.
CREATE TABLE IF NOT EXISTS event_tokens (
  user_id  INTEGER NOT NULL,
  event_id TEXT    NOT NULL,
  tokens   INTEGER NOT NULL DEFAULT 0,
  settled  INTEGER NOT NULL DEFAULT 0,   -- сгоревшие токены сконвертированы
  PRIMARY KEY (user_id, event_id)
);
CREATE TABLE IF NOT EXISTS event_claims (
  user_id  INTEGER NOT NULL,
  event_id TEXT    NOT NULL,
  claim_id TEXT    NOT NULL,             -- id квеста или '_community'
  PRIMARY KEY (user_id, event_id, claim_id)
);
CREATE TABLE IF NOT EXISTS event_community (
  event_id TEXT    NOT NULL PRIMARY KEY,
  value    INTEGER NOT NULL DEFAULT 0
);
