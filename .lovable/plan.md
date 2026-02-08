
# План: Окончательное исправление "падающей" карточки

## Найденная проблема

Проблема НЕ в специфичности CSS. Проблема в том, что:

1. **`.liquid-glass-card:hover`** (строка 262-268) устанавливает `transform: translateY(-4px)`
2. Мой override с `!important` должен работать, но **он применяется только к элементу `.flashcard-face`**
3. Однако при hover браузер всё равно применяет базовый `.liquid-glass-card:hover` потому что `!important` у меня стоит только на state без hover и на hover - но эти правила конфликтуют

## Корневая причина

CSS правило в строках 262-268:
```css
.liquid-glass-card:hover {
  ...
  transform: translateY(-4px);
}
```

Это правило применяется ко ВСЕМ `.liquid-glass-card` элементам при hover, включая flashcards.

Мой override:
```css
.flashcard-container .flashcard-inner .flashcard-face.liquid-glass-card:hover {
  transform: none !important;
}
```

Проблема: Этот селектор **должен** работать, но возможно браузер неправильно интерпретирует из-за **множественных классов** на элементе (`flashcard-face liquid-glass-card animated-border`).

## Решение

Самое надёжное решение - **убрать `transform` из базового `.liquid-glass-card:hover`** и добавить его только там где нужно, ИЛИ использовать ещё более специфичный селектор.

Я выберу второй подход - добавить `.animated-border` в селектор для полной специфичности:

### Изменения в `src/index.css`

Заменить строки 486-495 на:

```css
/* Flashcard: fully disable hover transforms for front and back - ultra specific */
.flashcard-container .flashcard-inner .flashcard-face.liquid-glass-card.animated-border,
.flashcard-container .flashcard-inner .flashcard-face.liquid-glass-card.animated-border:hover,
.flashcard-container .flashcard-inner .flashcard-face.liquid-glass-card:hover {
  transform: none !important;
}

.flashcard-container .flashcard-inner .flashcard-face.flashcard-back.liquid-glass-card.animated-border,
.flashcard-container .flashcard-inner .flashcard-face.flashcard-back.liquid-glass-card.animated-border:hover,
.flashcard-container .flashcard-inner .flashcard-face.flashcard-back.liquid-glass-card:hover {
  transform: rotateY(180deg) !important;
}
```

**Также** изменю сам `.liquid-glass-card:hover` чтобы исключить flashcard-face (альтернативный подход):

```css
.liquid-glass-card:hover:not(.flashcard-face) {
  ...
  transform: translateY(-4px);
}
```

Это гарантирует что `translateY(-4px)` НИКОГДА не применится к flashcard.

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `src/index.css` | Изменить `.liquid-glass-card:hover` добавив `:not(.flashcard-face)`, и обновить flashcard overrides с более специфичными селекторами |

## Результат

- Карточка НЕ будет падать/подниматься при hover
- Анимированная рамка продолжит работать
- Переворот карточки будет работать корректно
