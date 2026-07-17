# GG SDK: как игре подключиться к хабу

Хаб Game is Game собирает живое присутствие со всех игр: полка «Друзья в
сети», счётчик «🟢 N в игре» на карточках и чарты. Подключение — один
HTTP-вызов с сервера игры, без библиотек.

## Присутствие (presence)

Сервер игры сообщает хабу, что игрок сейчас в игре:

```
POST https://game-is-game-hub-production.up.railway.app/api/presence/ping
X-Presence-Key: <PRESENCE_KEY>
Content-Type: application/json

{ "userId": 123456789, "gameId": "domino", "event": "ping" }
```

- `userId` — Telegram id игрока (он у игры уже есть из initData).
- `gameId` — id игры из `shared/games.ts` хаба (обычно имя папки репозитория).
- `event` — `start` при входе в игру, `ping` раз в **60 секунд**, пока игрок
  активен, `end` при выходе. Запись живёт 3 минуты без пинга, так что
  потерянный `end` не страшен.

Ключ `PRESENCE_KEY` задаётся в переменных окружения хаба на Railway и
раздаётся играм тоже через env. Без ключа эндпоинт отвечает 403.

Минимальный код для сервера игры (Node):

```ts
const HUB = process.env.GG_HUB_URL   // https://game-is-game-hub-production.up.railway.app
const KEY = process.env.GG_PRESENCE_KEY

export function ggPresence(userId: number, event: 'start' | 'ping' | 'end') {
  if (!HUB || !KEY) return
  void fetch(`${HUB}/api/presence/ping`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-presence-key': KEY },
    body: JSON.stringify({ userId, gameId: 'domino', event }),
  }).catch(() => {})
}
```

Вызывай `ggPresence(uid, 'start')` при входе в комнату/матч, `'ping'` по
таймеру раз в минуту на активные сессии, `'end'` при выходе. Ошибки глотай:
присутствие — некритичная телеметрия, игра не должна замечать недоступный хаб.

## Результаты матчей (Results SDK)

Это «труба», которая зажигает весь мета-слой: достижения, квесты, серию, пропуск
и ранги (§2 библии). Игра рапортует **что произошло** в матче; сколько это стоит
(монеты/XP/прогресс) — считает **только хаб** по своим таблицам. Поэтому даже
скомпрометированная игра максимум наврёт про исход (ограниченно и детектируемо),
но не может начислить валюту.

### Один вызов на конец матча

```
POST https://game-is-game-hub-production.up.railway.app/api/sdk/result
X-GG-Launch: <токен запуска>
Content-Type: application/json

{
  "idempotencyKey": "chekharda:match8f3a:user42",  // одна выплата на матч/игрока
  "result": "win",              // win | loss | draw | finish
  "placement": 1,               // опц., 1..N
  "players": 16,                // размер лобби
  "humanPlayers": 6,            // из них живых людей (важно для соц./ранга/анти-чита)
  "score": 3,                   // опц., смысл задаёт игра
  "durationSec": 252,           // опц.
  "mode": "multi",              // multi | solo | friends
  "stats": { "goals": 3, "clean": true }   // опц. игровые метрики (см. ниже)
}
```

Хаб проверяет токен запуска, **дедупит по `idempotencyKey`** (повтор при сетевом
сбое безопасен — шли тот же ключ), считает награду сам, применяет дневной потолок
и тикает весь прогресс — одной транзакцией. Ответ: `{ ok, rewarded, coins, error? }`.

### Токен запуска (кто на самом деле играл, §2.3)

При запуске игры из хаба (`POST /open`) хаб выпускает короткоживущий подписанный
**токен запуска** (JWT, ~2ч, привязан к `{userId, gameId}`). Игра возвращает его в
`X-GG-Launch`. Нет валидного токена — результат не оплачивается (`bad_launch`).

Токен приходит в игру через `startapp`-параметр. Но JWT содержит точки, а Telegram
`startapp` разрешает только `[A-Za-z0-9_-]`, поэтому токен **завёрнут в base64url**.
Разворачивай его хелпером из `shared/sdk.ts`:

```ts
import { decodeLaunchParam, ggReport } from './gg-sdk'   // копия shared/sdk.ts

const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param
const launchToken = decodeLaunchParam(startParam)   // null → игра открыта не из хаба
```

### Минимальная интеграция

Скопируй `shared/sdk.ts` в игру (без зависимостей) и вызови один раз на конец матча:

```ts
const HUB = process.env.GG_HUB_URL   // https://game-is-game-hub-production.up.railway.app

if (launchToken) {
  await ggReport(HUB, launchToken, {
    idempotencyKey: `${GAME_ID}:${matchId}:${userId}`,
    result: 'win',
    players, humanPlayers,
    mode: 'multi',
    stats: { /* см. SDK-PER-GAME.md для этой игры */ },
  })
}
```

Никакой логики кошелька/XP/косметики в игре нет — игра рапортует, хаб награждает.
Пока игра не интегрирована, она получает **прежние награды за запуск** — ничего не
регрессирует; аутком-слой зажигается по игре по мере подключения.

### `stats` — как открываются игровые достижения (§7B)

Свободные ключи в `stats` хаб маппит сам, без кода под конкретную игру:

- **булев** `key: true` (в не-проигрышном матче) — «фирменный» момент, копит счётчик
  `f_<gameId>_<key>` (напр. `clean: true` → «Сухая победа»).
- **число** `key: N` — накопление `s_<gameId>_<key>` (напр. `goals: 3` → «Бомбардир»).

Полный перечень нужных ключей **по каждой из 41 игры** — в
[SDK-PER-GAME.md](SDK-PER-GAME.md) (генерируется из каталога достижений:
`npx tsx scripts/gen-sdk-spec.ts`, чтобы спека не расходилась с движком).

> **Одно замечание по доставке токена (для того, кто катит роллаут).** Сам эндпоинт,
> токены и награды — живые. Осталось, чтобы **приложение хаба** клало
> `encodeLaunchParam(launchToken)` в ссылку запуска игры (сейчас `startapp=<gameId>`),
> а `launch()` брал токен до открытия ссылки (сегодня `/open` возвращает его уже
> после). Это единственный шаг проводки на стороне хаба; контракт игры от него не
> зависит и описан выше.

## Единая валюта G (Кошелёк)

На весь проект **один счёт G** (баланс хаба). У игр своей валюты нет - они
читают и тратят общий баланс по токену запуска. Хаб - единственная точка
изменения баланса (аудит в ledger), поэтому трата честная и идемпотентная.

```ts
import { ggBalance, ggSpend } from './gg-sdk'   // копия shared/sdk.ts

// Показать баланс G (вместо локальных монет):
const { coins } = await ggBalance(HUB, launchToken)

// Списать G за покупку в игре (идемпотентно по ключу):
const r = await ggSpend(HUB, launchToken, {
  amount: 200, reason: 'cosmetic',
  idempotencyKey: `${GAME_ID}:hat_gold:${userId}`,
})
if (!r.ok && r.error === 'too_poor') { /* не хватает G */ }
```

- `GET /api/sdk/balance` -> `{ ok, coins }` - баланс G игрока.
- `POST /api/sdk/spend` `{ amount, reason?, idempotencyKey? }` -> `{ ok, coins, error? }`
  (`too_poor` если не хватает, `duplicate` при повторе того же ключа).

Оба эндпоинта авторизуются токеном запуска (как `/sdk/result`). Начисление G
по-прежнему идёт только через Results SDK - игра не может выдать себе валюту.

## Язык хаба в игре (i18n)

Игра открывается на языке хаба: язык едет в токене запуска (claim `lng`).

```ts
import { launchLang } from './gg-sdk'
const lang = launchLang(window.Telegram?.WebApp?.initDataUnsafe?.start_param)
if (lang) setLang(lang)   // 'ru' | 'en' | null (null = открыто не из хаба)
```

## Что дальше (планируется)

- **Комнаты**: премиум-комнаты за G.
- **Уведомления**: события игры подписчикам через бота хаба.

Пока этих API нет - не выдумывай их; этот файл дополняется по мере выхода.
