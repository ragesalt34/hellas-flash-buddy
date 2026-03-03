import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mic, MicOff, Volume2, VolumeX, ArrowRight, CheckCircle2, X } from 'lucide-react';
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

  const [questions, setQuestions]       = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading]       = useState(true);
  const [isFinished, setIsFinished]     = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [wordResults, setWordResults]   = useState<('correct' | 'wrong')[] | null>(null);
  const [heardText, setHeardText]       = useState('');
  const [score, setScore]               = useState(0);

  const recRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const { speak, stop, isSpeaking }     = useSpeech();
  useStudyTimer('flashcards');

  const validTopics  = ['history', 'culture', 'laws', 'geography'];
  const isValidTopic = topic && validTopics.includes(topic);
  const validTopic   = topic as TopicType;
  const accent       = topicAccent[validTopic] || '#7D8A57';

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
  }, [validTopic, user, isValidTopic]);

  const current = questions[currentIndex];

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
    rec.lang          = 'el-GR';
    rec.continuous    = false;
    rec.interimResults = false;

    rec.onresult = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const heard   = e.results[0][0].transcript;
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

  const stopRecording = () => { recRef.current?.stop(); setIsListening(false); };
  const handleNext    = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
    else setIsFinished(true);
  };

  // Guards
  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user)         return <Navigate to="/login" replace />;
  if (!isValidTopic) return <Navigate to="/learn" replace />;

  if (!SpeechRecognitionAPI) return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="glass-panel text-center p-10 max-w-sm w-full">
        <div className="text-5xl mb-4">🎤</div>
        <h2 className="text-xl font-semibold mb-2 text-foreground">
          {language === 'ru' ? 'Нужен Chrome или Edge' : 'Απαιτείται Chrome ή Edge'}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
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

  // Finished screen
  if (isFinished) {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const great = pct >= 70;
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="ambient-layer"><div className="ambient-blob ambient-blob-1" /><div className="ambient-blob ambient-blob-2" /></div>
        <div className="glass-panel text-center p-10 max-w-md w-full relative z-10">
          <div className="text-5xl mb-5">🎤</div>
          <h2 className="text-2xl font-semibold mb-6 text-foreground">
            {language === 'ru' ? 'Тренировка завершена!' : 'Η προπόνηση τελείωσε!'}
          </h2>
          {/* Score circle */}
          <div className="w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-bold"
            style={{
              background: great ? `${accent}18` : 'hsl(var(--muted)/0.5)',
              color: accent,
              border: `3px solid ${accent}33`,
            }}>
            {pct}%
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            {language === 'ru'
              ? `${score} из ${questions.length} произнесено верно`
              : `${score} από ${questions.length} κάρτες σωστά`}
          </p>
          <Link to="/learn">
            <button className="btn-pebble">
              {language === 'ru' ? 'К темам' : 'Στα θέματα'}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Main
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const words    = current?.correct_answer.split(/\s+/).filter(Boolean) ?? [];
  const correctCount = wordResults?.filter(r => r === 'correct').length ?? 0;
  const wrongCount   = wordResults?.filter(r => r === 'wrong').length ?? 0;

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <div className="ambient-layer">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
      </div>

      {/* Header */}
      <div className="sticky top-4 z-50 px-4">
        <div className="max-w-2xl mx-auto pill-header flex items-center justify-between h-[52px] px-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
              style={{ background: accent + '22', border: `1.5px solid ${accent}55` }}>
              <span style={{ fontSize: 14 }}>{topicEmoji[validTopic]}</span>
            </div>
            <span className="font-semibold text-sm text-foreground">
              {language === 'ru' ? 'Произношение' : 'Προφορά'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {currentIndex + 1}/{questions.length}
            </span>
            <Link to="/learn">
              <button className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground border border-border/60 bg-background/60 backdrop-blur-sm transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative z-10 pt-5 pb-10 px-4">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-5">

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-border/60 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: accent }} />
          </div>

          {/* Main card */}
          <div className="glass-panel rounded-3xl overflow-hidden">
            {/* Top accent strip */}
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}88, ${accent}22)` }} />

            <div className="px-6 sm:px-10 pt-8 pb-8 flex flex-col items-center gap-6">

              {/* Mode label */}
              <span className="text-xs font-bold tracking-widest uppercase opacity-70" style={{ color: accent }}>
                {language === 'ru' ? '🎤 Произнеси по-гречески' : '🎤 Πες στα Ελληνικά'}
              </span>

              {/* Question context */}
              <p className="text-sm text-center text-muted-foreground max-w-sm leading-relaxed">
                {current?.question}
              </p>

              {/* Greek answer — word-by-word highlight */}
              <div className="flex flex-wrap gap-x-2 gap-y-3 justify-center py-3 px-4">
                {words.map((word, wi) => {
                  const res = wordResults?.[wi];
                  return (
                    <span key={wi}
                      className="px-2 py-0.5 rounded-lg transition-all duration-300"
                      style={{
                        fontSize: 30,
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                        lineHeight: 1.3,
                        color: res === 'correct' ? '#7D8A57'
                             : res === 'wrong'   ? '#C25B5B'
                             : 'hsl(var(--foreground))',
                        background: res === 'correct' ? 'rgba(125,138,87,0.10)'
                                  : res === 'wrong'   ? 'rgba(194,91,91,0.10)'
                                  : 'transparent',
                      }}>
                      {word}
                    </span>
                  );
                })}
              </div>

              {/* Heard text */}
              {heardText && (
                <div className="text-sm text-muted-foreground italic text-center px-4 py-2 rounded-xl bg-muted/40 max-w-xs">
                  «{heardText}»
                </div>
              )}

              {/* Score pills */}
              {wordResults && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold"
                    style={{ background: 'rgba(125,138,87,0.12)', color: '#7D8A57' }}>
                    <span>✓</span> {correctCount} {language === 'ru' ? 'верно' : 'σωστά'}
                  </div>
                  {wrongCount > 0 && (
                    <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold"
                      style={{ background: 'rgba(194,91,91,0.10)', color: '#C25B5B' }}>
                      <span>✗</span> {wrongCount} {language === 'ru' ? 'ошибок' : 'λάθη'}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-1">
                {/* TTS */}
                <button
                  onClick={playTTS}
                  title={language === 'ru' ? 'Прослушать' : 'Ακούστε'}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150"
                  style={{
                    border: `1.5px solid ${isSpeaking ? accent : 'hsl(var(--border))'}`,
                    background: isSpeaking ? `${accent}18` : 'hsl(var(--background)/0.6)',
                    color: isSpeaking ? accent : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>

                {/* Record */}
                <button
                  onClick={isListening ? stopRecording : startRecording}
                  disabled={isSpeaking}
                  className="flex items-center gap-2.5 px-7 h-12 rounded-full font-semibold text-sm text-white transition-all duration-200"
                  style={{
                    background: isListening ? '#C25B5B' : accent,
                    opacity: isSpeaking ? 0.5 : 1,
                    cursor: isSpeaking ? 'default' : 'pointer',
                    boxShadow: isListening
                      ? '0 0 0 6px rgba(194,91,91,0.2), 0 4px 14px rgba(194,91,91,0.3)'
                      : `0 4px 14px ${accent}44`,
                  }}
                >
                  {isListening
                    ? <><MicOff className="h-4 w-4" />{language === 'ru' ? 'Стоп' : 'Σταμάτα'}</>
                    : <><Mic className="h-4 w-4" />{language === 'ru' ? 'Говори' : 'Μίλα'}</>}
                </button>
              </div>

            </div>
          </div>

          {/* Next button */}
          <div className={cn('flex justify-end transition-all duration-300', !wordResults && 'opacity-0 pointer-events-none')}>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: accent, boxShadow: `0 4px 14px ${accent}44` }}
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
