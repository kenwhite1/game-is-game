-- Дружеские серии (§9.5): общий счётчик, когда ОБА друга играли в один день.
-- Отдельное пламя на пару; портфель из нескольких серий устойчивее одиночных
-- срывов. a_id < b_id. a_day/b_day — последний игровой день каждого (МСК),
-- both_day — последний день, когда серия продвинулась (чтобы не считать дважды).
CREATE TABLE IF NOT EXISTS friend_streaks (
  a_id INTEGER NOT NULL,
  b_id INTEGER NOT NULL,
  current INTEGER NOT NULL DEFAULT 0,
  best INTEGER NOT NULL DEFAULT 0,
  a_day TEXT,
  b_day TEXT,
  both_day TEXT,
  nudge_day TEXT,
  PRIMARY KEY (a_id, b_id)
);
