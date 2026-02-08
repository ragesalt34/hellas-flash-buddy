
# План: Исправить анимированную рамку и "улетающую" карточку

## Проблема 1: Анимация рамки не видна

**Причина**: 
- `z-index: -1` на псевдо-элементе `::before` прячет рамку за фоном карточки
- `@property` для CSS-переменных не поддерживается в Safari и старых браузерах

**Решение**: 
- Убрать `z-index: -1`
- Использовать альтернативный подход — анимация через `background-position` вместо `@property`

## Проблема 2: Карточка улетает вниз при ответе

**Причина**: 
- `liquid-glass-card:hover` содержит `transform: translateY(-4px)` 
- Override для `.flashcard-face.liquid-glass-card:hover` ставит `transform: none`
- Это конфликтует с `transform: rotateY(180deg)` для back face

**Решение**: 
- Использовать более специфичный селектор для flashcard, который полностью отключает transform на hover для обеих сторон

## Технические изменения

### `src/index.css`

**1. Переписать `.animated-border` без `@property`:**

```css
.animated-border {
  position: relative;
  overflow: visible;
}

.animated-border::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    hsl(var(--primary)),
    hsl(var(--accent-foreground)),
    hsl(var(--primary) / 0.3),
    hsl(var(--accent-foreground)),
    hsl(var(--primary)),
    hsl(var(--accent-foreground)),
    hsl(var(--primary))
  );
  background-size: 300% 100%;
  animation: border-slide 3s linear infinite;
  pointer-events: none;
}

.animated-border::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: inherit;
  pointer-events: none;
}

@keyframes border-slide {
  0% { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}
```

**2. Исправить flashcard hover override:**

```css
/* Полностью отключить hover transforms для flashcard */
.flashcard-container .flashcard-inner .flashcard-face.liquid-glass-card,
.flashcard-container .flashcard-inner .flashcard-face.liquid-glass-card:hover {
  transform: none !important;
}

.flashcard-container .flashcard-inner .flashcard-face.flashcard-back.liquid-glass-card,
.flashcard-container .flashcard-inner .flashcard-face.flashcard-back.liquid-glass-card:hover {
  transform: rotateY(180deg) !important;
}
```

## Результат

| Проблема | Решение |
|----------|---------|
| Анимация не видна | Рамка будет "ползти" с помощью background-position |
| Карточка улетает вниз | Hover transform отключен для flashcard через !important |

## Файлы для изменения

- `src/index.css` — переписать animated-border и усилить flashcard override
