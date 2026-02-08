
# План: Окончательное исправление позиционирования карточки

## Диагноз

Проанализировав скриншоты и код, я нашёл **настоящую проблему**:

1. Контейнер `.flashcard-container` имеет фиксированную высоту `h-80` (320px)
2. `.flashcard-face` имеет `position: absolute` с `inset: 0`
3. `.flashcard-inner` имеет `position: relative` и `height: 100%`
4. При повороте карточки, `transform-style: preserve-3d` на `.flashcard-inner` создаёт новый stacking context
5. **Проблема**: когда применяется `transform: rotateY(180deg)`, это может влиять на то, как браузер вычисляет позицию элемента в 3D-пространстве

Однако **главная проблема** — это конфликт с `.liquid-glass-card:hover:not(.flashcard-face)`. Селектор работает правильно, НО есть ещё одна вещь:

**Класс `.flashcard-face` ДОЛЖЕН иметь `transform: none` или `transform: rotateY(180deg)` в зависимости от того, front это или back. Но при hover на ЛЮБОЙ из этих элементов, мы не должны менять transform вообще.**

## Решение

Нужно изменить подход:

1. **Убрать ВСЕ transitions с transform** для flashcard-face
2. **Добавить изоляцию transform** — исключить flashcard из ЛЮБЫХ hover effects которые меняют transform

### Изменения в `src/index.css`

Строки 486-499 нужно переписать так:

```css
/* Flashcard: completely isolate from hover transforms */
.flashcard-container .flashcard-inner .flashcard-face {
  /* Remove all transform transitions to prevent any shifting */
  transition: border-color 0.4s, box-shadow 0.4s !important;
}

/* Front face: always no transform */
.flashcard-container .flashcard-inner .flashcard-face:not(.flashcard-back) {
  transform: none !important;
}

/* Back face: always rotated 180deg */
.flashcard-container .flashcard-inner .flashcard-face.flashcard-back {
  transform: rotateY(180deg) !important;
}
```

И также добавить:

```css
/* Prevent ANY hover effect from changing transform on flashcard faces */
.flashcard-face:hover {
  transform: unset !important; /* This won't work, need to be more specific */
}
```

На самом деле, лучше всего — **ВООБЩЕ убрать классы liquid-glass-card и animated-border с Card** и применить стили напрямую, ИЛИ создать отдельные стили `.flashcard-glass` без hover transforms.

### Рекомендуемое решение

Создать новый класс `.flashcard-glass` который копирует стили `.liquid-glass-card` БЕЗ hover transform:

```css
.flashcard-glass {
  /* Copy all styles from liquid-glass-card EXCEPT hover transform */
  backdrop-filter: blur(40px);
  background: linear-gradient(...);
  border: 1px solid hsl(var(--primary) / 0.12);
  box-shadow: ...;
  transition: border-color 0.4s, box-shadow 0.4s;
}

.flashcard-glass:hover {
  border-color: hsl(var(--primary) / 0.25);
  box-shadow: ...;
  /* NO transform here! */
}
```

И в `Flashcards.tsx` заменить `liquid-glass-card` на `flashcard-glass`.

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/index.css` | Добавить `.flashcard-glass` класс без hover transform |
| `src/pages/Flashcards.tsx` | Заменить `liquid-glass-card` на `flashcard-glass` на Card elements |

## Результат

- Карточка НЕ будет сдвигаться при hover
- Карточка сохранит красивый glass-эффект
- Анимированная рамка продолжит работать
- Переворот будет работать корректно без сдвигов
