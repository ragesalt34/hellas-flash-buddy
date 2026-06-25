import { useEffect, useState } from 'react';
import { Eye, CheckCircle2, PartyPopper, Layers, RotateCcw, House, Check, Lightbulb, Frown, Smile, Target, Volume2 } from 'lucide-react';
import { api, Flashcard } from '../api';
import { haptic } from '../telegram';
import { speakGreek } from '../speech';
import { Empty, Loading, ProgressBar } from '../ui';

export function Flashcards({ onHome }: { onHome: () => void }) {
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  function load() {
    setCards(null);
    setI(0);
    setRevealed(false);
    setDone(false);
    api
      .flashcards()
      .then((r) => setCards(r.cards))
      .catch(() => setCards([]));
  }

  useEffect(load, []);

  if (!cards) return <Loading />;
  if (cards.length === 0)
    return (
      <Empty icon={CheckCircle2} text="Δεν υπάρχουν κάρτες για επανάληψη τώρα. Έλα αργότερα!" onHome={onHome} />
    );

  if (done) {
    return (
      <div className="fade-in center-col">
        <div className="result">
          <div className="emoji">
            <PartyPopper size={56} strokeWidth={1.8} />
          </div>
          <div className="ttl">Η συνεδρία ολοκληρώθηκε!</div>
          <div className="line" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Layers size={16} strokeWidth={2.4} /> {cards.length} κάρτες
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
    api.flashcardGrade(card.question_id, g).catch(() => {});
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
          <Layers size={14} strokeWidth={2.6} /> Κάρτες
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
            aria-label="Προφορά"
            onClick={() => { haptic(); speakGreek(card.question, `q_${card.question_id}`); }}
          >
            <Volume2 size={17} strokeWidth={2.3} />
          </button>
        </div>

        {revealed ? (
          <div className="fade-in">
            <div className="answer" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={22} strokeWidth={3} /> {card.correct_answer}
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
        ) : (
          <button className="btn btn-block" onClick={() => { haptic(); setRevealed(true); }}>
            <Eye size={20} strokeWidth={2.4} /> Δείξε απάντηση
          </button>
        )}
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
