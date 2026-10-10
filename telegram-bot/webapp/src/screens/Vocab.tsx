import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, RotateCcw, House, Volume2, WifiOff, Info } from 'lucide-react';
import { api, VocabCard, persistWrite } from '../api';
import { haptic } from '../telegram';
import { speakGreek, prefetchGreek } from '../speech';
import { playGrade, playComplete } from '../sound';
import { CountUp, Empty, Loading, ProgressBar } from '../ui';
import { countWord, useLanguage } from '../i18n';
import { gradeIntervalLabel } from '../srs';
import { Greek } from '../components/greek';
import { RewardSides, RewardWreath } from '../components/RewardArt';
import { StudyIcon } from '../components/StudyIcon';
import { VocabularyFrame, VocabDecorImg } from './vocabularyDecor';
import { VOCABULARY_HINTS } from '../data/vocabularyHints';
import { VocabularyRevealButton } from '../components/VocabularyRevealButton';

export function Vocab({ onHome }: { onHome: () => void }) {
  const { t, language } = useLanguage();
  const [cards, setCards] = useState<VocabCard[] | null>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  // Distinguishes "loaded, nothing due" from "the request failed". Without it a
  // dropped connection rendered the cheerful empty state — the app told the user
  // they were done for today, which is both false and a dead end.
  const [failed, setFailed] = useState(false);
  // See Flashcards: same double-tap guard, and it must sit with the other hooks
  // rather than after the early returns further down.
  const gradedRef = useRef<string | null>(null);
  const translationRef = useRef<HTMLDivElement>(null);
  const revealFocusRef = useRef(false);

  useEffect(() => {
    if (revealed && revealFocusRef.current) {
      translationRef.current?.focus({ preventScroll: true });
      revealFocusRef.current = false;
    }
  }, [revealed]);

  // Warm the current word's audio, and the next one's, so tapping 🔊 is instant.
  useEffect(() => {
    for (const c of [cards?.[i], cards?.[i + 1]]) if (c) prefetchGreek(c.word, `vocab_${c.id}`);
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
      .vocab()
      .then((r) => setCards(r.cards))
      .catch(() => setFailed(true));
  }

  // Guarded initial load so StrictMode's double-invoke can't flash one card
  // and then swap it for the second fetch's different one.
  useEffect(() => {
    let cancelled = false;
    reset();
    api
      .vocab()
      .then((r) => !cancelled && setCards(r.cards))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
    return <Empty icon={CheckCircle2} text={t('vocab.empty')} onHome={onHome} />;

  if (done) {
    return (
      <div className="fade-in center-col vc-screen">
        <VocabularyFrame />
        <div className="result">
          <RewardSides left="coin" />
          <div className="emoji">
            <RewardWreath className="emoji-wreath" />
            <span className="wreath-num">
              <b><CountUp value={cards.length} delay={150} duration={600} /></b>
              <small>{countWord(cards.length, 'word', language)}</small>
            </span>
          </div>
          <div className="ttl">{t('vocab.done')}</div>
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
  // Topic art remains the fallback until a word-specific hint is available.
  const wordHint = VOCABULARY_HINTS[card.id];
  const paperTopic = ['history', 'culture', 'laws', 'geography'].includes(card.topic) ? card.topic : 'mixed';

  function grade(g: number) {
    if (gradedRef.current === String(card.id)) return;
    gradedRef.current = String(card.id);
    haptic();
    persistWrite(() => api.vocabGrade(card.id, g), 'vocab grade');
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
    // Keyed on the card only (see Quiz): the frame and progress bar stay put.
    <div className="fade-in vc-screen">
      <VocabularyFrame />
      <div className="topbar">
        <span className="meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="vc-meta-ic">
            <StudyIcon name="vocab" />
          </span>{' '}
          {t('nav.vocab')}
          <Greek name="olive-branch-small" className="vc-meta-olive" />
        </span>
        <span className="counter">
          {i + 1} / {cards.length}
        </span>
        <Greek name="olive-branch-small" className="vc-counter-olive" />
      </div>
      <ProgressBar value={i} total={cards.length} />
      <div className="spacer" />

      <div className="fc-stage" key={i}>
      <span className={`fc-paper-topic ft-${paperTopic} pureplay-desktop`}>{t('topic.' + paperTopic)}</span>
      <div className="card vc-card swap-in">
        <img
          className={`fc-paper-art hs-deco${wordHint ? " vc-word-hint" : " pureplay-desktop"}`}
          src={wordHint
            ? `${import.meta.env.BASE_URL}assets/vocabulary-hints-v1/${wordHint}`
            : `${import.meta.env.BASE_URL}assets/pureplay/paper-art-${paperTopic}.webp`}
          width={wordHint ? 960 : 470}
          height={wordHint ? 640 : 225}
          alt=""
          aria-hidden="true"
          draggable={false}
          decoding="async"
        />
        <div className="study-card-label pureplay-desktop">{t('vocab.languagePair')}</div>
        <VocabDecorImg slot="cardGreekCorner" className="vc-corner tl" />
        <VocabDecorImg slot="cardOliveBranch" className="vc-corner-olive" />
        <div className="speak-row center">
          {/* Long phrases ("Εθνικό Αρχαιολογικό Μουσείο") step down a size so they
              wrap inside the card instead of running into its corner ornaments. */}
          <div className={`vocab-word${card.word.length > 22 ? ' xlong' : card.word.length > 14 ? ' long' : ''}`}>
            {card.word}
          </div>
          <button
            className="speak-btn"
            aria-label={t('common.pronounce')}
            onClick={() => { haptic(); speakGreek(card.word, `vocab_${card.id}`); }}
          >
            <Volume2 size={17} strokeWidth={2.3} />
          </button>
        </div>
        <VocabularyRevealButton
          label={t('vocab.openTranslation')}
          onReveal={(moveFocus) => {
            revealFocusRef.current = moveFocus;
            setRevealed(true);
          }}
        >
          <div
            className="spoiler vc-translation-revealed"
            ref={translationRef}
            role="region"
            aria-label={t('vocab.translation')}
            tabIndex={-1}
          >
            <VocabDecorImg slot="cardTemple" className="vc-panel-temple" />
            <div className="reveal">
              <div className="ru"><span className="vc-ru-tag pureplay-desktop">{t('vocab.translation')}</span>{card.ru}</div>
              {card.note && (
                <div className="note">
                  <Info className="vc-note-info pureplay-desktop" size={22} aria-hidden="true" />
                  <span>{card.note}</span>
                </div>
              )}
            </div>
          </div>
        </VocabularyRevealButton>
      </div>
      </div>

      {revealed && (
        <div className="actionbar">
          <div className="fc-grade-controls">
            <p className="fc-grade-prompt" id="vc-grade-prompt">{t('study.gradePrompt')}</p>
            <div className="grade-row" role="group" aria-labelledby="vc-grade-prompt">
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
        </div>
      )}
    </div>
  );
}
