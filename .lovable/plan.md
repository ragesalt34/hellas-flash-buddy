
# План: Исправление "улетающей" карточки при перевороте

## Проблема
После переворота флэш-карточка смещается вниз страницы вместо того, чтобы оставаться на месте. Это происходит из-за неправильной CSS-структуры для 3D-трансформации.

---

## Причины проблемы

1. **Отсутствует `perspective`** — класс `perspective-1000` не определён в Tailwind-конфигурации
2. **Псевдоэлементы мешают 3D** — классы `glow-border` и `rainbow-border` используют `::before`/`::after` с `position: absolute`, что ломает `transform-style: preserve-3d`
3. **Неправильная структура контейнера** — 3D-контейнер должен иметь фиксированную высоту и правильный `perspective`

---

## Решение

### 1. Добавить CSS-классы для 3D-карточки

В `src/index.css` добавим:

```css
/* Flashcard 3D */
.flashcard-container {
  perspective: 1000px;
}

.flashcard-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.flashcard-inner.flipped {
  transform: rotateY(180deg);
}

.flashcard-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flashcard-back {
  transform: rotateY(180deg);
}
```

### 2. Обновить структуру в Flashcards.tsx

Заменить текущую реализацию на правильную структуру:

```tsx
{/* Flashcard Container */}
<div className="relative max-w-2xl mx-auto h-80 px-2 flashcard-container">
  <div 
    className={cn("flashcard-inner cursor-pointer", isFlipped && "flipped")}
    onClick={handleFlip}
  >
    {/* Front */}
    <Card className="flashcard-face liquid-glass-card rainbow-border flex items-center justify-center p-8">
      {/* ... содержимое ... */}
    </Card>

    {/* Back */}
    <Card className="flashcard-face flashcard-back liquid-glass-card glow-border flex items-center justify-center p-8">
      {/* ... содержимое ... */}
    </Card>
  </div>
</div>
```

---

## Ключевые изменения

| Что | Было | Станет |
|-----|------|--------|
| Perspective | `perspective-1000` (не работает) | CSS-класс `flashcard-container` |
| Transform | inline `style` | CSS-класс `flashcard-inner` + `flipped` |
| Backface | inline `style` | CSS-класс `flashcard-face` |
| Высота | на внутреннем div | на контейнере |

---

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `src/index.css` | Добавить CSS-классы для 3D-карточки |
| `src/pages/Flashcards.tsx` | Исправить структуру и использовать новые классы |

---

## Технические детали

### Почему inline styles ломали карточку

Inline `style={{ transformStyle: 'preserve-3d' }}` конфликтовал с Tailwind-классами. Также `backfaceVisibility` в inline стилях не всегда работает корректно с CSS-анимациями.

### Почему псевдоэлементы влияли

Классы `glow-border::after` и `rainbow-border::before` имеют `position: absolute` и `inset: -2px`, что создавало дополнительные слои внутри 3D-контекста и могло влиять на расчёт трансформации.

### Решение с отдельными CSS-классами

Выделение всей 3D-логики в отдельные классы:
- Изолирует 3D-трансформацию от других эффектов
- Обеспечивает правильный порядок применения стилей
- Работает стабильно во всех браузерах

---

## Результат

- Карточка будет переворачиваться на месте без смещения
- Плавная анимация с cubic-bezier
- Все эффекты (glow-border, rainbow-border) сохранятся
