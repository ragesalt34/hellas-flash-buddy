
# План: Исправление вёрстки главной страницы

## Выявленные проблемы

На основе анализа кода и скриншотов страницы выявлены следующие проблемы:

| Секция | Проблема |
|--------|----------|
| Hero (главный экран) | Заголовок с `<br />` ломает центрирование на мобильных |
| Stats | Карточки не выровнены по центру на мобильных устройствах |
| Topics | Заголовок секции не по центру на некоторых экранах |
| Learning Modes | Иконки и текст смещены влево |
| CTA | Кнопка регистрации не центрирована |
| Footer | Текст не центрирован |

---

## Решения

### 1. Hero секция (строки 173-180)

**Проблема:** Тег `<br />` в заголовке создаёт жёсткий перенос, который ломает центрирование на узких экранах.

**Решение:** Убрать `<br />` и использовать `<span className="block">` для контролируемого переноса:

```tsx
<h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground opacity-0 animate-fade-in-up animate-delay-100">
  {language === 'ru' ? (
    <>
      Ваш путь к{' '}
      <span className="block text-shimmer">греческому гражданству</span>
    </>
  ) : (
    <>
      Ο δρόμος σας προς την{' '}
      <span className="block text-shimmer">ελληνική ιθαγένεια</span>
    </>
  )}
</h1>
```

### 2. Features grid (строки 214-221)

**Проблема:** На мобильных устройствах 2 колонки могут выглядеть криво из-за разной длины текста.

**Решение:** Добавить `items-stretch` и `text-center` для лучшего выравнивания:

```tsx
<div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 opacity-0 animate-fade-in-up animate-delay-400">
  {features.map((feature, i) => (
    <div key={i} className="flex items-center justify-center gap-2 text-sm text-muted-foreground liquid-glass-button rounded-full py-2 px-4 text-center">
```

### 3. Stats секция (строки 238-244)

**Проблема:** Контейнер не имеет явного центрирования.

**Решение:** Добавить `max-w-4xl mx-auto` для ограничения ширины и центрирования:

```tsx
<div className="container relative">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
    {stats.map((stat, i) => (
      <StatCard key={i} {...stat} delay={`${i * 150}ms`} />
    ))}
  </div>
</div>
```

### 4. StatCard компонент (строки 22-38)

**Проблема:** Иконка центрирована через `mx-auto`, но весь контейнер должен быть гарантированно центрирован.

**Решение:** Убедиться что `text-center` работает и добавить `flex flex-col items-center`:

```tsx
const StatCard = ({ icon: Icon, number, label, delay }: { ... }) => (
  <div 
    className="liquid-glass-card rounded-2xl p-6 flex flex-col items-center text-center opacity-0 animate-fade-in-up"
    style={{ animationDelay: delay }}
  >
    <div className="w-14 h-14 rounded-xl liquid-glass-button flex items-center justify-center mb-4">
      <Icon className="h-7 w-7 text-primary" />
    </div>
    <div className="font-display text-3xl font-bold text-foreground mb-1">{number}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);
```

### 5. TopicCard компонент (строки 56-72)

**Проблема:** Карточка использует `p-6` но не центрирует содержимое.

**Решение:** Добавить `text-left` явно для согласованности (так как это карточки с иконками слева):

```tsx
<div 
  className={`group relative liquid-glass-card rounded-2xl ${colorClasses[topic.id]} 
    p-6 text-left opacity-0 animate-fade-in-up cursor-pointer`}
```

### 6. ModeCard компонент (строки 76-93)

**Проблема:** Аналогично TopicCard.

**Решение:** Явно добавить `text-left`:

```tsx
<div 
  className={`group liquid-glass-card rounded-2xl p-6 text-left
    opacity-0 animate-fade-in-up cursor-pointer`}
```

### 7. Topics секция заголовок (строки 252-261)

**Проблема:** Заголовок по центру, но может быть смещён на мобильных.

**Решение:** Добавить `px-4` для мобильных отступов:

```tsx
<div className="text-center mb-16 px-4">
  <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 opacity-0 animate-fade-in-up">
```

### 8. Learning Modes секция заголовок (строки 275-283)

**Проблема:** Аналогично Topics.

**Решение:** Добавить `px-4`:

```tsx
<div className="text-center mb-16 px-4">
```

### 9. CTA секция (строки 305-321)

**Проблема:** Кнопка может выглядеть не центрированной.

**Решение:** Контейнер уже имеет `text-center`, но добавим `px-4` для мобильных:

```tsx
<div className="container relative z-10 text-center px-4">
```

---

## Файлы для изменения

| Файл | Что меняем |
|------|------------|
| `src/pages/Index.tsx` | Исправления выравнивания в Hero, Stats, Topics, Learning Modes, CTA секциях |

---

## Итоговые изменения

1. **Hero заголовок:** `<br />` → `<span className="block">`
2. **Features grid:** добавить `text-center` к каждому элементу
3. **Stats grid:** добавить `max-w-4xl mx-auto`
4. **StatCard:** `text-center` → `flex flex-col items-center text-center`
5. **TopicCard/ModeCard:** добавить явный `text-left`
6. **Секции Topics/Learning Modes/CTA:** добавить `px-4` к заголовкам

---

## Результат

- Все заголовки будут строго по центру на всех экранах
- Карточки статистики будут центрированы
- Текст в карточках тем и режимов будет выровнен слева (как задумано)
- Мобильная версия будет выглядеть аккуратнее с правильными отступами
