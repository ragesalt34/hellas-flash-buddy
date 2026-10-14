import { useEffect, useId, useRef } from 'react';
import { haptic } from '../telegram';

type Action = { label: string; onClick: () => void };
type Props = {
  title: string;
  result: string;
  description: string;
  repeat: Action;
  home: Action;
  other?: Action;
};

/** Shared paper finish for vocabulary, flashcards and quizzes. All totals are live data. */
export function StudyCompletion({ title, result, description, repeat, home, other }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return (
    <div className="vc-complete-screen">
      <section className="vc-complete-sheet" aria-labelledby={titleId}>
        <div className="vc-complete-copy">
          <h1 id={titleId} ref={heading} tabIndex={-1}>{title}</h1>
          <p className="vc-complete-count">{result}</p>
          <p className="vc-complete-description">{description}</p>
          <div className="vc-complete-actions">
            {[repeat, home].map((action, index) => (
              <button key={index} type="button" className={`vc-complete-button ${index === 0 ? 'is-primary' : 'is-secondary'}`}
                onClick={() => { haptic(); action.onClick(); }}>
                <span className="vc-complete-button-paper hs-deco" aria-hidden="true" />
                {index === 0 && <span className="vc-complete-button-fold hs-deco" aria-hidden="true" />}
                <span className="vc-complete-button-label">{action.label}</span>
              </button>
            ))}
          </div>
          {other && <button type="button" className="vc-complete-other"
            onClick={() => { haptic(); other.onClick(); }}>{other.label}</button>}
        </div>
        <img className="vc-complete-art hs-deco"
          src={`${import.meta.env.BASE_URL}assets/vocab-completion-v2/mosaic.webp`}
          width={1254} height={1254} alt="" aria-hidden="true" draggable={false} decoding="async" />
      </section>
    </div>
  );
}
