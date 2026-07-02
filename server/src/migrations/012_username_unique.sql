-- Ник игрока — это @username из Telegram, а если его нет, игрок выбирает свой.
-- В обоих случаях ник должен быть уникален. Индекс регистронезависимый; NULL
-- допускается многократно (у новых игроков ника ещё нет).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase ON users(lower(username));
