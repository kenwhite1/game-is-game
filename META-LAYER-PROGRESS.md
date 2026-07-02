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

## Next (bible build order §17.2)

- **Phase 4 — Season Pass**; **5 — Events/Tokens**; **6 — Ranked/Glicko-2**;
  **7 — Social (referral-on-qualify, challenges, clans)**; **8 — Marketplace**.

## Needs the games (not hub-only)

Per-game SDK adoption: each game reads the launch token from `startapp` and
calls `ggReport()` on match end. Until then games earn launch-based rewards
only; the outcome layer lights up per game as it integrates.
