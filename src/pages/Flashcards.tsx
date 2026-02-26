import { useState, useEffect } from 'react';
import { localizeQuestions } from '@/lib/questionLocale';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, ArrowLeft, ArrowRight, RotateCcw,
  Home, Shuffle, Volume2, VolumeX, Check, X,
} from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { cn } from '@/lib/utils';
import { upsertProgress } from '@/lib/progressHelper';

type Question = {
  id: string;
  question: string;
  correct_answer: string;
  explanation: string | null;
};

type TopicType = 'history' | 'culture' | 'laws' | 'geography';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ── Reusable icon button ────────────────────────────────────────────────────
const IconBtn = ({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 44, height: 44, borderRadius: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', color: '#2F3532',
      border: '1px solid transparent', cursor: 'pointer',
      transition: 'all 0.2s', fontFamily: 'inherit',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.6)';
      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.05)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
    }}
  >
    {children}
  </button>
);

// ── Ghost pill nav button ───────────────────────────────────────────────────
const GhostBtn = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 28px', borderRadius: '9999px',
      background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.6)',
      color: '#2F3532', fontWeight: 500, fontSize: 15,
      cursor: disabled ? 'default' : 'pointer', minWidth: 140, justifyContent: 'center',
      transition: 'all 0.2s', fontFamily: 'inherit',
      opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto',
    }}
    onMouseEnter={e => {
      if (!disabled) {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.85)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
      }
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.5)';
      (e.currentTarget as HTMLButtonElement).style.transform = '';
      (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
    }}
  >
    {children}
  </button>
);

// ── Colored answer button ───────────────────────────────────────────────────
const AnswerBtn = ({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '16px 48px', borderRadius: '9999px',
      background: color, color: 'white', border: 'none',
      fontWeight: 600, fontSize: 16, cursor: 'pointer',
      minWidth: 160, justifyContent: 'center',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      transition: 'all 0.2s', fontFamily: 'inherit',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
      (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.transform = '';
      (e.currentTarget as HTMLButtonElement).style.filter = '';
    }}
    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
  >
    {children}
  </button>
);

export default function Flashcards() {
  const { topic } = useParams<{ topic: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [unknownQuestions, setUnknownQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [restartCount, setRestartCount] = useState(0);
  const [ratedIndices, setRatedIndices] = useState<Set<number>>(new Set());
  const { speak, stop, isSpeaking, isSupported } = useSpeech();
  useStudyTimer('flashcards');

  const validTopic = topic as TopicType;
  const validTopics = ['history', 'culture', 'laws', 'geography'];
  const isValidTopic = topic && validTopics.includes(topic);

  useEffect(() => {
    if (!isValidTopic || !user) return;
    const fetchQuestions = async () => {
      setIsLoading(true);
      const [questionsResult, progressResult] = await Promise.all([
        supabase.from('questions').select('*').eq('topic', validTopic),
        supabase
          .from('user_progress')
          .select('question_id, correct_count, incorrect_count, next_review_at')
          .eq('user_id', user.id),
      ]);
      if (questionsResult.error) { setIsLoading(false); return; }
      const data = questionsResult.data || [];
      if (data.length === 0) { setQuestions([]); setIsLoading(false); return; }
      const localized = localizeQuestions(data, language);
      const progressMap = Object.fromEntries((progressResult.data || []).map(p => [p.question_id, p]));
      const now = Date.now();
      const scored = localized.map(q => {
        const p = progressMap[q.id];
        if (!p) return { q, group: 0, ts: 0 };
        const reviewTs = p.next_review_at ? new Date(p.next_review_at).getTime() : 0;
        const isDue = reviewTs <= now;
        if (isDue) return { q, group: 1, ts: reviewTs };
        if (p.incorrect_count > p.correct_count) return { q, group: 2, ts: reviewTs };
        return { q, group: 3, ts: reviewTs };
      });
      scored.sort((a, b) => a.group !== b.group ? a.group - b.group : a.ts - b.ts);
      setQuestions(scored.map(s => s.q));
      setIsLoading(false);
    };
    fetchQuestions();
  }, [validTopic, user, isValidTopic, language, restartCount]);

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isValidTopic) return <Navigate to="/learn" replace />;

  const handleFlip = () => setIsFlipped(f => !f);

  const handleKnow = () => {
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(prev => new Set([...prev, currentIndex]));
      setKnownCount(prev => prev + 1);
      if (user) upsertProgress(user.id, questions[currentIndex].id, true);
    }
    goToNext();
  };

  const handleDontKnow = () => {
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(prev => new Set([...prev, currentIndex]));
      setUnknownCount(prev => prev + 1);
      setUnknownQuestions(prev => [...prev, questions[currentIndex]]);
      if (user) upsertProgress(user.id, questions[currentIndex].id, false);
    }
    goToNext();
  };

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setIsFinished(true);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    setQuestions(shuffleArray(questions));
    setCurrentIndex(0); setIsFlipped(false);
    setKnownCount(0); setUnknownCount(0);
    setUnknownQuestions([]); setIsFinished(false);
    setRatedIndices(new Set());
  };

  const handleRestart = () => {
    setCurrentIndex(0); setIsFlipped(false);
    setKnownCount(0); setUnknownCount(0);
    setUnknownQuestions([]); setIsFinished(false);
    setRatedIndices(new Set());
    setRestartCount(c => c + 1);
  };

  const handleRestartUnknown = () => {
    if (unknownQuestions.length === 0) return;
    setQuestions(unknownQuestions);
    setCurrentIndex(0); setIsFlipped(false);
    setKnownCount(0); setUnknownCount(0);
    setUnknownQuestions([]); setIsFinished(false);
    setRatedIndices(new Set());
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (isFinished || questions.length === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'Space': e.preventDefault(); handleFlip(); break;
        case 'ArrowRight': if (isFlipped) handleKnow(); break;
        case 'ArrowLeft': if (isFlipped) handleDontKnow(); break;
        case 'ArrowUp': goToPrev(); break;
        case 'ArrowDown': goToNext(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFinished, questions.length, isFlipped, currentIndex]);

  const topicTitle = t(`topic.${validTopic}`);

  // ── No questions ──────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <Layout>
        <div className="relative z-10" style={{ maxWidth: 640, margin: '60px auto', padding: '0 24px' }}>
          <div className="glass-panel text-center">
            <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 12 }}>{t('quiz.noQuestions')}</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: 24 }}>{t('quiz.noQuestions.desc')}</p>
            <Link to="/learn">
              <button className="btn-pebble">
                <ArrowLeft style={{ width: 16, height: 16 }} />
                {t('quiz.backToTopics')}
              </button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Finished screen ───────────────────────────────────────────────────────
  if (isFinished) {
    const percentage = questions.length > 0 ? Math.round((knownCount / questions.length) * 100) : 0;
    const isHigh = percentage >= 70;
    const isMed = percentage >= 50;
    return (
      <Layout>
        <div className="relative z-10" style={{ maxWidth: 600, margin: '40px auto', padding: '0 24px' }}>
          <div className="glass-panel" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 500, marginBottom: 24, color: '#2F3532' }}>
              {t('flashcards.finished')}
            </h2>
            {/* Score circle */}
            <div style={{
              width: 120, height: 120, borderRadius: '50%', margin: '0 auto 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 600,
              background: isHigh ? 'rgba(125,138,87,0.15)' : isMed ? 'rgba(236,200,92,0.2)' : 'rgba(224,108,108,0.15)',
              color: isHigh ? '#58633C' : isMed ? '#8F721D' : '#A83838',
            }}>
              {percentage}%
            </div>
            {/* Known/Unknown counts */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
              <div style={{ textAlign: 'center', background: 'rgba(125,138,87,0.1)', borderRadius: 16, padding: '16px 24px' }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: '#7D8A57' }}>{knownCount}</div>
                <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>{t('flashcards.known')}</div>
              </div>
              <div style={{ textAlign: 'center', background: 'rgba(224,108,108,0.1)', borderRadius: 16, padding: '16px 24px' }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: '#E06C6C' }}>{unknownCount}</div>
                <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>{t('flashcards.unknown')}</div>
              </div>
            </div>
            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {unknownQuestions.length > 0 && (
                <GhostBtn onClick={handleRestartUnknown}>
                  <RotateCcw style={{ width: 15, height: 15 }} />
                  {language === 'ru' ? `Незнакомые (${unknownQuestions.length})` : `Άγνωστα (${unknownQuestions.length})`}
                </GhostBtn>
              )}
              <GhostBtn onClick={handleShuffle}>
                <Shuffle style={{ width: 15, height: 15 }} />
                {t('flashcards.shuffle')}
              </GhostBtn>
              <GhostBtn onClick={handleRestart}>
                <RotateCcw style={{ width: 15, height: 15 }} />
                {t('quiz.tryAgain')}
              </GhostBtn>
              <Link to="/learn" style={{ textDecoration: 'none' }}>
                <button className="btn-pebble">
                  <Home style={{ width: 15, height: 15 }} />
                  {t('quiz.toTopics')}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Main flashcard view ───────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  return (
    <Layout>
      <div className="relative z-10" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 140px)' }}>

        {/* Back link */}
        <Link
          to="/learn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', fontSize: 14, fontWeight: 500, marginBottom: 24, transition: 'color 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#2F3532'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'hsl(var(--muted-foreground))'; }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          {language === 'ru' ? 'Назад к темам' : 'Πίσω στα θέματα'}
        </Link>

        {/* Title row + shuffle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', color: '#2F3532', margin: 0 }}>
            {topicTitle} — {t('mode.flashcards')}
          </h1>
          <IconBtn onClick={handleShuffle} title={language === 'ru' ? 'Перемешать' : 'Shuffle'}>
            <Shuffle style={{ width: 18, height: 18 }} />
          </IconBtn>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2F3532', flexShrink: 0 }} />
          <div style={{ flex: 1, height: 6, background: 'rgba(47,53,50,0.1)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#2F3532', width: `${progress}%`, borderRadius: 10, transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#2F3532', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {currentIndex + 1} / {questions.length}
          </span>
        </div>

        {/* Card scene */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="flashcard-container"
            onClick={handleFlip}
            style={{ width: '100%', maxWidth: 640, height: 'clamp(320px, 42vh, 420px)', margin: '32px auto', cursor: 'pointer' }}
          >
            <div className={cn('flashcard-inner', isFlipped && 'flipped')}>

              {/* Front face */}
              <div
                className="flashcard-face"
                style={{ background: '#FFFFFF', borderRadius: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center', position: 'relative' }}
                onMouseEnter={e => {
                  if (!isFlipped) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 48px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 40px rgba(0,0,0,0.10)';
                }}
              >
                {/* Badge */}
                <div style={{ position: 'absolute', top: 24, left: 24, padding: '6px 16px', background: 'rgba(0,0,0,0.06)', borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(47,53,50,0.6)' }}>
                  {language === 'ru' ? 'Вопрос' : 'Ερώτηση'}
                </div>
                {/* Speaker */}
                {isSupported && (
                  <button
                    onClick={e => { e.stopPropagation(); isSpeaking ? stop() : speak(currentQuestion.question, `${currentQuestion.id}_q_${language}`); }}
                    style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSpeaking ? '#7D8A57' : 'rgba(47,53,50,0.4)', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#2F3532'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = isSpeaking ? '#7D8A57' : 'rgba(47,53,50,0.4)'; }}
                  >
                    {isSpeaking ? <VolumeX style={{ width: 20, height: 20 }} /> : <Volume2 style={{ width: 20, height: 20 }} />}
                  </button>
                )}
                {/* Question text */}
                <p style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 600, lineHeight: 1.3, color: '#2F3532', margin: 0 }}>
                  {currentQuestion.question}
                </p>
                {/* Flip hint */}
                <div style={{ position: 'absolute', bottom: 24, fontSize: 13, color: 'rgba(47,53,50,0.28)', fontWeight: 500 }}>
                  {language === 'ru' ? 'Нажмите, чтобы перевернуть' : 'Κάντε κλικ για αναστροφή'}
                </div>
              </div>

              {/* Back face */}
              <div
                className="flashcard-face flashcard-back"
                style={{ background: '#F9F8F6', border: '1px solid rgba(0,0,0,0.03)', borderRadius: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center', position: 'relative' }}
              >
                {/* Badge */}
                <div style={{ position: 'absolute', top: 24, left: 24, padding: '6px 16px', background: 'rgba(125,138,87,0.15)', borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7D8A57' }}>
                  {language === 'ru' ? 'Ответ' : 'Απάντηση'}
                </div>
                {/* Speaker */}
                {isSupported && (
                  <button
                    onClick={e => { e.stopPropagation(); isSpeaking ? stop() : speak(currentQuestion.correct_answer, `${currentQuestion.id}_a_${language}`); }}
                    style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSpeaking ? '#7D8A57' : 'rgba(47,53,50,0.4)', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#2F3532'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = isSpeaking ? '#7D8A57' : 'rgba(47,53,50,0.4)'; }}
                  >
                    {isSpeaking ? <VolumeX style={{ width: 20, height: 20 }} /> : <Volume2 style={{ width: 20, height: 20 }} />}
                  </button>
                )}
                {/* Answer text */}
                <p style={{ fontSize: 'clamp(18px, 2.8vw, 28px)', fontWeight: 500, lineHeight: 1.4, color: '#2F3532', margin: 0 }}>
                  {currentQuestion.correct_answer}
                </p>
                {/* Explanation */}
                {currentQuestion.explanation && (
                  <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(47,53,50,0.45)', maxWidth: 420, lineHeight: 1.5 }}>
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
          {/* Nav buttons — visible when not flipped */}
          {!isFlipped && (
            <div style={{ display: 'flex', gap: 24 }}>
              <GhostBtn onClick={goToPrev} disabled={currentIndex === 0}>
                <ArrowLeft style={{ width: 16, height: 16 }} />
                {language === 'ru' ? 'Назад' : 'Πίσω'}
              </GhostBtn>
              <GhostBtn onClick={goToNext} disabled={currentIndex === questions.length - 1}>
                {language === 'ru' ? 'Далее' : 'Επόμενο'}
                <ArrowRight style={{ width: 16, height: 16 }} />
              </GhostBtn>
            </div>
          )}
          {/* Answer buttons — visible when flipped */}
          {isFlipped && (
            <div style={{ display: 'flex', gap: 24 }}>
              <AnswerBtn onClick={handleDontKnow} color="#E06C6C">
                <X style={{ width: 18, height: 18 }} />
                {t('flashcards.dontKnow')}
              </AnswerBtn>
              <AnswerBtn onClick={handleKnow} color="#7D8A57">
                <Check style={{ width: 18, height: 18 }} />
                {t('flashcards.know')}
              </AnswerBtn>
            </div>
          )}
        </div>

        {/* Stats pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(125,138,87,0.12)', borderRadius: 9999, padding: '6px 14px' }}>
            <Check style={{ width: 14, height: 14, color: '#7D8A57' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#7D8A57' }}>{knownCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(224,108,108,0.12)', borderRadius: 9999, padding: '6px 14px' }}>
            <X style={{ width: 14, height: 14, color: '#E06C6C' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#E06C6C' }}>{unknownCount}</span>
          </div>
        </div>

      </div>
    </Layout>
  );
}
