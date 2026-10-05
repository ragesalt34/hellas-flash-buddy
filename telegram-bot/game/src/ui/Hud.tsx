import { useState, useSyncExternalStore } from 'react';
import { getStoredLanguage } from '@shared/i18n';
import { SCENES } from '../content/chapter1';
import type { Session } from '../session';
import { requestProgress } from '../story/requests';
import type { StoryStore } from '../story/store';
import { dayKey } from '../story/wordSrs';
import { s } from './strings';
import { useBusEvent } from './useBus';

export function Hud({ session, store }: { session: Session; store: StoryStore }) {
  useSyncExternalStore(store.subscribe, store.version);
  const [near, setNear] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  useBusEvent('world:near', ({ npcId }) => setNear(npcId));
  useBusEvent('world:freeze', ({ frozen: f }) => setFrozen(f));
  const st = store.get();
  const scene = SCENES.find((x) => x.id === st.scene);
  const { done, total } = requestProgress(st.requests, dayKey());
  return (
    <>
      <div className="hud">
        <span className="badge">{scene ? scene[getStoredLanguage()] : st.scene}</span>
        <span className="spacer" />
        {total > 0 && (
          <span className="badge">
            {s('today')}: {done}/{total}
          </span>
        )}
        <span className="badge">
          {s('streak')}: {session.streak}
        </span>
        {session.offline && <span className="badge off">{s('offline')}</span>}
      </div>
      {near && !frozen && <div className="talk-hint">{s('talk')}</div>}
    </>
  );
}
