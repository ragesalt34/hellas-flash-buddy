import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mic, MicOff, Volume2, VolumeX, ArrowRight, CheckCircle2, Home, X } from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { localizeQuestions } from '@/lib/questionLocale';
import { cn } from '@/lib/utils';

type Question = { id: string; question: string; correct_answer: string; };
type TopicType = 'history' | 'culture' | 'laws' | 'geography';

const topicAccent: Record<TopicType, string> = {
  history:   '#5B8DB8',
  culture:   '#9B7EC8',
  laws:      '#7D8A57',
  geography: '#D4874A',
};
const topicEmoji: Record<TopicType, string> = {
  history: '📜', culture: '🎭', laws: '⚖️', geography: '🗺️',
};

function normalizeWord(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,;:!?«»]/g, '').trim();
}

function compareWords(expected: string, heard: string): ('correct' | 'wrong')[] {
  const expWords = expected.split(/\s+/).filter(Boolean);
  const heardSet = new Set(heard.split(/\s+/).filter(Boolean).map(normalizeWord));
  return expWords.map(w => heardSet.has(normalizeWord(w)) ? 'correct' : 'wrong');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function Pronunciation() {
  const { topic } = useParams<{ topic: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();

  const [questions, setQuestions]     = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading]     = useState(true);
  const [isFinished, setIsFinished]   = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [wordResults, setWordResults] = useState<('correct' | 'wrong')[] | null>(null);
  const [heardText, setHeardText]     = useState('');
  const [score, setScore]             = useState(0);

  const recRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const { speak, stop, isSpeaking }   = useSpeech();
  useStudyTimer('flashcards');

  const validTopics = ['history', 'culture', 'laws', 'geography'];
  const isValidTopic = topic && validTopics.includes(topic);
  const validTopic   = topic as TopicType;
  const accent       = topicAccent[validTopic] || '#7D8A57';

  // Fetch questions (always Greek for pronunciation)
  useEffect(() => {
    if (!isValidTopic || !user) return;
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('questions').select('*').eq('topic', validTopic).limit(30);
      if (error || !data) { setIsLoading(false); return; }
      const localized = localizeQuestions(data, 'el');
      const shuffled = [...localized].sort(() => Math.random() - 0.5).slice(0, 15);
      setQuestions(shuffled);
      setIsLoading(false);
    })();
  }, [validTopic, user, isValidTopic]);

  const current = questions[currentIndex];

  // Auto-play TTS when card changes
  useEffect(() => {
    if (!current || isLoading) return;
    setWordResults(null);
    setHeardText('');
    void speak(current.correct_answer, `pron_${current.id}_el`);
    return () => stop();
  }, [currentIndex, current, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const playTTS = () => {
    if (!current) return;
    if (isSpeaking) { stop(); return; }
    void speak(current.correct_answer, `pron_${current.id}_el`);
  };

  const startRecording = useCallback(() => {
    if (!SpeechRecognitionAPI || !current) return;
    stop();
    setIsListening(true);
    setWordResults(null);
    setHeardText('');

    const rec = new SpeechRecognitionAPI();
    recRef.current = rec;
    rec.lang = 'el-GR';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const heard = e.results[0][0].transcript;
      setHeardText(heard);
      const results = compareWords(current.correct_answer, heard);
      setWordResults(results);
      const correctRatio = results.filter(r => r === 'correct').length / results.length;
      if (correctRatio >= 0.6) setScore(s => s + 1);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    rec.start();
  }, [current, stop]);

  const stopRecording = () => {
    recRef.current?.stop();
    setIsListening(false);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
    else setIsFinished(true);
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (!isValidTopic) return <Navigate to="/learn" replace />;

  if (!SpeechRecognitionAPI) return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="glass-panel text-center p-10 max-w-sm w-full">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 10, color: '#2F3532' }}>
          {language === 'ru' ? 'Нужен Chrome или Edge' : 'Απαιτείται Chrome ή Edge'}
        </h2>
        <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 24 }}>
          {language === 'ru'
            ? 'Распознавание речи работает только в Chrome и Edge.'
            : 'Η αναγνώριση ομιλίας λειτουργεί μόνο στο Chrome και Edge.'}
        </p>
        <Link to="/learn"><button className="btn-pebble">{language === 'ru' ? 'Назад' : 'Πίσω'}</button></Link>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  // ── Finished ────────────────────────────────────────────────────────────────
  if (isFinished) {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="ambient-layer"><div className="ambient-blob ambient-blob-1" /><div className="ambient-blob ambient-blob-2" /></div>
        <div className="glass-panel text-center p-10 max-w-md w-full relative z-10">
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎤</div>
          <h2 style={{ fontSize: 26, fontWeight: 600, marginBottom: 20, color: '#2F3532' }}>
            {language === 'ru' ? 'Тренировка завершена!' : 'Η προπόνηση τελείωσε!'}
          </h2>
          <div style={{
            width: 120, height: 120, borderRadius: '50%', margin: '0 auto 20px',
            background: pct >= 70 ? 'rgba(125,138,87,0.15)' : 'rgba(47,53,50,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 700, color: accent,
          }}>{pct}%</div>
          <p style={{ fontSize: 15, color: 'hsl(var(--muted-foreground))', marginBottom: 28 }}>
            {language === 'ru'
              ? `${score} из ${questions.length} карточек произнесено верно`
              : `${score} από ${questions.length} κάρτες προφέρθηκαν σωστά`}
          </p>
          <Link to="/learn">
            <button className="btn-pebble">
              <Home style={{ width: 16, height: 16 }} />
              {language === 'ru' ? 'К темам' : 'Στα θέματα'}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────────
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const words    = current?.correct_answer.split(/\s+/).filter(Boolean) ?? [];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <div className="ambient-layer">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
      </div>

      {/* Pill header */}
      <div className="sticky top-4 z-50 px-4">
        <div className="max-w-3xl mx-auto pill-header flex items-center justify-between h-[56px] px-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
              style={{ background: accent }}>
              {topicEmoji[validTopic]}
            </div>
            <span className="font-medium text-sm sm:text-base text-foreground">
              {language === 'ru' ? 'Произношение' : 'Προφορά'}
            </span>
          </div>
          <Link to="/learn">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border/60 rounded-full px-3 py-1.5 bg-background/60 backdrop-blur-sm">
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{language === 'ru' ? 'Выйти' : 'Έξοδος'}</span>
            </button>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative z-10 pt-6 pb-8 px-4">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-medium">
              <span>{currentIndex + 1} / {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: accent }} />
            </div>
          </div>

          {/* Card */}
          <div className="bg-card rounded-3xl shadow-sm">
            <div className="px-6 sm:px-8 py-8 flex flex-col items-center gap-5">

              {/* Mode label */}
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: accent }}>
                {language === 'ru' ? 'Произнеси по-гречески' : 'Πες στα Ελληνικά'}
              </span>

              {/* Question context */}
              <p className="text-sm text-center text-muted-foreground max-w-md leading-relaxed">
                {current?.question}
              </p>

              {/* Greek answer — word-by-word highlight */}
              <div className="flex flex-wrap gap-x-3 gap-y-2 justify-center py-2">
                {words.map((word, wi) => {
                  const res = wordResults?.[wi];
                  return (
                    <span key={wi} style={{
                      fontSize: 26,
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                      color: res === 'correct' ? '#7D8A57'
                           : res === 'wrong'   ? '#C25B5B'
                           : '#2F3532',
                      transition: 'color 0.3s ease',
                    }}>
                      {word}
                    </span>
                  );
                })}
              </div>

              {/* What the browser heard */}
              {heardText && (
                <p className="text-sm text-muted-foreground italic text-center">
                  «{heardText}»
                </p>
              )}

              {/* Word score pill */}
              {wordResults && (
                <div style={{
                  display: 'inline-flex', gap: 16, alignItems: 'center',
                  padding: '6px 20px', borderRadius: 99,
                  background: 'rgba(47,53,50,0.06)',
                  fontSize: 13, fontWeight: 700,
                }}>
                  <span style={{ color: '#7D8A57' }}>✓ {wordResults.filter(r => r === 'correct').length}</span>
                  <span style={{ color: '#C25B5B' }}>✗ {wordResults.filter(r => r === 'wrong').length}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-1">
                {/* TTS button */}
                <button
                  onClick={playTTS}
                  title={language === 'ru' ? 'Прослушать' : 'Ακούστε'}
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    border: `1.5px solid ${isSpeaking ? accent : 'rgba(47,53,50,0.15)'}`,
                    background: isSpeaking ? `${accent}18` : 'rgba(47,53,50,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: accent, transition: 'all 0.15s',
                  }}
                >
                  {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>

                {/* Record button */}
                <button
                  onClick={isListening ? stopRecording : startRecording}
                  disabled={isSpeaking}
                  style={{
                    height: 52, paddingLeft: 28, paddingRight: 28, borderRadius: 99,
                    border: 'none',
                    background: isListening ? '#C25B5B' : accent,
                    color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: isSpeaking ? 'default' : 'pointer',
                    opacity: isSpeaking ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: isListening ? '0 0 0 5px rgba(194,91,91,0.22)' : 'none',
                  }}
                >
                  {isListening
                    ? <><MicOff className="h-5 w-5" />{language === 'ru' ? 'Стоп' : 'Σταμάτα'}</>
                    : <><Mic className="h-5 w-5" />{language === 'ru' ? 'Говори' : 'Μίλα'}</>}
                </button>
              </div>

            </div>
          </div>

          {/* Next button (appears after attempt) */}
          <div className={cn('flex justify-end transition-all duration-300', !wordResults && 'opacity-0 pointer-events-none')}>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white shadow-md transition-all hover:opacity-90 active:scale-95"
              style={{ background: accent }}
            >
              {currentIndex < questions.length - 1
                ? <>{language === 'ru' ? 'Далее' : 'Επόμενο'} <ArrowRight className="h-4 w-4" /></>
                : <>{language === 'ru' ? 'Завершить' : 'Τέλος'} <CheckCircle2 className="h-4 w-4" /></>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
