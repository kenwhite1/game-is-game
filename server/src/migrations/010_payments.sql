-- Платежи Stars за пакеты Game: журнал для идемпотентного зачисления,
-- /paysupport и возвратов (refundStarPayment по charge_id).
CREATE TABLE IF NOT EXISTS payments (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER NOT NULL,
  pack_id   TEXT    NOT NULL,
  stars     INTEGER NOT NULL,
  coins     INTEGER NOT NULL,
  charge_id TEXT    UNIQUE,                    -- telegram_payment_charge_id
  status    TEXT    NOT NULL DEFAULT 'paid',   -- paid | refunded
  ts        TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, id DESC);
