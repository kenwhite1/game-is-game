-- Бонусы коллекций (§10.5): один бонус на игрока за собранную коллекцию.
CREATE TABLE IF NOT EXISTS collection_claims (
  user_id    INTEGER NOT NULL,
  collection TEXT    NOT NULL,
  ts         TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, collection)
);
