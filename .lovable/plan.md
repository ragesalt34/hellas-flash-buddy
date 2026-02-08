
Цель: убрать “падение вниз” у карточки ответа при перевороте/наведении на странице flashcards.

## Что реально происходит (диагноз по коду)
Сейчас на элементах карточки стоят классы одновременно:
- `flashcard-face` (должен делать face абсолютным и накладывать front/back друг на друга)
- `animated-border` (для бегущей рамки)

В `src/index.css` порядок правил такой:
1) `.flashcard-face { position: absolute; inset: 0; ... }`
2) ниже по файлу объявлено `.animated-border { position: relative; ... }`

Оба селектора — классы (одинаковая специфичность), поэтому побеждает то, что ниже в файле:  
`position: relative` из `.animated-border` перетирает `position: absolute` у `.flashcard-face`.

Итог:
- back-face перестаёт быть “наложенным” поверх front-face
- при flip он начинает вести себя как обычный блок в потоке, визуально “уезжая” вниз (то, что ты описываешь: “ответ падает вниз, вся карточка”)

Это объясняет, почему прошлые правки про `hover transform` не решали проблему: причина не в `translateY`, а в том, что back-face физически перестал быть absolute-слоем.

## Решение (минимально-инвазивное и надёжное)
Вариант A (предпочтительный): локально переопределить позиционирование flashcard-face ПОСЛЕ блока `animated-border`, чтобы рамка оставалась, но face всегда был absolute.

### Изменения в `src/index.css`
1) Оставляем `.animated-border` как есть (он нужен во всём проекте).
2) Добавляем новый override после блока `.animated-border` / `.animated-border::before`:

Логика:
- вернуть `position: absolute` именно для `.flashcard-face` внутри флешкарда
- повторно зафиксировать `inset/width/height`, чтобы никакие другие утилиты не ломали размеры

Пример того, что будет добавлено:
```css
/* Flashcards: force faces to stay absolute even when animated-border is applied */
.flashcard-container .flashcard-inner .flashcard-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
```

Опционально (если останутся конфликты из-за специфики Tailwind/утилит) — сделать это правило самым “жёстким”:
- либо добавить `!important` только на `position`
- либо расширить селектор до `.flashcard-container .flashcard-inner .flashcard-face.animated-border`

Но начнём с варианта без `!important`, потому что он чище.

### Почему это точно должно сработать
- Правило будет стоять ниже `.animated-border`, значит перезапишет `position: relative`
- Оно ограничено по области действия: только внутри `.flashcard-container`, то есть не поломает другие места, где используется `animated-border`

## План тестирования (обязательно)
1) Открыть `/learn/history/flashcards`
2) Навести на карточку до flip: карточка не “прыгает” и не меняет позицию
3) Клик — flip: back-face появляется ровно на том же месте (не ниже)
4) Навести на back-face: позиция не меняется
5) Проверить в нескольких браузерах (Chrome/Edge) и на масштабе 90%/100% (иногда 3D-трансформы показывают артефакты на разных zoom)

## Если после этого останется микросдвиг (план B)
Если окажется, что “падение” — это не размещение back-face ниже, а микросдвиг из‑за 3D/субпикселей, добавим:
- `transform: translateZ(0);` или `translate3d(0,0,0)` на `.flashcard-inner`
- `transform-origin: center;`
- `contain: layout paint;` на `.flashcard-container` для изоляции перерисовки

Но сначала фиксируем главную, 100% воспроизводимую причину: перезапись `position` классом `animated-border`.

## Файлы, которые будут изменены
- `src/index.css` (только CSS-правка, без изменений логики React)
