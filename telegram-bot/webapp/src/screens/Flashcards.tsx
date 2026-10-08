import { useEffect, useRef, useState } from 'react';
import { Eye, CheckCircle2, RotateCcw, House, Check, Volume2, WifiOff, Info } from 'lucide-react';
import { api, Flashcard, persistWrite } from '../api';
import { haptic } from '../telegram';
import { speakGreek, prefetchGreek, textKey, hasGreek } from '../speech';
import { playGrade, playComplete, playTap } from '../sound';
import { CountUp, Empty, Loading, ProgressBar } from '../ui';
import { countWord, useLanguage } from '../i18n';
import { gradeIntervalLabel } from '../srs';
import { QUESTION_HINTS, questionHintUrl } from '../questionHints';
import { Ostraka, Owl } from '../components/homeArt';
import { Greek } from '../components/greek';
import { RewardSides, RewardWreath } from '../components/RewardArt';
import { VocabDecorImg } from './vocabularyDecor';

/* Round-theme frame for this screen, matched to the Vocabulary screen's look
   (same artwork pack, assets/menus/vocabulary/) at the user's request — sized
   to this screen's own (narrower) column rather than copy-pasted from vocab's.
   Decorative only — aria-hidden, and the square theme hides every .hs-deco
   element. Not used on the quiz/topic screen, which keeps its own decor. */
function FcDecor() {
  return (
    <div className="hs-deco fc-decor" aria-hidden="true">
      <span className="fc-wash w-tl" />
      <span className="fc-wash w-br" />
      <VocabDecorImg slot="columnLeft" className="fd fd-column" />
      <VocabDecorImg slot="oliveTopLeft" className="fd fd-olive-tl" />
      <VocabDecorImg slot="parthenonTopRight" className="fd fd-parthenon" />
      <VocabDecorImg slot="meanderTopRight" className="fd fd-meander" />
      <VocabDecorImg slot="sparkleRight" className="fd fd-sparkle s1" />
      <VocabDecorImg slot="sparkleRight" className="fd fd-sparkle s2" />
      <VocabDecorImg slot="amphoraBottomLeft" className="fd fd-amphora" />
      <VocabDecorImg slot="oliveBottomLeft" className="fd fd-olive-bl" />
      <VocabDecorImg slot="oliveBottomRight" className="fd fd-olive-br" />
    </div>
  );
}

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

  // Warm the current card's question and answer so 🔊 is instant — the answer
  // before it is revealed, so it is ready by the time it shows.
  useEffect(() => {
    const c = cards?.[i];
    if (!c) return;
    prefetchGreek(c.question, `q_${c.question_id}`);
    prefetchGreek(c.correct_answer, textKey(c.correct_answer, 'a'));
    // The card's own illustration (if it has one) is warmed too, so it appears with no gap at reveal.
    const hint = QUESTION_HINTS[c.question_id];
    if (hint) new Image().src = questionHintUrl(hint.file);
  }, [cards, i]);

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
      <div className="fade-in center-col fc-screen">
        <FcDecor />
        <div className="result">
          <RewardSides left="coin" />
          <div className="emoji">
            <RewardWreath className="emoji-wreath" />
            <span className="wreath-num">
              <b><CountUp value={cards.length} delay={150} duration={600} /></b>
              <small>{countWord(cards.length, 'card', language)}</small>
            </span>
          </div>
          <div className="ttl">{t('flashcards.done')}</div>
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

  const wide = card.question.length + card.correct_answer.length > 120;
  const paperTopic = ['history', 'culture', 'laws', 'geography'].includes(card.topic ?? '')
    ? card.topic!
    : 'mixed';
  // One picture in the art box: the card's own illustration when it has one and may show now
  // (after-reveal ones wait for the answer), otherwise the topic collage (laws = the Parliament
  // collage). Both are alpha-trimmed, so the visible picture fills the box.
  const hint = QUESTION_HINTS[card.question_id];
  const paperArtSrc =
    hint && (hint.before || revealed)
      ? questionHintUrl(hint.file)
      : import.meta.env.BASE_URL + 'assets/pureplay/paper-art-' + paperTopic + '.webp';

  return (
    // Keyed on the card only (see Quiz): the decor and progress bar stay put.
    <div className={`fade-in fc-screen${wide ? ' fc-wide' : ''}`}>
      <FcDecor />
      <div className="topbar">
        <span className="meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="fc-meta-ic">
            <Ostraka />
          </span>{' '}
          {t('nav.flashcards')}
          <Greek name="olive-branch-small" className="fc-meta-olive" />
        </span>
        <span className="counter">
          {i + 1} / {cards.length}
        </span>
        <Greek name="olive-branch-small" className="fc-counter-olive" />
      </div>
      <ProgressBar value={i} total={cards.length} />
      <div className="spacer" />

      <div className="fc-stage" key={i}>
      <span className={`fc-paper-topic ft-${paperTopic} pureplay-desktop`}>{t('topic.' + paperTopic)}</span>
      <div className={`card fc-card${revealed ? ' is-revealed' : ''}`}>
        <VocabDecorImg slot="cardGreekCorner" className="fc-corner" />
        <VocabDecorImg slot="cardOliveBranch" className="fc-corner-olive" />
        <img
          className="fc-paper-art hs-deco pureplay-desktop"
          src={paperArtSrc}
          width={470}
          height={225}
          alt=""
          aria-hidden="true"
          draggable={false}
          decoding="async"
        />
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
              <VocabDecorImg slot="cardTemple" className="fc-panel-temple" />
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
              <div className="explain fc-explain">
                <Owl className="qz-owl" /><Info className="fc-paper-info pureplay-desktop" size={22} aria-hidden="true" />
                <span>{card.explanation}</span>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      <div className="actionbar">
        {revealed ? (
          <div className="fc-grade-controls">
            <p className="fc-grade-prompt" id="fc-grade-prompt">{t('flashcards.gradePrompt')}</p>
            <div className="grade-row" role="group" aria-labelledby="fc-grade-prompt">
              {([1, 2, 3] as const).map((g) => (
                <button key={g} type="button" className={`grade g${g} paper-grade`} onClick={() => grade(g)}>
                  <span className="paper-grade-base hs-deco" aria-hidden="true" />
                  <span className="paper-grade-face hs-deco" aria-hidden="true" />
                  <span className="paper-grade-copy">
                    <span className="paper-grade-label">{t(g === 1 ? 'grade.hard' : g === 2 ? 'grade.good' : 'grade.easy')}</span>
                    <span className="gsub">{gradeIntervalLabel(card.level ?? 0, g, language)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button className="btn btn-block fc-reveal" onClick={() => { haptic(); playTap(); setRevealed(true); }}>
            <Eye size={20} strokeWidth={2.4} /> {t('flashcards.showAnswer')}
          </button>
        )}
      </div>
    </div>
  );
}
