# Telegram-бот автопродаж COMINT

Бот работает в Cloudflare Workers. Он использует D1 для сессий и заявок, R2 для архивирования файлов и Telegram Bot API для диалога с клиентом и уведомлений менеджеру.

## Возможности

- выбор услуги из каталога сайта COMINT;
- свободное описание задачи;
- указание количества или тиража;
- прикрепление макета или примера;
- запрос телефона через кнопку Telegram;
- создание заявки с уникальным номером;
- список заявок клиента и их статусы;
- уведомление менеджера с кнопками «В работе», «Выполнено», «Отменить»;
- отдельная кнопка «Позвать менеджера».

## Настройка Cloudflare

1. Создайте отдельного бота через `@BotFather` и получите токен.
2. Создайте D1 и R2:

```bash
npx wrangler login
npx wrangler d1 create comint-autosales-db
npx wrangler r2 bucket create comint-autosales-uploads
```

3. Вставьте полученный `database_id` в `wrangler.jsonc`. Имя R2-бакета должно совпадать с `bucket_name`.
4. Выполните миграцию:

```bash
npx wrangler d1 migrations apply comint-autosales-db --remote
```

5. В `wrangler.jsonc` укажите `MANAGER_CHAT_ID` и `MANAGER_USER_IDS`. В `MANAGER_USER_IDS` можно перечислить несколько Telegram ID через запятую.
6. Сохраните секреты:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
```

7. Разверните Worker:

```bash
npx wrangler deploy
```

8. Установите webhook Telegram. Подставьте URL Worker и тот же секрет, который был сохранён в `WEBHOOK_SECRET`:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<WORKER_URL>/telegram/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>"
```

Проверка: `https://<WORKER_URL>/health` должна вернуть `{"ok":true,...}`.

## Локальный запуск

Скопируйте `.dev.vars.example` в `.dev.vars`, заполните секреты, примените локальную миграцию и запустите `npm run dev`. Для локального webhook понадобится публичный HTTPS-туннель.
