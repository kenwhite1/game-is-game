# SDK: интеграция по каждой игре (`ggReport`)

> **Сгенерировано** из `shared/achievements.ts` — не редактируй руками.
> Пересобрать: `npx tsx scripts/gen-sdk-spec.ts`. Общий контракт и токен
> запуска — в [SDK.md](SDK.md); здесь — что слать по каждой игре, чтобы её
> достижения (§7B библии) начали открываться.

## Как читать

- **result** — какой исход матча естественно слать (хаб платит за победу/финиш).
- **humanPlayers** — ставь ≥2 для матчей против живых: иначе не идут соц./ранговые
  достижения и «против людей» (§16.4 анти-чит).
- **stats** — свободные ключи из отчёта. Хаб маппит их сам: булев `key: true`
  накапливает «фирменный» счётчик, число `key: N` суммируется. Никакого кода на
  стороне хаба под конкретную игру не нужно — добавить игру = прислать ключи.
- Достижения `Первая победа / Завсегдатай / Победитель / Мастер` работают уже от
  `result` + `mode` + `humanPlayers`, **без** stats.

**Всего игр:** 41 · **достижений уровня игры:** 410 · **уникальных stats-ключей:** 175.

---

## 🔪 Маньяк — `maniac`

_Компания · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `novote` | булев | Победи за Маньяка, не собрав против себя ни одного голоса | Кто здесь Маньяк |
| `sheriff` | булев | За Шерифа потрать единственный патрон точно в Маньяка | Меткий шериф |
| `deciding` | булев | За мирного подай решающий голос, изгоняющий Маньяка | Дедукция |
| `survived` | булев | Доживи до конца матча 10 раз | Выживший |
| `fulltable` | булев | Победи в матче с 6+ живыми игроками | Полный стол |
| `accused` | булев | За Маньяка победи после публичного обвинения | Хладнокровный |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `maniac:${matchId}:${userId}`,
  result: 'win', mode: 'multi', stats: { novote: true, sheriff: true, deciding: true, survived: true, fulltable: true, accused: true },
})
```

## 🚀 Нитро-лига — `nitroliga`

_Аркады · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `hattrick` | булев | Забей 3+ гола за один матч | Хет-трик |
| `aerial` | булев | Забей гол с лёта, в воздухе | Воздушный ас |
| `clean` | булев | Выиграй, не пропустив ни одного гола | Сухая победа |
| `comeback` | булев | Выиграй, уступая 2+ гола | Камбэк |
| `goals` | число | Забивай голы | Бомбардир |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `nitroliga:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { hattrick: true, aerial: true, clean: true, comeback: true, goals: 3 },
})
```

## 🚤 Неон-Тайд — `neontide`

_Аркады · соло/мультиплеер_ · **result:** `'finish'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Доберись до сундука, не потеряв ни одного блока | Целым и невредимым |
| `gold` | булев | Заверши заплыв на золотых блоках | Золотой флот |
| `waterfall` | булев | Переживи секцию водопада | Инженер |
| `fast` | булев | Заверши заплыв быстрее порога | Скороход |
| `chest` | число | Забирай золотой сундук | Богач |
| `coop` | булев | Заверши заплыв вместе с другом | Кооп |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `neontide:${matchId}:${userId}`,
  result: 'finish', mode: 'multi', stats: { flawless: true, gold: true, waterfall: true, fast: true, chest: 1, coop: true },
})
```

## 🍡 Чехарда — `chekharda`

_Аркады · мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `nofall` | булев | Выиграй эпизод, ни разу не упав | Без падений |
| `fast` | булев | Возьми финальный раунд быстрее порога | Зефирная молния |
| `final` | булев | Дойди до третьего раунда 10 раз | Финалист |
| `full` | булев | Победи в полном лобби из 16 игроков | Полный лоббик |
| `qualify` | число | Проходи первый раунд | Живучий |
| `comeback` | булев | Победи, будучи последним в начале третьего раунда | Камбэк |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `chekharda:${matchId}:${userId}`,
  result: 'win', mode: 'multi', stats: { nofall: true, fast: true, final: true, full: true, qualify: 1, comeback: true },
})
```

## 🎴 Однушечка — `uno`

_Карты · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не набрав ни одного штрафного очка | Безупречно |
| `fast` | булев | Победи за минимум ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Победи, скинув последней картой «+4» | Чистая рука |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `uno:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🐊 Крокоша — `croco`

_Компания · мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи с идеальным раундом | Безупречно |
| `fast` | булев | Победи в экспресс-темпе | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Угадай слово меньше чем за 10 секунд | Телепат |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `croco:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🌙 Секрет ночи — `mafia`

_Компания · мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи с идеальным раундом | Безупречно |
| `fast` | булев | Победи в экспресс-темпе | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Победи за Мафию, оставшись до конца | Крёстный отец |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `mafia:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🎷 Сакс-будильник — `saxalarm`

_Компания · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи с идеальным раундом | Безупречно |
| `fast` | булев | Победи в экспресс-темпе | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Победи в компании из 6+ человек | Заводила |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `saxalarm:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🐾 Шарик — `pet`

_Аркады · соло_ · **result:** `'finish'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `full` | булев | Доведи все показатели питомца до максимума | Здоровяк |
| `signature` | булев | Достигни максимальной привязанности | Лучший друг |
| `variety` | булев | Накорми питомца всеми видами еды | Гурман |
| `clean` | булев | Держи питомца ухоженным неделю подряд | Чистюля |
| `fast` | булев | Сыграй с питомцем во все мини-игры | Непоседа |
| `comeback` | булев | Верни к жизни запущенного питомца | Второе дыхание |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `pet:${matchId}:${userId}`,
  result: 'finish', mode: 'solo', stats: { full: true, signature: true, variety: true, clean: true, fast: true, comeback: true },
})
```

## 🃏 Картишки — `kartishki`

_Карты · мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не набрав ни одного штрафного очка | Безупречно |
| `fast` | булев | Победи за минимум ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Выиграй раунд ведущим | Панчлайн |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `kartishki:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🍾 Слабо? — `slabo`

_Компания · мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи с идеальным раундом | Безупречно |
| `fast` | булев | Победи в экспресс-темпе | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Выполни задание «действие» на камеру | Смельчак |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `slabo:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🧠 Викторина — `viktorina`

_Компания · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи с идеальным раундом | Безупречно |
| `fast` | булев | Победи в экспресс-темпе | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Пройди раунд без единой ошибки | Эрудит |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `viktorina:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🕵️ Крот — `krot`

_Компания · мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи с идеальным раундом | Безупречно |
| `fast` | булев | Победи в экспресс-темпе | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Вычисли крота с первого голосования | Контрразведка |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `krot:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🎲 Домино — `domino`

_Настольные · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Выиграй по очкам в наглухо заблокированной партии | Рыба |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `domino:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🎟️ Лото — `loto`

_Настольные · соло/мультиплеер_ · **result:** `'win'`/`'loss'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Закрой карточку раньше всех «по кону» | Полный дом |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `loto:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🪜 Лесенки — `lesenki`

_Настольные · соло/мультиплеер_ · **result:** `'win'`/`'loss'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Дойди до финиша, не съехав ни по одной змее | Змеелов |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `lesenki:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🎩 Магнат — `magnat`

_Настольные · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Победи, владея полным набором цвета с отелями | Монополист |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `magnat:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## ⚓ Морской бой — `morskoyboy`

_Настольные · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Потопи весь флот, потратив ≤25 выстрелов | Снайпер |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `morskoyboy:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🀄 Маджонг — `mahjong`

_Настольные · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Разбери доску без отмен | Чистое поле |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `mahjong:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## ⚪ Реверси — `reversi`

_Настольные · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Победи, заняв 50+ клеток | Разгром |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `reversi:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🕷️ Паук — `pauk`

_Карты · соло_ · **result:** `'finish'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Собери пасьянс, ни разу не отменив ход | Без отмен |
| `fast` | булев | Собери пасьянс быстрее порога | Скоростной |
| `signature` | булев | Собери расклад в две масти | Паучок |
| `hard` | булев | Собери расклад в четыре масти | Арахнолог |
| `clean` | булев | Разбери всю доску без застреваний | Чистое поле |
| `comeback` | булев | Собери пасьянс из почти безвыходного расклада | Из тупика |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `pauk:${matchId}:${userId}`,
  result: 'finish', mode: 'solo', stats: { flawless: true, fast: true, signature: true, hard: true, clean: true, comeback: true },
})
```

## ✏️ Виселица — `viselitsa`

_Слова · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не сделав ни одной ошибки | Безупречно |
| `fast` | булев | Угадай с первых попыток | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Угадай слово, не сделав ни одной ошибки | С первой буквы |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `viselitsa:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🔤 Буквица — `bukvica`

_Слова · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не сделав ни одной ошибки | Безупречно |
| `fast` | булев | Угадай с первых попыток | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Собери слово из 7 букв на бонусной клетке | Слово дня |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `bukvica:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🧶 Плетёнка — `pletenka`

_Слова · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не сделав ни одной ошибки | Безупречно |
| `fast` | булев | Угадай с первых попыток | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Найди все слова, не ошибившись | Филолог |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `pletenka:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 👾 Хрумик — `hrumik`

_Аркады · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не получив ни одного урона | Безупречно |
| `fast` | булев | Победи быстрее порога времени | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Съешь всю доску и 4 призраков за один буст | Обжора |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `hrumik:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🫧 Пузырик — `puzyrik`

_Аркады · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не получив ни одного урона | Безупречно |
| `fast` | булев | Победи быстрее порога времени | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Схлопни 10+ шаров одним выстрелом | Каскад |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `puzyrik:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🏒 Шайбус — `shaybus`

_Аркады · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не получив ни одного урона | Безупречно |
| `fast` | булев | Победи быстрее порога времени | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Победи со счётом 7:0 | Всухую |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `shaybus:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🎱 Дуплет — `duplet`

_Аркады · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не получив ни одного урона | Безупречно |
| `fast` | булев | Победи быстрее порога времени | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Забей все свои шары и восьмёрку без промаха | Чистый прогон |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `duplet:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🏓 Рикошет — `rikoshet`

_Аркады · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не получив ни одного урона | Безупречно |
| `fast` | булев | Победи быстрее порога времени | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Выбей целый ряд одним рикошетом | Одним махом |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `rikoshet:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🪖 Танчики — `tanchiki`

_Аркады · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не получив ни одного урона | Безупречно |
| `fast` | булев | Победи быстрее порога времени | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Пройди волну, не потеряв базу | Крепость |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `tanchiki:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🎪 Забава — `zabava`

_Аркады · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не получив ни одного урона | Безупречно |
| `fast` | булев | Победи быстрее порога времени | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Победи во всех трёх мини-играх подряд | Три из трёх |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `zabava:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🧩 Клеточки — `kletki`

_Головоломки · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Реши без подсказок и отмен | Безупречно |
| `fast` | булев | Реши быстрее порога времени | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Реши нонограмму без единой ошибки | Без ошибок |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `kletki:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🧊 Кубик — `kubik`

_Головоломки · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Реши без подсказок и отмен | Безупречно |
| `fast` | булев | Реши быстрее порога времени | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Собери кубик быстрее порога | Спидкубер |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `kubik:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🔵 Линик — `linik`

_Головоломки · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Реши без подсказок и отмен | Безупречно |
| `fast` | булев | Реши быстрее порога времени | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Собери линию из 5 шаров одним ходом | Пятёрка |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `linik:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 📦 Складик — `skladik`

_Головоломки · соло/мультиплеер_ · **result:** `'finish'` (соло) · `'win'`/`'loss'` (versus)

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Реши без подсказок и отмен | Безупречно |
| `fast` | булев | Реши быстрее порога времени | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Реши уровень за минимум ходов | Оптимист |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `skladik:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🔴 Четыре в ряд — `ryad`

_Стратегии · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Победи, создав вилку из двух угроз | Двойная угроза |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `ryad:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## ⚫ Го — `go`

_Стратегии · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Победи с перевесом в 50+ очков | Территория |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `go:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## ⛩️ Сёги — `shogi`

_Стратегии · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Победи менее чем за 25 ходов | Мат в миттельшпиле |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `shogi:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🐉 Сянци — `xiangqi`

_Стратегии · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Победи менее чем за 25 ходов | Мат в миттельшпиле |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `xiangqi:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## ⚔️ Легион — `legion`

_Стратегии · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Удержи целый континент до своего хода | Континент |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `legion:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

## 🗺️ Натиск — `natisk`

_Стратегии · соло/мультиплеер_ · **result:** `'win'`/`'loss'`/`'draw'`

| ключ `stats` | тип | когда ставить | достижение |
|---|---|---|---|
| `flawless` | булев | Победи, не потеряв ни одной фигуры | Безупречно |
| `fast` | булев | Победи менее чем за 25 ходов | Молния |
| `comeback` | булев | Победи из явно проигрышной позиции | Камбэк |
| `signature` | булев | Захвати карту за минимум ходов | Блицкриг |

- булевы флаги шли **только** в том матче, где приём случился (не по умолчанию).
- шли `humanPlayers` (число живых) и `result:'win'` — для «Против людей».
- меняй `mode` (`solo`/`multi`/`friends`) — для «Знатока режимов».

```ts
await ggReport(HUB_URL, launchToken, {
  idempotencyKey: `natisk:${matchId}:${userId}`,
  result: 'win', players: 4, humanPlayers: 4, mode: 'multi', stats: { flawless: true, fast: true, comeback: true, signature: true },
})
```

---

## Автоматические (ключи не нужны)

- **Мастер: <игра>** 💎 — открывается сам, когда взяты все прочие достижения игры.
- **Полимат** 🌟 (кросс-игровое) — растёт от числа собранных «Мастеров».
- **Центурион / Чемпион категорий / Победитель людей** и прочие кросс-игровые
  ладдеры (§7A) тикают от тех же отчётов — специально ничего слать не надо.
