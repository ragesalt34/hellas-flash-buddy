import { useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import type { WordOfDay as Word } from '../api';
import { haptic } from '../telegram';
import { prefetchGreek, speakGreek } from '../speech';
import { t as translate, useLanguage } from '../i18n';
import { MeanderBand } from '../components/greekArt';
import { LaurelSprig } from '../components/homeArt';

/** Home: one Greek word a day, the same for everyone on that calendar day.
 * Uses the vocabulary clip (`vocab_<id>`) so the voice is already cached. */
export function WordOfDay({ word }: { word: Word }) {
  const { t, language } = useLanguage();
  const key = `vocab_${word.id}`;
  useEffect(() => prefetchGreek(word.word, key), [word.word, key]);
  return (
    <section className="wod" aria-label={t('wod.title')}>
      <MeanderBand className="hs-deco wod-band" height={9} />
      <div className="wod-eyebrow">
        {t('wod.title')}
        {language === 'ru' && <span lang="el"> · {translate('wod.title', 'el')}</span>}
      </div>
      <div className="wod-row">
        <div className="wod-word" lang="el">
          {word.word}
        </div>
        <button
          className="wod-speak"
          aria-label={t('common.pronounce')}
          onClick={() => {
            haptic();
            speakGreek(word.word, key);
          }}
        >
          <Volume2 size={20} strokeWidth={2.3} />
        </button>
      </div>
      <div className="wod-ru">{word.ru}</div>
      {word.note && <div className="wod-note">{word.note}</div>}
      <LaurelSprig className="hs-deco wod-sprig" />
    </section>
  );
}
