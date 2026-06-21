// Minimal typings + helpers around the Telegram WebApp JS bridge.
// https://core.telegram.org/bots/webapps

type ThemeParams = Record<string, string>;

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: { id: number; first_name?: string; last_name?: string; username?: string };
  };
  colorScheme: 'light' | 'dark';
  themeParams: ThemeParams;
  viewportStableHeight: number;
  isExpanded: boolean;
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  onEvent: (event: string, cb: () => void) => void;
  offEvent: (event: string, cb: () => void) => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export const tg: TelegramWebApp | undefined = window.Telegram?.WebApp;

// Our own brand background per scheme — must match :root / [data-scheme="dark"] --tg-bg in styles.css.
const APP_BG_LIGHT = '#f3f5f9';
const APP_BG_DARK = '#0f1620';

/**
 * Switch light/dark scheme only. We intentionally do NOT inherit the user's literal
 * Telegram theme colors (themeParams) — on AMOLED "pure black" themes that made every
 * surface collapse to near-black. Our own palette (defined in styles.css) already has
 * a tuned dark mode; we just keep Telegram's own chrome (status bar/notch) in sync with it.
 */
export function applyTheme(): void {
  if (!tg) return;
  document.documentElement.dataset.scheme = tg.colorScheme;

  const bg = tg.colorScheme === 'dark' ? APP_BG_DARK : APP_BG_LIGHT;
  try {
    tg.setBackgroundColor(bg);
    tg.setHeaderColor(bg);
  } catch {
    /* older clients: ignore */
  }
}

/** Keep --app-height in sync with Telegram's stable viewport (avoids the iOS 100vh bug). */
function syncViewport(): void {
  const h = tg?.viewportStableHeight || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${h}px`);
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  tg?.HapticFeedback?.impactOccurred(style);
}

export function notify(type: 'error' | 'success' | 'warning'): void {
  tg?.HapticFeedback?.notificationOccurred(type);
}

export function selectionChanged(): void {
  tg?.HapticFeedback?.selectionChanged();
}

export function initTelegram(): void {
  if (!tg) {
    document.documentElement.style.setProperty('--app-height', '100vh');
    return;
  }
  tg.ready();
  tg.expand();
  applyTheme();
  syncViewport();
  tg.onEvent('themeChanged', applyTheme);
  tg.onEvent('viewportChanged', syncViewport);
}
