
## Проблема

Анимация переворота карточки имеет два недостатка:

1. **Не достаточно плавная** — `transition: transform 0.5s cubic-bezier(0.4,0,0.2,1)` — это стандартный Material Design easing для 2D-движений, но для 3D-переворота лучше подходит симметричная кривая типа `ease-in-out` или специальная cubic-bezier с более мягким входом и выходом.

2. **Кнопки "задеваются"** — в момент 3D-переворота `.fc-inner` с `transform-style: preserve-3d` поворачивается, и кнопки внутри карточки (спикер, rating) могут получать случайные клики из-за `pointer-events` в момент анимации, а также `overflow: hidden` на `.fc-face` обрезает 3D-трансформацию некорректно.

## Решение

**Файл:** `src/pages/Flashcards.tsx`

### 1. CSS анимации

Заменить кривую перехода и длительность:
```css
/* БЫЛО */
transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);

/* СТАНЕТ */
transition: transform 0.7s cubic-bezier(0.45, 0.05, 0.55, 0.95);
```
Кривая `0.45, 0.05, 0.55, 0.95` — симметричная "ease-in-out" с мягким входом и выходом, идеальна для 3D-карточек. Длительность 0.7s даёт ощущение физического переворота.

### 2. Блокировка кликов во время анимации

Добавить CSS-класс `.fc-inner.animating` с `pointer-events: none` на время анимации, и управлять им через React state `isAnimating`:

```css
.fc-inner.animating { pointer-events: none; }
```

```tsx
const [isAnimating, setIsAnimating] = useState(false);

const handleFlip = useCallback(() => {
  if (isAnimating) return;
  setIsAnimating(true);
  setIsFlipped(prev => !prev);
  setTimeout(() => setIsAnimating(false), 700); // совпадает с длительностью CSS
}, [isAnimating]);
```

### 3. Убрать `overflow: hidden` на `.fc-face`

`overflow: hidden` на `.fc-face` (через `overflow-hidden` в className) обрезает 3D-трансформацию и создаёт артефакты в момент поворота. Нужно убрать `overflow-hidden` с `.fc-face` и перенести его на внутренние контейнеры только там, где нужно.

### 4. Perspective

Увеличить `perspective` с `1200px` до `1400px` для более мягкого 3D-эффекта (меньше "рыбий глаз"):
```css
.fc-scene { perspective: 1400px; }
```

## Итог изменений

- Более плавная, физически реалистичная анимация переворота (0.7s, симметричная кривая)
- Полная блокировка кликов на кнопки во время анимации через `pointer-events: none`
- Увеличенная перспектива для меньшего искажения 3D
- Убран `overflow-hidden` с `.fc-face` который мог вызывать артефакты
