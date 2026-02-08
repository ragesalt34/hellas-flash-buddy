import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Loader2, 
  Wrench,
  Sparkles,
  Filter,
  FilterX
} from 'lucide-react';

interface VerificationPanelProps {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  showOnlyErrors: boolean;
  onToggleFilter: () => void;
  onVerify: () => void;
  isVerifying: boolean;
}

const CircularProgress = ({ percent }: { percent: number }) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPercent / 100) * circumference;
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPercent(percent), 100);
    return () => clearTimeout(timer);
  }, [percent]);

  const getColor = () => {
    if (percent >= 90) return 'stroke-green-500';
    if (percent >= 70) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  const getGlowColor = () => {
    if (percent >= 90) return 'drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]';
    if (percent >= 70) return 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]';
    return 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
  };

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className={`w-full h-full -rotate-90 ${getGlowColor()}`} viewBox="0 0 96 96">
        {/* Background circle */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          className="fill-none stroke-muted/50"
          strokeWidth="6"
        />
        {/* Progress circle */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          className={`fill-none ${getColor()} transition-all duration-1000 ease-out`}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        {/* Inner glow effect */}
        <circle
          cx="48"
          cy="48"
          r={radius - 8}
          className="fill-none stroke-muted/20"
          strokeWidth="1"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{animatedPercent}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">%</span>
      </div>
    </div>
  );
};

export function VerificationPanel({
  totalQuestions,
  correctCount,
  incorrectCount,
  showOnlyErrors,
  onToggleFilter,
  onVerify,
  isVerifying,
}: VerificationPanelProps) {
  const percent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const isAllCorrect = incorrectCount === 0;

  return (
    <div className={`liquid-glass-card rounded-2xl p-5 animate-fade-in ${
      isAllCorrect ? 'border-green-500/20' : 'border-yellow-500/20'
    }`}>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Circular Progress */}
        <CircularProgress percent={percent} />
        
        {/* Stats Section */}
        <div className="flex-1 space-y-3 text-center sm:text-left">
          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <Badge 
              variant="outline" 
              className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 gap-1.5 px-3 py-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {correctCount} верно
            </Badge>
            
            {incorrectCount > 0 && (
              <Badge 
                variant="outline" 
                className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 gap-1.5 px-3 py-1"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {incorrectCount} {incorrectCount === 1 ? 'ошибка' : incorrectCount < 5 ? 'ошибки' : 'ошибок'}
              </Badge>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <Progress 
              value={percent} 
              className="h-2 bg-muted/50" 
            />
          </div>
          
          {/* Message */}
          <p className="text-sm text-muted-foreground">
            {isAllCorrect ? (
              <span className="flex items-center justify-center sm:justify-start gap-1.5">
                <Sparkles className="h-4 w-4 text-green-500" />
                Отлично! Все ответы проверены и верны
              </span>
            ) : (
              `Рекомендуем исправить ${incorrectCount} ${incorrectCount === 1 ? 'вопрос' : incorrectCount < 5 ? 'вопроса' : 'вопросов'}`
            )}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          {incorrectCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showOnlyErrors ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleFilter}
                  className={`gap-2 transition-all ${
                    showOnlyErrors 
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                      : 'hover:border-yellow-500/50 hover:text-yellow-600'
                  }`}
                >
                  {showOnlyErrors ? (
                    <>
                      <FilterX className="h-4 w-4" />
                      Все
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4" />
                      Ошибки
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showOnlyErrors ? 'Показать все вопросы' : 'Показать только ошибки для исправления'}
              </TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onVerify} 
                disabled={isVerifying}
                className="gap-2"
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {!isVerifying && <span className="hidden sm:inline">Проверить</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Проверить все ответы с помощью AI</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
