# TUKI

**AI-платформа «сваха» для ремонта и строительства в Израиле.**
Клиент описывает задачу своими словами → ИИ формирует структурированную заявку →
местные мастера предлагают цены → выбор → контакт передаётся в WhatsApp.

## Документация

- [`PLAN.md`](./PLAN.md) — пошаговый план реализации (M1–M7) с чекбоксами
- [`PIVOT_ISRAEL.md`](./PIVOT_ISRAEL.md) — изменения относительно исходного PRD
- [`PRODUCT_PRD.md`](./PRODUCT_PRD.md) — полный PRD (исходная версия для рынка РФ)

## Стек

Next.js 14 (App Router) · TypeScript · TailwindCSS · next-intl (he/ru/en, RTL) ·
Supabase (БД + Auth) · Google Gemini (ИИ) · Cloudflare R2 (фото) · Vercel (хостинг)

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # заполните ключи (см. таблицу ниже)
npm run dev                  # http://localhost:3000
```

Приложение работает **без ключей** — ИИ и БД подключены через мок-провайдеры.
Реальные сервисы подключаются добавлением ключей в `.env.local`.

## Переменные окружения

| Переменная | Когда нужна | Где получить |
|------------|-------------|--------------|
| `GEMINI_API_KEY` | M2 (реальный ИИ; без неё — мок) | [aistudio.google.com](https://aistudio.google.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | M3 | [supabase.com](https://supabase.com) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | M3 | там же |
| `R2_*` | M4 (фото) | Cloudflare Dashboard |
| `RESEND_API_KEY` | M5 (email) | [resend.com](https://resend.com) |

## Деплой на Vercel (бесплатно)

1. Залейте репозиторий на GitHub
2. [vercel.com](https://vercel.com) → Add New Project → импортируйте репозиторий
3. В **Environment Variables** добавьте (минимум для продакшена):
   ```
   GEMINI_API_KEY=...          # реальный ИИ (без него — rule-based мок)
   AUTH_SECRET=<случайная строка>  # openssl rand -hex 32
   ADMIN_EMAILS=you@mail.com   # доступ к /admin
   NEXT_PUBLIC_SITE_URL=https://ваш-домен
   ```
4. Deploy → готово. Далее (по желанию): Supabase-ключи → данные в БД вместо memory

**Важно для продакшена:** без Supabase данные живут в памяти сервера и пропадают при redeploy. Для реального запуска подключите Supabase (см. ниже).

## Подключение Supabase (персистентность)

1. [supabase.com](https://supabase.com) → New project
2. SQL Editor → вставьте `supabase/migrations/001_initial_schema.sql` → Run
3. Settings → API → скопируйте `Project URL` и `service_role` ключ
4. Добавьте в `.env.local` (и в Vercel):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
5. Перезапустите — Repository сам переключится с memory на Supabase

## Скрипты

```bash
npm run dev      # разработка
npm run build    # production-сборка
npm run start    # запуск production-сборки
npm run lint     # ESLint
```

## Структура

```
src/
  app/[locale]/        — страницы (he — RTL по умолчанию, ru, en)
  components/          — React-компоненты
  i18n/                — конфигурация next-intl + словари
  lib/ai/              — AIProvider: GeminiProvider + MockProvider
  lib/geo/             — города Израиля, кластеры матчинга
  lib/db/              — Repository-слой (Supabase + мок)
supabase/              — SQL-миграции
```
