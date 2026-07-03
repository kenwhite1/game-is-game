-- Кланы (§15.3). Тег уникален (регистронезависимо). Игрок состоит максимум в
-- одном клане (UNIQUE по user_id в участниках). Недельная награда — раз в неделю
-- на участника (clan_claims).
CREATE TABLE IF NOT EXISTS clans (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  tag        TEXT    NOT NULL,
  owner_id   INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clans_tag ON clans(lower(tag));

CREATE TABLE IF NOT EXISTS clan_members (
  clan_id   INTEGER NOT NULL,
  user_id   INTEGER NOT NULL UNIQUE,
  role      TEXT    NOT NULL DEFAULT 'member',   -- owner | member
  joined_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_clan_members ON clan_members(clan_id);

CREATE TABLE IF NOT EXISTS clan_claims (
  clan_id INTEGER NOT NULL,
  week    TEXT    NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (clan_id, week, user_id)
);
