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
