-- Каталог: избранное и оценки игр. Глобальные счётчики запусков берутся
-- из существующей таблицы opens агрегацией, отдельная таблица не нужна.

CREATE TABLE IF NOT EXISTS favorites (
  user_id    INTEGER NOT NULL,
  game_id    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, game_id)
);
CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id);

-- Оценка: +1 (нравится) или -1 (не нравится), одна на игрока на игру.
CREATE TABLE IF NOT EXISTS ratings (
  user_id    INTEGER NOT NULL,
  game_id    TEXT    NOT NULL,
  value      INTEGER NOT NULL CHECK (value IN (1, -1)),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, game_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_game ON ratings(game_id);

-- Быстрая агрегация запусков по играм (глобальные чарты «Популярное»).
CREATE INDEX IF NOT EXISTS idx_opens_game ON opens(game_id);
