-- Кооп-квесты с другом (§8.3): пара берёт общую недельную цель (вместе выиграть
-- N матчей), прогресс копится от ОБОИХ, награда — каждому. Виральный возврат:
-- на друга ложится соц-обязательство.
CREATE TABLE IF NOT EXISTS coop_quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  a_id INTEGER NOT NULL,           -- всегда a_id < b_id
  b_id INTEGER NOT NULL,
  week TEXT NOT NULL,              -- понедельник недели (UTC)
  target INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  a_claimed INTEGER NOT NULL DEFAULT 0,
  b_claimed INTEGER NOT NULL DEFAULT 0,
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_coop_pair_week ON coop_quests(a_id, b_id, week);
