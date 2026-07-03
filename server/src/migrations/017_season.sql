-- Сезонный пропуск (§11). Одна строка на игрока и сезон. tier выводится из xp,
-- поэтому не храним. claimed — JSON-массив забранных наград ("f3","p5").
CREATE TABLE IF NOT EXISTS season_progress (
  user_id   INTEGER NOT NULL,
  season_id TEXT    NOT NULL,
  xp        INTEGER NOT NULL DEFAULT 0,
  premium   INTEGER NOT NULL DEFAULT 0,
  claimed   TEXT    NOT NULL DEFAULT '[]',
  PRIMARY KEY (user_id, season_id)
);
