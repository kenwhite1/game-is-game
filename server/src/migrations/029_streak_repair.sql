-- Ремонт серии (§9.3): при разрыве без заморозок запоминаем прежнюю длину и
-- открываем 24-часовое окно. Восстановить можно, сыграв 3 матча ИЛИ заплатив
-- 100🪙 — сильный сток на потере (loss aversion).
ALTER TABLE users ADD COLUMN streak_broke_value INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN streak_repair_until INTEGER NOT NULL DEFAULT 0;
