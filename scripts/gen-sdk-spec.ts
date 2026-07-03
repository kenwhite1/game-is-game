// Генератор SDK-PER-GAME.md — единственный источник правды по интеграции игр.
// Читает каталог достижений (shared/achievements.ts) + список игр и выводит по
// каждой из 41 игры: какой result слать, какие ключи report.stats «зажигают» её
// достижения, и готовый вызов ggReport(). Раз спека выведена из тех же данных,
// что и движок, — она не может разойтись с тем, за что хаб реально платит.
//
//   npx tsx scripts/gen-sdk-spec.ts    (пишет ../SDK-PER-GAME.md)

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { GAMES, categoryRu, type GameDef } from '../shared/games'
import { PER_GAME, TIER_META, type Achievement } from '../shared/achievements'

const here = dirname(fileURLToPath(import.meta.url))

/** Какие исходы естественно слать этой игре (подсказка, не жёсткое правило). */
function resultHint(g: GameDef): string {
  if (g.players === 'solo' || g.id === 'neontide') return "`'finish'`"
  const soloScored = ['hrumik', 'puzyrik', 'rikoshet', 'tanchiki', 'zabava', 'kletki', 'kubik', 'linik', 'skladik', 'mahjong', 'viselitsa', 'pletenka', 'bukvica']
  if (soloScored.includes(g.id)) return "`'finish'` (соло) · `'win'`/`'loss'` (versus)"
  if (['loto', 'lesenki'].includes(g.id)) return "`'win'`/`'loss'`"
  return "`'win'`/`'loss'`/`'draw'`"
}

interface StatReq { key: string; type: 'boolean' | 'number'; trigger: string; ach: string }

/** Разобрать достижения игры в требования к report.stats и структурные пометки. */
function analyze(g: GameDef): { stats: StatReq[]; needsHumans: boolean; needsModes: boolean } {
  const fPre = `f_${g.id}_`
  const sPre = `s_${g.id}_`
  const stats: StatReq[] = []
  let needsHumans = false
  let needsModes = false
  for (const a of PER_GAME) {
    if (a.gameId !== g.id) continue
    if (a.stat === `winsvsh_game_${g.id}`) { needsHumans = true; continue }
    if (a.stat === `modes_game_${g.id}`) { needsModes = true; continue }
    if (a.stat.startsWith(fPre)) stats.push({ key: a.stat.slice(fPre.length), type: 'boolean', trigger: a.desc, ach: a.title })
    else if (a.stat.startsWith(sPre)) stats.push({ key: a.stat.slice(sPre.length), type: 'number', trigger: a.desc, ach: a.title })
  }
  return { stats, needsHumans, needsModes }
}

/** Пример report.stats для сниппета: булев → true, числовой → показательное число. */
function exampleStats(stats: StatReq[]): string {
  if (!stats.length) return ''
  const parts = stats.map(s => `${s.key}: ${s.type === 'boolean' ? 'true' : sampleNum(s.key)}`)
  return `, stats: { ${parts.join(', ')} }`
}
function sampleNum(key: string): number {
  if (key === 'goals') return 3
  if (key === 'chest') return 1
  if (key === 'qualify') return 1
  return 1
}

function achTier(a: Achievement): string {
  return TIER_META[a.rungs[a.rungs.length - 1].tier].emoji
}

const out: string[] = []
out.push('# SDK: интеграция по каждой игре (`ggReport`)')
out.push('')
out.push('> **Сгенерировано** из `shared/achievements.ts` — не редактируй руками.')
out.push('> Пересобрать: `npx tsx scripts/gen-sdk-spec.ts`. Общий контракт и токен')
out.push('> запуска — в [SDK.md](SDK.md); здесь — что слать по каждой игре, чтобы её')
out.push('> достижения (§7B библии) начали открываться.')
out.push('')
out.push('## Как читать')
out.push('')
out.push('- **result** — какой исход матча естественно слать (хаб платит за победу/финиш).')
out.push('- **humanPlayers** — ставь ≥2 для матчей против живых: иначе не идут соц./ранговые')
out.push('  достижения и «против людей» (§16.4 анти-чит).')
out.push('- **stats** — свободные ключи из отчёта. Хаб маппит их сам: булев `key: true`')
out.push('  накапливает «фирменный» счётчик, число `key: N` суммируется. Никакого кода на')
out.push('  стороне хаба под конкретную игру не нужно — добавить игру = прислать ключи.')
out.push('- Достижения `Первая победа / Завсегдатай / Победитель / Мастер` работают уже от')
out.push('  `result` + `mode` + `humanPlayers`, **без** stats.')
out.push('')

// Сводка по покрытию.
let totalStats = 0
for (const g of GAMES) totalStats += analyze(g).stats.length
out.push(`**Всего игр:** ${GAMES.length} · **достижений уровня игры:** ${PER_GAME.length} · **уникальных stats-ключей:** ${totalStats}.`)
out.push('')
out.push('---')
out.push('')

for (const g of GAMES) {
  const { stats, needsHumans, needsModes } = analyze(g)
  out.push(`## ${g.emoji} ${g.name} — \`${g.id}\``)
  out.push('')
  out.push(`_${categoryRu(g.category)} · ${g.players === 'both' ? 'соло/мультиплеер' : g.players === 'multi' ? 'мультиплеер' : 'соло'}_ · **result:** ${resultHint(g)}`)
  out.push('')
  if (stats.length) {
    out.push('| ключ `stats` | тип | когда ставить | достижение |')
    out.push('|---|---|---|---|')
    for (const s of stats) out.push(`| \`${s.key}\` | ${s.type === 'boolean' ? 'булев' : 'число'} | ${s.trigger} | ${s.ach} |`)
    out.push('')
  } else {
    out.push('_Особых `stats` не нужно — прогресс идёт от исхода матча._')
    out.push('')
  }
  const notes: string[] = []
  if (stats.some(s => s.type === 'boolean')) notes.push('булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).')
  if (needsHumans) notes.push('шли `humanPlayers` (число живых) и `result:\'win\'` — для «Против людей».')
  if (needsModes) notes.push('меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».')
  if (notes.length) { for (const n of notes) out.push(`- ${n}`); out.push('') }

  const mode = g.players === 'multi' ? 'multi' : g.players === 'solo' ? 'solo' : 'multi'
  const human = needsHumans ? ', players: 4, humanPlayers: 4' : ''
  const win = g.players === 'solo' || g.id === 'neontide' ? 'finish' : 'win'
  out.push('```ts')
  out.push(`await ggReport(HUB_URL, launchToken, {`)
  out.push(`  idempotencyKey: \`${g.id}:\${matchId}:\${userId}\`,`)
  out.push(`  result: '${win}'${human}, mode: '${mode}'${exampleStats(stats)},`)
  out.push(`})`)
  out.push('```')
  out.push('')
}

// «Мастер каждой игры» и «Полимат» открываются автоматически поверх остального —
// напоминание, чтобы никто не искал под них отдельный ключ.
out.push('---')
out.push('')
out.push('## Автоматические (ключи не нужны)')
out.push('')
out.push('- **Мастер: <игра>** 💎 — открывается сам, когда взяты все прочие достижения игры.')
out.push('- **Полимат** 🌟 (кросс-игровое) — растёт от числа собранных «Мастеров».')
out.push('- **Центурион / Чемпион категорий / Победитель людей** и прочие кросс-игровые')
out.push('  ладдеры (§7A) тикают от тех же отчётов — специально ничего слать не надо.')
out.push('')

const target = join(here, '..', 'SDK-PER-GAME.md')
writeFileSync(target, out.join('\n'))
console.log(`SDK-PER-GAME.md: ${GAMES.length} игр, ${PER_GAME.length} достижений, ${totalStats} stats-ключей → ${target}`)
