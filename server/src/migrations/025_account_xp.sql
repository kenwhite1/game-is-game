-- Развязка XP от «запусков» (§5.1): постоянный account_xp (не сбрасывается) +
-- престиж. Кривая теперь растущая (§5.3: xpToNext=80+20·level), поэтому бэкфилл
-- сохраняет ПРЕЖНИЙ уровень: старый L = 1 + floor(opens/4) (opens*25 при 100/ур.),
-- а account_xp = cumulativeXP(L) = 10·L²+70·L−80 — старт того же уровня на новой
-- кривой. Так ни у кого уровень не падает; меняется и ИСТОЧНИК (матчи/квесты/
-- достижения/серия), и форма кривой.
ALTER TABLE users ADD COLUMN account_xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN prestige    INTEGER NOT NULL DEFAULT 0;
UPDATE users SET account_xp =
  10 * (1 + opens/4) * (1 + opens/4) + 70 * (1 + opens/4) - 80;
