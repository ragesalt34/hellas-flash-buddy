import { useState, useEffect, useCallback, useRef } from 'react';
import { localizeQuestions } from '@/lib/questionLocale';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  ArrowLeft,
  RotateCcw,
  Home,
  Shuffle,
  Volume2,
  VolumeX,
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
  srsCorrect: number;
  srsIncorrect: number;
};

type TopicType = 'history' | 'culture' | 'laws' | 'geography';

const topicAccent: Record<TopicType, string> = {
  history:   '#5B8DB8',
  culture:   '#9B7EC8',
  laws:      '#7D8A57',
  geography: '#D4874A',
};

const topicEmoji: Record<TopicType, string> = {
  history:   '📜',
  culture:   '🎭',
  laws:      '⚖️',
  geography: '🗺️',
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Returns a human-readable label for the next review interval given a grade.
// Mirrors the DB interval logic so the preview is always accurate.
function getIntervalLabel(
  grade: 1 | 2 | 3,
  correct: number,
  incorrect: number,
  language: string,
): string {
  const d = (n: number) => language === 'ru' ? `${n}д` : `${n}μ`;
  if (grade === 1) return language === 'ru' ? '<1м' : '<1λ';
  const c = correct + 1; // after this Good/Easy rating
  if (grade === 2) {
    if (incorrect > c) return d(1);
    if (c <= 1) return d(1);
    if (c <= 2) return d(3);
    if (c <= 4) return d(7);
    return d(14);
  }
  // grade === 3 (Easy) — accelerated
  if (c <= 1) return d(4);
  if (c <= 2) return d(7);
  if (c <= 4) return d(14);
  return d(21);
}

export default function Flashcards() {
  const { topic } = useParams<{ topic: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  const [questions, setQuestions]       = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped]       = useState(false);
  const [againCount, setAgainCount]     = useState(0);
  const [goodCount, setGoodCount]       = useState(0);
  const [easyCount, setEasyCount]       = useState(0);
  const [originalCount, setOriginalCount] = useState(0);
  const [isLoading, setIsLoading]       = useState(true);
  const [isFinished, setIsFinished]     = useState(false);
  const [restartCount, setRestartCount] = useState(0);
  const [ratedIndices, setRatedIndices] = useState<Set<number>>(new Set());

  // Track which question IDs have already been re-queued as "Again" this session
  // (prevents infinite appending if user keeps pressing Again on the same card)
  const againAppendedRef = useRef<Set<string>>(new Set());

  const { speak, stop, isSpeaking, isSupported } = useSpeech();
  useStudyTimer('flashcards');

  const validTopic = topic as TopicType;
  const validTopics = ['history', 'culture', 'laws', 'geography'];
  const isValidTopic = topic && validTopics.includes(topic);

  useEffect(() => {
    if (!isValidTopic || !user) return;

    const fetchQuestions = async () => {
      setIsLoading(true);
      againAppendedRef.current = new Set();

      const [questionsResult, progressResult] = await Promise.all([
        supabase.from('questions').select('*').eq('topic', validTopic),
        supabase
          .from('user_progress')
          .select('question_id, correct_count, incorrect_count, next_review_at')
          .eq('user_id', user.id),
      ]);

      if (questionsResult.error) {
        console.error('Error fetching questions:', questionsResult.error);
        setIsLoading(false);
        return;
      }

      const data = questionsResult.data || [];
      if (data.length === 0) {
        setQuestions([]);
        setOriginalCount(0);
        setIsLoading(false);
        return;
      }

      const localized = localizeQuestions(data, language);
      const progressMap = Object.fromEntries(
        (progressResult.data || []).map(p => [p.question_id, p])
      );

      const now = Date.now();

      const scored = localized.map(q => {
        const p = progressMap[q.id];
        const srsCorrect   = p?.correct_count   ?? 0;
        const srsIncorrect = p?.incorrect_count ?? 0;
        const enriched = { ...q, srsCorrect, srsIncorrect };
        if (!p) return { q: enriched, group: 0, ts: 0 };
        const reviewTs = p.next_review_at ? new Date(p.next_review_at).getTime() : 0;
        const isDue = reviewTs <= now;
        if (isDue)                               return { q: enriched, group: 1, ts: reviewTs };
        if (p.incorrect_count > p.correct_count) return { q: enriched, group: 2, ts: reviewTs };
        return { q: enriched, group: 3, ts: reviewTs };
      });

      scored.sort((a, b) => a.group !== b.group ? a.group - b.group : a.ts - b.ts);
      const sorted = scored.map(s => s.q);
      setQuestions(sorted);
      setOriginalCount(sorted.length);
      setIsLoading(false);
    };

    fetchQuestions();
  }, [validTopic, user, isValidTopic, language, restartCount]);

  const handleFlip = useCallback(() => setIsFlipped(prev => !prev), []);

  const handleGrade = useCallback((grade: 1 | 2 | 3) => {
    if (!isFlipped) return;

    const currentQ = questions[currentIndex];
    if (user) void upsertProgress(user.id, currentQ.id, grade);

    setIsFlipped(false);

    if (grade === 1) {
      setAgainCount(c => c + 1);
      const isAlreadyAppended = againAppendedRef.current.has(currentQ.id);
      if (!isAlreadyAppended) {
        againAppendedRef.current.add(currentQ.id);
        setQuestions(prev => [...prev, currentQ]);
      }
      // After appending: new deck length = questions.length + 1, safe to go next.
      // If already appended (second Again on same card), check if truly last card.
      const newLength = isAlreadyAppended ? questions.length : questions.length + 1;
      if (currentIndex >= newLength - 1) {
        setIsFinished(true);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
      return;
    }

    // grade 2 or 3
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(prev => new Set([...prev, currentIndex]));
    }
    if (grade === 2) setGoodCount(c => c + 1);
    else             setEasyCount(c => c + 1);

    if (currentIndex >= questions.length - 1) {
      setIsFinished(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [isFlipped, currentIndex, questions, ratedIndices, user]);

  const handleShuffle = () => {
    setQuestions(shuffleArray(questions));
    setCurrentIndex(0);
    setIsFlipped(false);
    setAgainCount(0);
    setGoodCount(0);
    setEasyCount(0);
    setIsFinished(false);
    setRatedIndices(new Set());
    againAppendedRef.current = new Set();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setAgainCount(0);
    setGoodCount(0);
    setEasyCount(0);
    setIsFinished(false);
    setRatedIndices(new Set());
    againAppendedRef.current = new Set();
    setRestartCount(c => c + 1);
  };

  // Keyboard: Space = flip, 1/2/3 = grade
  useEffect(() => {
    if (isFinished || isLoading || questions.length === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleFlip();
          break;
        case 'Digit1':
          if (isFlipped) handleGrade(1);
          break;
        case 'Digit2':
          if (isFlipped) handleGrade(2);
          break;
        case 'Digit3':
          if (isFlipped) handleGrade(3);
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFinished, isLoading, isFlipped, handleFlip, handleGrade]);

  if (authLoading) {
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

  // Progress bar: % of original deck completed (capped at 100)
  const progress = originalCount > 0 ? Math.min((currentIndex / originalCount) * 100, 100) : 0;
  const topicTitle = t(`topic.${validTopic}`);
  const accent     = topicAccent[validTopic] || '#5B8DB8';
  const emoji      = topicEmoji[validTopic]  || '📚';

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="glass-panel max-w-2xl mx-auto text-center p-12 rounded-2xl">
            <h2 className="text-2xl font-display font-bold mb-4">{t('quiz.noQuestions')}</h2>
            <p className="text-muted-foreground mb-6">{t('quiz.noQuestions.desc')}</p>
            <Link to="/learn">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('quiz.backToTopics')}
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (isFinished) {
    const finishPct = originalCount > 0
      ? Math.min(Math.round((goodCount + easyCount) / originalCount * 100), 100)
      : 0;
    return (
      <Layout>
        <div className="container py-12">
          <div className="glass-panel max-w-2xl mx-auto rounded-2xl p-10 text-center space-y-6">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: accent }} />

            <h2 className="font-display text-3xl font-bold">{t('flashcards.finished')}</h2>

            <div
              className="w-32 h-32 rounded-full flex items-center justify-center mx-auto text-4xl font-bold"
              style={{
                background: hexToRgba(accent, 0.12),
                color: accent,
                boxShadow: `0 8px 32px ${hexToRgba(accent, 0.2)}`
              }}
            >
              {finishPct}%
            </div>

            <div className="flex justify-center gap-4">
              <div className="text-center rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)' }}>
                <div className="text-2xl font-bold text-destructive">{againCount}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  ↺ {language === 'ru' ? 'Снова' : 'Πάλι'}
                </div>
              </div>
              <div className="text-center rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.08)' }}>
                <div className="text-2xl font-bold text-success">{goodCount}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  👍 {language === 'ru' ? 'Хорошо' : 'Καλό'}
                </div>
              </div>
              <div className="text-center rounded-xl p-4" style={{ background: hexToRgba(accent, 0.08) }}>
                <div className="text-2xl font-bold" style={{ color: accent }}>{easyCount}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  ⚡ {language === 'ru' ? 'Легко' : 'Εύκολο'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-4">
              <Button variant="outline" onClick={handleShuffle}>
                <Shuffle className="h-4 w-4 mr-2" />
                {t('flashcards.shuffle')}
              </Button>
              <Button variant="outline" onClick={handleRestart}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('quiz.tryAgain')}
              </Button>
              <Link to="/learn">
                <Button>
                  <Home className="h-4 w-4 mr-2" />
                  {t('quiz.toTopics')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <Layout>
      <div className="relative container py-4 sm:py-8 px-4">

        {/* Header: topic name + close session button */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            {emoji} {topicTitle}
          </span>
          <Link to="/learn">
            <button
              className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors hover:bg-black/5"
              style={{
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(0,0,0,0.08)',
                color: 'hsl(var(--muted-foreground))',
                backdropFilter: 'blur(8px)',
              }}
            >
              × {language === 'ru' ? 'Закрыть сессию' : 'Κλείσιμο'}
            </button>
          </Link>
        </div>

        {/* Progress row + bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {language === 'ru'
                ? `Карточка ${currentIndex + 1} из ${questions.length}`
                : `Κάρτα ${currentIndex + 1} από ${questions.length}`}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {Math.round(progress)}%&nbsp;
              {language === 'ru' ? 'выполнено' : 'ολοκληρωμένο'}
            </span>
          </div>
          <div className="h-[3px] rounded-full bg-black/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: hexToRgba(accent, 0.75) }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="relative max-w-2xl mx-auto h-72 sm:h-96 px-2 flashcard-container">
          <div
            className={cn("flashcard-inner cursor-pointer", isFlipped && "flipped")}
            onClick={handleFlip}
          >
            {/* Front */}
            <div className="flashcard-face flashcard-glass flex flex-col overflow-hidden rounded-2xl">
              <div className="h-1 w-full shrink-0" style={{ background: accent }} />

              <div className="flex items-start justify-between px-5 pt-4 pb-0">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: hexToRgba(accent, 0.13), color: accent }}
                >
                  {emoji} {topicTitle}
                </span>

                {isSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground/50 hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      isSpeaking ? stop() : speak(currentQuestion.question, `${currentQuestion.id}_question_${language}`);
                    }}
                  >
                    {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center px-8 sm:px-12">
                <p className="text-2xl sm:text-4xl font-semibold leading-relaxed text-center">
                  {currentQuestion.question}
                </p>
              </div>

              <div className="pb-4 text-center">
                <span className="text-xs text-muted-foreground/50">
                  {language === 'ru' ? 'Нажмите, чтобы перевернуть' : 'Πατήστε για αναστροφή'} · Space
                </span>
              </div>
            </div>

            {/* Back */}
            <div
              className="flashcard-face flashcard-back flashcard-glass flex flex-col overflow-hidden rounded-2xl"
              style={{
                background: `radial-gradient(circle at 30% 20%, ${hexToRgba(accent, 0.10)}, transparent 70%), rgba(255,255,255,0.72)`,
              }}
            >
              <div className="h-1 w-full shrink-0" style={{ background: accent }} />

              <div className="flex items-start justify-between px-5 pt-4 pb-0">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: hexToRgba(accent, 0.13), color: accent }}
                >
                  {language === 'ru' ? '✓ Ответ' : '✓ Απάντηση'}
                </span>

                {isSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground/50 hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      isSpeaking ? stop() : speak(currentQuestion.correct_answer, `${currentQuestion.id}_answer_${language}`);
                    }}
                  >
                    {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center px-8 sm:px-12 pb-4">
                <p className="text-2xl sm:text-4xl font-semibold leading-relaxed text-center text-foreground">
                  {currentQuestion.correct_answer}
                </p>
              </div>

              {currentQuestion.explanation && (
                <div className="px-6 pb-5 border-t pt-3" style={{ borderColor: hexToRgba(accent, 0.15) }}>
                  <p className="text-sm text-foreground/50 italic leading-relaxed text-center">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SRS Rating Buttons — always visible, muted before flip, active after */}
        <div className="max-w-2xl mx-auto mt-6 px-2">
          <div className={cn(
            "flex gap-3 justify-center transition-opacity duration-200",
            !isFlipped && "opacity-40 pointer-events-none"
          )}>
            {/* Again */}
            <button
              onClick={() => handleGrade(1)}
              className="flex flex-col items-center gap-1 flex-1 max-w-[110px] px-3 py-3 rounded-2xl transition-all duration-200"
              style={{
                background: 'rgba(239,68,68,0.07)',
                border: '1.5px solid rgba(239,68,68,0.2)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: isFlipped ? 'rgb(239,68,68)' : 'hsl(var(--muted-foreground))' }}
              >
                ↺ {language === 'ru' ? 'Снова' : 'Πάλι'}
              </span>
              <span className="text-xs text-muted-foreground/70">
                {getIntervalLabel(1, currentQuestion.srsCorrect, currentQuestion.srsIncorrect, language)}
              </span>
            </button>

            {/* Good */}
            <button
              onClick={() => handleGrade(2)}
              className="flex flex-col items-center gap-1 flex-1 max-w-[110px] px-3 py-3 rounded-2xl transition-all duration-200"
              style={{
                background: 'rgba(34,197,94,0.07)',
                border: '1.5px solid rgba(34,197,94,0.2)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: isFlipped ? 'rgb(34,197,94)' : 'hsl(var(--muted-foreground))' }}
              >
                👍 {language === 'ru' ? 'Хорошо' : 'Καλό'}
              </span>
              <span className="text-xs text-muted-foreground/70">
                {getIntervalLabel(2, currentQuestion.srsCorrect, currentQuestion.srsIncorrect, language)}
              </span>
            </button>

            {/* Easy */}
            <button
              onClick={() => handleGrade(3)}
              className="flex flex-col items-center gap-1 flex-1 max-w-[110px] px-3 py-3 rounded-2xl transition-all duration-200"
              style={{
                background: hexToRgba(accent, 0.07),
                border: `1.5px solid ${hexToRgba(accent, 0.25)}`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: isFlipped ? accent : 'hsl(var(--muted-foreground))' }}
              >
                ⚡ {language === 'ru' ? 'Легко' : 'Εύκολο'}
              </span>
              <span className="text-xs text-muted-foreground/70">
                {getIntervalLabel(3, currentQuestion.srsCorrect, currentQuestion.srsIncorrect, language)}
              </span>
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground/40 text-center mt-3">
            {language === 'ru'
              ? '[Space] переворот • [1, 2, 3] оценка'
              : '[Space] αναστροφή • [1, 2, 3] βαθμολογία'}
          </p>
        </div>

      </div>
    </Layout>
  );
}
