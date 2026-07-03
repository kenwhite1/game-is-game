-- Перекраска (§10.6): лёгкий повторяемый сток — перекрасить свой предмет в
-- палитровый вариант (поворот оттенка). Храним выбранный hue на (игрок, предмет);
-- рендер применяет hue-rotate. Дёшево (у нас уже цвета в hex/градиентах).
CREATE TABLE IF NOT EXISTS cosmetic_recolors (
  user_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  hue INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);
