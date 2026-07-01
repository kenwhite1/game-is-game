-- Задания дня: выданные награды (сами задания считаются на лету из opens,
-- ratings и favorites, здесь только защита от повторного получения).
CREATE TABLE IF NOT EXISTS quest_claims (
  user_id    INTEGER NOT NULL,
  quest_id   TEXT    NOT NULL,
  day        TEXT    NOT NULL,               -- YYYY-MM-DD (UTC)
  claimed_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, quest_id, day)
);

-- Подарки Game между друзьями: журнал переводов (аудит + дневной лимит).
CREATE TABLE IF NOT EXISTS gifts (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id INTEGER NOT NULL,
  to_id   INTEGER NOT NULL,
  amount  INTEGER NOT NULL,
  ts      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gifts_from ON gifts(from_id, ts);
