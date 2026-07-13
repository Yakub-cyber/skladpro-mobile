# Push на закрытое приложение (этап 2, Firebase/FCM)

Этап 1 (уведомления при открытом/фоновом приложении через Realtime) уже работает.
Чтобы уведомления приходили на **полностью закрытое** приложение, нужен Firebase.
Весь код уже готов — ниже только твои действия.

**Статус (обновлено 2026-07-14):**
- [x] `google-services.json` подключён в проекте (`app.json` → `android.googleServicesFile`).
- [x] Edge Function `supabase/functions/send-push/index.ts` написана.
- [x] SQL для таблицы токенов (`push_tokens.sql`).
- [ ] Firebase-проект создан и `google-services.json` от него положен в корень.
- [ ] Secret `FCM_SERVICE_ACCOUNT` добавлен в Supabase.
- [ ] Edge Function задеплоена.
- [ ] Database Webhook на `orders` настроен.

## 1. Firebase-проект (бесплатно)
1. Зайди на https://console.firebase.google.com → **Создать проект** (любое имя, напр. «SkladPro»).
2. Внутри проекта: **Add app → Android**.
   - **Android package name:** `ru.skladpro.app` (точно так).
   - Скачай **`google-services.json`**.
3. Замени файл в корне `D:\Claude\skladpro-mobile\google-services.json` на свежий из Firebase.
   Файл в `.gitignore` — в репо не попадёт.

## 2. Подключить файл в проекте
Уже сделано: в `app.json` → `android.googleServicesFile = "./google-services.json"`.

## 3. Service account для отправки
1. Firebase Console → ⚙️ **Project settings → Service accounts**.
2. **Generate new private key** → скачается JSON.
3. Открой этот JSON, скопируй **всё содержимое** (понадобится в шаге 5).

## 4. База
В Supabase → **SQL Editor** примени:
- `push_tokens.sql` (таблица токенов)
- `realtime_orders.sql` (если ещё не применял — для этапа 1)

## 5. Edge Function
1. Supabase → **Edge Functions → Secrets** (или Project Settings → Functions → Secrets):
   - Добавь секрет **`FCM_SERVICE_ACCOUNT`** = весь JSON из шага 3 (одной строкой).
2. Задеплой функцию `send-push` (папка `supabase/functions/send-push/`):
   - Через CLI: `supabase functions deploy send-push --no-verify-jwt`
   - Или скопируй код `index.ts` в новую функцию через Dashboard.
3. Скопируй URL функции (вида `https://<ref>.supabase.co/functions/v1/send-push`).

## 6. Webhook (триггер на заказы)
Supabase → **Database → Webhooks → Create**:
- Таблица: `orders`
- События: **Insert**, **Update**
- Тип: **HTTP Request**, метод **POST**
- URL: URL функции из шага 5
- Заголовок: `Authorization: Bearer <SERVICE_ROLE_KEY>` (или включи «service role»)

## 7. Пересборка APK
После того как `google-services.json` лежит и `app.json` обновлён — пересобрать.

**Рекомендуемый путь — EAS Build** (не трогает `android/`, keystore хранит облако Expo):
```
eas build --profile production --platform android
```

Локальная сборка (если не хочется EAS):
```
# ВНИМАНИЕ: --clean затрёт правки android/app/build.gradle (release signingConfig)
# и AndroidManifest.xml (blockedPermissions). Если signing и permissions уже настроены
# локально (см. android/SIGNING.md) — --clean НЕ запускать.
npx expo prebuild -p android
cd android && ./gradlew.bat bundleRelease
```

**Внимание:** для релиза в Play Store сборка должна быть подписана upload keystore — см. `android/SIGNING.md`. Debug-подпись Play отклонит.

## Готово
После этого: новый заказ → push менеджеру/админу; назначение заказа курьеру →
push курьеру; доставлен → push менеджеру — даже когда приложение закрыто.

Кому что приходит — логика в `send-push/index.ts` (можно менять).
