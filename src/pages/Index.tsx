import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, CheckCircle } from 'lucide-react';

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
      const totalSeconds = sessions.reduce((s, se) => s + (se.duration_seconds || 0), 0);
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const studyTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      // Topic progress = cards seen / total cards in topic (%)
      const topicSeen: Record<string, number> = {};
      progress.forEach((p: any) => {
        const topic = p.questions?.topic;
        if (!topic) return;
        topicSeen[topic] = (topicSeen[topic] || 0) + 1;
      });
      const topicAccuracy = Object.fromEntries(
        Object.keys(topicTotal).map(k => [k, topicTotal[k] > 0 ? Math.round((topicSeen[k] || 0) / topicTotal[k] * 100) : 0])
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

      return { accuracy, studyTime, topicAccuracy, streak, streakCount };
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
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 relative z-10">

          {/* === SECTION 1: 3-column top grid === */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Greeting */}
            <div className="glass-panel flex flex-col justify-center">
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}>
                {language === 'ru' ? 'Добро пожаловать' : 'Καλώς ήρθατε'}
              </span>
              <h1 style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.02em', color: '#2F3532', lineHeight: 1.2 }}>
                {language === 'ru' ? 'Привет, ' : 'Γεια σου, '}
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
                  {language === 'ru' ? 'Серия недели' : 'Εβδομαδιαίο σερί'}
                </span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#2F3532' }}>
                  {studyStats?.streakCount ?? 0} {language === 'ru' ? 'дн.' : 'ημ.'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px' }}>
                {(language === 'ru' ? WEEK_DAYS_RU : WEEK_DAYS_EL).map((day, i) => {
                  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
                  const streakIdx = 6 - ((todayIdx - i + 7) % 7);
                  const isActive = studyStats?.streak[streakIdx];
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div
                        className={`pebble${isActive ? (i === todayIdx ? ' pebble-current' : ' pebble-active') : ''}`}
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
                  {language === 'ru' ? 'Тема дня' : 'Θέμα της ημέρας'}
                </span>
                <h3 style={{ fontWeight: 500, fontSize: '18px', color: '#2F3532', lineHeight: 1.3 }}>
                  {language === 'ru' ? 'История Греции' : 'Πόλεμος της Ανεξαρτησίας'}
                </h3>
                <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '6px' }}>
                  {language === 'ru' ? 'Изучайте ключевые события' : 'Μελετήστε σημαντικά ιστορικά γεγονότα'}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px' }}>
                <span style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>
                  {questionsCount ? `${questionsCount} ${language === 'ru' ? 'карточек' : 'κάρτες'}` : '—'}
                </span>
                <Link to="/learn/history/flashcards">
                  <button className="btn-pebble" style={{ padding: '8px 14px', fontSize: '13px' }}>
                    {language === 'ru' ? 'Повторить' : 'Επανάληψη'}
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* === SECTION 2: Stats row === */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {[
              { label: language === 'ru' ? 'Время учёбы' : 'Χρόνος μελέτης', value: studyStats?.studyTime ?? '0m' },
              { label: language === 'ru' ? 'Точность' : 'Ακρίβεια', value: `${studyStats?.accuracy ?? 0}%` },
            ].map(s => (
              <div key={s.label} className="glass-panel">
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                  {s.label}
                </span>
                <div className="idx-dash-stat-value" style={{ fontSize: '36px', fontWeight: 500, letterSpacing: '-0.02em', color: '#2F3532', marginTop: '4px' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* === SECTION 3: Study Topics === */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 500, color: '#2F3532' }}>
              {language === 'ru' ? 'Темы для изучения' : 'Θέματα μελέτης'}
            </h2>
            <Link to="/learn" style={{ fontSize: '13px', color: '#2F3532', opacity: 0.6, textDecoration: 'none', fontWeight: 500 }}>
              {language === 'ru' ? 'Все темы' : 'Προβολή όλων'}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {TOPICS.map(topic => {
              const acc = studyStats?.topicAccuracy[topic.id] ?? 0;
              return (
                <Link to={`/learn/${topic.id}/flashcards`} key={topic.id} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel idx-topic-card" style={{ height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', padding: '20px' }}>
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
                      <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>{language === 'ru' ? topic.subtitle_ru : topic.subtitle_el}</div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px', color: 'hsl(var(--muted-foreground))' }}>
                        <span>{language === 'ru' ? 'Прогресс' : 'Πρόοδος'}</span>
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
            {language === 'ru' ? 'Режимы обучения' : 'Τρόποι μάθησης'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { emoji: '📚', id: 'flashcards', href: '/learn', desc: language === 'ru' ? 'Флэш-карточки с переворотом' : 'Γυρίστε κάρτες για μάθηση' },
              { emoji: '✏️', id: 'quiz',       href: '/learn', desc: language === 'ru' ? 'Тест с 4 вариантами' : 'Τεστ πολλαπλής επιλογής' },
              { emoji: '🎓', id: 'exam',       href: '/learn', desc: language === 'ru' ? 'Симуляция экзамена' : 'Προσομοιώστε την εξέταση' },
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

        </div>
        <style>{`
          @media (max-width: 430px) {
            .idx-dash-stat-value { font-size: 26px !important; }
            .idx-topic-card { height: auto !important; min-height: 150px !important; }
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
