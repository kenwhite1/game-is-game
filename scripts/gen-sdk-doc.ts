// Генерирует SDK-PER-GAME.md из фактических определений достижений — так гайд
// для интеграторов всегда совпадает с кодом. Запуск: npx tsx scripts/gen-sdk-doc.ts
import { GAMES } from '../shared/games'
import { PER_GAME, type Achievement } from '../shared/achievements'

const byGame = new Map<string, Achievement[]>()
for (const a of PER_GAME) {
  if (!a.gameId) continue
  const l = byGame.get(a.gameId) ?? []; l.push(a); byGame.set(a.gameId, l)
}

const out: string[] = []
out.push('# Game is Game — SDK интеграция по играм')
out.push('')
out.push('> Автогенерируется из `shared/achievements.ts` (`scripts/gen-sdk-doc.ts`). Не редактируй руками.')
out.push('')
out.push('Каждая игра при окончании матча вызывает `ggReport(HUB_URL, launchToken, report)` из `shared/sdk.ts`.')
out.push('Токен запуска игра получает из `startapp`-параметра. Хаб сам считает награды/прогресс/ранг —')
out.push('игре нужен ОДИН вызов. Повтор с тем же `idempotencyKey` идемпотентен.')
out.push('')
out.push('## Общий контракт (`MatchReport`)')
out.push('')
out.push('```ts')
out.push('await ggReport(HUB_URL, launchToken, {')
out.push("  idempotencyKey: 'game:match:<matchId>:<userId>', // уникально на матч/игрока")
out.push("  result: 'win' | 'loss' | 'draw' | 'finish',      // finish — для раннеров/пасьянсов")
out.push('  players, humanPlayers,   // размер лобби и сколько ЖИВЫХ людей (важно для соц./ранга)')
out.push("  mode: 'solo' | 'multi' | 'friends',")
out.push('  durationSec, score,       // опционально')
out.push('  stats: { /* см. ниже по игре */ },')
out.push('})')
out.push('```')
out.push('')
out.push('**Автоматически (без `stats`)** хаб считает из полей отчёта:')
out.push('- «Первая победа» / «Победитель» / прогресс — из `result` (`win`/`finish` = успех).')
out.push('- «Завсегдатай» — из числа матчей.')
out.push('- «Против людей» — из побед при `humanPlayers ≥ 2`.')
out.push('- «Знаток режимов» — из разных `mode`.')
out.push('- «Мастер игры» — открывается сам, когда взяты все прочие достижения игры.')
out.push('')
out.push('**Только флаги/числа в `stats`** нужны для «фирменных»/скилловых достижений ниже —')
out.push('булев `true` (когда игрок совершил приём) или число (накопление). Слать их нужно только')
out.push('в матче, где приём случился; в остальных — не слать.')
out.push('')

for (const g of GAMES) {
  const list = byGame.get(g.id) ?? []
  const flags: { key: string; title: string; desc: string }[] = []
  const nums: { key: string; title: string; desc: string }[] = []
  for (const a of list) {
    const mf = /^f_.+_(.+)$/.exec(a.stat)
    const mn = /^s_.+_(.+)$/.exec(a.stat)
    if (mf) flags.push({ key: mf[1], title: a.title, desc: a.desc })
    else if (mn) nums.push({ key: mn[1], title: a.title, desc: a.desc })
  }
  out.push(`### ${g.name} — \`${g.id}\``)
  if (flags.length === 0 && nums.length === 0) {
    out.push('')
    out.push('Дополнительные `stats` не нужны — всё считается автоматически из отчёта.')
    out.push('')
    continue
  }
  out.push('')
  out.push('| Ключ в `stats` | Тип | Достижение | Когда слать |')
  out.push('|---|---|---|---|')
  for (const f of flags) out.push(`| \`${f.key}\` | \`true\` | ${f.title} | ${f.desc} |`)
  for (const n of nums) out.push(`| \`${n.key}\` | число | ${n.title} | ${n.desc} (кумулятивно за матч) |`)
  out.push('')
}

process.stdout.write(out.join('\n') + '\n')
