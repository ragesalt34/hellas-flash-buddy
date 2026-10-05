import { useEffect, useRef, useState } from 'react';
import { bus } from '../bus';
import { enterScene } from '../story/director';
import type { StoryStore } from '../story/store';
import { World } from '../world3d/engine';
import { s } from './strings';

export function WorldCanvas({ store, onWorld }: { store: StoryStore; onWorld: (w: World | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let world: World | null = null;
    let cancelled = false;
    // Lettering is painted into canvases when a scene builds — the font must be ready first.
    void document.fonts
      .load('64px "GFS Didot"')
      .catch(() => undefined)
      .then(() => {
        if (cancelled || !ref.current) return;
        const st = store.get();
        try {
          world = new World(ref.current, {
            bus,
            start: { scene: st.scene, x: st.x, z: st.z },
            hasFlag: (flag) => store.get().world.flags.includes(flag),
            onEnterScene: (scene, x, z) => store.update((cur) => enterScene(cur, scene, x, z)),
          });
        } catch {
          setFailed(true);
          return;
        }
        onWorld(world);
        if (import.meta.env.DEV) (window as unknown as { __world?: World }).__world = world;
      });
    return () => {
      cancelled = true;
      onWorld(null);
      world?.dispose();
    };
  }, [store, onWorld]);

  if (failed) {
    return (
      <div className="screen">
        <div className="panel">{s('noWebgl')}</div>
      </div>
    );
  }
  return <div ref={ref} className="canvas" />;
}
