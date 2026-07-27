import { useState } from 'react';
import { Feather, Square } from 'lucide-react';
import { haptic } from '../telegram';
import { useLanguage } from '../i18n';
import { getStoredTheme, setStoredTheme, type Theme } from '../theme';

/**
 * Picks the visual theme. Sits next to the language switch in .bottomnav-inner,
 * so it inherits the same responsive placement (fixed corner on mobile, part of
 * the sidebar on desktop).
 *
 * Deliberately NOT a light/dark control: there is no dark palette in the
 * stylesheet, and an icon that looks like one would promise something the app
 * cannot do. This switches between two complete looks — see src/theme.ts.
 */
export function ThemeSwitch() {
  const { t } = useLanguage();
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  const pick = (next: Theme) => {
    if (next === theme) return;
    haptic('light');
    setStoredTheme(next);
    setTheme(next);
  };

  return (
    <div className="theme-switch" role="group" aria-label={t('theme.aria')}>
      <button
        className={theme === 'soft' ? 'active' : ''}
        onClick={() => pick('soft')}
        aria-pressed={theme === 'soft'}
        title={t('theme.soft')}
      >
        <Feather size={15} strokeWidth={2.2} />
      </button>
      <button
        className={theme === 'brut' ? 'active' : ''}
        onClick={() => pick('brut')}
        aria-pressed={theme === 'brut'}
        title={t('theme.brut')}
      >
        <Square size={15} strokeWidth={2.6} />
      </button>
    </div>
  );
}
