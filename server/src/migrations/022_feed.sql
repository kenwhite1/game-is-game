-- Обогащение ленты (§15.2): публикуем мета-события (достижения, вехи серии),
-- чтобы лента рекламировала мета-системы. Хранится как текст + вид.
CREATE TABLE IF NOT EXISTS feed_events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  kind    TEXT    NOT NULL,   -- achievement | streak | level
  text    TEXT    NOT NULL,
  ts      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_feed_user ON feed_events(user_id, id DESC);
