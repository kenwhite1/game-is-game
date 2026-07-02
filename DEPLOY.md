# Деплой Game is Game на Railway

## 1. Бот в @BotFather

1. `/newbot` → получи `BOT_TOKEN`, запомни `@username` бота (например `game_is_game_bot`).
2. Позже, после получения публичного URL, сервер сам поставит кнопку меню,
   открывающую лаунчер. Дополнительно можно включить главное мини-приложение
   через `/setmenubutton` или Configure Mini App.

## 2. Проект на Railway

1. Создай сервис из этого репозитория (Railway сам поймёт Nixpacks по `railway.json`/`nixpacks.toml`).
2. Сборка: `npm install && npm run build`. Старт: `npm start`. Node 22 (через `.nvmrc` + engines).
3. Добавь том (Volume) и смонтируй его в `/data` (там живёт SQLite).
4. Переменные окружения:

   | Переменная | Значение |
   |---|---|
   | `BOT_TOKEN` | токен из @BotFather (обязателен в проде) |
   | `APP_URL` | публичный https-URL сервиса Railway |
   | `BOT_USERNAME` | username бота без `@` |
   | `WEBHOOK_SECRET` | любая случайная строка |
   | `JWT_SECRET` | длинная случайная строка |
   | `DATA_DIR` | `/data` |
   | `NODE_ENV` | `production` |
   | `ADMIN_IDS` | Telegram id админов через запятую (доступ к `/announce`, `/refund`) |
   | `PRESENCE_KEY` | случайная строка: серверы игр шлют ей живое присутствие (см. SDK.md) |

5. После первого деплоя сервер сам поставит вебхук на `APP_URL/bot/<WEBHOOK_SECRET>`,
   зарегистрирует команды и описания бота и привяжет кнопку меню к лаунчеру.

## 3. Связанные игры (по желанию)

Плитки открывают игры по ссылкам из `shared/games.ts`. Переопредели их только если
у игры другой `@username` или нужен свой URL:

| Переменная | Пример |
|---|---|
| `UNO_BOT` / `UNO_LINK` | `odinkartibot` / полный URL |
| `CROCO_BOT` / `CROCO_LINK` | `krokosha_play_bot` / полный URL |
| `MAFIA_BOT` / `MAFIA_LINK` | `secretnochibot` / полный URL |
| `PET_BOT` / `PET_LINK` | `sharikrubot` / полный URL |

Чтобы `?startapp` открывал игру сразу, у каждого бота-игры должно быть включено
главное мини-приложение (BotFather → Bot Settings → Configure Mini App → Main Mini App).

## Заметки

- Без `BOT_TOKEN` сервер уходит в DEV MODE (авторизация-заглушка), в проде так
  делать нельзя: сервер предупредит об этом в логах.
- Если `/data` не смонтирован, сервер не падает: откатывается во временную папку
  (данные не сохраняются между деплоями) и пишет предупреждение.
- Health-check: `GET /api/health` → `{"ok":true}`.
