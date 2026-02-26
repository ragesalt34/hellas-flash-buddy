import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useState, useCallback } from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { upsertProgress } from '@/lib/progressHelper';

const TOPICS = [
  { id: 'history',   emoji: '🏛️', subtitle: 'Modern & Ancient' },
  { id: 'culture',   emoji: '🎭', subtitle: 'Arts & Customs' },
  { id: 'laws',      emoji: '⚖️', subtitle: 'Government & Law' },
  { id: 'geography', emoji: '🗺️', subtitle: 'Regions & Cities' },
];

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Index() {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const { data: questionsCount } = useQuery({
    queryKey: ['questions-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: studyStats } = useQuery({
    queryKey: ['index-study-stats', user?.id],
    queryFn: async () => {
      const [progressRes, sessionsRes] = await Promise.all([
        supabase.from('user_progress').select('correct_count, incorrect_count, questions(topic)').eq('user_id', user!.id),
        supabase.from('study_sessions').select('duration_seconds, started_at').eq('user_id', user!.id),
      ]);
      const progress = progressRes.data || [];
      const sessions = sessionsRes.data || [];

      const totalCorrect = progress.reduce((s, p) => s + (p.correct_count || 0), 0);
      const totalAnswers = progress.reduce((s, p) => s + (p.correct_count || 0) + (p.incorrect_count || 0), 0);
      const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
      const mastered = progress.filter(p => (p.correct_count || 0) >= 3).length;
      const totalSeconds = sessions.reduce((s, se) => s + (se.duration_seconds || 0), 0);
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const studyTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      const topicStats: Record<string, { c: number; total: number }> = {};
      progress.forEach((p: any) => {
        const topic = p.questions?.topic;
        if (!topic) return;
        if (!topicStats[topic]) topicStats[topic] = { c: 0, total: 0 };
        topicStats[topic].c += p.correct_count || 0;
        topicStats[topic].total += (p.correct_count || 0) + (p.incorrect_count || 0);
      });
      const topicAccuracy = Object.fromEntries(
        Object.entries(topicStats).map(([k, v]) => [k, v.total > 0 ? Math.round(v.c / v.total * 100) : 0])
      );

      const now = new Date();
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - 6 + i);
        return d.toISOString().split('T')[0];
      });
      const sessionDays = new Set(sessions.map((s: any) => s.started_at.split('T')[0]));
      const streak = weekDays.map(day => sessionDays.has(day));
      const streakCount = streak.filter(Boolean).length;

      return { accuracy, mastered, studyTime, topicAccuracy, streak, streakCount };
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  // Active Session flashcard
  const [sessionCardFlipped, setSessionCardFlipped] = useState(false);
  const [sessionCardIndex, setSessionCardIndex] = useState(0);

  const { data: sessionCardData, refetch: refetchSessionCard } = useQuery({
    queryKey: ['session-card', user?.id],
    queryFn: async () => {
      const now = new Date().toISOString();
      // Get due cards first, fall back to all progress, else random question
      const [dueRes, allProgressRes, randomQRes] = await Promise.all([
        supabase
          .from('user_progress')
          .select('question_id, correct_count, incorrect_count, questions(id, question_el, question, correct_answer_el, correct_answer, topic)')
          .eq('user_id', user!.id)
          .lte('next_review_at', now)
          .limit(20),
        supabase
          .from('user_progress')
          .select('question_id')
          .eq('user_id', user!.id),
        supabase
          .from('questions')
          .select('id, question_el, question, correct_answer_el, correct_answer, topic')
          .limit(50),
      ]);

      const dueCards = (dueRes.data || []).filter((r: any) => r.questions);
      if (dueCards.length > 0) {
        const card = dueCards[Math.floor(Math.random() * dueCards.length)] as any;
        return { question: card.questions, isDue: true };
      }

      // Fall back: unseen question
      const seenIds = new Set((allProgressRes.data || []).map((p: any) => p.question_id));
      const unseen = (randomQRes.data || []).filter((q: any) => !seenIds.has(q.id));
      const pool = unseen.length > 0 ? unseen : (randomQRes.data || []);
      if (pool.length === 0) return null;
      return { question: pool[Math.floor(Math.random() * pool.length)], isDue: false };
    },
    enabled: !!user,
  });

  // Weekly Performance data
  const { data: weeklyData } = useQuery({
    queryKey: ['weekly-performance', user?.id],
    queryFn: async () => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('user_progress')
        .select('last_reviewed_at, is_known')
        .eq('user_id', user!.id)
        .gte('last_reviewed_at', weekStart.toISOString());

      const mastered = (data || []).filter((p: any) => p.is_known).length;

      // Group by day of week (Mon=0..Sun=6)
      const dayCounts = Array(7).fill(0);
      (data || []).forEach((p: any) => {
        if (!p.last_reviewed_at) return;
        const d = new Date(p.last_reviewed_at);
        const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        dayCounts[dayIdx]++;
      });

      // Get all mastered for ranking
      const { count: totalMastered } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_known', true);

      return { dayCounts, mastered: totalMastered ?? mastered };
    },
    enabled: !!user,
  });

  const handleSessionAnswer = useCallback(async (correct: boolean | null) => {
    const card = sessionCardData?.question;
    if (!card || !user) return;
    if (correct !== null) {
      await upsertProgress(user.id, card.id, correct);
      queryClient.invalidateQueries({ queryKey: ['index-study-stats', user.id] });
      queryClient.invalidateQueries({ queryKey: ['weekly-performance', user.id] });
    }
    setSessionCardFlipped(false);
    setTimeout(() => refetchSessionCard(), 300);
  }, [sessionCardData, user, queryClient, refetchSessionCard]);

  const topicColors: Record<string, string> = {
    history: 'hsl(var(--history))',
    culture: 'hsl(var(--culture))',
    laws: 'hsl(var(--laws))',
    geography: 'hsl(var(--geography))',
  };

  const features = language === 'ru'
    ? ['Более 300 вопросов', 'Отслеживание прогресса', '3 режима изучения', 'Симуляция экзамена']
    : ['Πάνω από 300 ερωτήσεις', 'Παρακολούθηση προόδου', '3 τρόποι μάθησης', 'Προσομοίωση εξέτασης'];

  // Authenticated Dashboard
  if (user) {
    return (
      <Layout>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 relative z-10">

          {/* === SECTION 1: 3-column top grid === */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Greeting */}
            <div className="glass-panel flex flex-col justify-center">
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}>
                {language === 'ru' ? 'Добро пожаловать' : 'Welcome back'}
              </span>
              <h1 style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.02em', color: '#2F3532', lineHeight: 1.2 }}>
                {language === 'ru' ? 'Γεια σου, ' : 'Γεια σου, '}
                {user.email?.split('@')[0] || (language === 'ru' ? 'друг' : 'φίλε')}!
              </h1>
              <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginTop: '8px' }}>
                {language === 'ru' ? 'Продолжай готовиться к гражданству' : 'Συνέχισε να προετοιμάζεσαι για την ιθαγένεια'}
              </p>
              <Link to="/learn" style={{ marginTop: '20px', display: 'inline-flex' }}>
                <button className="btn-pebble">
                  {language === 'ru' ? 'Учиться' : 'Μελέτη'}
                  <ArrowRight style={{ width: '14px', height: '14px' }} />
                </button>
              </Link>
            </div>

            {/* Weekly Streak */}
            <div className="glass-panel flex flex-col gap-3">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                  {language === 'ru' ? 'Серия недели' : 'Weekly Streak'}
                </span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#2F3532' }}>
                  {studyStats?.streakCount ?? 0} {language === 'ru' ? 'дн.' : 'days'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px' }}>
                {WEEK_DAYS.map((day, i) => {
                  const isActive = studyStats?.streak[i];
                  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
                  const isToday = i === todayIdx;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div className={`pebble${isActive ? (i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) ? ' pebble-current' : ' pebble-active') : ''}`}
                        style={{ width: '30px', height: '30px' }}
                      />
                      <span style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Focus of Day */}
            <div className="glass-panel flex flex-col justify-between">
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.6)',
                  color: '#5B8DB8',
                  marginBottom: '10px',
                }}>
                  {language === 'ru' ? 'Тема дня' : 'Focus of the Day'}
                </span>
                <h3 style={{ fontWeight: 500, fontSize: '18px', color: '#2F3532', lineHeight: 1.3 }}>
                  {language === 'ru' ? 'История Греции' : 'War of Independence'}
                </h3>
                <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '6px' }}>
                  {language === 'ru' ? 'Изучайте ключевые события' : 'Review key historical events'}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px' }}>
                <span style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>
                  {questionsCount ? `${questionsCount} ${language === 'ru' ? 'карточек' : 'cards'}` : '—'}
                </span>
                <Link to="/learn/history/flashcards">
                  <button className="btn-pebble" style={{ padding: '8px 14px', fontSize: '13px' }}>
                    {language === 'ru' ? 'Повторить' : 'Review'}
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* === SECTION 2: Stats row === */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[
              { label: language === 'ru' ? 'Освоено карточек' : 'Mastered Cards', value: studyStats?.mastered ?? 0 },
              { label: language === 'ru' ? 'Время учёбы' : 'Study Time', value: studyStats?.studyTime ?? '0m' },
              { label: language === 'ru' ? 'Точность' : 'Accuracy', value: `${studyStats?.accuracy ?? 0}%` },
            ].map(s => (
              <div key={s.label} className="glass-panel">
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                  {s.label}
                </span>
                <div style={{ fontSize: '36px', fontWeight: 500, letterSpacing: '-0.02em', color: '#2F3532', marginTop: '4px' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* === SECTION 3: Study Topics === */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 500, color: '#2F3532' }}>
              {language === 'ru' ? 'Темы для изучения' : 'Study Topics'}
            </h2>
            <Link to="/learn" style={{ fontSize: '13px', color: '#2F3532', opacity: 0.6, textDecoration: 'none', fontWeight: 500 }}>
              {language === 'ru' ? 'Все темы' : 'View all'}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {TOPICS.map(topic => {
              const acc = studyStats?.topicAccuracy[topic.id] ?? 0;
              return (
                <Link to={`/learn/${topic.id}/flashcards`} key={topic.id} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel" style={{ height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', padding: '20px' }}>
                    <div>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', marginBottom: '10px',
                      }}>
                        {topic.emoji}
                      </div>
                      <div style={{ fontWeight: 500, fontSize: '14px', color: '#2F3532' }}>{t(`topic.${topic.id}`)}</div>
                      <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>{topic.subtitle}</div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px', color: 'hsl(var(--muted-foreground))' }}>
                        <span>{language === 'ru' ? 'Прогресс' : 'Progress'}</span>
                        <span>{acc}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div className={`progress-fill-${topic.id}`} style={{ height: '100%', width: `${acc}%`, borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* === SECTION 4: Learning Modes === */}
          <h2 style={{ fontSize: '22px', fontWeight: 500, color: '#2F3532', marginBottom: '20px' }}>
            {language === 'ru' ? 'Режимы обучения' : 'Learning Modes'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { emoji: '📚', id: 'flashcards', href: '/learn', desc: language === 'ru' ? 'Флэш-карточки с переворотом' : 'Flip cards to learn' },
              { emoji: '✏️', id: 'quiz',       href: '/learn', desc: language === 'ru' ? 'Тест с 4 вариантами' : '4-choice multiple choice' },
              { emoji: '🎓', id: 'exam',       href: '/learn', desc: language === 'ru' ? 'Симуляция экзамена' : 'Simulate the real exam' },
            ].map(mode => (
              <Link to={mode.href} key={mode.id} style={{ textDecoration: 'none' }}>
                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    border: '1.5px solid rgba(47,53,50,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', flexShrink: 0,
                  }}>
                    {mode.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '15px', color: '#2F3532' }}>{t(`mode.${mode.id}`)}</div>
                    <div style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>{mode.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* === SECTION 5: Active Session === */}
          <h2 style={{ fontSize: '22px', fontWeight: 500, color: '#2F3532', marginBottom: '20px', marginTop: '8px' }}>
            {language === 'ru' ? 'Активная сессия' : 'Active Session'}
          </h2>
          <div className="glass-panel mb-8" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {sessionCardData ? (() => {
              const q = sessionCardData.question as any;
              const topicColor = topicColors[q.topic] || 'hsl(var(--history))';
              const questionText = language === 'el' ? (q.question_el || q.question) : q.question;
              const answerText = language === 'el' ? (q.correct_answer_el || q.correct_answer) : q.correct_answer;
              const answerEl = q.correct_answer_el;
              return (
                <>
                  <div
                    className="flashcard-container"
                    style={{ maxWidth: '560px', width: '100%', height: '300px', cursor: 'pointer' }}
                    onClick={() => setSessionCardFlipped(f => !f)}
                  >
                    {/* Front */}
                    <div className="flashcard-face" style={{
                      borderRadius: '20px',
                      background: '#FFFFFF',
                      boxShadow: '0 12px 36px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(255,255,255,0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '40px 36px',
                      textAlign: 'center',
                      position: 'relative',
                      backfaceVisibility: sessionCardFlipped ? 'visible' : 'hidden',
                      transform: sessionCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      transition: 'transform 0.6s cubic-bezier(0.4,0.2,0.2,1)',
                    }}>
                      <span style={{
                        position: 'absolute', top: '20px',
                        fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: topicColor,
                      }}>
                        {t(`topic.${q.topic}`)} • {q.topic === 'history' ? (language === 'ru' ? '1940-е' : '1940s') : ''}
                      </span>
                      <p style={{ fontSize: '22px', fontWeight: 500, color: 'hsl(var(--foreground))', lineHeight: 1.4 }}>
                        {questionText}
                      </p>
                      <span style={{
                        position: 'absolute', bottom: '20px',
                        fontSize: '13px', color: 'hsl(var(--muted-foreground))', opacity: 0.7,
                      }}>
                        {language === 'ru' ? 'Нажмите, чтобы перевернуть' : 'Click to flip'}
                      </span>
                    </div>

                    {/* Back */}
                    <div className="flashcard-face" style={{
                      borderRadius: '20px',
                      background: '#F8F7F5',
                      boxShadow: '0 12px 36px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(255,255,255,0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '40px 36px',
                      textAlign: 'center',
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      backfaceVisibility: sessionCardFlipped ? 'hidden' : 'visible',
                      transform: sessionCardFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                      transition: 'transform 0.6s cubic-bezier(0.4,0.2,0.2,1)',
                    }}>
                      <span style={{
                        position: 'absolute', top: '20px',
                        fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: 'hsl(var(--muted-foreground))',
                      }}>
                        {language === 'ru' ? 'Ответ' : 'Answer'}
                      </span>
                      <p style={{ fontSize: '26px', fontWeight: 500, color: 'hsl(var(--foreground))', lineHeight: 1.4 }}>
                        {answerText}
                      </p>
                      {answerEl && answerEl !== answerText && (
                        <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginTop: '10px' }}>
                          ({answerEl})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                    <button
                      onClick={() => handleSessionAnswer(false)}
                      style={{
                        width: '52px', height: '52px', borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.7)',
                        background: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer', fontSize: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'hsl(var(--geography))',
                        transition: 'transform 0.2s, background 0.2s',
                      }}
                      title={language === 'ru' ? 'Неправильно' : 'Wrong'}
                      onMouseEnter={e => (e.currentTarget.style.background = 'white')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
                    >✕</button>
                    <button
                      onClick={() => handleSessionAnswer(null)}
                      style={{
                        width: '52px', height: '52px', borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.7)',
                        background: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer', fontSize: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'hsl(var(--muted-foreground))',
                        transition: 'transform 0.2s, background 0.2s',
                      }}
                      title={language === 'ru' ? 'Пропустить' : 'Skip'}
                      onMouseEnter={e => (e.currentTarget.style.background = 'white')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
                    >↺</button>
                    <button
                      onClick={() => handleSessionAnswer(true)}
                      style={{
                        width: '52px', height: '52px', borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.7)',
                        background: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer', fontSize: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'hsl(var(--laws))',
                        transition: 'transform 0.2s, background 0.2s',
                      }}
                      title={language === 'ru' ? 'Правильно' : 'Correct'}
                      onMouseEnter={e => (e.currentTarget.style.background = 'white')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
                    >✓</button>
                  </div>
                </>
              );
            })() : (
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '14px' }}>
                {language === 'ru' ? 'Загрузка карточки…' : 'Loading card…'}
              </p>
            )}
          </div>

          {/* === SECTION 6: Weekly Performance === */}
          <h2 style={{ fontSize: '22px', fontWeight: 500, color: '#2F3532', marginBottom: '20px' }}>
            {language === 'ru' ? 'Недельная активность' : 'Weekly Performance'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Bar chart panel */}
            <div className="glass-panel md:col-span-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                  {language === 'ru' ? 'Активность' : 'Study Activity'}
                </span>
                <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>
                  {language === 'ru' ? 'Эта неделя' : 'This Week'}
                </span>
              </div>
              <div style={{ height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(weeklyData?.dayCounts ?? Array(7).fill(0)).map((v: number, i: number) => ({
                      day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
                      count: v,
                    }))}
                    margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                    barCategoryGap="30%"
                  >
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(weeklyData?.dayCounts ?? Array(7).fill(0)).map((_: number, index: number) => (
                        <Cell key={index} fill={`hsl(var(--history) / ${(weeklyData?.dayCounts?.[index] ?? 0) > 0 ? '0.7' : '0.12'})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingLeft: '2px', paddingRight: '2px' }}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                  <span key={d} style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', fontWeight: 600, flex: 1, textAlign: 'center' }}>{d}</span>
                ))}
              </div>
            </div>

            {/* Badge panels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '28px' }}>🏆</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '17px', color: 'hsl(var(--foreground))' }}>
                    {language === 'ru' ? 'Топ 5%' : 'Top 5%'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>
                    {language === 'ru' ? 'Среди начинающих' : 'Among beginners'}
                  </div>
                </div>
              </div>
              <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '28px' }}>🔥</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '17px', color: 'hsl(var(--foreground))' }}>
                    {weeklyData?.mastered ?? 0}
                  </div>
                  <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>
                    {language === 'ru' ? 'Освоено карточек' : 'Cards mastered'}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </Layout>
    );
  }

  // Guest Landing Page
  return (
    <Layout>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 relative z-10">

        {/* Hero */}
        <div className="glass-panel text-center max-w-2xl mx-auto mb-12" style={{ padding: '48px 40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '9999px',
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.7)',
            fontSize: '13px', fontWeight: 500, color: '#2F3532',
            marginBottom: '24px',
          }}>
            <span>🇬🇷</span>
            {language === 'ru' ? 'Подготовка к гражданству Греции' : 'Προετοιμασία για ελληνική ιθαγένεια'}
          </div>

          <h1 style={{ fontSize: '40px', fontWeight: 500, letterSpacing: '-0.02em', color: '#2F3532', lineHeight: 1.2, marginBottom: '16px' }}>
            {language === 'ru' ? 'Ваш путь к греческому гражданству' : 'Ο δρόμος σας προς την ελληνική ιθαγένεια'}
          </h1>

          <p style={{ fontSize: '16px', color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: '32px' }}>
            {t('index.hero.subtitle')}
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register">
              <button className="btn-pebble" style={{ padding: '12px 28px', fontSize: '15px' }}>
                {language === 'ru' ? 'Начать бесплатно' : 'Ξεκινήστε δωρεάν'}
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </button>
            </Link>
            <Link to="/login">
              <button style={{
                padding: '12px 28px', fontSize: '15px', fontWeight: 500,
                background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(47,53,50,0.12)',
                borderRadius: '14px', cursor: 'pointer', color: '#2F3532',
                fontFamily: 'inherit',
              }}>
                {language === 'ru' ? 'У меня есть аккаунт' : 'Έχω λογαριασμό'}
              </button>
            </Link>
          </div>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          {features.map((feature, i) => (
            <div key={i} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px' }}>
              <CheckCircle style={{ width: '16px', height: '16px', color: '#7D8A57', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#2F3532' }}>{feature}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { emoji: '📖', value: `${questionsCount || 0}`, label: language === 'ru' ? 'Вопросов' : 'Questions' },
            { emoji: '✨', value: language === 'ru' ? 'Бесплатно' : 'Δωρεάν', label: language === 'ru' ? 'Полный доступ навсегда' : 'Πλήρης πρόσβαση για πάντα' },
            { emoji: '⏰', value: '24/7', label: language === 'ru' ? 'Доступ в любое время' : 'Πρόσβαση ανά πάσα στιγμή' },
          ].map(s => (
            <div key={s.label} className="glass-panel" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{s.emoji}</div>
              <div style={{ fontSize: '32px', fontWeight: 500, letterSpacing: '-0.02em', color: '#2F3532' }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Topics preview */}
        <h2 style={{ fontSize: '22px', fontWeight: 500, color: '#2F3532', marginBottom: '20px' }}>
          {language === 'ru' ? 'Темы для изучения' : 'Study Topics'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {TOPICS.map(topic => (
            <div key={topic.id} className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{topic.emoji}</div>
              <div style={{ fontWeight: 500, fontSize: '14px', color: '#2F3532' }}>{t(`topic.${topic.id}`)}</div>
              <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '3px' }}>{topic.subtitle}</div>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="glass-panel text-center" style={{ padding: '48px 32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 500, color: '#2F3532', marginBottom: '12px' }}>
            {language === 'ru' ? 'Готовы начать подготовку?' : 'Είστε έτοιμοι να ξεκινήσετε;'}
          </h2>
          <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))', marginBottom: '28px', maxWidth: '520px', margin: '0 auto 28px' }}>
            {language === 'ru'
              ? 'Зарегистрируйтесь бесплатно и получите доступ ко всем материалам'
              : 'Εγγραφείτε δωρεάν και αποκτήστε πρόσβαση σε όλο το υλικό'}
          </p>
          <Link to="/register">
            <button className="btn-pebble" style={{ padding: '14px 32px', fontSize: '15px' }}>
              {language === 'ru' ? 'Создать аккаунт' : 'Δημιουργία λογαριασμού'}
              <ArrowRight style={{ width: '16px', height: '16px' }} />
            </button>
          </Link>
        </div>

      </div>
    </Layout>
  );
}
