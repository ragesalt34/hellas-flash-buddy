
## Что происходит сейчас (почему «всё равно крутится»)

Сейчас у `.liquid-glass-card:hover` есть `transform: translateY(-4px)`.  
На флэшкарте это конфликтует с 3D-переворотом, потому что:

- у **задней стороны** (`.flashcard-back`) постоянно должен быть `transform: rotateY(180deg)`;
- но при наведении срабатывает `.liquid-glass-card:hover { transform: translateY(-4px) }` (по специфичности сильнее, чем `.flashcard-back`), и **задняя сторона теряет rotateY**;
- из‑за этого при малейшем движении мыши (hover on/off, попадание на разные элементы внутри карточки) трансформ «прыгает» между состояниями — визуально выглядит как «крутится/дергается» и может сильно лагать.

Важно: наше текущее правило
```css
.flashcard-face.liquid-glass-card:hover { transform: none; }
```
тоже ухудшает ситуацию, потому что оно **сбрасывает transform и для задней стороны**, а ей `rotateY(180deg)` нужен всегда.

---

## Как исправим (минимально и правильно)

### 1) Исправим hover-override так, чтобы:
- **передняя сторона** при hover не получала translateY;
- **задняя сторона** при hover сохраняла `rotateY(180deg)` (то есть мы «перепишем» hover только для неё).

План правок в `src/index.css` (внизу, рядом с Flashcard 3D):

1. Удалить текущее правило:
```css
.flashcard-face.liquid-glass-card:hover {
  transform: none;
}
```

2. Добавить два правила (в таком порядке):

```css
/* Flashcard: disable lift on hover (front face) */
.flashcard-container .flashcard-face.liquid-glass-card:hover {
  transform: none;
}

/* Flashcard: keep back face rotated even on hover */
.flashcard-container .flashcard-face.flashcard-back.liquid-glass-card:hover {
  transform: rotateY(180deg);
}
```

Это устранит «кручение», потому что hover больше не будет ломать 3D-схему.

---

### 2) Снимем часть лагов при наведении (опционально, но рекомендую)
У `.liquid-glass-card` стоит `transition: all ...` — на тяжелых эффектах (blur/shadow) это может давать микрофризы.

В пределах флэшкарты переопределим transition, чтобы не трогать transform и лишние свойства:

```css
.flashcard-container .flashcard-face.liquid-glass-card {
  transition-property: border-color, box-shadow;
  transition-duration: 0.4s;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

### 3) Подсказка браузеру для плавности переворота
Добавим в `.flashcard-inner`:

```css
.flashcard-inner {
  will-change: transform;
}
```

(Это не меняет поведение, но часто делает анимацию стабильнее.)

---

## Какие файлы будут изменены
- `src/index.css` — точечные правки hover/transition для флэшкарты.

---

## Как проверим результат
1. Открыть `/learn/history/flashcards`
2. Перевернуть карточку кликом.
3. Поводить мышкой по карточке (включая области с текстом и вокруг кнопок озвучки).
4. Ожидаемо: карточка больше не «крутится» и не дергается, переворот остается плавным; hover по-прежнему меняет border/shadow, но не двигает карточку и не ломает 3D.
