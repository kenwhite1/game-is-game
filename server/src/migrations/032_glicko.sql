-- Настоящий Glicko-2 (§13.2): к рейтингу добавляем отклонение (rd) и волатильность
-- (vol). updated_ts — для распада на Мастер+ при простое. Стартовые значения по
-- Гликману. Elo-против-поля остаётся фолбэком, когда игра не прислала id соперников.
ALTER TABLE ranked_ratings ADD COLUMN rd  REAL NOT NULL DEFAULT 350;
ALTER TABLE ranked_ratings ADD COLUMN vol REAL NOT NULL DEFAULT 0.06;
ALTER TABLE ranked_ratings ADD COLUMN updated_ts INTEGER NOT NULL DEFAULT 0;
