# GG SDK: как игре подключиться к хабу

Хаб Game is Game собирает живое присутствие со всех игр: полка «Друзья в
сети», счётчик «🟢 N в игре» на карточках и чарты. Подключение — один
HTTP-вызов с сервера игры, без библиотек.

## Присутствие (presence)

Сервер игры сообщает хабу, что игрок сейчас в игре:

```
POST https://game-is-game-production.up.railway.app/api/presence/ping
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
const HUB = process.env.GG_HUB_URL   // https://game-is-game-production.up.railway.app
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

## Что дальше (планируется)

- **Кошелёк**: списание/начисление Game из игр (game passes, буллы).
- **Комнаты**: премиум-комнаты за Game.
- **Уведомления**: события игры подписчикам через бота хаба.

Пока этих API нет — не выдумывай их; этот файл дополняется по мере выхода.
