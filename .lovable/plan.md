
## Проблема

В строках 255–258 файла `src/pages/Learn.tsx` CSS для `.lp-grid` повреждён — вместо полного правила `display: grid; grid-template-columns: 1fr 1fr; gap: 20px;` записано только `...` и `gap: 20px`. Это сломало двухколоночную сетку, и карточки выстроились в один столбец.

## Что исправить

**`src/pages/Learn.tsx`, строки 255–258:**

```css
/* Было (сломано): */
.lp-wrap { max-width: 1040px; margin: 0 auto; padding: 28px 16px 48px; }
...
  gap: 20px;
}

/* Станет: */
.lp-wrap { max-width: 1040px; margin: 0 auto; padding: 28px 16px 48px; }
.lp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
```

Одна правка — восстановить полное CSS-правило `.lp-grid`. Всё вернётся к 2×2 сетке карточек.
