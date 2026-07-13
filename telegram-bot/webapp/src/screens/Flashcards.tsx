import { useEffect, useState } from 'react';
import { Eye, CheckCircle2, PartyPopper, Layers, RotateCcw, House, Check, Lightbulb, Frown, Smile, Target, Volume2 } from 'lucide-react';
import { api, Flashcard } from '../api';
import { haptic } from '../telegram';
import { speakGreek, prefetchGreek, textKey } from '../speech';
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

  // Warm the current card's question (and its answer once revealed) so 🔊 is instant.
  useEffect(() => {
    const c = cards?.[i];
    if (!c) return;
    prefetchGreek(c.question, `q_${c.question_id}`);
    if (revealed) prefetchGreek(c.correct_answer, textKey(c.correct_answer, 'a'));
  }, [cards, i, revealed]);

  function reset() {
    setCards(null);
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
      .catch(() => setCards([]));
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
      .catch(() => !cancelled && setCards([]));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

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
    haptic();
    api.flashcardGrade(card.question_id, g).catch(() => {});
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
        <div className="speak-row">
          <div className="qtext">{card.question}</div>
          <button
            className="speak-btn"
            aria-label={t('common.pronounce')}
            onClick={() => { haptic(); speakGreek(card.question, `q_${card.question_id}`); }}
          >
            <Volume2 size={17} strokeWidth={2.3} />
          </button>
        </div>

        {revealed && (
          <div className="fade-in">
            <div className="answer-box">
              <span className="answer-tag">
                <Check size={13} strokeWidth={3.2} /> {t('flashcards.answerLabel')}
              </span>
              <div className="speak-row" style={{ marginBottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <div className="answer-text">{card.correct_answer}</div>
                <button
                  className="speak-btn"
                  aria-label={t('common.pronounce')}
                  onClick={() => { haptic(); speakGreek(card.correct_answer, textKey(card.correct_answer, 'a')); }}
                >
                  <Volume2 size={17} strokeWidth={2.3} />
                </button>
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
