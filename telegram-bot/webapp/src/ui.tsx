import { useEffect, useId, useState, type ReactNode } from 'react';

export function Skeleton({ h, w, r, style }: { h: number; w?: string; r?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="skeleton"
      style={{ height: h, width: w ?? '100%', borderRadius: r, ...style }}
    />
  );
}

/** Modern skeleton placeholder shown while a screen loads. */
export function Loading() {
  return (
    <div className="fade-in">
      <Skeleton h={120} r={26} />
      <Skeleton h={13} w="42%" style={{ margin: '22px 6px 14px' }} />
      <div className="tiles">
        <Skeleton h={56} style={{ gridColumn: 'span 2' }} />
        <Skeleton h={108} />
        <Skeleton h={108} />
        <Skeleton h={72} style={{ gridColumn: 'span 2' }} />
      </div>
    </div>
  );
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="progress">
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Animated circular progress ring with a gradient stroke. */
export function Ring({
  pct,
  size = 132,
  stroke = 12,
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const id = useId().replace(/:/g, '');
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(Math.max(0, Math.min(100, pct))), 60);
    return () => clearTimeout(t);
  }, [pct]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - shown / 100);

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-2)" />
            <stop offset="100%" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#g${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.9s var(--ease)' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function Empty({
  emoji,
  text,
  onHome,
}: {
  emoji: string;
  text: string;
  onHome: () => void;
}) {
  return (
    <div className="fade-in">
      <div className="empty">
        <div className="e">{emoji}</div>
        <p>{text}</p>
      </div>
      <button className="btn btn-block secondary" onClick={onHome}>
        🏠 Μενού
      </button>
    </div>
  );
}
