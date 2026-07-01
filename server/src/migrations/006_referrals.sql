-- Реферальная программа: кто привёл игрока в хаб. Заполняется один раз при
-- первом входе по ссылке ?startapp=ref_<КОД> и больше не меняется.
-- Счётчик приглашённых не денормализуем: COUNT по индексу дешёвый.

ALTER TABLE users ADD COLUMN referred_by INTEGER;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
