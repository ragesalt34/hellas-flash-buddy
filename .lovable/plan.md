
## Улучшение читаемости вопросов и ответов

### Проблема
Текст на карточках с вопросами и ответами слишком мелкий и плохо читается:
- **Quiz**: вопрос `text-base sm:text-xl`, ответы `text-sm sm:text-base`
- **Exam**: вопрос `text-xl`, ответы без указания размера (default ~14-16px), обзор результатов `text-sm`
- **Flashcards**: вопрос/ответ `text-lg sm:text-2xl`, пояснение `text-base`

### Что будет сделано

**1. Quiz (`src/pages/Quiz.tsx`)**
- Вопрос: `text-base sm:text-xl` --> `text-lg sm:text-2xl` + `font-semibold`
- Варианты ответов: `text-sm sm:text-base` --> `text-base sm:text-lg` + `font-medium`
- Пояснение: `text-sm text-muted-foreground` --> `text-base text-foreground/80`

**2. Exam (`src/pages/Exam.tsx`)**
- Вопрос (активный экзамен): `text-xl` --> `text-xl sm:text-2xl` + `font-semibold`
- Варианты ответов: добавить `text-base sm:text-lg font-medium`
- Обзор результатов: вопрос `text-sm` --> `text-base`, ответы `text-xs` --> `text-sm`

**3. Flashcards (`src/pages/Flashcards.tsx`)**
- Вопрос и ответ: `text-lg sm:text-2xl` --> `text-xl sm:text-3xl` + `font-semibold`
- Пояснение: `text-base text-muted-foreground` --> `text-base sm:text-lg text-foreground/70`

### Технические детали

Файлы для изменения:
- `src/pages/Quiz.tsx` -- строки 158, 175, 194
- `src/pages/Exam.tsx` -- строки 764, 769, 774, 945, 959, 964
- `src/pages/Flashcards.tsx` -- строки 279, 309, 326
