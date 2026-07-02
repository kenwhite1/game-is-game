-- Квесты 2.0 (§8): персональная выдача заданий, реролл и недельные квесты.
-- Одна строка = одно задание в слоте периода у игрока. Реролл меняет quest_id
-- в слоте; claimed — получена ли награда. Прогресс считается на лету из
-- opens/match_results, поэтому здесь его не храним.
CREATE TABLE IF NOT EXISTS quest_assignments (
  user_id    INTEGER NOT NULL,
  period     TEXT    NOT NULL,   -- 'day' | 'week'
  period_key TEXT    NOT NULL,   -- UTC-день 'YYYY-MM-DD' или понедельник недели
  slot       INTEGER NOT NULL,   -- позиция задания (стабильна для реролла)
  quest_id   TEXT    NOT NULL,
  claimed    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period, period_key, slot)
);
