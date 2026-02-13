
# Удаление режима "Ввод" (Input Mode)

## Что будет сделано

Полное удаление режима "Ввод ответа" из приложения:

### 1. Удалить кнопку "Ввод" из карточек тем

**`src/pages/Learn.tsx`** (строка 26) — убрать `{ id: 'input', ... }` из массива `modes`, а также убрать неиспользуемый импорт `PenTool`.

### 2. Удалить кнопку "Ввод" с главной страницы

**`src/pages/Index.tsx`** (строка 119) — аналогично убрать `input` из массива `modes` и импорт `PenTool`.

### 3. Удалить маршрут

**`src/App.tsx`** (строка 38) — убрать `<Route path="/learn/:topic/input" ...>` и импорт `InputMode`.

### 4. Удалить страницу

**`src/pages/InputMode.tsx`** — удалить файл целиком.

### 5. Очистить переводы

**`src/contexts/LanguageContext.tsx`** — убрать ключи `mode.input`, `mode.input.desc`, `input.placeholder`, `input.correct`, `input.incorrect`, `input.correctAnswer`.
