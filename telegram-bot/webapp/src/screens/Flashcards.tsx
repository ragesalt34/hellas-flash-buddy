import { useEffect, useRef, useState } from 'react';
import { Eye, CheckCircle2, PartyPopper, Layers, RotateCcw, House, Check, Lightbulb, Frown, Smile, Target, Volume2, WifiOff } from 'lucide-react';
import { api, Flashcard, persistWrite } from '../api';
import { haptic } from '../telegram';
import { speakGreek, prefetchGreek, textKey, hasGreek } from '../speech';
import { playGrade, playComplete, playTap } from '../sound';
import { Empty, Loading, ProgressBar } from '../ui';
import { useLanguage } from '../i18n';
import { gradeIntervalLabel } from '../srs';

export function Flashcards({ onHome }: { onHome: () => void }) {
  const { t, language } = useLanguage();
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  // Distinguishes "loaded, nothing due" from "the request failed". Without it a
  // dropped connection rendered the cheerful empty state — the app told the user
  // they were done for today, which is both false and a dead end.
  const [failed, setFailed] = useState(false);
  // Guards a double tap: both taps see the same card (i only changes on the next
  // render), so without this one card took two grades — level +2 and seen_count
  // +2 for a single answer. Declared with the other hooks, above the early
  // returns below: a hook after a conditional return breaks React's hook order.
  const gradedRef = useRef<string | null>(null);

  // Warm the current card's question (and its answer once revealed) so 🔊 is instant.
  useEffect(() => {
    const c = cards?.[i];
    if (!c) return;
    prefetchGreek(c.question, `q_${c.question_id}`);
    if (revealed) prefetchGreek(c.correct_answer, textKey(c.correct_answer, 'a'));
  }, [cards, i, revealed]);

  function reset() {
    setCards(null);
    setFailed(false);
    setI(0);
    setRevealed(false);
    setDone(false);
  }

  // Retry button — fresh user action, no race to guard.
  function load() {
    reset();
    api
      .flashcards()
      .then((r) => setCards(r.cards))
      .catch(() => setFailed(true));
  }

  // Initial (and on language change) load, guarded so React 18 StrictMode's
  // double-invoke — or any re-run — can't flash a first random card and then
  // swap it for a second fetch's different one.
  useEffect(() => {
    let cancelled = false;
    reset();
    api
      .flashcards()
      .then((r) => !cancelled && setCards(r.cards))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);


  // A fresh deck may open on a card that was graded in the previous run — clear
  // the guard so its grade is not swallowed.
  useEffect(() => {
    gradedRef.current = null;
  }, [cards]);

  if (failed)
    return (
      <div className="empty fade-in">
        <div className="e">
          <WifiOff size={52} strokeWidth={1.8} />
        </div>
        <p>{t('common.error')}</p>
        <button className="btn" onClick={() => { haptic(); load(); }}>
          <RotateCcw size={18} strokeWidth={2.4} /> {t('common.retry')}
        </button>
      </div>
    );
  if (!cards) return <Loading />;
  if (cards.length === 0)
    return <Empty icon={CheckCircle2} text={t('flashcards.empty')} onHome={onHome} />;

  if (done) {
    return (
      <div className="fade-in center-col">
        <div className="result">
          <div className="emoji">
            <PartyPopper size={56} strokeWidth={1.8} />
          </div>
          <div className="ttl">{t('flashcards.done')}</div>
          <div className="line" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Layers size={16} strokeWidth={2.4} /> {cards.length} {t('flashcards.cardsCount')}
          </div>
        </div>
        <button className="btn btn-block" onClick={load}>
          <RotateCcw size={18} strokeWidth={2.4} /> {t('common.retry')}
        </button>
        <button className="btn btn-block secondary" onClick={onHome}>
          <House size={18} strokeWidth={2.4} /> {t('nav.menu')}
        </button>
      </div>
    );
  }

  const card = cards[i];

  function grade(g: number) {
    if (gradedRef.current === card.question_id) return;
    gradedRef.current = card.question_id;
    haptic();
    persistWrite(() => api.flashcardGrade(card.question_id, g), 'flashcard grade');
    if (i + 1 >= cards!.length) {
      playComplete();
      setDone(true);
    } else {
      playGrade(g);
      setI(i + 1);
      setRevealed(false);
    }
  }

  return (
    <div className="fade-in" key={i}>
      <div className="topbar">
        <span className="meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Layers size={14} strokeWidth={2.6} /> {t('nav.flashcards')}
        </span>
        <span className="counter">
          {i + 1}/{cards.length}
        </span>
      </div>
      <ProgressBar value={i} total={cards.length} />
      <div className="spacer" />

      <div className="card">
        {/* Pronunciation only where there is Greek to pronounce (see hasGreek). */}
        <div className="speak-row">
          <div className="qtext">{card.question}</div>
          {hasGreek(card.question) && (
            <button
              className="speak-btn"
              aria-label={t('common.pronounce')}
              onClick={() => { haptic(); speakGreek(card.question, `q_${card.question_id}`); }}
            >
              <Volume2 size={17} strokeWidth={2.3} />
            </button>
          )}
        </div>

        {revealed && (
          <div className="fade-in">
            <div className="answer-box">
              <span className="answer-tag">
                <Check size={13} strokeWidth={3.2} /> {t('flashcards.answerLabel')}
              </span>
              <div className="speak-row" style={{ marginBottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <div className="answer-text">{card.correct_answer}</div>
                {hasGreek(card.correct_answer) && (
                  <button
                    className="speak-btn"
                    aria-label={t('common.pronounce')}
                    onClick={() => { haptic(); speakGreek(card.correct_answer, textKey(card.correct_answer, 'a')); }}
                  >
                    <Volume2 size={17} strokeWidth={2.3} />
                  </button>
                )}
              </div>
            </div>
            {card.explanation && (
              <div className="explain">
                <Lightbulb
                  size={16}
                  strokeWidth={2.4}
                  style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }}
                />
                {card.explanation}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="actionbar">
        {revealed ? (
          <div className="grade-row">
            <button className="grade g1" onClick={() => grade(1)}>
              <span className="e">
                <Frown size={22} strokeWidth={2.2} />
              </span>
              {t('grade.hard')}
              <span className="gsub">{gradeIntervalLabel(card.level ?? 0, 1, language)}</span>
            </button>
            <button className="grade g2" onClick={() => grade(2)}>
              <span className="e">
                <Smile size={22} strokeWidth={2.2} />
              </span>
              {t('grade.good')}
              <span className="gsub">{gradeIntervalLabel(card.level ?? 0, 2, language)}</span>
            </button>
            <button className="grade g3" onClick={() => grade(3)}>
              <span className="e">
                <Target size={22} strokeWidth={2.2} />
              </span>
              {t('grade.easy')}
              <span className="gsub">{gradeIntervalLabel(card.level ?? 0, 3, language)}</span>
            </button>
          </div>
        ) : (
          <button className="btn btn-block" onClick={() => { haptic(); playTap(); setRevealed(true); }}>
            <Eye size={20} strokeWidth={2.4} /> {t('flashcards.showAnswer')}
          </button>
        )}
      </div>
    </div>
  );
}
