
# План: Стильный UI для результатов проверки с исправлением

## Обзор
Добавим красивую панель результатов проверки в стиле Liquid Glass с круговой диаграммой, статистикой, фильтром ошибок и удобным исправлением.

---

## Визуальный дизайн

После проверки появится стильная карточка:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Liquid Glass Panel                                         │   │
│   │                                                             │   │
│   │   ╭────╮                                                    │   │
│   │   │ 80%│  ✅ 12 верно    ⚠️ 3 ошибки                       │   │
│   │   │    │                                                    │   │
│   │   ╰────╯  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░              │   │
│   │   Круговая                                                  │   │
│   │   диаграмма        [🔧 Показать ошибки]   [🔍 Проверить]   │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   [Список вопросов...]                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

При 100% правильных:
```
┌─────────────────────────────────────────────────────────────────┐
│   ╭────╮                                                        │
│   │100%│  ✅ Отлично! Все 15 ответов верны                      │
│   │ ✓  │                                                        │
│   ╰────╯  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━            │
│                                      [🔍 Проверить ещё раз]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Что будет сделано

### 1. Создание компонента VerificationPanel

Новый компонент `VerificationPanel.tsx` с:
- Круговой прогресс-диаграммой (SVG)
- Статистикой: сколько верно / сколько ошибок
- Линейный прогресс-бар
- Кнопка фильтра "Показать только ошибки" с иконкой Wrench
- Кнопка повторной проверки
- Анимации появления и шиммер-эффект

### 2. Обновление QuestionsList

- Интегрировать VerificationPanel
- Добавить состояние фильтра `showOnlyErrors`
- Фильтровать вопросы при активном фильтре

### 3. Круговая диаграмма прогресса

SVG-круг с:
- Анимацией заполнения
- Процентом в центре
- Цвет зависит от результата (зелёный/жёлтый/красный)

---

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `src/components/admin/VerificationPanel.tsx` | Создать |
| `src/components/admin/QuestionsList.tsx` | Обновить |

---

## Технические детали

### Круговая диаграмма (SVG)

```tsx
const CircularProgress = ({ percent }: { percent: number }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  
  const color = percent >= 90 ? 'text-green-500' : 
                percent >= 70 ? 'text-yellow-500' : 'text-red-500';
  
  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="48" cy="48" r={radius}
          className="fill-none stroke-muted stroke-[6]"
        />
        <circle
          cx="48" cy="48" r={radius}
          className={`fill-none stroke-[6] ${color} transition-all duration-1000`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold">{percent}%</span>
      </div>
    </div>
  );
};
```

### VerificationPanel компонент

```tsx
interface VerificationPanelProps {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  showOnlyErrors: boolean;
  onToggleFilter: () => void;
  onVerify: () => void;
  isVerifying: boolean;
}

const VerificationPanel = ({...}: VerificationPanelProps) => {
  const percent = Math.round((correctCount / totalQuestions) * 100);
  
  return (
    <div className="liquid-glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-6">
        <CircularProgress percent={percent} />
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-4">
            <Badge className="bg-green-500/20 text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {correctCount} верно
            </Badge>
            
            {incorrectCount > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-700">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                {incorrectCount} ошибок
              </Badge>
            )}
          </div>
          
          <Progress value={percent} className="h-2" />
          
          <p className="text-sm text-muted-foreground">
            {percent === 100 
              ? '✨ Отлично! Все ответы проверены и верны'
              : `Рекомендуем исправить ${incorrectCount} вопросов`
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          {incorrectCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showOnlyErrors ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleFilter}
                  className="gap-2"
                >
                  <Wrench className="h-4 w-4" />
                  {showOnlyErrors ? 'Все' : 'Ошибки'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showOnlyErrors ? 'Показать все вопросы' : 'Показать только ошибки'}
              </TooltipContent>
            </Tooltip>
          )}
          
          <Button variant="outline" size="sm" onClick={onVerify} disabled={isVerifying}>
            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
```

### Фильтрация в QuestionsList

```typescript
const [showOnlyErrors, setShowOnlyErrors] = useState(false);

const displayedQuestions = showOnlyErrors 
  ? questions.filter(q => {
      const result = verificationResults.find(r => r.questionId === q.id);
      return result && !result.isCorrect;
    })
  : questions;
```

---

## Визуальные эффекты

1. **Liquid Glass стиль** — панель с размытием и переливами
2. **Анимация появления** — плавное fade-in при показе результатов
3. **Круговая диаграмма** — анимация заполнения при появлении
4. **Цветовая индикация**:
   - 90-100%: зелёный (успех)
   - 70-89%: жёлтый (внимание)
   - <70%: красный (много ошибок)

---

## Результат

- Красивая стеклянная панель с результатами проверки
- Наглядная круговая диаграмма с процентом
- Бейджи со статистикой верных и неверных ответов
- Кнопка с гаечным ключом для фильтрации ошибок
- Сообщение-рекомендация по исправлению
- Всё в едином Liquid Glass стиле проекта
