import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, PartyPopper, Languages, RotateCcw, House, MousePointerClick, Frown, Smile, Target, Volume2, WifiOff } from 'lucide-react';
import { api, VocabCard, persistWrite } from '../api';
import { haptic } from '../telegram';
import { speakGreek, prefetchGreek } from '../speech';
import { playGrade, playComplete, playTap } from '../sound';
import { Empty, Loading, ProgressBar } from '../ui';
import { useLanguage } from '../i18n';
import { gradeIntervalLabel } from '../srs';
import { OliveSprig, ColumnSketch, AmphoraSketch, TempleScene, MeanderCorner, MeanderRule, TempleMark } from '../components/icons';

/* Round-theme ornaments for the vocabulary screen: a light classical accent
   spread along the edges — one element per corner, never clustered — so the
   centre stays clean for the word. Decorative only (aria-hidden, .hs-deco is
   hidden by the square theme); phones keep only what fits the margins. */
function VocabDecor() {
  return (
    <div className="hs-deco vc-decor" aria-hidden="true">
      <span className="blob b-tl" />
      <span className="blob b-bl" />
      <span className="blob b-br" />
      <ColumnSketch className="orn o-column" size={58} />
      <OliveSprig className="orn o-olive-tl" size={64} />
      <TempleScene className="orn o-temple" size={210} />
      <AmphoraSketch className="orn o-amphora" size={46} />
      <OliveSprig className="orn o-olive-br" size={70} />
      <span className="orn o-meander">
        <MeanderRule height={24} />
      </span>
      <span className="orn o-key-tr">
        <MeanderRule height={24} />
      </span>
      <span className="orn o-diamond d1" />
      <span className="orn o-diamond d2" />
      <span className="orn o-diamond d3" />
    </div>
  );
}

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

  // Warm the current word's audio so tapping 🔊 is instant.
  useEffect(() => {
    const c = cards?.[i];
    if (c) prefetchGreek(c.word, `vocab_${c.id}`);
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
        <VocabDecor />
        <div className="result">
          <div className="emoji">
            <PartyPopper size={56} strokeWidth={1.8} />
          </div>
          <div className="ttl">{t('vocab.done')}</div>
          <div className="line" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Languages size={16} strokeWidth={2.4} /> {cards.length} {t('vocab.wordsCount')}
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
    <div className="fade-in vc-screen" key={i}>
      <VocabDecor />
      <div className="topbar">
        <span className="meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="vc-meta-ic">
            <Languages size={14} strokeWidth={2.6} />
          </span>{' '}
          {t('nav.vocab')}
          <OliveSprig className="hs-deco vc-meta-olive" size={22} />
        </span>
        <span className="counter">
          {i + 1}/{cards.length}
        </span>
      </div>
      <ProgressBar value={i} total={cards.length} />
      <div className="spacer" />

      <div className="card vc-card">
        <MeanderCorner className="hs-deco vc-corner tl" size={58} />
        <OliveSprig className="hs-deco vc-corner-olive" size={54} />
        <div className="speak-row center">
          <div className="vocab-word">{card.word}</div>
          <button
            className="speak-btn"
            aria-label={t('common.pronounce')}
            onClick={() => { haptic(); speakGreek(card.word, `vocab_${card.id}`); }}
          >
            <Volume2 size={17} strokeWidth={2.3} />
          </button>
        </div>
        <div
          className={`spoiler${revealed ? '' : ' hidden'}`}
          onClick={() => {
            if (!revealed) {
              haptic();
              playTap();
              setRevealed(true);
            }
          }}
        >
          <span className="hs-deco vc-panel-temple" aria-hidden="true">
            <TempleMark size={26} strokeWidth={1.6} />
          </span>
          <div className="reveal">
            <div className="ru">{card.ru}</div>
            {card.note && <div className="note">{card.note}</div>}
          </div>
          {!revealed && (
            <div className="tap" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <MousePointerClick size={14} strokeWidth={2.4} /> {t('vocab.tapToReveal')}
            </div>
          )}
        </div>
      </div>

      {revealed && (
        <div className="actionbar">
          <div className="grade-row">
            <button className="grade g1" onClick={() => grade(1)}>
              <MeanderCorner className="hs-deco gr-key" size={30} />
              <OliveSprig className="hs-deco gr-olive" size={30} />
              <span className="e">
                <Frown size={22} strokeWidth={2.2} />
              </span>
              {t('grade.hard')}
              <span className="gsub">{gradeIntervalLabel(card.level ?? 0, 1, language)}</span>
            </button>
            <button className="grade g2" onClick={() => grade(2)}>
              <MeanderCorner className="hs-deco gr-key" size={30} />
              <OliveSprig className="hs-deco gr-olive" size={30} />
              <span className="e">
                <Smile size={22} strokeWidth={2.2} />
              </span>
              {t('grade.good')}
              <span className="gsub">{gradeIntervalLabel(card.level ?? 0, 2, language)}</span>
            </button>
            <button className="grade g3" onClick={() => grade(3)}>
              <MeanderCorner className="hs-deco gr-key" size={30} />
              <OliveSprig className="hs-deco gr-olive" size={30} />
              <span className="e">
                <Target size={22} strokeWidth={2.2} />
              </span>
              {t('grade.easy')}
              <span className="gsub">{gradeIntervalLabel(card.level ?? 0, 3, language)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
