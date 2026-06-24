import { useEffect, useState } from 'react';
import { CheckCircle2, PartyPopper, Languages, RotateCcw, House, MousePointerClick, Frown, Smile, Target } from 'lucide-react';
import { api, VocabCard } from '../api';
import { haptic } from '../telegram';
import { Empty, Loading, ProgressBar } from '../ui';

export function Vocab({ onHome }: { onHome: () => void }) {
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
    return <Empty icon={CheckCircle2} text="Δεν υπάρχουν λέξεις για σήμερα. Έλα αύριο για νέες!" onHome={onHome} />;

  if (done) {
    return (
      <div className="fade-in center-col">
        <div className="result">
          <div className="emoji">
            <PartyPopper size={56} strokeWidth={1.8} />
          </div>
          <div className="ttl">Ολοκληρώθηκε!</div>
          <div className="line" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Languages size={16} strokeWidth={2.4} /> {cards.length} λέξεις
          </div>
        </div>
        <button className="btn btn-block" onClick={load}>
          <RotateCcw size={18} strokeWidth={2.4} /> Ξανά
        </button>
        <button className="btn btn-block secondary" onClick={onHome}>
          <House size={18} strokeWidth={2.4} /> Μενού
        </button>
      </div>
    );
  }

  const card = cards[i];

  function grade(g: number) {
    haptic();
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
          <Languages size={14} strokeWidth={2.6} /> Λεξιλόγιο
        </span>
        <span className="counter">
          {i + 1}/{cards.length}
        </span>
      </div>
      <ProgressBar value={i} total={cards.length} />
      <div className="spacer" />

      <div className="card">
        <div className="vocab-word">{card.word}</div>
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
              <MousePointerClick size={14} strokeWidth={2.4} /> Πάτησε για μετάφραση
            </div>
          )}
        </div>
      </div>

      {revealed && (
        <>
          <div className="spacer" />
          <div className="grade-row">
            <button className="grade g1" onClick={() => grade(1)}>
              <span className="e">
                <Frown size={22} strokeWidth={2.2} />
              </span>
              Δύσκολο
              <span className="gsub">10 λεπτά</span>
            </button>
            <button className="grade g2" onClick={() => grade(2)}>
              <span className="e">
                <Smile size={22} strokeWidth={2.2} />
              </span>
              Καλά
              <span className="gsub">1 ημέρα</span>
            </button>
            <button className="grade g3" onClick={() => grade(3)}>
              <span className="e">
                <Target size={22} strokeWidth={2.2} />
              </span>
              Το ξέρω
              <span className="gsub">4 ημέρες</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
