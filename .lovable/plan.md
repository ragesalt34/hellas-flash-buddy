

# План: Анимированная "ползущая" рамка для карточек

## Текущее состояние

Сейчас карточки используют:
- **Вопрос (Front)**: класс `rainbow-border` — статичная анимация смещения градиента
- **Ответ (Back)**: класс `glow-border` — пульсирующее свечение

Оба эффекта не очень заметны, и рамка не "движется" по периметру карточки.

## Решение

Создать новый эффект **"animated-border"** — градиент, который плавно вращается вокруг карточки, создавая эффект "бегущего света" по периметру.

## Технические изменения

### 1. Добавить в `src/index.css` новый класс

```css
.animated-border {
  position: relative;
}

.animated-border::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  padding: 2px;
  background: conic-gradient(
    from var(--border-angle, 0deg),
    hsl(var(--primary)),
    hsl(var(--accent)),
    hsl(var(--primary) / 0.3),
    hsl(var(--accent)),
    hsl(var(--primary))
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: border-rotate 4s linear infinite;
  pointer-events: none;
}

@keyframes border-rotate {
  to {
    --border-angle: 360deg;
  }
}

@property --border-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
```

### 2. Обновить `src/pages/Flashcards.tsx`

| Строка | Изменение |
|--------|-----------|
| 273 | Заменить `rainbow-border` на `animated-border` |
| 303 | Заменить `glow-border` на `animated-border` |

```tsx
// Строка 273 — Front (вопрос)
<Card className="flashcard-face liquid-glass-card animated-border flex items-center justify-center p-8">

// Строка 303 — Back (ответ)  
<Card className="flashcard-face flashcard-back liquid-glass-card animated-border flex items-center justify-center p-8">
```

## Результат

| До | После |
|----|-------|
| Статичная рамка | Градиент плавно вращается по периметру карточки |
| Едва заметный эффект | Хорошо видимая анимированная "ползущая" текстура |
| Разные эффекты для вопроса/ответа | Единый стильный эффект для обеих сторон |

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `src/index.css` | Добавить класс `animated-border` и keyframes |
| `src/pages/Flashcards.tsx` | Заменить `rainbow-border` и `glow-border` на `animated-border` |

