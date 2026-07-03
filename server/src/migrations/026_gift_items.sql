-- Подарки косметикой (§14.2): дневной журнал переводов торгуемых предметов
-- между друзьями (для лимита/аудита). Сам предмет переносится в cosmetics_owned.
CREATE TABLE IF NOT EXISTS gift_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id INTEGER NOT NULL,
  to_id   INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_gift_items_from ON gift_items(from_id, ts);
