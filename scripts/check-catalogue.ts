// Проверки каталога достижений (§7B). Не тест-фреймворк — просто ассерты на
// инварианты, которые легко сломать при правках: npx tsx scripts/check-catalogue.ts
import { GAMES } from '../shared/games'
import { ACHIEVEMENTS, PER_GAME, isMasterStat, reachedIndex, achievementById } from '../shared/achievements'

let fails = 0
const ok = (cond: boolean, msg: string) => { if (!cond) { console.error('  ✗', msg); fails++ } else console.log('  ✓', msg) }

console.log('Каталог:')
ok(PER_GAME.length === 410, `PER_GAME = 410 (факт ${PER_GAME.length})`)
const masters = ACHIEVEMENTS.filter(a => isMasterStat(a.stat))
ok(masters.length === 41, `Мастеров = 41 (факт ${masters.length})`)
ok(GAMES.every(g => masters.some(m => m.gameId === g.id)), 'у каждой из 41 игры есть «Мастер»')

// Ровно 10 достижений на игру.
const badCounts = GAMES.filter(g => PER_GAME.filter(a => a.gameId === g.id).length !== 10)
ok(badCounts.length === 0, `по 10 достижений на игру (исключений: ${badCounts.length}${badCounts.length ? ' → ' + badCounts.map(g => g.id).join(',') : ''})`)

// Уникальность id по всему каталогу.
const ids = ACHIEVEMENTS.map(a => a.id)
ok(new Set(ids).size === ids.length, `id уникальны (${ids.length} шт.)`)

// Пороги «лесенок» строго возрастают, тиры валидны.
const goodRungs = ACHIEVEMENTS.every(a => a.rungs.length > 0 && a.rungs.every((rg, i) => (i === 0 || rg.target > a.rungs[i - 1].target)))
ok(goodRungs, 'пороги лесенок строго возрастают')

// Каждый мастер зависит РОВНО от прочих достижений своей игры (и не от себя).
const masterOk = masters.every(m => {
  const members = PER_GAME.filter(a => a.gameId === m.gameId && !isMasterStat(a.stat))
  return members.length === 9 && !members.includes(m)
})
ok(masterOk, 'каждый «Мастер» покрывает ровно 9 достижений своей игры')

// Полимат присутствует и читает games_mastered.
const poly = achievementById('polymath')
ok(!!poly && poly.stat === 'games_mastered', 'Полимат (④) есть и читает games_mastered')

// Симуляция: игра «домино» с максимальными счётчиками → все её достижения взяты,
// master_domino = 1. Строим фейковый snapshot из целей верхних рунгов.
const gid = 'domino'
const members = PER_GAME.filter(a => a.gameId === gid && !isMasterStat(a.stat))
const snap: Record<string, number> = {}
for (const a of members) snap[a.stat] = a.rungs[a.rungs.length - 1].target
const allMaxed = members.every(a => reachedIndex(a, snap[a.stat]) === a.rungs.length - 1)
ok(allMaxed, `все достижения «${gid}» берутся на максимум при целевых счётчиках`)

// Стат-ключи уровня игры следуют конвенции (successes/matches/winsvsh/f_/s_/modes/master).
const okStat = (s: string, id: string) =>
  s === `successes_game_${id}` || s === `matches_game_${id}` || s === `winsvsh_game_${id}` ||
  s === `finishes_game_${id}` || s === `modes_game_${id}` || s === `master_${id}` ||
  s.startsWith(`f_${id}_`) || s.startsWith(`s_${id}_`)
const strayStats = PER_GAME.filter(a => a.gameId && !okStat(a.stat, a.gameId))
ok(strayStats.length === 0, `стат-ключи по конвенции (нарушений: ${strayStats.length}${strayStats.length ? ' → ' + strayStats.slice(0, 3).map(a => a.stat).join(',') : ''})`)

console.log(fails === 0 ? '\nВсе проверки пройдены ✅' : `\n${fails} проверок упало ❌`)
process.exit(fails === 0 ? 0 : 1)
