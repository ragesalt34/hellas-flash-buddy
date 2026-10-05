import { useSyncExternalStore } from 'react';
import { ITEMS } from '../content/chapter1';
import type { StoryStore } from '../story/store';

export function Inventory({ store }: { store: StoryStore }) {
  useSyncExternalStore(store.subscribe, store.version);
  const items = store.get().world.inventory;
  if (items.length === 0) return null;
  return (
    <div className="inventory">
      {items.map((id) => (
        <span key={id} className="item">
          {ITEMS[id].icon}
        </span>
      ))}
    </div>
  );
}
