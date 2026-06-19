-- Косметика хаба: надетые «скины» игрока + явно выданные предметы (на будущее
-- — магазин/монетизация). Аватар уже хранится в users.avatar (миграция 002).

ALTER TABLE users ADD COLUMN frame TEXT;
ALTER TABLE users ADD COLUMN banner TEXT;
ALTER TABLE users ADD COLUMN title TEXT;

-- Явно полученные предметы (покупка/награда/грант). Открытия по уровню и
-- значкам считаются на лету и здесь НЕ хранятся.
CREATE TABLE IF NOT EXISTS cosmetics_owned (
  user_id     INTEGER NOT NULL,
  item_id     TEXT    NOT NULL,
  acquired_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_cosmetics_user ON cosmetics_owned(user_id);
