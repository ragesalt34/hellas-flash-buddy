import { useEffect, useState } from 'react';
import { Eye, CheckCircle2, PartyPopper, Layers, RotateCcw, House, Check, Lightbulb, Frown, Smile, Target, Volume2 } from 'lucide-react';
import { api, Flashcard } from '../api';
import { haptic } from '../telegram';
import { speakGreek } from '../speech';
import { playGrade } from '../sound';
import { Empty, Loading, ProgressBar } from '../ui';
import { useLanguage } from '../i18n';

export function Flashcards({ onHome }: { onHome: () => void }) {
  const { t, language } = useLanguage();
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [language]);

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
    playGrade(g);
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
              <div className="answer-text">{card.correct_answer}</div>
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
        ) : (
          <button className="btn btn-block" onClick={() => { haptic(); setRevealed(true); }}>
            <Eye size={20} strokeWidth={2.4} /> {t('flashcards.showAnswer')}
          </button>
        )}
      </div>
    </div>
  );
}
