import { useCallback, useEffect, useState } from 'react';
import { bus } from '../bus';
import type { Session } from '../session';
import { ChallengeDialog } from './ChallengeDialog';
import { Hud } from './Hud';
import { PauseMenu } from './PauseMenu';
import { Toasts } from './Toasts';
import { useBusEvent } from './useBus';
import { Victory } from './Victory';

export function Play({ session }: { session: Session }) {
  const [paused, setPaused] = useState(false);
  const [victory, setVictory] = useState(false);
  useBusEvent('boss:defeated', () => setVictory(true));

  const setPause = useCallback((p: boolean) => {
    setPaused(p);
    bus.emit('game:pause', { paused: p });
  }, []);
  const closeVictory = useCallback(() => setVictory(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || session.controller.current() || victory) return;
      setPause(!paused);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, victory, session, setPause]);

  const { done, total } = session.controller.progress();
  return (
    <div className="stage">
      <div className="canvas" />
      <Hud session={session} />
      <Toasts />
      <ChallengeDialog controller={session.controller} />
      {paused && <PauseMenu onResume={() => setPause(false)} />}
      {victory && <Victory done={done} total={total} onClose={closeVictory} />}
    </div>
  );
}
