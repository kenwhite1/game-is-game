-- Кастомизируемый персонаж «Бубл»: цвет тела + выражение лица.
-- Старый столбец avatar (emoji-персонаж) больше не используется, оставлен как есть.

ALTER TABLE users ADD COLUMN color TEXT;
ALTER TABLE users ADD COLUMN face TEXT;
