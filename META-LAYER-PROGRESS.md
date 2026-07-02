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

## Next (bible build order §17.2)

- **Phase 1 — Achievements & GG Score**: `shared/achievements.ts` (cross-game
  ladders + per-game 10-archetype), `user_achievements`, GG Score + leaderboard,
  rarity %, grandfather the 10 badges, progress off the event bus + UI.
- **Phase 2 — Quests 2.0**: weighted daily pool, reroll, weeklies, co-op;
  `quest_assignments`. (Streaks already shipped.)
- **Phase 3 — Cosmetics retail**: rotating daily shop, new `Unlock` kinds,
  collections/set bonuses, recolor sink; apply remaining §4 balance.
- **Phase 4 — Season Pass**; **5 — Events/Tokens**; **6 — Ranked/Glicko-2**;
  **7 — Social (referral-on-qualify, challenges, clans)**; **8 — Marketplace**.

## Needs the games (not hub-only)

Per-game SDK adoption: each game reads the launch token from `startapp` and
calls `ggReport()` on match end. Until then games earn launch-based rewards
only; the outcome layer lights up per game as it integrates.
