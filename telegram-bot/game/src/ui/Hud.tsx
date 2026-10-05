import { useState, useSyncExternalStore } from 'react';
import { getStoredLanguage } from '@shared/i18n';
import type { HudState } from '../bus';
import type { Session } from '../session';
import { ROOMS, type RoomId } from '../world/rooms';
import { s } from './strings';
import { useBusEvent } from './useBus';

export function Hud({ session }: { session: Session }) {
  const [hud, setHud] = useState<HudState | null>(null);
  useBusEvent('hud:update', setHud);
  const { controller } = session;
  useSyncExternalStore(controller.subscribe, () => controller.version());
  const { done, total } = controller.progress();
  if (!hud) return null;
  const room = ROOMS[hud.room as RoomId];
  return (
    <div className="hud">
      <span className="hearts">
        {'♥'.repeat(Math.max(0, hud.hp))}
        {'♡'.repeat(Math.max(0, hud.maxHp - hud.hp))}
      </span>
      <span className="badge">{room ? room.name[getStoredLanguage()] : hud.room}</span>
      {hud.dash && <span className="badge">{s('dash')}</span>}
      {hud.doubleJump && <span className="badge">{s('doubleJump')}</span>}
      <span className="spacer" />
      <span className="badge">
        {s('today')}: {done}/{total}
      </span>
      <span className="badge">
        {s('streak')}: {session.streak}
      </span>
      {session.offline && <span className="badge off">{s('offline')}</span>}
    </div>
  );
}
