import { useEffect, useRef } from 'react';
import { bus } from '../bus';
import { loadSave, writeSave } from '../save';
import { createGame } from '../world/createGame';

export function GameCanvas({ accountId }: { accountId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const save = loadSave(localStorage, accountId);
    const game = createGame(ref.current!, { bus, save, persist: (s) => writeSave(localStorage, accountId, s) });
    return () => game.destroy(true);
  }, [accountId]);
  return <div ref={ref} className="canvas" />;
}
