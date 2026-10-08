import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, ChevronDown, Menu, X } from 'lucide-react';
import { useLanguage } from '../i18n';
import { ThemeSwitch } from './ThemeSwitch';
import './siteHeader.css';

export type HeaderPage = 'landing' | 'home' | 'quiz' | 'flashcards' | 'vocab' | 'stats' | 'homework' | 'auth';
type Props = {
  page: HeaderPage;
  accountEntry: boolean;
  onNavigate: (page: Exclude<HeaderPage, 'auth'>) => void;
  onAccount: () => void;
  onLogin?: () => void;
  onLogout?: () => void;
};
const STUDY_LINKS = [
  ['landing', 'nav.home'], ['quiz', 'nav.quiz'], ['flashcards', 'nav.flashcards'],
  ['vocab', 'nav.vocab'], ['homework', 'nav.homework'], ['stats', 'nav.stats'],
] as const;
const LANDING_LINKS = [
  ['how-it-works', 'landing.steps.title'], ['features', 'landing.features.title'],
  ['faq', 'landing.pureplay.nav.faq'],
] as const;

/** A persistent shell: page content cannot resize or restyle the navigation. */
export function SiteHeader({ page, accountEntry, onNavigate, onAccount, onLogin, onLogout }: Props) {
  const { t, language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState('');
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const settings = useRef<HTMLDetailsElement>(null);

  useEffect(() => { setOpen(false); setSection(''); if (settings.current) settings.current.open = false; }, [page]);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        if (settings.current) settings.current.open = false;
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (settings.current?.open) {
        settings.current.open = false;
        settings.current.querySelector('summary')?.focus();
      } else if (open) { setOpen(false); toggle.current?.focus(); }
    };
    const desktop = window.matchMedia('(min-width: 1280px)');
    const resize = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    desktop.addEventListener('change', resize);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', escape);
      desktop.removeEventListener('change', resize);
    };
  }, [open]);

  const closeMenu = () => {
    // Return focus before a mobile link disappears from the accessibility tree.
    if (open) toggle.current?.focus();
    setOpen(false);
  };
  const navigate = (next: Exclude<HeaderPage, 'auth'>) => { closeMenu(); onNavigate(next); };
  const account = () => { closeMenu(); onAccount(); };
  const accountKey = page === 'auth' ? 'auth.back' : accountEntry ? 'nav.dashboard' : 'landing.enter';

  const links = page === 'landing'
    ? LANDING_LINKS.map(([id, key]) => (
      <a key={id} className="hs-header-link" href={`#${id}`} aria-current={section === id ? 'location' : undefined}
        onClick={() => { setSection(id); closeMenu(); }}>{t(key)}</a>
    ))
    : (page === 'auth' ? STUDY_LINKS.slice(0, 1) : STUDY_LINKS).map(([id, key]) => (
      <button key={id} type="button" className="hs-header-link" aria-current={page === id ? 'page' : undefined}
        onClick={() => navigate(id)}>{t(key)}</button>
    ));

  return (
    <header ref={root} className="hs-site-header" data-page={page}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
          if (settings.current) settings.current.open = false;
        }
      }}>
      <div className="hs-header-inner">
        <button type="button" className="hs-header-brand" aria-label={`Hellas Study — ${t('nav.home')}`} onClick={() => navigate('landing')}>
          <span className="hs-header-mark"><BookOpen size={24} strokeWidth={1.7} aria-hidden="true" /></span>
          <span>Hellas Study</span>
        </button>
        <nav className="hs-header-nav" aria-label={t('nav.aria')}>{links}</nav>
        <div className="hs-header-actions">
          <details ref={settings} className="hs-header-settings">
            <summary onClick={() => setOpen(false)} aria-label={`${t('header.language')}: ${language.toUpperCase()}. ${t('header.settings')}`}>
              <span>{language.toUpperCase()}</span><ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
            </summary>
            <div className="hs-header-popover">
              <span className="hs-header-setting-label">{t('header.language')}</span>
              <div className="hs-header-language" role="group" aria-label={t('header.language')}>
                {(['ru', 'el'] as const).map((lang) => <button type="button" key={lang} lang={lang}
                  aria-pressed={language === lang} onClick={() => setLanguage(lang)}>{t(`header.language.${lang}`)}</button>)}
              </div>
              <span className="hs-header-setting-label">{t('theme.aria')}</span>
              <ThemeSwitch labeled />
              {onLogin && <button type="button" className="hs-header-session" onClick={onLogin}>{t('landing.enter')}<ArrowUpRight size={16} aria-hidden="true" /></button>}
              {onLogout && <button type="button" className="hs-header-session" onClick={onLogout}>{t('auth.logout')}<ArrowUpRight size={16} aria-hidden="true" /></button>}
            </div>
          </details>
          <button type="button" className="hs-header-account" aria-current={page === 'home' ? 'page' : undefined} onClick={account}>
            {t(accountKey)}{page === 'auth' ? <ArrowLeft size={18} aria-hidden="true" /> : <ArrowUpRight size={18} aria-hidden="true" />}
          </button>
          <button ref={toggle} type="button" className="hs-header-toggle" aria-expanded={open} aria-controls="hs-header-menu"
            aria-label={t(open ? 'nav.close' : 'header.openMenu')} onClick={() => { if (settings.current) settings.current.open = false; setOpen(!open); }}>
            {open ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && <nav id="hs-header-menu" className="hs-header-menu" aria-label={t('nav.aria')}>
        {links}
        <button type="button" className="hs-header-account" aria-current={page === 'home' ? 'page' : undefined} onClick={account}>
          {t(accountKey)}<ArrowUpRight size={18} aria-hidden="true" />
        </button>
        {onLogin && <button type="button" className="hs-header-link" onClick={() => { closeMenu(); onLogin(); }}>{t('landing.enter')}</button>}
        {onLogout && <button type="button" className="hs-header-link" onClick={onLogout}>{t('auth.logout')}</button>}
      </nav>}
    </header>
  );
}
