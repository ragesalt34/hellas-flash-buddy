import { useCallback, useEffect, useMemo, useState } from 'react';
import { bus } from '../bus';
import type { Session } from '../session';
import { StoryStore } from '../story/store';
import type { World } from '../world3d/engine';
import { ChallengeDialog } from './ChallengeDialog';
import { Hud } from './Hud';
import { PauseMenu } from './PauseMenu';
import { Toasts } from './Toasts';
import { WorldCanvas } from './WorldCanvas';

export function Play({ session }: { session: Session }) {
  const store = useMemo(() => new StoryStore(session.accountId, localStorage), [session.accountId]);
  const [, setWorld] = useState<World | null>(null);
  const onWorld = useCallback((w: World | null) => setWorld(w), []);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    bus.emit('world:freeze', { frozen: paused });
  }, [paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || session.controller.current()) return;
      setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);

  return (
    <div className="stage">
      <WorldCanvas store={store} onWorld={onWorld} />
      <Hud session={session} store={store} />
      <Toasts />
      <ChallengeDialog controller={session.controller} />
      {paused && <PauseMenu onResume={() => setPaused(false)} />}
    </div>
  );
}
