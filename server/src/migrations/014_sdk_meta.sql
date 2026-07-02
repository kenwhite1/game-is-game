-- Results SDK и мета-телеметрия (§2, §17 библии). Пайп «игра → хаб»: единая
-- запись исходов, из которой читают достижения/квесты/ранги.

-- Один рапорт на матч/игрока; idempotency_key дедупит выплаты.
CREATE TABLE IF NOT EXISTS match_results (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  game_id         TEXT    NOT NULL,
  result          TEXT    NOT NULL,          -- win|loss|draw|finish
  placement       INTEGER,
  players         INTEGER,
  human_players   INTEGER,
  score           INTEGER,
  duration_sec    INTEGER,
  mode            TEXT,
  idempotency_key TEXT    NOT NULL UNIQUE,
  ts              INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_mr_user ON match_results(user_id, id DESC);
CREATE INDEX IF NOT EXISTS ix_mr_game ON match_results(game_id);

-- Append-only поток событий для реплея/аудита прогресса.
CREATE TABLE IF NOT EXISTS event_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  kind         TEXT    NOT NULL,
  payload_json TEXT    NOT NULL,
  ts           INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_evlog_user ON event_log(user_id, id DESC);

-- Свёрнутые счётчики прогресса (дешёвое чтение для достижений/квестов).
CREATE TABLE IF NOT EXISTS user_progress (
  user_id INTEGER NOT NULL,
  key     TEXT    NOT NULL,
  value   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, key)
);
