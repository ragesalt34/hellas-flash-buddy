

# Апгрейд дизайна: Apple Liquid Glass 2025/2026

## Что сейчас актуально

Apple представила **Liquid Glass** в iOS 26 / macOS Tahoe (WWDC 2025) — это эволюция glassmorphism с добавлением:
- **Рефракция (lensing)** — фон за стеклом искажается, а не просто размывается
- **Specular highlights** — блики света на краях стекла
- **Многослойность** — highlight layer + shadow layer + illumination
- **Динамические тени** — тени реагируют на контент за стеклом
- **Tinted glass** — стекло может быть окрашено в цвет контекста

## Что изменим

### 1. Новый Liquid Glass эффект (SVG filter + CSS)
Добавить настоящий liquid glass через SVG filter (feTurbulence + feDisplacementMap) для ключевых элементов:
- **Header** — рефракция фона за навигацией (не просто blur, а искажение)
- **Карточки на главной** — легкий specular highlight по краям
- **Кнопки CTA** — стеклянный блик, который двигается при наведении

### 2. Header — прозрачное стекло с рефракцией
- Заменить `liquid-glass` на новый `liquid-glass-refract` с SVG фильтром
- Добавить тонкий specular highlight (белая полоска сверху, имитация отражения)
- При скролле — header становится чуть более непрозрачным (scroll-aware opacity)

### 3. Карточки — многослойное стекло
- Добавить `.liquid-glass-card-v2` с тремя слоями:
  - Base layer: размытый фон (backdrop-filter)
  - Specular layer: тонкий белый блик по верхнему краю
  - Shadow layer: мягкая тень снизу с цветовым оттенком
- При hover — блик "перетекает" (анимация `specular-shift`)

### 4. Кнопки — стеклянный hover-эффект
- Новый `.glass-button-v2`: при наведении — перемещающийся блик (radial-gradient следует за курсором через CSS custom property)
- Эффект "внутреннего свечения" (inset glow)

### 5. Hero Section — глубина и движение
- Добавить parallax-эффект: при скролле aurora-блобы двигаются с другой скоростью
- Заголовок — добавить легкий text-shadow с цветом aurora для "свечения"
- Фоновый noise/grain — уменьшить opacity до 0.008 (сейчас 0.015) для более чистого вида

### 6. Секция Stats — стеклянные карточки с рефракцией
- Каждая stat-карточка получает мини-SVG фильтр для легкого искажения фона
- Числа — добавить `text-shadow` для ощущения глубины

### 7. Footer — минимальный liquid glass
- Применить тонкий glass-эффект к footer (backdrop-blur + specular)

### 8. Новые микро-анимации
- `specular-shift` — блик скользит по поверхности карточки
- `glass-breathe` — карточка "дышит" (очень легкое изменение opacity фона)
- Плавный scroll-reveal через Intersection Observer для секций

## Технические детали

### Файлы для изменения:

**1. `src/index.css`** — основные изменения:
- Добавить SVG filter (inline в CSS через `url("data:image/svg+xml,...")`) для displacement map
- Новые классы:
  - `.liquid-glass-refract` — стекло с рефракцией (SVG filter + backdrop-filter + specular)
  - `.liquid-glass-card-v2` — многослойная карточка с бликом
  - `.glass-specular` — белый блик по верхнему краю
  - `.glass-button-v2` — кнопка со скользящим бликом
- Новые keyframes: `specular-shift`, `glass-breathe`
- Уменьшить grain opacity: `0.015` -> `0.008`
- Scroll-aware header transition

**2. `tailwind.config.ts`**:
- Добавить keyframes: `specular-shift`, `glass-breathe`
- Добавить animations для них

**3. `src/components/layout/Header.tsx`**:
- Заменить `liquid-glass` на `liquid-glass-refract`
- Добавить specular highlight div
- Добавить scroll listener для динамической opacity (через useState + useEffect)

**4. `src/pages/Index.tsx`**:
- Обновить StatCard, TopicCard, ModeCard — использовать `liquid-glass-card-v2`
- Hero: добавить text-shadow на заголовок, parallax на блобы (CSS transform на scroll)
- Добавить Intersection Observer для scroll-reveal анимаций секций
- Feature pills: обновить на `.glass-button-v2`

**5. `src/components/layout/Layout.tsx`**:
- Footer: добавить glass-эффект

**6. `src/pages/Login.tsx` и `src/pages/Register.tsx`**:
- Обновить карточку на `liquid-glass-card-v2`

**7. `src/pages/Learn.tsx`**:
- Обновить карточки тем и экзамена на новый стиль

**Итого: 7 файлов. Никакой новой логики — только визуальный апгрейд на уровень Apple Liquid Glass 2025/2026.**

