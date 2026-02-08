
# План: Исправление лага и вращения карточки при наведении

## Проблема
При наведении мыши на перевёрнутую карточку она лагает и начинает крутиться. Карточка позиционируется правильно, но анимация ломается при hover.

---

## Причина

Класс `.liquid-glass-card:hover` содержит:
```css
transform: translateY(-4px);
```

Это конфликтует с 3D-трансформацией `.flashcard-inner`:
- При hover добавляется `translateY(-4px)` к карточке
- Это перезаписывает/конфликтует с `rotateY(180deg)` на родителе
- Результат: карточка дёргается, создаётся эффект непрерывного вращения

---

## Решение

### 1. Убрать hover-эффекты с flashcard

Добавим модификатор `.flashcard-face`, который отключит hover-трансформации для карточек внутри флэшкард-контейнера:

```css
/* В секции Flashcard 3D */
.flashcard-face.liquid-glass-card:hover {
  transform: none;
}
```

### 2. Альтернатива: Создать отдельный класс для flashcard-карточек

Вместо использования `liquid-glass-card` на flashcard-face, создадим специальный класс:

```css
.flashcard-glass {
  background: linear-gradient(
    145deg,
    hsl(var(--card) / 0.6) 0%,
    hsl(var(--card) / 0.3) 100%
  );
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid hsl(var(--primary) / 0.12);
  box-shadow: 
    0 4px 24px hsl(var(--primary) / 0.08),
    inset 0 1px 0 hsl(0 0% 100% / 0.12);
  /* НЕТ transition на transform! */
  transition: border-color 0.4s, box-shadow 0.4s;
}

.flashcard-glass:hover {
  border-color: hsl(var(--primary) / 0.25);
  box-shadow: 
    0 8px 40px hsl(var(--primary) / 0.15),
    0 0 60px hsl(var(--primary) / 0.08),
    inset 0 1px 0 hsl(0 0% 100% / 0.2);
  /* БЕЗ transform! */
}
```

---

## Выбранное решение

Первый вариант — проще и минимально инвазивный:

**В `src/index.css`** добавим правило-исключение:
```css
.flashcard-face.liquid-glass-card:hover {
  transform: none;
}
```

Это отключит подъём карточки при hover, сохранив остальные эффекты (border-color, box-shadow).

---

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `src/index.css` | Добавить CSS-правило для отключения hover-transform на flashcard |

---

## Результат

- Карточка переворачивается плавно без лагов
- При наведении мыши карточка не дёргается
- Сохраняются все визуальные эффекты (свечение, border)
- Только hover-transform отключён для flashcard
