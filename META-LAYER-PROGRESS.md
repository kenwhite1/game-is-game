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

- **Phase 7 — Social deepening** (this commit, partial):
  - Referral **pay-on-qualification** (§15.1 fraud fix): `applyReferral` only
    befriends + records; `settleReferral` (called from recordOpen) pays both
    once the newcomer plays ≥5 games. `invitedCount` now counts only qualified
    (feeds Амбассадор ⑮). Migration 020 (`referral_paid`).
  - Challenge-a-friend (§15.2): `⚔️` on friend rows shares a `chl_<game>_<uid>`
    deep-link; on accept both get +40 (once per pair+game+day, no self, anti-
    farm via `challenges` table). Store handles the deep-link on init → reward
    + launch.
  - Verified: referral pays on 5th game once (no double), qualified count,
    challenge reward + done/bad gating, ⚔️ buttons render.
  - Deferred: clans/teams, activity-feed enrichment (achievement/level events).

- **Phase 8 — Marketplace** (this commit): the deliberately-restrained last phase.
  - `shared/cosmetics.ts` `isTradeable` + `TRADEABLE_IDS` (only a few shop items;
    every earned reward stays bound — "you can never buy a flex").
  - `shared/market.ts`: 10% burn fee, per-rarity price bounds, trade hold
    (min opens), daily listing cap. `server/src/market.ts`: escrow (item pulled
    from owner on list + un-equipped), atomic buy (burn 10%, seller gets 90%),
    cancel returns item. Migration 021 `market_listings`.
  - API `/market(+/list,/buy,/cancel)`. UI: "Барахолка" sheet from Shop (sell
    form with rarity bounds, my lots, player lots).
  - Verified: floor rejection, escrow removes ownership, 10% burn (buyer −200 /
    seller +180 / 20 destroyed), own-guard, cancel restores item, bound items
    rejected (`not_tradeable`). UI OK, no console errors.

- **Polish — Activity-feed enrichment** (§15.2, this commit): notable
  achievement unlocks (gold+) and streak milestones publish to `feed_events`
  (migration 022); `activityFeed` merges them with game-launches by time; feed UI
  shows 🏆/🔥 meta events. Verified end-to-end.

- **Phase 9 — Clans/Teams** (§15.3, this commit): create/join/leave clans (tag
  unique via index, one clan per player, disband-on-last-leave, owner transfer),
  roster with member GG Score, weekly shared goal (combined launches → +300 to
  each member, once), clan leaderboard by aggregate GG Score. `shared/clans.ts`,
  `server/src/clans.ts`, migration 023. UI: "🛡️ Команда" sheet from Friends.
  Verified: create/in-clan/tag-taken, weekly not_done→claim(+300)→claimed,
  disband, join. UI OK.

- **Collections & set bonuses** (§10.5, this commit): the `collection` tags are
  now sets — `COLLECTIONS` (≥3 items) with rarity-scaled bonuses; `collectionsOf`
  computes owned/total from ownership (incl. level/achievement-gated), one-time
  bonus claim (migration 024), publishes a feed event. UI: "🧩 Коллекции" sheet
  from Shop with progress bars. Verified: Базовые 27/27 → +1080, idempotent,
  incomplete-guard.

- **Economy-health dashboard** (§16.3, this commit): `server/src/econ.ts`
  aggregates `coin_ledger` — circulation, per-source faucet/sink volumes,
  sink/faucet ratio (7d/30d), wallet P50/P90/P99, money-supply growth rate.
  Admin-gated `GET /admin/economy` (ADMIN_IDS / DEV) + operator bot `/econ`
  command. Verified in dev.

- **Per-game achievements (§7B) — the ~410 catalogue** (this batch): the full
  10-archetype × 41-game framework in `shared/achievements.ts` (bespoke sets for
  Маньяк/Нитро/Неон/Чехарда/Паук/Шарик, template for the rest) + Polymath +
  Master-of-game. Server (`events.ts`) populates §7B keys from `report.stats`
  (`f_<id>_<flag>` / `s_<id>_<num>`, sanitized); `achievements.ts` does the
  multi-stage sync (game achs → `master_<id>` → `games_mastered` → meta). Profile
  UI: cross-game grid + per-game collapsible sections with 💎 Master crowns.
  **430 ladders / 605 rungs.** Verified: per-game unlock via stats flags, full
  Master→Polymath chain (+800 platinum), UI renders.
- **SDK launch-token delivery (§2.3/§2.6)**: `shared/sdk.ts` `encode/
  decodeLaunchParam` (base64url so the JWT rides `startapp`); `/auth` now embeds
  a per-user launch token in every tile link (`catalogFor`), so a game reads it
  from `startapp`, calls `ggReport`, and the hub rewards. Verified round-trip +
  report. `SDK-PER-GAME.md` (generated by `scripts/gen-sdk-spec.ts`) lists per
  game the result to send, the exact `stats` keys, and a ready `ggReport` snippet.

- **Loop batch «finish all that»** (this session, 5 commits `b9e399a`→`1b6ed72`):
  pushed the polish tail toward doc-complete. Each committed + verified on a
  throwaway DB.
  - **§5 XP/уровни/престиж** — растущая кривая `xpToNext=80+20·level` в
    `progression.ts` (L1→2=100 … ~29k/L50, ~107k/L100) + level-preserving
    бэкфилл (миграция 025) + вехи 5/10/25/50/75/100. Престиж/XP-развязка уже
    были; кривая довела §5 до доковой.
  - **Appendix B** — `shopPrice` = редкость × множитель слота (`SLOT_MULT`),
    даёт ровно таблицу (Common-эффект 170 … Mythic-эффект 8400).
  - **§4.5** — удвоитель первой покупки каждого пакета (идемпотентно по
    charge_id) + бейдж «×2 первая» (`boughtPacks` в /auth).
  - **§14.2** — `giftCosmetic`: дарить только торгуемое (заслуги bound), перевод
    владения + разэкипировка, лимит 3/день (миграция 026); UI в шторке подарка.
  - **§9.6** — идеальная серия (`streak_perfect`, миграция 027) → золотое пламя.
  - **§7A ⑲ скрытые** — «Копилка» (25k на балансе), «Сова» (03–05 МСК);
    маскировка «Секрет ❓» для нераскрытых (§6.3).
  - **§16.2** — авто-обнаружение аномалий (`anomaly.ts`, миграция 028): частотный
    кап 40/час/игра + невозможная скорость → тихое удержание награды/прогресса;
    `anomalyReport()` в /admin/economy.

## Status: hub-buildable meta-layer effectively doc-complete

Almost every bible item that can live in the hub is shipped. What genuinely
remains:

**Out of this repo (the real finish line):**
- **Per-game `ggReport()` adoption** — each of the 41 game repos reads the launch
  token (`decodeLaunchParam`) and reports match outcomes with the `stats` keys in
  `SDK-PER-GAME.md`. Pipe + rewards + all 410 per-game achievements + token
  delivery are live here; a game lights up its outcome layer the moment it
  integrates. Cannot be done from this repo.

**In-repo, deferred (each a focused vertical — good next loop targets):**
- **§9 depth (rest):** streak repair (24h window, pay-100🪙 / play-3), friend
  streaks (+shared counter, pairing), last-chance push (needs a near-midnight
  cron).
- **§8.3 co-op friend quests** — weekly shared target + shared reward (pairing).
- **§13.2 true Glicko-2** + decay + soft-reset — needs opponent ids in the SDK
  report (schema extension); Elo-vs-field proxy shipped.
- **§12 event rotation** — RU-holiday calendar + multiplier-weekend/tournament
  archetypes (framework + one event exist).
- **§7A day-ladders ⑤⑥⑦** (variety-marathon / seven-for-seven / marathoner) +
  ⑱ frenemies — need day-scoped counters / friend-opponent ids.
- **§10.6 recolor sink** — deferred (most render-cross-cutting; low econ value).
- **§10.7** grow cosmetics catalogue toward ~400 (data volume).

## Needs the games (not hub-only)

Per-game SDK adoption: each game reads the launch token from `startapp`
(`decodeLaunchParam`) and calls `ggReport()` on match end with the keys in
`SDK-PER-GAME.md`. Until then games earn launch-based rewards only; the outcome
layer + that game's ~10 achievements light up as it integrates.
