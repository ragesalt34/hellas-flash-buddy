
# Редизайн UI в стиле 2026 года

## Концепция

Эволюция текущего "Liquid Glass" в направлении **"Aurora Glass"** — тренд 2026 года: mesh-градиенты вместо плоских, более глубокий и насыщенный backdrop-blur, тонкие микро-анимации, переход от "всё прозрачное" к контрастной иерархии с выделенными акцентными зонами. Сохраняем бело-голубую палитру (Греция).

## Ключевые изменения

### 1. Обновление цветовой палитры и CSS-переменных
- Более насыщенный primary (глубокий синий с лёгким фиолетовым оттенком)
- Новый accent — мягкий aurora-градиент (сине-фиолетово-розовый)
- Тёплые нейтральные тона вместо чисто серых для background/card
- Улучшение контраста: темнее foreground, светлее background
- Добавление CSS-переменной `--glass-blur` для единообразного управления размытием

### 2. Новые эффекты и утилитарные классы (index.css)
- **Aurora mesh gradient** — анимированный фон из нескольких градиентных слоёв
- **Glass morphism 2.0** — более глубокий blur (32-48px), тонкая inner-shadow для "стеклянного" ощущения
- **Noise texture overlay** — лёгкий SVG noise для текстурности стекла
- **Glow effects** — мягкие цветные glow на hover вместо грубых box-shadow
- **Smooth spring transitions** — замена `ease-out` на `cubic-bezier(0.34, 1.56, 0.64, 1)` для пружинящих эффектов
- **Grain overlay** — субтильный шум на фоне для глубины

### 3. Редизайн Header (Header.tsx)
- Более тонкий, "парящий" header с отступом от краёв (mx-4 mt-2 rounded-2xl)
- Усиленный backdrop-blur (48px)
- Иконка логотипа с aurora-градиентом
- Кнопки навигации с micro-animations

### 4. Редизайн главной страницы (Index.tsx)
- **Hero**: aurora mesh gradient фон вместо простого radial-gradient
- Заголовок с animate-gradient вместо text-shimmer (плавнее, менее "мигающий")
- Badges и feature pills с новым glass-эффектом
- Карточки тем и режимов с hover-glow и spring-анимациями
- CTA-секция с mesh-градиентом и glassmorphism overlay
- Убрать излишние FloatingOrbs (оставить 2-3 тонких), заменить на subtile aurora blobs

### 5. Редизайн страницы Learn (Learn.tsx)
- Topic карточки с цветным gradient-border на hover
- Mode кнопки со стилем pill-buttons
- Exam карточка с aurora-gradient фоном

### 6. Редизайн форм Login/Register (Login.tsx, Register.tsx)
- Карточка формы с усиленным glass-blur и тонкой gradient-рамкой
- Input-поля с мягким inner-glow на focus
- Кнопки с gradient-анимацией при hover

### 7. Редизайн Quiz, InputMode (Quiz.tsx, InputMode.tsx)
- Варианты ответов: pill-стиль с мягким glow при выборе
- Progress bar с gradient-заполнением
- Результат: анимированный круг с gradient-stroke

### 8. Footer (Layout.tsx)
- Минимальный footer с glass-blur и тонкой gradient-линией сверху

## Файлы для изменения

| Файл | Что меняется |
|------|-------------|
| `src/index.css` | Обновление CSS-переменных, новые утилиты (aurora, glass-2, grain-overlay, spring-transition), обновление liquid-glass-card, liquid-glass, buttons |
| `tailwind.config.ts` | Новые keyframes (aurora-shift, gradient-flow), обновление animation timing |
| `src/components/layout/Header.tsx` | Парящий header с усиленным blur, aurora-логотип |
| `src/components/layout/Layout.tsx` | Grain/noise overlay на body, обновлённый footer |
| `src/pages/Index.tsx` | Aurora mesh hero, обновлённые карточки, уменьшение orbs |
| `src/pages/Learn.tsx` | Glass-стиль карточек, gradient-border hover |
| `src/pages/Login.tsx` | Обновлённый glass-form, input focus glow |
| `src/pages/Register.tsx` | Аналогично Login |
| `src/pages/Quiz.tsx` | Pill-ответы с glow, gradient progress |
| `src/pages/InputMode.tsx` | Glass-стиль, gradient-кнопки, glow input |
| `src/pages/Profile.tsx` | Обновлённые stat-карточки, glass-2 стиль |
| `src/pages/Flashcards.tsx` | Обновление glass-стиля (без поломки fix'а) |

## Технические детали

### Новые CSS-классы (примеры)

```css
/* Aurora mesh background */
.aurora-bg {
  background:
    radial-gradient(ellipse at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, hsl(258 80% 65% / 0.12) 0%, transparent 40%),
    radial-gradient(ellipse at 40% 80%, hsl(210 100% 70% / 0.08) 0%, transparent 45%);
  animation: aurora-drift 20s ease-in-out infinite alternate;
}

/* Glass card 2.0 */
.glass-card-2 {
  background: hsl(var(--card) / 0.5);
  backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid hsl(var(--primary) / 0.08);
  box-shadow:
    0 0 0 1px hsl(0 0% 100% / 0.05) inset,
    0 8px 40px hsl(var(--primary) / 0.06);
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.glass-card-2:hover {
  border-color: hsl(var(--primary) / 0.2);
  box-shadow:
    0 0 0 1px hsl(0 0% 100% / 0.1) inset,
    0 16px 64px hsl(var(--primary) / 0.12),
    0 0 40px hsl(var(--primary) / 0.06);
  transform: translateY(-2px);
}
```

### Новые keyframes

```css
@keyframes aurora-drift {
  0% { background-position: 0% 50%; filter: hue-rotate(0deg); }
  50% { background-position: 100% 50%; filter: hue-rotate(15deg); }
  100% { background-position: 0% 50%; filter: hue-rotate(0deg); }
}
```

### Обновление цветов (пример light mode)

```css
:root {
  --background: 220 20% 97%;
  --foreground: 222 47% 11%;
  --card: 220 20% 99%;
  --primary: 237 73% 58%;
  --muted-foreground: 220 9% 46%;
}
```

## Что НЕ меняется
- Логика приложения (роутинг, запросы, авторизация)
- Структура компонентов
- Flashcard 3D fix (position: absolute для animated-border)
- Supabase интеграция
- Языковая система

## Ожидаемый результат
- Современный, "дорогой" вид с глубиной и слоями
- Более чёткая визуальная иерархия
- Плавные spring-анимации вместо линейных
- Aurora-градиенты как фон вместо плоских цветов
- Лучший контраст текста, особенно заголовков
