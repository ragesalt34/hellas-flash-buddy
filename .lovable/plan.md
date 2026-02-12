

# Качественная озвучка через ElevenLabs с кешированием

## Суть подхода
Аудио для каждого вопроса/ответа генерируется через ElevenLabs **один раз** и сохраняется в хранилище. При повторном воспроизведении аудио загружается из кеша — бесплатно и мгновенно.

Стоимость: примерно $0.50-1 за все 168 вопросов (одноразово). Новые вопросы будут генерироваться по мере добавления.

## Шаги реализации

### 1. Подключить ElevenLabs коннектор
Через коннектор Lovable подключим ElevenLabs — в проекте появится `ELEVENLABS_API_KEY`.

### 2. Создать Storage bucket `tts-audio`
Миграция для создания публичного бакета, куда будут сохраняться MP3-файлы. Файлы именуются по шаблону: `{question_id}_{field}_{lang}.mp3` (например `abc123_question_ru.mp3`).

### 3. Создать edge function `elevenlabs-tts`
Серверная функция, которая:
- Принимает `text`, `language` (ru/el), и опционально `cacheKey`
- Проверяет, есть ли файл в Storage — если да, возвращает публичный URL
- Если нет — вызывает ElevenLabs API с моделью `eleven_multilingual_v2`
- Сохраняет результат в Storage
- Возвращает публичный URL на MP3

Голос: **George** (JBFqnCBsd6RMkjVDRZzb) — мужской, чистый, поддерживает русский и греческий.

### 4. Создать edge function `generate-all-tts`
Пакетная генерация аудио для всех вопросов и ответов (на обоих языках). Запускается один раз, обрабатывает по 10 записей за вызов.

### 5. Обновить `useSpeech.ts`
- Заменить Web Speech API на вызов edge function
- Добавить параметр `language`
- In-memory кеш URL: один и тот же текст не запрашивается повторно в рамках сессии
- Интерфейс остаётся тем же: `speak(text, cacheKey?)`, `stop()`, `isSpeaking`, `isSupported`
- `isSupported` всегда `true` (не зависит от браузера)

### 6. Обновить компоненты
- `Flashcards.tsx` и `Quiz.tsx` — передавать `language` и `cacheKey` (id вопроса + поле) в `speak()`

## Технические детали

### Файлы для создания
- `supabase/functions/elevenlabs-tts/index.ts` — генерация и кеширование TTS
- `supabase/functions/generate-all-tts/index.ts` — пакетная генерация

### Файлы для изменения
- `supabase/config.toml` — добавить конфиг новых функций
- `src/hooks/useSpeech.ts` — переписать на ElevenLabs
- `src/pages/Flashcards.tsx` — передать language и cacheKey
- `src/pages/Quiz.tsx` — передать language и cacheKey

### Миграция БД
- Создать Storage bucket `tts-audio` с публичным доступом на чтение

