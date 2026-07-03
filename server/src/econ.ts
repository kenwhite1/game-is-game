import { db } from './db'

// Мониторинг здоровья экономики (§16.3, «центробанк» по EVE Online). Читает
// coin_ledger: сколько монет в обороте, объёмы фаусетов/стоков по источникам,
// соотношение сток/фаусет (держим ≥1), перцентили кошельков и рост денежной
// массы. Только для операторов (ADMIN_IDS) — витрины для игроков нет.

function windowMs(days: number): number { return Date.now() - days * 86_400_000 }

interface SourceRow { reason: string; faucet: number; sink: number }

function bySource(sinceMs: number): SourceRow[] {
  return db.prepare(
    `SELECT reason,
            SUM(CASE WHEN delta>0 THEN delta ELSE 0 END) AS faucet,
            SUM(CASE WHEN delta<0 THEN -delta ELSE 0 END) AS sink
       FROM coin_ledger WHERE ts >= ? GROUP BY reason ORDER BY (faucet+sink) DESC`,
  ).all(sinceMs) as SourceRow[]
}
function totals(sinceMs: number): { faucet: number; sink: number; net: number } {
  const r = db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN delta>0 THEN delta ELSE 0 END),0) AS faucet,
            COALESCE(SUM(CASE WHEN delta<0 THEN -delta ELSE 0 END),0) AS sink,
            COALESCE(SUM(delta),0) AS net FROM coin_ledger WHERE ts >= ?`,
  ).get(sinceMs) as { faucet: number; sink: number; net: number }
  return r
}
function percentiles(): { p50: number; p90: number; p99: number; max: number } {
  const coins = (db.prepare('SELECT coins FROM users ORDER BY coins ASC').all() as { coins: number }[]).map(r => r.coins)
  if (coins.length === 0) return { p50: 0, p90: 0, p99: 0, max: 0 }
  const at = (p: number) => coins[Math.min(coins.length - 1, Math.floor(p * coins.length))]
  return { p50: at(0.5), p90: at(0.9), p99: at(0.99), max: coins[coins.length - 1] }
}

export interface EconomyReport {
  circulation: number
  users: number
  ledgerRows: number
  wallets: { p50: number; p90: number; p99: number; max: number }
  d7: { faucet: number; sink: number; ratio: number; growthRatePct: number; bySource: SourceRow[] }
  d30: { faucet: number; sink: number; ratio: number; growthRatePct: number }
}

export function economyReport(): EconomyReport {
  const circulation = (db.prepare('SELECT COALESCE(SUM(coins),0) AS n FROM users').get() as { n: number }).n
  const users = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n
  const ledgerRows = (db.prepare('SELECT COUNT(*) AS n FROM coin_ledger').get() as { n: number }).n
  const t7 = totals(windowMs(7)), t30 = totals(windowMs(30))
  const ratio = (t: { faucet: number; sink: number }) => (t.faucet > 0 ? Math.round((t.sink / t.faucet) * 100) / 100 : 0)
  const growth = (net: number) => {
    const prev = circulation - net
    return prev > 0 ? Math.round((net / prev) * 1000) / 10 : 0
  }
  return {
    circulation, users, ledgerRows, wallets: percentiles(),
    d7: { faucet: t7.faucet, sink: t7.sink, ratio: ratio(t7), growthRatePct: growth(t7.net), bySource: bySource(windowMs(7)) },
    d30: { faucet: t30.faucet, sink: t30.sink, ratio: ratio(t30), growthRatePct: growth(t30.net) },
  }
}

/** Текстовый отчёт для бота-оператора. */
export function economyReportText(): string {
  const r = economyReport()
  const money = (n: number) => n.toLocaleString('ru')
  const lines = [
    '📊 Экономика Game is Game',
    `В обороте: ${money(r.circulation)} · игроков: ${money(r.users)} · строк ledger: ${money(r.ledgerRows)}`,
    `Кошельки P50/P90/P99: ${money(r.wallets.p50)} / ${money(r.wallets.p90)} / ${money(r.wallets.p99)} (макс ${money(r.wallets.max)})`,
    '',
    `7д: фаусет ${money(r.d7.faucet)} · сток ${money(r.d7.sink)} · сток/фаусет ${r.d7.ratio} · рост ${r.d7.growthRatePct}%`,
    `30д: фаусет ${money(r.d30.faucet)} · сток ${money(r.d30.sink)} · сток/фаусет ${r.d30.ratio} · рост ${r.d30.growthRatePct}%`,
    '',
    'Источники (7д, фаусет/сток):',
    ...r.d7.bySource.slice(0, 12).map(s => `  ${s.reason}: +${money(s.faucet)} / −${money(s.sink)}`),
    '',
    r.d7.ratio >= 1 ? '✅ сток/фаусет ≥ 1 — здорово' : '⚠️ сток < фаусет — риск инфляции: усилить стоки/срезать краны',
  ]
  return lines.join('\n')
}
