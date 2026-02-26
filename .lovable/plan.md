
## Liquid Glass Bubble hover-эффект для навигации и topic cards

### Что делается

Добавляется чисто CSS-анимация «пузырьки + блик за курсором» поверх существующих элементов, **без изменения логики, роутинга или текстов**.

---

### Файл 1: `src/index.css` — добавить CSS-блок в конец файла

```css
/* ── Liquid Glass Bubble hover effect ── */
.liquid-hover {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: inherit;
}

/* Cursor-following specular highlight */
.liquid-hover::before {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  background: radial-gradient(
    160px circle at var(--mx, 50%) var(--my, 50%),
    rgba(255,255,255,0.38) 0%,
    rgba(255,255,255,0.10) 40%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.25s ease;
}

.liquid-hover:hover::before { opacity: 1; }

/* Bubble layer */
.liquid-hover::after {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 55%) -20px 100% / 14px 14px no-repeat,
    radial-gradient(circle, rgba(255,255,255,0.40) 0%, transparent 55%)  30px 100% / 10px 10px no-repeat,
    radial-gradient(circle, rgba(255,255,255,0.50) 0%, transparent 55%)  65px 100% / 12px 12px no-repeat,
    radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 55%)  90px 100% / 8px  8px  no-repeat,
    radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 55%) 120px 100% / 11px 11px no-repeat;
  opacity: 0;
  animation: none;
}

.liquid-hover:hover::after {
  opacity: 1;
  animation: bubbles-rise 1.6s ease-in infinite;
}

@keyframes bubbles-rise {
  0%   { background-position: -20px 110%, 30px 110%, 65px 110%, 90px 110%, 120px 110%; opacity: 0; }
  10%  { opacity: 1; }
  80%  { opacity: 0.7; }
  100% { background-position: -20px -20%, 30px -15%, 65px -25%, 90px -10%, 120px -20%; opacity: 0; }
}

/* Reduced motion: keep subtle glow, no animation */
@media (prefers-reduced-motion: reduce) {
  .liquid-hover::after { animation: none !important; opacity: 0 !important; }
  .liquid-hover:hover::before { opacity: 0.5; }
}
```

---

### Файл 2: `src/components/layout/Header.tsx` — навигационные ссылки

Добавить `className="liquid-hover"` + `onMouseMove`/`onMouseLeave` для установки `--mx`/`--my` через `requestAnimationFrame` к каждому элементу `<Link>` в desktop nav (строки 63–78).

```tsx
// helper (добавить перед return)
const handleLiquidMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
  const el = e.currentTarget;
  requestAnimationFrame(() => {
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  });
};
const handleLiquidLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.currentTarget.style.setProperty('--mx', '50%');
  e.currentTarget.style.setProperty('--my', '50%');
};
```

К каждому `<Link>` в `nav`:
```tsx
<Link
  ...existing props...
  className="liquid-hover"
  onMouseMove={handleLiquidMove}
  onMouseLeave={handleLiquidLeave}
  style={{ ...existing style..., padding: '6px 10px', borderRadius: '8px' }}
>
```

---

### Файл 3: `src/pages/Index.tsx` — topic cards

Добавить аналогичный helper для `div` (или обернуть в него `<div className="liquid-hover">`). К `<div className="glass-panel"` внутри topic cards (строки 309–331):

```tsx
const handleLiquidMove = (e: React.MouseEvent<HTMLDivElement>) => { ... };
const handleLiquidLeave = (e: React.MouseEvent<HTMLDivElement>) => { ... };
```

```tsx
<div
  className="glass-panel liquid-hover"
  onMouseMove={handleLiquidMove}
  onMouseLeave={handleLiquidLeave}
  style={{ height: '180px', ... }}
>
```

---

### Итог изменений по файлам

| Файл | Что меняется |
|------|-------------|
| `src/index.css` | +55 строк CSS в конец: `.liquid-hover` с `::before`/`::after` + `@keyframes bubbles-rise` + `prefers-reduced-motion` |
| `src/components/layout/Header.tsx` | +helper-функции `handleLiquidMove`/`handleLiquidLeave`, `className="liquid-hover"` + handlers на nav `<Link>` |
| `src/pages/Index.tsx` | +helper-функции, `className="… liquid-hover"` + handlers на topic card `<div>`s |

Логика, роутинг, тексты, структура компонентов — не затронуты.
