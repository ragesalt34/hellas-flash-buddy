import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface MobileDashboardProps {
  studyStats?: {
    accuracy: number;
    studyTotalMinutes: number;
    topicMastery: Record<string, number>;
    streak: boolean[];
    streakCount: number;
  };
  questionsCount?: number;
}

const WEEK_DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEK_DAYS_EL = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'];

export function MobileDashboard({ studyStats, questionsCount }: MobileDashboardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({ 0: true });

  const isRu = language === 'ru';

  const toggleCheck = (i: number) =>
    setCheckedItems(prev => ({ ...prev, [i]: !prev[i] }));

  const checkItems = isRu
    ? ['Занимался сегодня', 'Прочитал материал', 'Прошёл тест']
    : ['Μελέτησα σήμερα', 'Διάβασα υλικό', 'Έλεγξα τις γνώσεις'];

  const studyMinutes = studyStats?.studyTotalMinutes ?? 0;
  const studyHours = Math.floor(studyMinutes / 60);
  const studyMins = studyMinutes % 60;
  const timeLabel = isRu
    ? studyHours > 0 ? `${studyHours}ч ${studyMins}м` : `${studyMinutes}м`
    : studyHours > 0 ? `${studyHours}ω ${studyMins}λ` : `${studyMinutes}λ`;

  const totalMastered = Object.values(studyStats?.topicMastery ?? {}).reduce((a, b) => a + b, 0);
  const avgMastery = Object.keys(studyStats?.topicMastery ?? {}).length > 0
    ? Math.round(totalMastered / Object.keys(studyStats.topicMastery).length)
    : 0;

  const firstName = user?.email?.split('@')[0] ?? (isRu ? 'друг' : 'φίλε');

  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const weekDays = isRu ? WEEK_DAYS_RU : WEEK_DAYS_EL;

  return (
    <div className="glp-mobile-root">
      {/* ── HEADER ── */}
      <div className="glp-header">
        <div>
          <p className="glp-text-label">{isRu ? 'Добро пожаловать,' : 'Καλώς ήρθες,'}</p>
          <h1 className="glp-text-hero">{firstName}<br />{isRu ? 'Твой путь' : 'Το ταξίδι σου'}</h1>
        </div>
        <div className="glp-avatar-blob">
          <span style={{ fontSize: '20px', lineHeight: 1 }}>🇬🇷</span>
        </div>
      </div>

      {/* ── MAIN CARD (peach) — Streak / Topic ── */}
      <div className="glp-card glp-card-peach glp-dose-card">
        {/* decorative blob */}
        <svg className="glp-dose-visual" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <path d="M60,10 C85,10 110,30 110,60 C110,90 85,110 60,110 C35,110 10,90 10,60 C10,30 35,10 60,10 Z" className="glp-blob-shape" />
        </svg>

        <div className="glp-dose-info">
          <p className="glp-text-label">{isRu ? 'Серия занятий' : 'Σερί μελέτης'}</p>
          <div className="glp-dose-stat">{studyStats?.streakCount ?? 0}</div>
          <p className="glp-text-sub">{isRu ? 'дней подряд на этой неделе' : 'ημέρες αυτή την εβδομάδα'}</p>
        </div>

        {/* Weekly pebbles */}
        <div className="glp-dose-action">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {weekDays.map((day, i) => {
              const streakIdx = 6 - ((todayIdx - i + 7) % 7);
              const active = studyStats?.streak[streakIdx];
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: active ? 'rgba(26,26,26,0.7)' : 'rgba(255,255,255,0.35)',
                    border: i === todayIdx ? '1.5px solid rgba(26,26,26,0.5)' : 'none',
                    transition: 'background 0.2s',
                  }} />
                  <span style={{ fontSize: '9px', fontWeight: 600, opacity: 0.6, letterSpacing: '0.03em' }}>{day}</span>
                </div>
              );
            })}
          </div>
          <Link to="/learn" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>→</Link>
        </div>
      </div>

      {/* ── 2×2 METRIC GRID ── */}
      <div className="glp-grid-2">
        {/* Accuracy — sage */}
        <div className="glp-card glp-card-sage glp-metric-card">
          <div className="glp-metric-blob" />
          <p className="glp-text-label">{isRu ? 'Точность' : 'Ακρίβεια'}</p>
          <h3 className="glp-metric-value">{studyStats?.accuracy ?? 0}%</h3>
          <p className="glp-text-sub" style={{ fontSize: '12px' }}>{isRu ? 'правильных' : 'σωστές'}</p>
        </div>

        {/* Study Time — periwinkle */}
        <div className="glp-card glp-card-periwinkle glp-metric-card">
          <div className="glp-metric-blob" />
          <p className="glp-text-label">{isRu ? 'Время' : 'Χρόνος'}</p>
          <h3 className="glp-metric-value">{timeLabel || '0м'}</h3>
          <p className="glp-text-sub" style={{ fontSize: '12px' }}>{isRu ? 'изучено' : 'μελέτης'}</p>
        </div>
      </div>

      {/* ── DAILY CHECK-IN (outline card) ── */}
      <div className="glp-card glp-card-outline">
        <p className="glp-section-title">{isRu ? 'Дневной чек-ин' : 'Ημερήσιος έλεγχος'}</p>
        <p className="glp-text-sub" style={{ marginTop: '4px', fontSize: '13px' }}>
          {isRu ? 'Отметь, что сделал сегодня' : 'Σημείωσε τι έκανες σήμερα'}
        </p>
        <div className="glp-symptom-list">
          {checkItems.map((item, i) => (
            <button
              key={i}
              onClick={() => toggleCheck(i)}
              className="glp-symptom-item"
            >
              <div className={`glp-check-circle${checkedItems[i] ? ' glp-checked' : ''}`} />
              <span style={{ fontSize: '14px' }}>{item}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── INSIGHT CARD (sage) — topic of the day ── */}
      <div className="glp-card glp-card-sage">
        <div className="glp-insight-card">
          <div>
            <p className="glp-text-label">{isRu ? 'Тема дня' : 'Θέμα της ημέρας'}</p>
            <h3 className="glp-section-title" style={{ marginTop: '4px' }}>
              {isRu ? 'История Греции' : 'Ιστορία'}
            </h3>
            <p className="glp-text-sub" style={{ fontSize: '13px', marginTop: '4px' }}>
              {isRu ? 'Изучи ключевые события' : 'Μελέτησε βασικά γεγονότα'}
            </p>
            <Link to="/learn/history/flashcards">
              <button className="glp-action-btn" style={{ marginTop: '14px' }}>
                {isRu ? 'Учить' : 'Μελέτη'} →
              </button>
            </Link>
          </div>
          <div className="glp-insight-image">
            <span style={{ fontSize: '52px', lineHeight: 1 }}>🏛️</span>
          </div>
        </div>
      </div>

      {/* ── PROGRESS CARD (periwinkle) ── */}
      <div className="glp-card glp-card-periwinkle" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* decorative blobs row */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {[
            { bg: '#FF9E7D', shape: '40% 60% 55% 45% / 50% 45% 55% 50%' },
            { bg: '#C5DEA7', shape: '55% 45% 40% 60% / 45% 55% 45% 55%' },
            { bg: '#D3DEEA', shape: '45% 55% 60% 40% / 55% 45% 50% 50%' },
          ].map((b, i) => (
            <div key={i} style={{
              width: 28, height: 28,
              background: b.bg,
              borderRadius: b.shape,
              border: '1px solid rgba(26,26,26,0.15)',
            }} />
          ))}
        </div>
        <p className="glp-text-label">{isRu ? 'Общий прогресс' : 'Συνολική πρόοδος'}</p>
        <div className="glp-dose-stat" style={{ fontSize: '44px', margin: '6px 0' }}>
          {avgMastery}%
        </div>
        <p className="glp-text-sub" style={{ fontSize: '13px' }}>
          {isRu ? `Освоено из ${questionsCount ?? 0} вопросов` : `Από ${questionsCount ?? 0} ερωτήσεις`}
        </p>

        {/* progress bar */}
        <div style={{ marginTop: '16px', height: '6px', background: 'rgba(26,26,26,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${avgMastery}%`,
            background: 'rgba(26,26,26,0.5)',
            borderRadius: '999px',
            transition: 'width 0.8s ease',
          }} />
        </div>
      </div>

      {/* ── MODES QUICK ACCESS ── */}
      <div className="glp-card glp-card-outline">
        <p className="glp-section-title" style={{ marginBottom: '12px' }}>
          {isRu ? 'Режимы обучения' : 'Τρόποι μάθησης'}
        </p>
        {[
          { emoji: '📚', to: '/learn', label: isRu ? 'Карточки' : 'Κάρτες', sub: isRu ? 'Флэш-карточки' : 'Flashcards' },
          { emoji: '✏️', to: '/learn', label: isRu ? 'Тест' : 'Τεστ', sub: isRu ? '4 варианта' : 'Πολλαπλής επιλογής' },
          { emoji: '🎓', to: '/learn/exam', label: isRu ? 'Экзамен' : 'Εξέταση', sub: isRu ? 'Симуляция' : 'Προσομοίωση' },
        ].map((m, i) => (
          <Link to={m.to} key={i} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glp-symptom-item" style={{ borderRadius: '0' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '1px solid rgba(26,26,26,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', marginRight: '12px', flexShrink: 0,
              }}>
                {m.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{m.label}</span>
                <span style={{ fontSize: '12px', opacity: 0.6, display: 'block' }}>{m.sub}</span>
              </div>
              <span style={{ opacity: 0.4, fontSize: '14px' }}>→</span>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
