# Data Safety — чек-лист для Google Play Console

Это шпаргалка ответов на форму Data Safety (Play Console → App content → Data safety). Основано на реальном поведении СкладПро на момент 2026-07-14.

## Data collection and security

- **Does your app collect or share any of the required user data types?** — **Yes**
- **Is all of the user data collected by your app encrypted in transit?** — **Yes** (Supabase = HTTPS, FCM = HTTPS)
- **Do you provide a way for users to request that their data is deleted?** — **Yes** (email в PRIVACY.md)

## Data types

Отметить в форме как **Collected + Shared**:

| Category | Type | Purpose | Optional? |
|---|---|---|---|
| Personal info | Email address | Account management | Required |
| Personal info | Name | Account management (имя сотрудника) | Required |
| App info | Crash logs | Analytics (только если подключён Sentry) | Optional |
| App info | Diagnostics | Analytics (только если подключён Sentry) | Optional |
| App activity | App interactions | App functionality (заказы, документы) | Required |
| Device or other IDs | Device or other IDs | App functionality (FCM push token) | Required |

**Financial info, Location, Health, Messages, Photos and videos, Audio, Files and docs, Calendar, Contacts, Web browsing** — **NOT collected**.

## Data usage and handling per type

Для каждого типа выше:
- **Collected**: Yes
- **Shared with third parties**: Yes (Supabase, для email/данных компании; Firebase, для push token)
- **Processed ephemerally**: No
- **Required or optional**: как в таблице выше

## Security practices

- **Encryption in transit**: Yes
- **Users can request data deletion**: Yes
- **Committed to Play Families Policy**: N/A (приложение не для детей)
- **Independent security review**: No

## Что НЕ отмечать (частая ошибка)

- Location — приложение не запрашивает GPS.
- Financial info — платежей в приложении нет.
- Health & fitness — нет.
- Photos, Audio, Files — камера используется только для сканирования штрихкодов (это App info → App interactions, не Photos).

## После публикации

Периодически (каждый релиз, где меняются данные) — проверять что Data Safety соответствует реальности. Play может забанить приложение за расхождение.
