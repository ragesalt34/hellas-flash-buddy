

## Визуальный аудит страницы /learn — найденные проблемы

### Что я вижу из кода

**Проблема 1 — Двойной padding на карточках (критично)**
`glass-panel` добавляет `padding: 24px` глобально, а `.lp-card` добавляет ещё `padding: 20px`. Итого карточки имеют **двойной** padding — контент очень сжат внутри, кольцо и текст "болтаются" с огромными отступами.

**Проблема 2 — Конфликт hover-эффектов**
`glass-panel:hover` делает `translateY(-2px)`, а `.lp-card:hover` делает `translateY(-4px)`. Оба срабатывают одновременно — реальный сдвиг **-6px**, что слишком много и дёргано.

**Проблема 3 — `.lp-card--featured` ничего не делает**
```css
.lp-card--featured { grid-column: auto; grid-row: auto; }
```
Это пустышка — featured-карточка визуально идентична остальным. Нет увеличенной высоты, нет отличий. Смысл featured-логики в Ring (size 80 vs 60) теряется, потому что карточки одинаковые.

**Проблема 4 — Мелкий шрифт темы для малых карточек**
`font-size: 14px` для не-featured карточек слишком мелко, особенно с `letter-spacing: -0.02em`. На маленьком тексте отрицательный трекинг выглядит некрасиво.

**Проблема 5 — `.lp-mastered` слишком мелкий и теряется**
11px подпись "освоено" под названием темы почти не читается рядом с 14px названием.

**Проблема 6 — Прогресс-кольцо и текст не выровнены правильно**
`lp-mid` использует `align-items: center`, но Ring и текстовый блок имеют разные естественные высоты — на маленьком размере (60px ring) текст "прыгает" по вертикали.

**Проблема 7 — Exam stats блок: `.lp-exam-stats` имеет `min-width: 200px`**
На планшетном размере (768–900px) это вызывает overflow или ugly-wrap exam карточки.

**Проблема 8 — `lp-wrap` padding-bottom: 100px + MobileBottomNav**
На десктопе лишние 100px снизу — видимый пустой зазор под экзамен-карточкой.

---

### Что нужно исправить

**`src/pages/Learn.tsx`:**
1. Убрать `glass-panel` с `.lp-card` — заменить на собственный glass (inline styles или дополнить `.lp-card` нужными свойствами) чтобы не было двойного padding
2. Убрать `glass-panel` класс с карточек, написать весь glass прямо в `.lp-card` CSS
3. Featured-карточка — добавить `lp-card--featured` реальные стили: min-height: 260px vs 200px, увеличенный ring уже есть
4. Название темы: featured 17px → 18px; обычные 14px → 15px  
5. `.lp-mastered` → 12px вместо 11px

**`src/pages/Learn.tsx` — CSS секция:**
1. `.lp-card` — добавить весь glass напрямую (background, backdrop-filter, border, box-shadow) вместо class="glass-panel"
2. Убрать конфликт hover: `.lp-card:hover` оставить `translateY(-4px)`, стереть конкурирующий `.glass-panel:hover`
3. `.lp-card--featured` → `min-height: 268px`
4. `.lp-exam-stats` → убрать `min-width`, добавить `flex: 1`
5. `.lp-wrap` → `padding-bottom: 32px` для десктопа, 100px только на мобайле

### Файлы с изменениями
- `src/pages/Learn.tsx` — только CSS внутри `<style>` тега + убрать `glass-panel` из className карточек

