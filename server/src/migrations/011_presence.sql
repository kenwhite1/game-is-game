-- Живое присутствие: кто прямо сейчас в какой игре. Пишется хабом при
-- запуске игры и серверами игр через POST /api/presence/ping (заголовок
-- X-Presence-Key). Запись живёт ~3 минуты без пинга.
CREATE TABLE IF NOT EXISTS presence (
  user_id    INTEGER PRIMARY KEY,
  game_id    TEXT    NOT NULL,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_presence_game ON presence(game_id, updated_at);
