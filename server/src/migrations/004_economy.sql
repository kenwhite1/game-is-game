-- Валюта Game + надеваемые аксессуары (шляпа, очки, эффект, питомец).
-- frame/banner/title уже добавлены миграцией 003, avatar — 002.

ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN hat TEXT;
ALTER TABLE users ADD COLUMN eyewear TEXT;
ALTER TABLE users ADD COLUMN effect TEXT;
ALTER TABLE users ADD COLUMN companion TEXT;

-- Стартовый бонус существующим игрокам, чтобы магазин сразу был живым.
UPDATE users SET coins = 300 WHERE coins = 0;
