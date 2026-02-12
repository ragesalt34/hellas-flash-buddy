

# Убрать рамки с карточек и разделительные линии

## Что убираем

На скриншотах видны три проблемы:

1. **Aurora-блобы** на страницах Register/Login — видны как отчётливые круги на фоне (слишком заметные края)
2. **Разделительная линия** между секциями Hero и Stats на главной странице
3. **Рамки у stat-карточек** (168 вопросов, +30%, 24/7)

## Изменения

### 1. `src/index.css` — убрать border у `liquid-glass-card`
- Убрать `border: 1px solid hsl(var(--primary) / 0.15)` из `.liquid-glass-card`
- Убрать `border-color` из `.liquid-glass-card:hover`
- То же для `.flashcard-glass` и `.liquid-glass-button`

### 2. `src/index.css` — сделать aurora-blob мягче
- Увеличить `filter: blur()` с 60px до 100px, чтобы края были плавнее

### 3. `src/pages/Register.tsx` и `src/pages/Login.tsx`
- Убрать класс `glow-border` с Card (светящаяся рамка вокруг формы)

### 4. `src/pages/Index.tsx`
- Убрать горизонтальную разделительную линию `<div className="h-px bg-gradient-to-r ...">` между секциями (Top accent line и Bottom accent)
