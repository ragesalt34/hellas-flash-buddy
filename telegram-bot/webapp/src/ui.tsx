import { useEffect, useId, useState, type ReactNode } from 'react';
import { House, type LucideIcon } from 'lucide-react';
import { cacheGet, cacheSet } from './api';

/**
 * Stale-while-revalidate data hook: returns cached data instantly (so the
 * screen paints with no skeleton on repeat visits), then refreshes in the
 * background. An error only surfaces if there's no cached data to fall back on.
 */
export function useCached<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(() => cacheGet<T>(key));
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetcher()
      .then((v) => {
        if (!alive) return;
        cacheSet(key, v);
        setData(v);
        setErr(null);
      })
      .catch((e) => {
        if (!alive) return;
        if (cacheGet<T>(key) === undefined) setErr(e?.message ?? String(e));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data, err };
}

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
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
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
  icon: Icon,
  text,
  onHome,
}: {
  icon: LucideIcon;
  text: string;
  onHome: () => void;
}) {
  return (
    <div className="fade-in">
      <div className="empty">
        <div className="e">
          <Icon size={52} strokeWidth={1.8} />
        </div>
        <p>{text}</p>
      </div>
      <button className="btn btn-block secondary" onClick={onHome}>
        <House size={18} strokeWidth={2.4} /> Μενού
      </button>
    </div>
  );
}
