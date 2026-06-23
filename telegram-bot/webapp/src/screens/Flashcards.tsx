import { useEffect, useState } from 'react';
import { api, Flashcard } from '../api';
import { haptic } from '../telegram';
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
    return <Empty emoji="🎉" text="Δεν υπάρχουν κάρτες για επανάληψη τώρα. Έλα αργότερα!" onHome={onHome} />;

  if (done) {
    return (
      <div className="fade-in center-col">
        <div className="result">
          <div className="emoji">🎉</div>
          <div className="ttl">Η συνεδρία ολοκληρώθηκε!</div>
          <div className="line">🎴 {cards.length} κάρτες</div>
        </div>
        <button className="btn btn-block" onClick={load}>
          🔄 Ξανά
        </button>
        <button className="btn btn-block secondary" onClick={onHome}>
          🏠 Μενού
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
        <span className="meta">🎴 Κάρτες</span>
        <span className="counter">
          {i + 1}/{cards.length}
        </span>
      </div>
      <ProgressBar value={i} total={cards.length} />
      <div className="spacer" />

      <div className="card">
        <div className="qtext">{card.question}</div>

        {revealed ? (
          <div className="fade-in">
            <div className="answer">✅ {card.correct_answer}</div>
            {card.explanation && (
              <div className="explain">
                <b>💡</b> {card.explanation}
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-block" onClick={() => { haptic(); setRevealed(true); }}>
            👀 Δείξε απάντηση
          </button>
        )}
      </div>

      {revealed && (
        <>
          <div className="spacer" />
          <div className="grade-row">
            <button className="grade g1" onClick={() => grade(1)}>
              <span className="e">😕</span>Δύσκολο
              <span className="gsub">10 λεπτά</span>
            </button>
            <button className="grade g2" onClick={() => grade(2)}>
              <span className="e">😊</span>Καλά
              <span className="gsub">1 ημέρα</span>
            </button>
            <button className="grade g3" onClick={() => grade(3)}>
              <span className="e">🎯</span>Το ξέρω
              <span className="gsub">4 ημέρες</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
