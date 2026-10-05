import { useState } from 'react';
import { s } from './strings';
import { useBusEvent } from './useBus';

interface Toast {
  id: number;
  text: string;
}
let seq = 0;

export function Toasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useBusEvent('toast', ({ key, value }) => {
    const t = { id: ++seq, text: s(key, value) };
    setToasts((list) => [...list, t]);
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), 2500);
  });
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  );
}
