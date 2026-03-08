import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { MobileDashboard } from '@/components/layout/MobileDashboard';

const TOPICS = [
  { id: 'history',   emoji: '🏛️', subtitle_ru: 'Древняя и современная', subtitle_el: 'Αρχαία και σύγχρονη' },
  { id: 'culture',   emoji: '🎭', subtitle_ru: 'Искусство и обычаи', subtitle_el: 'Τέχνες και έθιμα' },
  { id: 'laws',      emoji: '⚖️', subtitle_ru: 'Государство и право', subtitle_el: 'Κράτος και δίκαιο' },
  { id: 'geography', emoji: '🗺️', subtitle_ru: 'Регионы и города', subtitle_el: 'Περιοχές και πόλεις' },
];

const WEEK_DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEK_DAYS_EL = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'];


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
      const [progressRes, sessionsRes, topicCountsRes] = await Promise.all([
        supabase.from('user_progress').select('correct_count, incorrect_count, is_known, questions(topic)').eq('user_id', user!.id),
        supabase.from('study_sessions').select('duration_seconds, started_at').eq('user_id', user!.id),
        supabase.from('questions').select('topic'),
      ]);
      const progress = progressRes.data || [];
      const sessions = sessionsRes.data || [];

      // Count total questions per topic
      const topicTotal: Record<string, number> = {};
      (topicCountsRes.data || []).forEach((q: any) => {
        topicTotal[q.topic] = (topicTotal[q.topic] || 0) + 1;
      });

      const totalCorrect = progress.reduce((s, p) => s + (p.correct_count || 0), 0);
      const totalAnswers = progress.reduce((s, p) => s + (p.correct_count || 0) + (p.incorrect_count || 0), 0);
      const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
      const totalSeconds = sessions
        .filter((se: any) => (se.duration_seconds || 0) <= 1800)
        .reduce((s: number, se: any) => s + (se.duration_seconds || 0), 0);
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const studyTotalMinutes = hours * 60 + mins;

      // Topic progress = mastered (is_known) / total questions in topic
      const topicMastered: Record<string, number> = {};
      progress.forEach((p: any) => {
        const topic = p.questions?.topic;
        if (!topic || !p.is_known) return;
        topicMastered[topic] = (topicMastered[topic] || 0) + 1;
      });
      const topicMastery = Object.fromEntries(
        Object.keys(topicTotal).map(k => [k, topicTotal[k] > 0 ? Math.round((topicMastered[k] || 0) / topicTotal[k] * 100) : 0])
      );

      const now = new Date();
      const toLocalDateKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - 6 + i);
        return toLocalDateKey(d);
      });
      const sessionDays = new Set(sessions.map((s: any) => toLocalDateKey(new Date(s.started_at))));
      const streak = weekDays.map(day => sessionDays.has(day));
      const streakCount = streak.filter(Boolean).length;

      return { accuracy, studyTotalMinutes, topicMastery, streak, streakCount };
    },
    enabled: !!user,
  });

  const features = language === 'ru'
    ? ['Более 300 вопросов', 'Отслеживание прогресса', '3 режима изучения', 'Симуляция экзамена']
    : ['Πάνω από 300 ερωτήσεις', 'Παρακολούθηση προόδου', '3 τρόποι μάθησης', 'Προσομοίωση εξέτασης'];

  // Authenticated Dashboard
  if (user) {
    return (
      <Layout>
        {/* ── MOBILE: GLP-1 style dashboard ── */}
        <MobileDashboard studyStats={studyStats} questionsCount={questionsCount ?? 0} />

        {/* ── DESKTOP: original dashboard (hidden on mobile via CSS) ── */}
        <div className="glp-mobile-hidden max-w-[1200px] xl:max-w-[1600px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-20 py-6 xl:py-10 2xl:py-14 relative z-10">

          {/* === SECTION 1: Greeting + Streak (stacked on mobile) === */}
          <div className="idx-top-grid grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6 2xl:gap-8 mb-4 xl:mb-6 2xl:mb-8">
            {/* Greeting */}
            <div className="glass-panel flex flex-col justify-center" style={{ padding: 'clamp(20px, 2vw, 40px)' }}>
              <span style={{ fontSize: 'clamp(11px, 0.7vw, 14px)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '6px' }}>
                {language === 'ru' ? 'Добро пожаловать' : 'Καλώς ήρθατε'}
              </span>
              <h1 className="idx-greeting-title" style={{ fontSize: 'clamp(24px, 1.8vw, 36px)', fontWeight: 500, letterSpacing: '-0.02em', color: '#2F3532', lineHeight: 1.2 }}>
                {language === 'ru' ? 'Привет, ' : 'Γεια σου, '}
                {user.email?.split('@')[0] || (language === 'ru' ? 'друг' : 'φίλε')}!
              </h1>
              <p style={{ fontSize: 'clamp(13px, 0.85vw, 17px)', color: 'hsl(var(--muted-foreground))', marginTop: '6px' }}>
                {language === 'ru' ? 'Продолжай готовиться к гражданству' : 'Συνέχισε να προετοιμάζεσαι για την ιθαγένεια'}
              </p>
              <Link to="/learn" style={{ marginTop: '16px', display: 'inline-flex' }}>
                <button className="btn-pebble">
                  {language === 'ru' ? 'Учиться' : 'Μελέτη'}
                  <ArrowRight style={{ width: '14px', height: '14px' }} />
                </button>
              </Link>
            </div>

            {/* Weekly Streak */}
            <div className="glass-panel flex flex-col gap-2" style={{ padding: 'clamp(20px, 2vw, 40px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 'clamp(11px, 0.7vw, 14px)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                  {language === 'ru' ? 'Серия недели' : 'Εβδομαδιαίο σερί'}
                </span>
                <span style={{ fontWeight: 700, fontSize: 'clamp(17px, 1.2vw, 24px)', color: '#2F3532' }}>
                  {studyStats?.streakCount ?? 0} {language === 'ru' ? 'дн.' : 'ημ.'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
                {(language === 'ru' ? WEEK_DAYS_RU : WEEK_DAYS_EL).map((day, i) => {
                  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
                  const streakIdx = 6 - ((todayIdx - i + 7) % 7);
                  const isActive = studyStats?.streak[streakIdx];
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div
                        className={`pebble${isActive ? (i === todayIdx ? ' pebble-current' : ' pebble-active') : ''}`}
                        style={{ width: 'clamp(28px, 2vw, 42px)', height: 'clamp(28px, 2vw, 42px)' }}
                      />
                      <span style={{ fontSize: 'clamp(10px, 0.65vw, 13px)', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Focus of Day */}
            <div className="glass-panel flex flex-col justify-between" style={{ padding: 'clamp(20px, 2vw, 40px)' }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: 'clamp(11px, 0.7vw, 14px)',
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.6)',
                  color: '#5B8DB8',
                  marginBottom: '8px',
                }}>
                  {language === 'ru' ? 'Тема дня' : 'Θέμα της ημέρας'}
                </span>
                <h3 style={{ fontWeight: 500, fontSize: 'clamp(16px, 1.1vw, 22px)', color: '#2F3532', lineHeight: 1.3 }}>
                  {language === 'ru' ? 'История Греции' : 'Ιστορία της Ελλάδας'}
                </h3>
                <p style={{ fontSize: 'clamp(13px, 0.85vw, 17px)', color: 'hsl(var(--muted-foreground))', marginTop: '5px' }}>
                  {language === 'ru' ? 'Изучайте ключевые события' : 'Μελετήστε σημαντικά ιστορικά γεγονότα'}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
                <span style={{ fontSize: 'clamp(13px, 0.85vw, 17px)', color: 'hsl(var(--muted-foreground))' }}>
                  {questionsCount ? `${questionsCount} ${language === 'ru' ? 'карточек' : 'κάρτες'}` : '—'}
                </span>
                <Link to="/learn/history/flashcards">
                  <button className="btn-pebble" style={{ padding: 'clamp(7px, 0.5vw, 12px) clamp(12px, 1vw, 20px)', fontSize: 'clamp(12px, 0.8vw, 15px)' }}>
                    {language === 'ru' ? 'Повторить' : 'Επανάληψη'}
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* === SECTION 2: Stats row === */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: language === 'ru' ? 'Время учёбы' : 'Χρόνος μελέτης', value: (() => { const m = studyStats?.studyTotalMinutes ?? 0; const h = Math.floor(m / 60); const r = m % 60; const hL = language === 'ru' ? 'ч' : 'ω'; const mL = language === 'ru' ? 'м' : 'λ'; if (h > 0 && r > 0) return `${h}${hL} ${r}${mL}`; if (h > 0) return `${h}${hL}`; return `${m}${mL}`; })() },
              { label: language === 'ru' ? 'Точность' : 'Ακρίβεια', value: `${studyStats?.accuracy ?? 0}%` },
            ].map(s => (
              <div key={s.label} className="glass-panel" style={{ padding: '18px 20px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                  {s.label}
                </span>
                <div className="idx-dash-stat-value" style={{ fontSize: '32px', fontWeight: 500, letterSpacing: '-0.02em', color: '#2F3532', marginTop: '4px' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* === SECTION 3: Study Topics === */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <h2 className="idx-section-title" style={{ fontSize: '20px', fontWeight: 500, color: '#2F3532' }}>
              {language === 'ru' ? 'Темы для изучения' : 'Θέματα μελέτης'}
            </h2>
            <Link to="/learn" style={{ fontSize: '13px', color: '#2F3532', opacity: 0.6, textDecoration: 'none', fontWeight: 500 }}>
              {language === 'ru' ? 'Все темы' : 'Προβολή όλων'}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {TOPICS.map(topic => {
              const acc = studyStats?.topicMastery[topic.id] ?? 0;
              return (
                <Link to={`/learn/${topic.id}/flashcards`} key={topic.id} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel idx-topic-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', padding: '16px' }}>
                    <div>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', marginBottom: '8px',
                      }}>
                        {topic.emoji}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#2F3532' }}>{t(`topic.${topic.id}`)}</div>
                      <div className="idx-topic-sub" style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginTop: '2px', lineHeight: 1.3 }}>{language === 'ru' ? topic.subtitle_ru : topic.subtitle_el}</div>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px', color: 'hsl(var(--muted-foreground))' }}>
                        <span>{language === 'ru' ? 'Прогресс' : 'Πρόοδος'}</span>
                        <span>{acc}%</span>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(0,0,0,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div className={`progress-fill-${topic.id}`} style={{ height: '100%', width: `${acc}%`, borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* === SECTION 4: Learning Modes === */}
          <h2 className="idx-section-title" style={{ fontSize: '20px', fontWeight: 500, color: '#2F3532', marginBottom: '16px' }}>
            {language === 'ru' ? 'Режимы обучения' : 'Τρόποι μάθησης'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {[
              { emoji: '📚', id: 'flashcards', href: '/learn', desc: language === 'ru' ? 'Флэш-карточки с переворотом' : 'Γυρίστε κάρτες για μάθηση' },
              { emoji: '✏️', id: 'quiz',       href: '/learn', desc: language === 'ru' ? 'Тест с 4 вариантами' : 'Τεστ πολλαπλής επιλογής' },
              { emoji: '🎓', id: 'exam',       href: '/learn/exam', desc: language === 'ru' ? 'Симуляция экзамена' : 'Προσομοιώστε την εξέταση' },
            ].map(mode => (
              <Link to={mode.href} key={mode.id} style={{ textDecoration: 'none' }}>
                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', padding: '16px 18px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    border: '1.5px solid rgba(47,53,50,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', flexShrink: 0,
                  }}>
                    {mode.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '14px', color: '#2F3532' }}>{t(`mode.${mode.id}`)}</div>
                    <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>{mode.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
        <style>{`
          @media (max-width: 430px) {
            .idx-dash-stat-value { font-size: 24px !important; }
            .idx-section-title { font-size: 18px !important; }
            .idx-greeting-title { font-size: 22px !important; }
            .idx-topic-card { min-height: 130px !important; }
            .idx-topic-sub { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          }
        `}</style>
      </Layout>
    );
  }

  // Guest Landing Page
  return (
    <Layout>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 relative z-10">

        {/* Hero */}
        <div className="glass-panel text-center max-w-2xl mx-auto mb-12 idx-hero" style={{ padding: '48px 40px' }}>
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

          <h1 className="idx-hero-title" style={{ fontSize: '40px', fontWeight: 500, letterSpacing: '-0.02em', color: '#2F3532', lineHeight: 1.2, marginBottom: '16px' }}>
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
            { emoji: '📖', value: `${questionsCount || 0}`, label: language === 'ru' ? 'Вопросов' : 'Ερωτήσεις' },
            { emoji: '✨', value: language === 'ru' ? 'Бесплатно' : 'Δωρεάν', label: language === 'ru' ? 'Полный доступ навсегда' : 'Πλήρης πρόσβαση για πάντα' },
            { emoji: '⏰', value: '24/7', label: language === 'ru' ? 'Доступ в любое время' : 'Πρόσβαση ανά πάσα στιγμή' },
          ].map(s => (
            <div key={s.label} className="glass-panel idx-stats-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div className="idx-stats-emoji" style={{ fontSize: '32px', marginBottom: '8px' }}>{s.emoji}</div>
              <div className="idx-stats-value" style={{ fontSize: '32px', fontWeight: 500, letterSpacing: '-0.02em', color: '#2F3532' }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Topics preview */}
        <h2 style={{ fontSize: '22px', fontWeight: 500, color: '#2F3532', marginBottom: '20px' }}>
          {language === 'ru' ? 'Темы для изучения' : 'Θέματα μελέτης'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {TOPICS.map(topic => (
            <div key={topic.id} className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{topic.emoji}</div>
              <div style={{ fontWeight: 500, fontSize: '14px', color: '#2F3532' }}>{t(`topic.${topic.id}`)}</div>
              <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '3px' }}>{language === 'ru' ? topic.subtitle_ru : topic.subtitle_el}</div>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="glass-panel text-center idx-cta" style={{ padding: '48px 32px' }}>
          <h2 className="idx-cta-title" style={{ fontSize: '28px', fontWeight: 500, color: '#2F3532', marginBottom: '12px' }}>
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
      <style>{`
        @media (max-width: 430px) {
          .idx-hero { padding: 28px 18px !important; }
          .idx-hero-title { font-size: 26px !important; }
          .idx-stats-card { padding: 20px 14px !important; }
          .idx-stats-emoji { font-size: 24px !important; margin-bottom: 6px !important; }
          .idx-stats-value { font-size: 24px !important; }
          .idx-cta { padding: 28px 18px !important; }
          .idx-cta-title { font-size: 22px !important; }
        }
      `}</style>
    </Layout>
  );
}
