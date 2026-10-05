import { useEffect, useState } from 'react';
import { getToken } from '@shared/auth';
import { GUEST_KEY, startSession, type Session } from './session';
import { Loading } from './ui/Loading';
import { Login } from './ui/Login';

type Phase =
  | { name: 'login' }
  | { name: 'loading'; attempt: number }
  | { name: 'error' }
  | { name: 'play'; session: Session };

const initialPhase = (): Phase =>
  getToken() || localStorage.getItem(GUEST_KEY) ? { name: 'loading', attempt: 0 } : { name: 'login' };

export function App() {
  const [phase, setPhase] = useState<Phase>(initialPhase);

  useEffect(() => {
    if (phase.name !== 'loading') return;
    let cancelled = false;
    startSession((attempt) => {
      if (!cancelled) setPhase({ name: 'loading', attempt });
    })
      .then((session) => {
        if (cancelled) session.stop();
        else setPhase({ name: 'play', session });
      })
      .catch(() => {
        if (!cancelled) setPhase({ name: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [phase.name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F11') return;
      e.preventDefault();
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  switch (phase.name) {
    case 'login':
      return <Login onDone={() => setPhase({ name: 'loading', attempt: 0 })} />;
    case 'loading':
      return <Loading attempt={phase.attempt} />;
    case 'error':
      return <Loading attempt={0} error onRetry={() => setPhase({ name: 'loading', attempt: 0 })} />;
    case 'play':
      return <div className="stage" />;
  }
}
