# Hellas Study — нативное приложение (Expo / React Native)

Настоящее нативное iOS-приложение (рендерит компоненты Apple, не webview). Разработка
с Windows, живой просмотр на реальном iPhone через **Expo Go**, финальный билд — в облаке
**EAS Build** (Mac не нужен). Использует тот же бэкенд (бот API + Supabase), что и Mini App.

## Стек
- Expo SDK 56, React Native 0.85, TypeScript
- Навигация: `@react-navigation/bottom-tabs` (5 вкладок)
- Анимации: `react-native-reanimated` 4 (+ worklets, babel-плагин подключён)
- Иконки: `lucide-react-native` (+ `react-native-svg`)
- Шрифт: Nunito (`@expo-google-fonts/nunito`)
- Звук: `expo-audio`, хаптика: `expo-haptics`

## Структура
```
mobile/
  App.tsx            — шрифты + тёмная тема + нижние вкладки
  src/theme.ts       — токены палитры Drops (коралл/тёмный)
  src/api.ts         — клиент бот-API (тот же, что у Mini App)
  src/screens/       — экраны (пока заглушки; портируем по одному)
```

## Конфиг (env)
Создай `mobile/.env` (gitignored). Expo автоматически читает `EXPO_PUBLIC_*`:
```
EXPO_PUBLIC_API_BASE=https://<стабильный-URL-бота>   # без слеша на конце
EXPO_PUBLIC_DEV_USER_ID=<твой числовой Telegram id>
```
На боте включить `ALLOW_DEV_AUTH=true` в `telegram-bot/.env` и перезапустить (вне Telegram
нет initData → приложение авторизуется dev-заголовком).
⚠️ Стабильный URL обязателен для полноценного использования; для теста можно временно
указать текущий cloudflared-туннель.

## Цикл разработки (Windows + iPhone, бесплатно)
1. На iPhone поставь **Expo Go** (App Store).
2. В `mobile/`: `npx expo start --tunnel` (туннель, чтобы телефон достучался до Metro).
3. Отсканируй QR из терминала камерой айфона → приложение откроется в Expo Go с
   **live-reload**: меняешь код → сразу видно на телефоне.

## Финальный билд для установки (без Apple-аккаунта, для себя)
1. `npm i -g eas-cli` → `eas login` (бесплатный Expo-аккаунт).
2. `eas build -p ios --profile preview` — сборка в облаке. Для установки без $99
   используется сайдлоад (Sideloadly + бесплатный Apple ID, переподпись раз в 7 дней),
   либо `--profile development` для запуска через dev-client.
   (Подробнее настроим `eas.json` ближе к релизу.)

## Проверка
- `npx tsc --noEmit` — типы.
- `npx expo-doctor` — конфигурация проекта (сейчас 21/21).
