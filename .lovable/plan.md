
# План: Убрать некрасивые рамки на странице Learn

## Проблема

На странице `/learn` видны две некрасивые "рамки":

1. **Правый верхний угол** — декоративный элемент `floating-orb-glass` создаёт видимую дугу/рамку
2. **Секция "Симуляция экзамена"** — карточка имеет слишком выраженную тень `shadow-2xl shadow-primary/30`, которая выглядит как рамка

## Решение

1. **Удалить декоративные orb-элементы** со страницы Learn — они не добавляют ценности и выглядят как дефект
2. **Смягчить тень у Exam Card** — заменить `shadow-2xl shadow-primary/30` на более мягкую тень `shadow-lg`

## Изменения в файле

### `src/pages/Learn.tsx`

| Строки | Изменение |
|--------|-----------|
| 104-105 | Удалить два `floating-orb-glass` элемента |
| 159 | Изменить классы Card с `shadow-2xl shadow-primary/30` на `shadow-lg` |

### До:
```tsx
<div className="relative container py-6 sm:py-12 px-4 overflow-hidden">
  {/* Floating decorative elements */}
  <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full floating-orb-glass" />
  <div className="absolute bottom-20 -left-20 w-[250px] h-[250px] rounded-full floating-orb-glass" style={{ animationDelay: '2s' }} />
  ...
  <Card className="gradient-greek text-primary-foreground shadow-2xl shadow-primary/30 overflow-hidden">
```

### После:
```tsx
<div className="relative container py-6 sm:py-12 px-4">
  ...
  <Card className="gradient-greek text-primary-foreground shadow-lg overflow-hidden">
```

## Результат

- Исчезнет дуга/рамка в правом верхнем углу
- Исчезнет рамка вокруг секции экзамена слева
- Страница будет выглядеть чище и более стильно
