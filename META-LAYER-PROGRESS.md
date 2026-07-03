# Meta-layer build — progress tracker

Implementing `GG-Achievements-Quests-Economy-Bible.md` incrementally, hub-side.
Each phase is committed + deployed (Railway) before the next. Updated as the
`/loop` iterates.

## Done

- **Economy v1** (`6241c5f`) — `coin_ledger` + `credit`/`debit` (single audited
  write path for every coin move); breadth launch faucet (§4.2); streaks (§9:
  tick, scaling reward, milestones, freezes) with banner/profile UI.
- **Phase 0 — Results SDK pipe** (this commit) — the gate everything reads:
  - `POST /api/sdk/result` (`server/src/sdk.ts`): launch-token auth, idempotent
    on `idempotencyKey`, hub-computed rewards, per-day `MATCH_COIN_CAP`.
  - Launch tokens (`signLaunch`/`verifyLaunch` in `auth.ts`), issued by `/open`.
  - `match_results`, `event_log`, `user_progress` (migration 014).
  - Event bus + rolled-up counters (`server/src/events.ts`): total_wins,
    wins_cat_*, wins_game_*, distinct_games_won, humans_beaten, matches_played.
  - Outcome coin rewards (§4.2): played/won/first-win-of-day, via ledger.
  - `shared/sdk.ts` — `MatchReport` contract + `ggReport()` one-call helper.

- **Phase 1 — Achievements & GG Score** (this commit):
  - `shared/achievements.ts`: 12 cross-game ladders + 7 category-master ladders
    (65 rungs), 5 tiers (points + coin reward), categories, rarity.
  - `server/src/achievements.ts`: snapshot from `user_progress` + base stats,
    two-pass sync (meta `gg_score`/`achievements_unlocked` after pass 1),
    idempotent unlock, per-tier coin payout via ledger (`achievement` reason),
    GG Score, rarity %. Wired into `recordOpen` + `/sdk/result`.
  - `user_achievements` (migration 015); `GET /api/achievements`; GG Score +
    counts in `profileDetail`.
  - Profile UI: "Достижения" grid (tier medal, progress-to-next, rare glow) +
    "GG N · unlocked/total" header. Badges kept (grandfathered alongside).
  - Not yet: per-game 410 (needs `matches_game_*` + per-game skill stats from
    the SDK); day-based ladders (⑤⑥⑦); friend-specific/hidden (⑱⑲).

- **Phase 2 — Quests 2.0** (this commit):
  - Rewrote `server/src/quests.ts`: per-user daily deal with a bucket spread
    (engage / category / meta), weekly quests, `quest_assignments` (migration
    016), reroll (1 free/day then 50🪙, same-bucket swap), completion bonus
    (daily +50 / weekly +200, paid once via a `_bonus` slot), all via ledger.
    Progress windowed to today / since-Monday from opens/ratings/favorites;
    daily stays completable pre-SDK (launch/breadth/meta based).
  - `GET /quests` → {quests, weekly, rerollsLeft}; `POST /quests/reroll`.
  - Home UI: daily card + ♻ reroll button, new purple weekly card.
  - Verified: bucket spread, free→paid reroll (−50), claim (+reward),
    completion bonus fires exactly once. UI renders, no console errors.
  - Co-op friend quests deferred (needs pairing).

- **Phase 3 — Cosmetics retail** (this commit, no migration):
  - New `Unlock` kinds (achievement / streak / season / ranked / event /
    prestige) + `OwnerCtx.achTiers`/`streakBest`; `isOwned`/`unlockLabel` handle
    them. Server `ownerCtx` reads `user_achievements` + `users.streak_best`.
  - Earned cosmetics: titles «Универсал», «Легенда GG», «Преданный»; frames
    «Каталог» (catalogue platinum), «Огонь-30» (streak 30).
  - Rotating daily shop (`shared/shop.ts`, deterministic by UTC day): 4 deals,
    0/15/30% discounts, last slot "уходит скоро"; `buy()` charges the deal price;
    Wardrobe carries `daily`; Shop UI "Витрина дня" strip.
  - Verified: streak-30 unlock on threshold; achievement-gated stay locked;
    discounted buy charged the deal price (−300 for 350→300). No console errors.
  - Deferred: slot price multipliers, collections/set bonuses, recolor sink.

- **Phase 4 — Season Pass** (this commit):
  - `shared/season.ts`: 8-week seasons (computed from epoch), 50 tiers ×600 XP,
    free+premium track with a generated reward curve (coins/freezes/existing
    cosmetics), Season XP rates (Appendix A), `SeasonView`.
  - `server/src/season.ts`: `grantSeasonXp`, `seasonView`, `claimTier` (locked /
    no_premium / claimed gating, item grants inlined to avoid an import cycle,
    coins via ledger `season`, freezes bump), `unlockPremium`. Migration 017
    `season_progress`.
  - Season XP wired into recordOpen (breadth/streak), quest claims + bonuses,
    and match results (`/sdk/result`).
  - Premium via ⭐: `pack_xl` (15000/300) + `PASS_PREMIUM_STARS` 350; `/season/
    premium` invoice; bot webhook unlocks premium on payment (idempotent).
  - UI: Home "Сезон" card (tier/XP bar/claimable) + full pass sheet (track,
    claim buttons, premium unlock).
  - Verified: accrual (+15 fresh launch), free claim (+50), idempotent, locked
    + no_premium gating, premium claim after unlock. UI renders, no errors.

- **Phase 5 — Cross-game Events & Tokens** (this commit):
  - `shared/festival.ts`: event config (quests / token shop / community goal),
    one active "Летний движ" (July 2026), 🎟 `TOKEN_TO_COIN` expiry (10%).
  - `server/src/festival.ts`: token balance, event-quest claims (windowed),
    token shop buy, community counter + reward, `settleExpired` (ended-event
    tokens → coins). Migration 018 (event_tokens/event_claims/event_community).
    Community ticks on launches (recordOpen); item grants inlined (no cycle).
  - Event-exclusive cosmetics (`unlock:{kind:'event'}`): «Летний», «Соучастник»,
    frame «Лето».
  - API: `/festival`, `/festival/quest/claim`, `/festival/community/claim`,
    `/festival/shop/buy`. UI: Home festival card + full event sheet (tokens,
    community bar, quests, token shop).
  - Verified: quest claims (+tokens), not_done gating, token buy (−20) +
    too_poor, community tick on launch, community reward grant. UI OK.

- **Phase 6 — Ranked & Leaderboards** (this commit):
  - `shared/ranked.ts`: RANKED_GAMES (skill games), 7 divisions ×sub-tiers,
    `divisionOf`, Elo-vs-field helpers, GG-Ladder contribution.
  - `server/src/ranked.ts`: `updateRating` (Elo-vs-field, per game/season,
    humans-only, peak), `rankedOf` (ranks + GG-Ladder), boards: GG Score /
    GG-Ladder / weekly coins. Migration 019 `ranked_ratings`. Hooked into
    `/sdk/result`.
  - API `/ranked`, `/boards`. UI: "Рейтинги" sheet (self GG-Ladder + division,
    tabbed boards) opened from Friends → Лидеры.
  - Verified: 6 wins+1 loss vs humans in Сёги → 1078, Серебро II, peak Серебро I,
    GG-Ladder 78; non-ranked win made no rating; all 3 boards populate. UI OK.
  - Note: true Glicko-2 needs opponent ids in the SDK (schema extension later);
    Elo-vs-field is the honest proxy from the current single-sided report.

## Next (bible build order §17.2)

- **7 — Social (referral-on-qualify, challenges, clans)**; **8 — Marketplace**.

## Needs the games (not hub-only)

Per-game SDK adoption: each game reads the launch token from `startapp` and
calls `ggReport()` on match end. Until then games earn launch-based rewards
only; the outcome layer lights up per game as it integrates.
