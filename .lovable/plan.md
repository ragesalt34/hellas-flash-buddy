

# Полное удаление рамок

## Проблемы

1. **Рамка карточки**: Компонент `Card` по умолчанию включает Tailwind-класс `border`, который добавляет `border-width: 1px`. CSS-правило `border: none` в `.liquid-glass-card` конфликтует по специфичности с этим классом.

2. **Края aurora-блобов**: Блобы все ещё видны как круги несмотря на увеличенный blur до 100px. Нужно ещё больше размыть и уменьшить opacity.

## Изменения

### 1. `src/pages/Register.tsx` и `src/pages/Login.tsx`
- Добавить класс `border-0` к Card, чтобы Tailwind-класс явно убрал рамку (перебьёт дефолтный `border`):
  - `className="... liquid-glass-card border-0 ..."`

### 2. `src/index.css` — aurora-blob
- Увеличить `filter: blur()` со 100px до 140px
- Уменьшить opacity до 0.5, чтобы края были совсем незаметны

### 3. `src/index.css` — глобальная защита
- В `.liquid-glass-card` добавить `border: none !important` чтобы гарантировать отсутствие рамки при любых Tailwind-классах
- То же для `.flashcard-glass`

