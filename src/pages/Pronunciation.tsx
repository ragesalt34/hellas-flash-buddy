import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import {
  Loader2, Mic, MicOff, Volume2, VolumeX,
  ArrowRight, CheckCircle2, Home, X, RotateCcw, SkipForward,
} from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { localizeQuestions } from '@/lib/questionLocale';
import { toast } from 'sonner';

type Question = { id: string; question: string; correct_answer: string };
type TopicType = 'history' | 'culture' | 'laws' | 'geography';
type Phase = 'idle' | 'listening' | 'result';

const topicAccent: Record<TopicType, string> = {
  history:   '#5B8DB8',
  culture:   '#9B7EC8',
  laws:      '#7D8A57',
  geography: '#D4874A',
};
const topicEmoji: Record<TopicType, string> = {
  history: '📜', culture: '🎭', laws: '⚖️', geography: '🗺️',
};
const topicLabel: Record<TopicType, { ru: string; el: string }> = {
  history:   { ru: 'История',   el: 'Ιστορία' },
  culture:   { ru: 'Культура',  el: 'Πολιτισμός' },
  laws:      { ru: 'Законы',    el: 'Νόμοι' },
  geography: { ru: 'География', el: 'Γεωγραφία' },
};

function normalizeWord(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,;:!?«»()]/g, '').trim();
}

function compareWords(expected: string, heard: string): ('correct' | 'wrong')[] {
  const expWords = expected.split(/\s+/).filter(Boolean);
  const heardSet = new Set(heard.split(/\s+/).filter(Boolean).map(normalizeWord));
  return expWords.map(w => heardSet.has(normalizeWord(w)) ? 'correct' : 'wrong');
}

const VALID_TOPICS = ['history', 'culture', 'laws', 'geography'] as const;

export default function Pronunciation() {
  const { topic }                       = useParams<{ topic: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { language }                    = useLanguage();

  const [questions, setQuestions]       = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading]       = useState(true);
  const [isFinished, setIsFinished]     = useState(false);
  const [phase, setPhase]               = useState<Phase>('idle');
  const [wordResults, setWordResults]   = useState<('correct' | 'wrong')[] | null>(null);
  const [heardText, setHeardText]       = useState('');
  const [score, setScore]               = useState(0);
  const [hasListened, setHasListened]   = useState(false);

  const recRef                        = useRef<any>(null); // eslint-disable-line
  const { speak, stop, isSpeaking }   = useSpeech();
  useStudyTimer('flashcards');

  const isValidTopic = topic && (VALID_TOPICS as readonly string[]).includes(topic);
  const validTopic   = topic as TopicType;
  const accent       = topicAccent[validTopic] ?? '#7D8A57';
  const emoji        = topicEmoji[validTopic]  ?? '📖';
  const label        = topicLabel[validTopic]  ?? { ru: '', el: '' };

  const SpeechRecognitionAPI = (window as any).SpeechRecognition // eslint-disable-line
                             || (window as any).webkitSpeechRecognition; // eslint-disable-line

  // ── Fetch questions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isValidTopic || !user) return;
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('questions').select('*').eq('topic', validTopic).limit(30);
      if (error || !data) { setIsLoading(false); return; }
      const localized = localizeQuestions(data, 'el');
      const shuffled  = [...localized].sort(() => Math.random() - 0.5).slice(0, 15);
      setQuestions(shuffled);
      setIsLoading(false);
    })();
  }, [validTopic, user, isValidTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = questions[currentIndex];

  // ── Auto-play TTS on each new card ──────────────────────────────────────────
  // FIX: dep on [currentIndex, questions] NOT [current] — current is derived and
  // causes the effect to fire twice (both currentIndex AND current change together)
  useEffect(() => {
    if (!current || isLoading) return;
    setWordResults(null);
    setHeardText('');
    setPhase('idle');
    setHasListened(false);
    stop();
    const timer = setTimeout(() => {
      speak(current.correct_answer, `pron_${current.id}_el`).then(() => {
        setHasListened(true);
      }).catch(() => setHasListened(true)); // allow mic even if TTS fails
    }, 120); // tiny delay so stop() settles first
    return () => clearTimeout(timer);
  }, [currentIndex, questions]); // eslint-disable-line react-hooks/exhaustive-deps

  const playTTS = useCallback(() => {
    if (!current) return;
    if (isSpeaking) { stop(); return; }
    void speak(current.correct_answer, `pron_${current.id}_el`).then(() => setHasListened(true)).catch(() => setHasListened(true));
  }, [current, isSpeaking, speak, stop]);

  // ── SpeechRecognition ────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!SpeechRecognitionAPI || !current) return;
    // Always stop TTS first
    stop();
    // Clean up any previous recognizer
    if (recRef.current) {
      try { recRef.current.abort(); } catch { /* ignore */ }
      recRef.current = null;
    }
    setPhase('listening');
    setWordResults(null);
    setHeardText('');

    const rec = new SpeechRecognitionAPI();
    recRef.current = rec;
    rec.lang          = 'el-GR';
    rec.continuous    = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => { // eslint-disable-line
      const heard = e.results[0][0].transcript;
      setHeardText(heard);
      const results = compareWords(current.correct_answer, heard);
      setWordResults(results);
      setPhase('result');
      const correctRatio = results.filter(r => r === 'correct').length / results.length;
      if (correctRatio >= 0.6) setScore(s => s + 1);
    };

    rec.onerror = (e: any) => { // eslint-disable-line
      setPhase('idle');
      const msg = e.error === 'not-allowed'
        ? (language === 'ru' ? 'Нет доступа к микрофону' : 'Δεν επιτρέπεται η πρόσβαση στο μικρόφωνο')
        : e.error === 'no-speech'
        ? (language === 'ru' ? 'Речь не обнаружена' : 'Δεν ανιχνεύτηκε ομιλία')
        : (language === 'ru' ? 'Ошибка микрофона' : 'Σφάλμα μικροφώνου');
      toast.error(msg);
    };

    rec.onend = () => {
      // If onresult hasn't fired yet and we're still listening → treat as no-speech
      setPhase(p => p === 'listening' ? 'idle' : p);
    };

    try { rec.start(); } catch { setPhase('idle'); }
  }, [current, stop, SpeechRecognitionAPI, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setPhase('idle');
  }, []);

  const handleRetry = useCallback(() => {
    setWordResults(null);
    setHeardText('');
    setPhase('idle');
  }, []);

  const handleNext = useCallback(() => {
    try { recRef.current?.abort(); } catch { /* ignore */ }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, questions.length]);

  const handleSkip = useCallback(() => {
    try { recRef.current?.abort(); } catch { /* ignore */ }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, questions.length]);

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (!isValidTopic) return <Navigate to="/learn" replace />;

  if (!SpeechRecognitionAPI) return (
    <Layout>
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="glass-panel text-center p-10 max-w-sm w-full">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>
            {language === 'ru' ? 'Нужен Chrome или Edge' : 'Απαιτείται Chrome ή Edge'}
          </h2>
          <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 24 }}>
            {language === 'ru'
              ? 'Распознавание речи доступно только в Chrome и Edge.'
              : 'Η αναγνώριση ομιλίας λειτουργεί μόνο στο Chrome και Edge.'}
          </p>
          <Link to="/learn"><button className="btn-pebble">{language === 'ru' ? 'Назад' : 'Πίσω'}</button></Link>
        </div>
      </div>
    </Layout>
  );

  if (isLoading) return (
    <Layout>
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
      </div>
    </Layout>
  );

  // ── Finished ─────────────────────────────────────────────────────────────────
  if (isFinished) {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="ambient-layer">
          <div className="ambient-blob ambient-blob-1" />
          <div className="ambient-blob ambient-blob-2" />
        </div>
        <div className="glass-panel text-center p-10 max-w-md w-full relative z-10">
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎤</div>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: 'hsl(var(--foreground))' }}>
            {language === 'ru' ? 'Тренировка завершена!' : 'Η προπόνηση τελείωσε!'}
          </h2>
          <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 24 }}>
            {language === 'ru' ? `Тема: ${label.ru}` : `Θέμα: ${label.el}`}
          </p>
          {/* Score ring */}
          <div style={{
            width: 110, height: 110, borderRadius: '50%', margin: '0 auto 24px',
            background: pct >= 70 ? 'rgba(125,138,87,0.15)' : pct >= 40 ? 'rgba(236,200,92,0.15)' : 'rgba(194,91,91,0.12)',
            border: `3px solid ${pct >= 70 ? '#7D8A57' : pct >= 40 ? '#ECC85C' : '#C25B5B'}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2,
          }}>
            <span style={{ fontSize: 30, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{pct}%</span>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'ru' ? 'верно' : 'σωστά'}
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 28 }}>
            {language === 'ru'
              ? `${score} из ${questions.length} слов произнесено верно`
              : `${score} από ${questions.length} λέξεις προφέρθηκαν σωστά`}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/learn">
              <button className="btn-pebble" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Home style={{ width: 16, height: 16 }} />
                {language === 'ru' ? 'К темам' : 'Θέματα'}
              </button>
            </Link>
            <button
              onClick={() => {
                setIsFinished(false);
                setScore(0);
                setCurrentIndex(0);
                const shuffled = [...questions].sort(() => Math.random() - 0.5);
                setQuestions(shuffled);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 14,
                border: `1.5px solid ${accent}44`,
                background: `${accent}11`, color: accent,
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <RotateCcw style={{ width: 15, height: 15 }} />
              {language === 'ru' ? 'Ещё раз' : 'Ξανά'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────────
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const words    = current?.correct_answer.split(/\s+/).filter(Boolean) ?? [];
  const correctCount = wordResults?.filter(r => r === 'correct').length ?? 0;
  const wrongCount   = wordResults?.filter(r => r === 'wrong').length   ?? 0;

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <div className="ambient-layer">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
      </div>

      {/* ── Pill header ───────────────────────────────────────────────────────── */}
      <div className="sticky top-4 z-50 px-4">
        <div className="max-w-2xl mx-auto pill-header flex items-center justify-between h-[52px] px-5">
          <div className="flex items-center gap-3">
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: `${accent}22`, border: `1.5px solid ${accent}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>{emoji}</div>
            <div>
              <span className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                {language === 'ru' ? 'Произношение' : 'Προφορά'}
              </span>
              <span className="text-xs ml-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {language === 'ru' ? label.ru : label.el}
              </span>
            </div>
          </div>
          <Link to="/learn">
            <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border border-border/50 rounded-full px-3 py-1.5 bg-background/50 backdrop-blur-sm">
              <X className="h-3 w-3" />
              <span className="hidden sm:inline">{language === 'ru' ? 'Выйти' : 'Έξοδος'}</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center relative z-10 pt-6 pb-10 px-4">
        <div className="max-w-2xl w-full flex flex-col gap-5">

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <span>{currentIndex + 1} / {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(47,53,50,0.10)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: accent, borderRadius: 99, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          {/* Main card */}
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Accent stripe */}
            <div style={{ height: 4, background: accent, borderRadius: '24px 24px 0 0', flexShrink: 0 }} />

            <div style={{ padding: '32px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Step label */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: phase === 'listening' ? '#C25B5B' : accent,
                }}>
                  {phase === 'idle'      && (language === 'ru' ? '🔊 Слушай и повторяй' : '🔊 Άκου και επανάλαβε')}
                  {phase === 'listening' && <><span className="pron-pulse-dot" />  {language === 'ru' ? 'Слушаю...' : 'Ακούω...'}</>}
                  {phase === 'result'    && (language === 'ru' ? '✓ Результат' : '✓ Αποτέλεσμα')}
                </span>
                {/* Skip */}
                <button
                  onClick={handleSkip}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 12, color: 'hsl(var(--muted-foreground))', background: 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    padding: '4px 8px', borderRadius: 8,
                    opacity: 0.7, transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'}
                >
                  <SkipForward style={{ width: 13, height: 13 }} />
                  {language === 'ru' ? 'Пропустить' : 'Παράλειψη'}
                </button>
              </div>

              {/* Question context */}
              <p style={{
                fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5,
                textAlign: 'center', minHeight: 36,
              }}>
                {current?.question}
              </p>

              {/* Greek answer — word-by-word highlight */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', padding: '8px 0' }}>
                {words.map((word, wi) => {
                  const res = wordResults?.[wi];
                  return (
                    <span key={wi} style={{
                      fontSize: 28,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      color: res === 'correct' ? '#556B47'
                           : res === 'wrong'   ? '#C25B5B'
                           : 'hsl(var(--foreground))',
                      transition: 'color 0.35s ease',
                      textDecoration: res === 'wrong' ? 'underline wavy #C25B5B' : 'none',
                    }}>
                      {word}
                    </span>
                  );
                })}
              </div>

              {/* What was heard */}
              {heardText && (
                <p style={{
                  textAlign: 'center', fontSize: 13,
                  color: 'hsl(var(--muted-foreground))', fontStyle: 'italic',
                }}>
                  «{heardText}»
                </p>
              )}

              {/* Word score pill */}
              {wordResults && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    display: 'inline-flex', gap: 20, alignItems: 'center',
                    padding: '7px 22px', borderRadius: 99,
                    background: 'rgba(47,53,50,0.06)',
                    fontSize: 14, fontWeight: 700,
                  }}>
                    <span style={{ color: '#556B47' }}>✓ {correctCount}</span>
                    <span style={{ width: 1, height: 16, background: 'rgba(47,53,50,0.12)', display: 'inline-block' }} />
                    <span style={{ color: '#C25B5B' }}>✗ {wrongCount}</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>

                {/* TTS button */}
                <button
                  onClick={playTTS}
                  disabled={phase === 'listening'}
                  title={language === 'ru' ? 'Прослушать' : 'Ακούστε'}
                  style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid ${isSpeaking ? accent : 'rgba(47,53,50,0.18)'}`,
                    background: isSpeaking ? `${accent}22` : 'rgba(47,53,50,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: phase === 'listening' ? 'default' : 'pointer',
                    color: accent, transition: 'all 0.18s',
                    opacity: phase === 'listening' ? 0.4 : 1,
                  }}
                >
                  {isSpeaking
                    ? <VolumeX style={{ width: 19, height: 19 }} />
                    : <Volume2 style={{ width: 19, height: 19 }} />}
                </button>

                {/* Mic / Record button */}
                <button
                  onClick={phase === 'listening' ? stopRecording : startRecording}
                  disabled={isSpeaking || (!hasListened && phase === 'idle')}
                  style={{
                    height: 52, paddingLeft: 28, paddingRight: 28,
                    borderRadius: 99, border: 'none',
                    background: phase === 'listening'
                      ? '#C25B5B'
                      : hasListened || phase === 'result'
                      ? accent
                      : 'rgba(47,53,50,0.18)',
                    color: '#fff',
                    fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: (isSpeaking || (!hasListened && phase === 'idle')) ? 'default' : 'pointer',
                    opacity: (isSpeaking || (!hasListened && phase === 'idle')) ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: phase === 'listening'
                      ? '0 0 0 6px rgba(194,91,91,0.20)'
                      : 'none',
                  }}
                >
                  {phase === 'listening'
                    ? <><MicOff style={{ width: 18, height: 18 }} />{language === 'ru' ? 'Стоп' : 'Σταμάτα'}</>
                    : !hasListened
                    ? <><Mic style={{ width: 18, height: 18 }} />{language === 'ru' ? 'Сначала послушай' : 'Άκου πρώτα'}</>
                    : <><Mic style={{ width: 18, height: 18 }} />{language === 'ru' ? 'Говори' : 'Μίλα'}</>}
                </button>

                {/* Retry button (after result) */}
                {phase === 'result' && (
                  <button
                    onClick={handleRetry}
                    title={language === 'ru' ? 'Повторить' : 'Επανάληψη'}
                    style={{
                      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                      border: '1.5px solid rgba(47,53,50,0.18)',
                      background: 'rgba(47,53,50,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'hsl(var(--muted-foreground))',
                      transition: 'all 0.18s',
                    }}
                  >
                    <RotateCcw style={{ width: 17, height: 17 }} />
                  </button>
                )}
              </div>

              {/* Hint */}
              {!hasListened && phase === 'idle' && (
                <p style={{ textAlign: 'center', fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: -8 }}>
                  {language === 'ru' ? 'Прослушай произношение, затем повтори' : 'Άκου την προφορά και μετά μίλα'}
                </p>
              )}
            </div>
          </div>

          {/* Next / Finish button — always visible after result */}
          {phase === 'result' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleNext}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '13px 28px', borderRadius: 99,
                  border: 'none', background: accent, color: '#fff',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: `0 4px 20px -4px ${accent}66`,
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                {currentIndex < questions.length - 1
                  ? <>{language === 'ru' ? 'Далее' : 'Επόμενο'} <ArrowRight style={{ width: 16, height: 16 }} /></>
                  : <>{language === 'ru' ? 'Завершить' : 'Τέλος'} <CheckCircle2 style={{ width: 16, height: 16 }} /></>}
              </button>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes pron-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
        .pron-pulse-dot {
          display: inline-block;
          width: 8px; height: 8px; border-radius: 50%;
          background: #C25B5B;
          animation: pron-pulse 1s ease-in-out infinite;
        }
        @media (max-width: 480px) {
          .pron-answer { font-size: 22px !important; }
        }
      `}</style>
    </div>
  );
}
