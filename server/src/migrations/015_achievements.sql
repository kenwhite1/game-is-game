-- Достижения (§6–7 библии). Одна строка на «лесенку»; tier_reached — индекс
-- максимально взятого тира (0-based). Значки (badges) остаются как есть.
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id      INTEGER NOT NULL,
  ach_id       TEXT    NOT NULL,
  tier_reached INTEGER NOT NULL,
  unlocked_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, ach_id)
);
CREATE INDEX IF NOT EXISTS ix_uach_ach ON user_achievements(ach_id);
