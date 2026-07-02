import { useEffect, useState } from 'react';
import { CheckCircle2, PartyPopper, Languages, RotateCcw, House, MousePointerClick, Frown, Smile, Target, Volume2 } from 'lucide-react';
import { api, VocabCard } from '../api';
import { haptic } from '../telegram';
import { speakGreek } from '../speech';
import { playGrade } from '../sound';
import { Empty, Loading, ProgressBar } from '../ui';
import { useLanguage } from '../i18n';

export function Vocab({ onHome }: { onHome: () => void }) {
  const { t } = useLanguage();
  const [cards, setCards] = useState<VocabCard[] | null>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  function load() {
    setCards(null);
    setI(0);
    setRevealed(false);
    setDone(false);
    api
      .vocab()
      .then((r) => setCards(r.cards))
      .catch(() => setCards([]));
  }

  useEffect(load, []);

  if (!cards) return <Loading />;
  if (cards.length === 0)
    return <Empty icon={CheckCircle2} text={t('vocab.empty')} onHome={onHome} />;

  if (done) {
    return (
      <div className="fade-in center-col">
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
    haptic();
    playGrade(g);
    api.vocabGrade(card.id, g).catch(() => {});
    if (i + 1 >= cards!.length) {
      setDone(true);
    } else {
      setI(i + 1);
      setRevealed(false);
    }
  }

  return (
    <div className="fade-in" key={i}>
      <div className="topbar">
        <span className="meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Languages size={14} strokeWidth={2.6} /> {t('nav.vocab')}
        </span>
        <span className="counter">
          {i + 1}/{cards.length}
        </span>
      </div>
      <ProgressBar value={i} total={cards.length} />
      <div className="spacer" />

      <div className="card">
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
              setRevealed(true);
            }
          }}
        >
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
              <span className="e">
                <Frown size={22} strokeWidth={2.2} />
              </span>
              {t('grade.hard')}
              <span className="gsub">{t('grade.hard.sub')}</span>
            </button>
            <button className="grade g2" onClick={() => grade(2)}>
              <span className="e">
                <Smile size={22} strokeWidth={2.2} />
              </span>
              {t('grade.good')}
              <span className="gsub">{t('grade.good.sub')}</span>
            </button>
            <button className="grade g3" onClick={() => grade(3)}>
              <span className="e">
                <Target size={22} strokeWidth={2.2} />
              </span>
              {t('grade.easy')}
              <span className="gsub">{t('grade.easy.sub')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
