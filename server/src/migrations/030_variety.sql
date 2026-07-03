-- «Марафон разнообразия» (§7A ⑤): считаем серию дней, где каждый день играешь
-- игру, отличную от предыдущего дня. Пик серии кладём в user_progress.variety_best.
ALTER TABLE users ADD COLUMN variety_last_day  TEXT;
ALTER TABLE users ADD COLUMN variety_last_game TEXT;
ALTER TABLE users ADD COLUMN variety_streak    INTEGER NOT NULL DEFAULT 0;
