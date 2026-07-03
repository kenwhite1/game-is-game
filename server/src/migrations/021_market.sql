-- Маркетплейс (§14). Эскроу: активный лот значит, что предмет ИЗЪЯТ у продавца
-- (нет строки в cosmetics_owned) и «висит» здесь до покупки/отмены.
CREATE TABLE IF NOT EXISTS market_listings (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id INTEGER NOT NULL,
  item_id   TEXT    NOT NULL,
  price     INTEGER NOT NULL,
  status    TEXT    NOT NULL DEFAULT 'active',  -- active | sold | cancelled
  buyer_id  INTEGER,
  ts        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_market_active ON market_listings(status, id DESC);
CREATE INDEX IF NOT EXISTS ix_market_seller ON market_listings(seller_id, status);
