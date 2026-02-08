
# План: Выравнивание карточек тем

## Проблема

Карточка "География Греции" выглядит криво по сравнению с остальными тремя карточками, потому что:
- У первых трёх карточек описание занимает 2 строки
- У "Географии" описание занимает 1 строку
- Из-за этого кнопки режимов (Карточки, Тест, Ввод, Экзамен) находятся на разной высоте

## Решение

Сделать так, чтобы все карточки имели одинаковую высоту с помощью flexbox:

1. **Добавить `h-full` и `flex flex-col`** на Card - чтобы карточка растягивалась на всю высоту ряда
2. **Добавить `flex-1`** на CardHeader - чтобы заголовок занимал всё доступное пространство и "выталкивал" кнопки вниз
3. **Зафиксировать высоту описания** с помощью `min-h-[2.5rem]` - резервирует место минимум для 2 строк текста

## Изменения в `src/pages/Learn.tsx`

```tsx
<Card 
  key={topic.id}
  className="group bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 animate-fade-in h-full flex flex-col"
  style={{ animationDelay: `${index * 0.1}s` }}
>
  <CardHeader className="pb-2 pt-6 flex-1">
    <div className={`w-12 sm:w-14 h-12 sm:h-14 rounded-xl flex items-center justify-center ${topic.iconClass} transition-all duration-300`}>
      <topic.icon className="h-6 sm:h-7 w-6 sm:w-7 transition-colors duration-300" />
    </div>
    <CardTitle className="font-display text-lg sm:text-xl mt-4">{topic.title}</CardTitle>
    <CardDescription className="text-sm mt-1 min-h-[2.5rem]">{topic.description}</CardDescription>
  </CardHeader>
  <CardContent className="pt-0 mt-auto">
    ...
  </CardContent>
</Card>
```

## Результат

| До | После |
|----|-------|
| Кнопки на разной высоте | Все кнопки на одной линии |
| Карточки разной высоты | Все карточки одинаковой высоты |
| "География" выглядит криво | Все 4 карточки ровные |

## Файл для изменения

| Файл | Действие |
|------|----------|
| `src/pages/Learn.tsx` | Добавить flex-классы и min-height для выравнивания |
