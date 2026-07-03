-- Социалка (§15). Реферальная награда платится по КВАЛИФИКАЦИИ, не на входе
-- (анти-фрод): держим referral_paid, пока новичок не наиграет минимум.
ALTER TABLE users ADD COLUMN referral_paid INTEGER NOT NULL DEFAULT 0;

-- Вызовы другу: награда обоим один раз за пару+игру+день (защита от фарма).
CREATE TABLE IF NOT EXISTS challenges (
  from_id INTEGER NOT NULL,
  to_id   INTEGER NOT NULL,
  game_id TEXT    NOT NULL,
  day     TEXT    NOT NULL,
  ts      INTEGER NOT NULL,
  PRIMARY KEY (from_id, to_id, game_id, day)
);
