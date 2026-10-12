import { useEffect, useRef } from 'react';
import { countWord, useLanguage } from '../i18n';
import { haptic } from '../telegram';

type Props = {
  count: number;
  onRepeat: () => void;
  onHome: () => void;
};

/** The session total comes from the reviewed deck, never from the artwork. */
export function VocabCompletion({ count, onRepeat, onHome }: Props) {
  const { t, language } = useLanguage();
  const title = useRef<HTMLHeadingElement>(null);
  const result = t('vocab.completedCount')
    .replace('{count}', String(count))
    .replace('{words}', countWord(count, 'word', language));

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="vc-screen vc-complete-screen">
      <section className="vc-complete-sheet" aria-labelledby="vc-complete-title">
        <div className="vc-complete-copy">
          <h1 id="vc-complete-title" ref={title} tabIndex={-1}>{t('vocab.completedTitle')}</h1>
          <p className="vc-complete-count">{result}</p>
          <p className="vc-complete-description">{t('vocab.completedDescription')}</p>
          <div className="vc-complete-actions">
            <button type="button" className="vc-complete-button is-primary"
              onClick={() => { haptic(); onRepeat(); }}>
              <span className="vc-complete-button-paper hs-deco" aria-hidden="true" />
              <span className="vc-complete-button-fold hs-deco" aria-hidden="true" />
              <span className="vc-complete-button-label">{t('common.retry')}</span>
            </button>
            <button type="button" className="vc-complete-button is-secondary"
              onClick={() => { haptic(); onHome(); }}>
              <span className="vc-complete-button-paper hs-deco" aria-hidden="true" />
              <span className="vc-complete-button-label">{t('nav.menu')}</span>
            </button>
          </div>
        </div>
        <img className="vc-complete-art hs-deco"
          src={`${import.meta.env.BASE_URL}assets/vocab-completion-v1/study-folder.webp`}
          width={1254} height={1254} alt="" aria-hidden="true"
          draggable={false} decoding="async" />
      </section>
    </div>
  );
}

