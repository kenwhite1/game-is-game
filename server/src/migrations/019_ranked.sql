-- Ранговый режим (§13). Рейтинг per-game на сезон; peak — лучший за сезон.
CREATE TABLE IF NOT EXISTS ranked_ratings (
  user_id   INTEGER NOT NULL,
  game_id   TEXT    NOT NULL,
  season_id TEXT    NOT NULL,
  rating    REAL    NOT NULL DEFAULT 1000,
  games     INTEGER NOT NULL DEFAULT 0,
  peak      REAL    NOT NULL DEFAULT 1000,
  PRIMARY KEY (user_id, game_id, season_id)
);
CREATE INDEX IF NOT EXISTS ix_ranked_game ON ranked_ratings(season_id, game_id, rating DESC);
