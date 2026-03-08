
## Визуальный аудит страницы /learn

Код читается корректно. Вот что нашёл:

### Что работает нормально
- `.lp-grid` — `display: grid; grid-template-columns: 1fr 1fr; gap: 20px;` ✓
- `.lp-wrap` — `padding: 28px 16px 48px` ✓  
- `.lp-exam` — `grid-column: 1 / 3` (полная ширина) ✓
- Header, кнопки, бейджи точности — CSS корректный ✓

### Найдено: три мелкие визуальные шероховатости

**1. `.lp-name` не имеет явного `font-size` в CSS-классе** — он задаётся через inline `style={{ fontSize: 16 }}` прямо в JSX. Это работает, но если что-то перезаписывает inline-стиль — название темы может выглядеть слишком мало/крупно.

**2. `.lp-desc` (описание темы) клипается в 2 строки** — `display: -webkit-box; -webkit-line-clamp: 2` — если текст перевода длиннее, конец обрезается многоточием. На русском языке описания бывают длиннее, поэтому у некоторых тем текст может обрезаться некрасиво.

**3. `gap` у `.lp-exam-inner`** — `flex-wrap: wrap` с `gap: 28px`. На средних экранах (~900px) блок статистики и кнопка «Начать экзамен» переносятся на вторую строку раньше чем нужно — выглядит как сломанный layout. Исправляется через `min-width` на `.lp-exam-stats`.

### Что исправить

```css
/* Было */
.lp-exam-stats { display: flex; flex: 1; background: ...; min-width: unset; }

/* Станет */
.lp-exam-stats { display: flex; flex: 1; min-width: 180px; ... }
```

И для `.lp-desc` — увеличить clamp с 2 до 3 строк, чтобы русский текст не обрезался криво:

```css
/* Было */
-webkit-line-clamp: 2;

/* Станет */  
-webkit-line-clamp: 3;
```

### Итого: 2 точечные правки

1. `src/pages/Learn.tsx` строка 311 — `.lp-desc`: `-webkit-line-clamp: 2` → `3`
2. `src/pages/Learn.tsx` строка 333 — `.lp-exam-stats`: добавить `min-width: 180px`
