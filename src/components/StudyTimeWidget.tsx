import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, Flame, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const RECOMMENDED_DAILY_MINUTES = 30;

function formatMinutes(minutes: number): string {
  if (minutes < 1) return '<1 мин';
  if (minutes < 60) return `${Math.round(minutes)} мин`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}ч ${m}мин` : `${h}ч`;
}

function formatMinutesEl(minutes: number): string {
  if (minutes < 1) return '<1 λεπ';
  if (minutes < 60) return `${Math.round(minutes)} λεπ`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}ω ${m}λ` : `${h}ω`;
}

type DayData = {
  date: string;
  minutes: number;
};

export function StudyTimeWidget() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const fmt = language === 'ru' ? formatMinutes : formatMinutesEl;

  const { data: weekData } = useQuery({
    queryKey: ['study-time-week', user?.id],
    queryFn: async () => {
      // Helper: local date string YYYY-MM-DD
      const toLocalDateStr = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('study_sessions')
        .select('started_at, duration_seconds')
        .eq('user_id', user!.id)
        .gte('started_at', sevenDaysAgo.toISOString())
        .order('started_at', { ascending: true });

      if (error) throw error;

      // Group by LOCAL day
      const dayMap: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        dayMap[toLocalDateStr(d)] = 0;
      }

      (data || []).forEach((s: any) => {
        // Convert UTC timestamp to local date
        const localDay = toLocalDateStr(new Date(s.started_at));
        if (dayMap[localDay] !== undefined) {
          dayMap[localDay] += (s.duration_seconds || 0) / 60;
        }
      });

      return Object.entries(dayMap).map(([date, minutes]) => ({
        date,
        minutes,
      })) as DayData[];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  if (!weekData) return null;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayMinutes = weekData.find(d => d.date === todayStr)?.minutes || 0;
  const todayPercent = Math.min(100, (todayMinutes / RECOMMENDED_DAILY_MINUTES) * 100);
  const maxMinutes = Math.max(...weekData.map(d => d.minutes), RECOMMENDED_DAILY_MINUTES);
  
  // Streak: consecutive days with >= 5 min.
  // If today (last element) has no study time yet, start counting from yesterday —
  // mirrors the Stats.tsx calculateStreak logic so the flame doesn't vanish at midnight.
  let streak = 0;
  const streakStartIdx =
    weekData.length > 0 && weekData[weekData.length - 1].minutes < 5
      ? weekData.length - 2
      : weekData.length - 1;
  for (let i = streakStartIdx; i >= 0; i--) {
    if (weekData[i].minutes >= 5) streak++;
    else break;
  }

  const weekDayNames = language === 'ru' 
    ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    : ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'];

  return (
    <Card className="liquid-glass-card animate-fade-in" style={{ animationDelay: '0.35s' }}>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <div className="p-2 rounded-lg liquid-glass-button">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          {language === 'ru' ? 'Время обучения' : 'Χρόνος μελέτης'}
        </CardTitle>
        <CardDescription>
          {language === 'ru' 
            ? `Рекомендуется минимум ${RECOMMENDED_DAILY_MINUTES} мин/день`
            : `Συνιστάται τουλάχιστον ${RECOMMENDED_DAILY_MINUTES} λεπτά/ημέρα`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Today's progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {language === 'ru' ? 'Сегодня' : 'Σήμερα'}
            </span>
            <span className={cn(
              "text-sm font-bold",
              todayPercent >= 100 ? "text-success" : "text-foreground"
            )}>
              {fmt(todayMinutes)} / {fmt(RECOMMENDED_DAILY_MINUTES)}
            </span>
          </div>
          <div className="relative">
            <Progress value={todayPercent} className="h-3" />
            {todayPercent >= 100 && (
              <span className="absolute -right-1 -top-1 text-success text-xs">✓</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {todayPercent >= 100 
              ? (language === 'ru' ? '🎉 Цель на сегодня достигнута!' : '🎉 Ο στόχος σήμερα επιτεύχθηκε!')
              : (language === 'ru' 
                  ? `Осталось ${fmt(Math.max(0, RECOMMENDED_DAILY_MINUTES - todayMinutes))}`
                  : `Απομένουν ${fmt(Math.max(0, RECOMMENDED_DAILY_MINUTES - todayMinutes))}`)}
          </p>
        </div>

        {/* Weekly chart */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              {language === 'ru' ? 'За неделю' : 'Εβδομάδα'}
            </span>
            {streak > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-accent">
                <Flame className="h-3.5 w-3.5" />
                {streak} {language === 'ru' ? (streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней') : (streak === 1 ? 'ημέρα' : 'ημέρες')}
              </span>
            )}
          </div>
          <div className="flex items-end gap-1.5 h-24">
            {weekData.map((day, i) => {
              const dayOfWeek = new Date(day.date + 'T00:00:00').getDay();
              const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const barHeight = maxMinutes > 0 ? Math.max(4, (day.minutes / maxMinutes) * 100) : 4;
              const isToday = day.date === todayStr;
              const metGoal = day.minutes >= RECOMMENDED_DAILY_MINUTES;

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative" style={{ height: '80px' }}>
                    {/* Recommended line */}
                    <div 
                      className="absolute w-full border-t border-dashed border-primary/30"
                      style={{ bottom: `${(RECOMMENDED_DAILY_MINUTES / maxMinutes) * 100}%` }}
                    />
                    <div
                      className={cn(
                        "absolute bottom-0 w-full rounded-t-sm transition-all duration-300",
                        isToday 
                          ? metGoal ? "bg-success" : "bg-primary" 
                          : metGoal ? "bg-success/60" : "bg-muted-foreground/30"
                      )}
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px]",
                    isToday ? "font-bold text-foreground" : "text-muted-foreground"
                  )}>
                    {weekDayNames[adjustedDay]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-success inline-block" />
              {language === 'ru' ? `≥${RECOMMENDED_DAILY_MINUTES}мин` : `≥${RECOMMENDED_DAILY_MINUTES}λεπ`}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm border border-dashed border-primary/30 inline-block" />
              {language === 'ru' ? 'Цель' : 'Στόχος'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
