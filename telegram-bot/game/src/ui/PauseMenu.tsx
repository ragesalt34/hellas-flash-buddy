import { useState } from 'react';
import { getStoredLanguage } from '@shared/i18n';
import { logout } from '../session';
import { s, setLanguage } from './strings';

export function PauseMenu({ onResume }: { onResume: () => void }) {
  const [, rerender] = useState(0);
  return (
    <div className="overlay">
      <div className="panel">
        <h2>{s('paused')}</h2>
        <button onClick={onResume}>{s('resume')}</button>
        <button
          className="ghost"
          onClick={() => {
            setLanguage(getStoredLanguage() === 'ru' ? 'el' : 'ru');
            rerender((n) => n + 1);
          }}
        >
          {s('language')}
        </button>
        <button className="ghost" onClick={logout}>
          {s('logout')}
        </button>
        <p className="muted">{s('controls')}</p>
      </div>
    </div>
  );
}
