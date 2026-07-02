import { useLanguage } from '../i18n';
import { haptic } from '../telegram';

/**
 * RU/EL toggle. Lives inside .bottomnav-inner in the markup (see App.tsx) so it
 * gets positioned responsively by CSS: a fixed top-left pill on mobile, a static
 * pill among the sidebar's nav buttons on desktop.
 */
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  const pick = (l: 'ru' | 'el') => {
    if (l === language) return;
    haptic('light');
    setLanguage(l);
  };

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      <button
        className={language === 'ru' ? 'active' : ''}
        onClick={() => pick('ru')}
        aria-pressed={language === 'ru'}
      >
        RU
      </button>
      <button
        className={language === 'el' ? 'active' : ''}
        onClick={() => pick('el')}
        aria-pressed={language === 'el'}
      >
        EL
      </button>
    </div>
  );
}
