import type { ReactNode } from 'react';
import { t as translate, useLanguage } from '../i18n';

/** A section eyebrow. In the Russian interface the Greek word for the same
 * section follows it ("Обучение · Μάθηση"), so Greek is present in the chrome
 * of the app itself, not only in the content. */
export function SectionLabel({ k, className = '', children }: { k: string; className?: string; children?: ReactNode }) {
  const { t, language } = useLanguage();
  return (
    <div className={`section-label${className ? ` ${className}` : ''}`}>
      <span>
        {t(k)}
        {language === 'ru' && (
          <span className="sl-el" lang="el">
            {' · '}
            {translate(k, 'el')}
          </span>
        )}
      </span>
      {children}
    </div>
  );
}
