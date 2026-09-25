/* Illustrations for the readiness screen. Unlike the .hs-deco ornaments these
   carry data (column heights, active days), so they render in both themes;
   every colour comes from CSS classes (see "Readiness art" in styles.css). */

const tone = (pct: number) => (pct >= 0.85 ? 'h3' : pct >= 0.6 ? 'h2' : pct > 0 ? 'h1' : 'h0');

/** Line glyph for a topic, drawn in a 32×32 box with currentColor. */
export function TopicGlyph({ topic }: { topic: string }) {
  switch (topic) {
    case 'history': // Corinthian helmet, front view, with crest
      return (
        <g className="g">
          <path className="g-soft" d="M10.5 9 C10 3.2 22 3.2 21.5 9 Z" />
          <path d="M10.5 9 C10 3.2 22 3.2 21.5 9 M13 8 V5.6 M16 7.6 V4.4 M19 8 V5.6" />
          <path className="g-soft" d="M9 17 C9 11 12 7.5 16 7.5 C20 7.5 23 11 23 17 V24 C23 25.6 21.4 26.2 20.2 25.2 L18.2 22.2 L17.2 19.2 H14.8 L13.8 22.2 L11.8 25.2 C10.6 26.2 9 25.6 9 24 Z" />
          <path d="M9 17 C9 11 12 7.5 16 7.5 C20 7.5 23 11 23 17 V24 C23 25.6 21.4 26.2 20.2 25.2 L18.2 22.2 L17.2 19.2 H14.8 L13.8 22.2 L11.8 25.2 C10.6 26.2 9 25.6 9 24 Z" />
          <path d="M11.2 14.8 C13.2 13.9 18.8 13.9 20.8 14.8 M16 14.4 V19.2" />
        </g>
      );
    case 'culture': // lyre
      return (
        <g className="g">
          <path className="g-soft" d="M9.5 20.5 C9.5 27 22.5 27 22.5 20.5 Z" />
          <path d="M9.5 20.5 C9.5 27 22.5 27 22.5 20.5 Z" />
          <path d="M11 20.5 C6.8 16.5 6.4 10.4 9.8 7.6 C11.2 6.5 12.8 7 12.9 8.6 M21 20.5 C25.2 16.5 25.6 10.4 22.2 7.6 C20.8 6.5 19.2 7 19.1 8.6" />
          <path d="M8.6 10.8 H23.4" />
          <path d="M14 10.8 V22.6 M16 10.8 V23 M18 10.8 V22.6" />
        </g>
      );
    case 'laws': // scales of Themis
      return (
        <g className="g">
          <path d="M16 5.5 V26 M11 26 H21 M6.5 9.5 H25.5" />
          <circle className="g-dot" cx="16" cy="5.5" r="1.4" />
          <path d="M6.5 9.5 L3.5 17.5 M6.5 9.5 L9.5 17.5 M25.5 9.5 L22.5 17.5 M25.5 9.5 L28.5 17.5" />
          <path className="g-soft" d="M3 17.5 H10 C9.6 20 7.9 21 6.5 21 C5.1 21 3.4 20 3 17.5 Z M22 17.5 H29 C28.6 20 26.9 21 25.5 21 C24.1 21 22.4 20 22 17.5 Z" />
          <path d="M3 17.5 H10 C9.6 20 7.9 21 6.5 21 C5.1 21 3.4 20 3 17.5 Z M22 17.5 H29 C28.6 20 26.9 21 25.5 21 C24.1 21 22.4 20 22 17.5 Z" />
        </g>
      );
    case 'geography': // trireme under sail, on waves
      return (
        <g className="g">
          <path className="g-soft" d="M16.5 5.5 L24 16.5 H16.5 Z" />
          <path d="M16.5 4.5 V19 M16.5 5.5 L24 16.5 H16.5" />
          <path d="M4 19 H28 L25 23 H8.5 Z" />
          <path d="M4 19 C3 18 3 16.8 4.4 16.4" />
          <path d="M11 23 L10 25.6 M15 23 L14 25.6 M19 23 L18 25.6 M23 23 L22 25.6" />
          <path d="M3 28 C4.5 27 6 27 7.5 28 S10.5 29 12 28 S15 27 16.5 28 S19.5 29 21 28 S24 27 25.5 28 S28.5 29 29.5 28" />
        </g>
      );
    default: // a plain column
      return (
        <g className="g">
          <path d="M9 7 H23 M10.5 9.5 H21.5 M12 9.5 V24 M16 9.5 V24 M20 9.5 V24 M10 24 H22 M8.5 27 H23.5" />
        </g>
      );
  }
}

export function TopicEmblem({ topic, className }: { topic: string; className?: string }) {
  return (
    <svg
      className={`rd-emblem tp-${topic}${className ? ` ${className}` : ''}`}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <TopicGlyph topic={topic} />
    </svg>
  );
}

/** A temple whose columns are the topics: each shaft is built up to that
 * topic's Greek coverage; a finished column gets its capital, and the
 * entablature and pediment go on only when every column is finished. */
export function ParthenonProgress({ topics }: { topics: { topic: string; label: string; pct: number }[] }) {
  const n = Math.max(1, topics.length);
  const left = 34;
  const span = 172;
  const w = Math.min(20, (span / n) * 0.46);
  const top = 62;
  const bottom = 130;
  const h = bottom - top;
  const complete = topics.length > 0 && topics.every((t) => t.pct >= 0.85);
  const roof = complete ? 't-solid' : 't-ghost';

  return (
    <svg className="rd-temple" viewBox="0 0 240 196" aria-hidden="true" focusable="false">
      <ellipse className="t-shadow" cx="120" cy="160" rx="112" ry="4" />

      {/* entablature + pediment: pencilled in until every column is finished */}
      <g className={roof}>
        <path d="M18 44 L120 13 L222 44 Z" />
        <path className="t-tympanum" d="M34 40.5 L120 17.5 L206 40.5 Z" />
        <rect x="18" y="44" width="204" height="11" rx="1" />
      </g>
      {complete && (
        <g className="t-frieze">
          {Array.from({ length: 13 }, (_, i) => (
            <rect key={i} x={24 + i * 15.2} y="46.5" width="3.2" height="6" rx="0.6" />
          ))}
          <circle cx="120" cy="32" r="4.2" />
          <path className="t-acro" d="M18 44 C13 44 11 40.5 12.5 37.5 C14.5 39.5 16.5 41 18 44 Z M222 44 C227 44 229 40.5 227.5 37.5 C225.5 39.5 223.5 41 222 44 Z M120 13 C117 10.5 117.5 6.5 120 5 C122.5 6.5 123 10.5 120 13 Z" />
        </g>
      )}

      {topics.map((t, i) => {
        const c = left + (span / n) * (i + 0.5);
        const x = c - w / 2;
        const done = t.pct >= 0.85;
        // A finished topic is a finished column, even short of 100%.
        const filled = done ? h : t.pct > 0 ? Math.max(6, t.pct * h) : 0;
        return (
          <g key={t.topic}>
            <title>{`${t.label} — ${Math.round(t.pct * 100)}%`}</title>
            <rect className="t-ghost" x={x} y={top} width={w} height={h} rx="1.5" />
            {filled > 0 && (
              <g className="t-rise">
                <rect className={`t-fill ${tone(t.pct)}`} x={x} y={bottom - filled} width={w} height={filled} rx="1.5" />
                {[-0.25, 0, 0.25].map((f) => (
                  <line
                    key={f}
                    className="t-flute"
                    x1={c + f * w}
                    x2={c + f * w}
                    y1={bottom - filled + 3}
                    y2={bottom - 2}
                  />
                ))}
              </g>
            )}
            <g className={done ? 't-cap' : 't-ghost'}>
              <path d={`M${x} ${top} L${x - 3} ${top - 4.5} H${x + w + 3} L${x + w} ${top} Z`} />
              <rect x={x - 5} y={top - 7.5} width={w + 10} height="3" rx="0.8" />
            </g>
            <rect className="t-plinth" x={x - 3} y={bottom} width={w + 6} height="4" rx="1" />
            <g transform={`translate(${c - 8} 163) scale(0.5)`} className={`t-glyph tp-${t.topic}`}>
              <TopicGlyph topic={t.topic} />
            </g>
            <text className={`t-pct ${tone(t.pct)}`} x={c} y="192" textAnchor="middle">
              {Math.round(t.pct * 100)}%
            </text>
          </g>
        );
      })}

      <rect className="t-step" x="22" y="134" width="196" height="8" rx="1.5" />
      <rect className="t-step" x="14" y="142" width="212" height="8" rx="1.5" />
      <rect className="t-step" x="6" y="150" width="228" height="8" rx="1.5" />
    </svg>
  );
}

export type MedalKind = 'greek' | 'words' | 'memory' | 'russian';

/** Coin-like medallion with a beaded rim and the criterion's symbol. */
export function Medallion({ kind }: { kind: MedalKind }) {
  return (
    <svg className={`rd-medal k-${kind}`} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <circle className="m-rim" cx="20" cy="20" r="19" />
      <circle className="m-bead" cx="20" cy="20" r="16.6" />
      <circle className="m-face" cx="20" cy="20" r="14.2" />
      {kind === 'greek' && (
        <text className="m-letter" x="20" y="26.2" textAnchor="middle">
          Α
        </text>
      )}
      {kind === 'russian' && (
        <text className="m-letter" x="20" y="26.2" textAnchor="middle">
          Я
        </text>
      )}
      {kind === 'words' && (
        <g className="m-line">
          <path className="m-soft" d="M14 13 H26 V27 H14 Z" />
          <rect x="12" y="11" width="16" height="3.2" rx="1.6" />
          <rect x="12" y="25.8" width="16" height="3.2" rx="1.6" />
          <path d="M16.3 17.4 H23.7 M16.3 20 H23.7 M16.3 22.6 H21.2" />
        </g>
      )}
      {kind === 'memory' && (
        <g className="m-line">
          <path className="m-soft" d="M14 29 C12.2 22.5 13 15.4 20 15.4 C27 15.4 27.8 22.5 26 29 Z" />
          <path d="M14 29 C12.2 22.5 13 15.4 20 15.4 C27 15.4 27.8 22.5 26 29 Z" />
          <path d="M14.8 16.8 L14.2 12.4 L17.6 15.1 M25.2 16.8 L25.8 12.4 L22.4 15.1" />
          <circle className="m-eye" cx="17.2" cy="19.6" r="2.5" />
          <circle className="m-eye" cx="22.8" cy="19.6" r="2.5" />
          <circle className="m-pupil" cx="17.4" cy="19.8" r="1" />
          <circle className="m-pupil" cx="22.6" cy="19.8" r="1" />
          <path className="m-beak" d="M19.2 21.8 L20 23.6 L20.8 21.8 Z" />
          <path d="M16.6 25.6 L18.1 26.6 L19.6 25.6 M20.4 25.6 L21.9 26.6 L23.4 25.6" />
        </g>
      )}
    </svg>
  );
}

const STEM_Y = (x: number) => 14 + 3.2 * Math.sin((x / 300) * Math.PI);

/** Five weeks as five olive twigs; each olive is a day, ripe when studied. */
export function OliveCalendar({ days, active, today }: { days: string[]; active: Set<string>; today: string }) {
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const stem = Array.from({ length: 31 }, (_, i) => {
    const x = 4 + i * 9.7;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${STEM_Y(x).toFixed(2)}`;
  }).join(' ');
  return (
    <div className="rd-olives">
      {weeks.map((week, wi) => (
        <svg key={wi} className="rd-olive-week" viewBox="0 0 300 42" aria-hidden="true" focusable="false">
          <path className="o-stem" d={stem} />
          {Array.from({ length: 8 }, (_, i) => {
            const x = 12 + i * 40;
            const y = STEM_Y(x);
            const up = i % 2 === 0;
            const rot = up ? -32 : 30;
            return (
              <ellipse
                key={i}
                className={`o-leaf${i % 3 === 0 ? ' dark' : ''}`}
                cx={x + 6}
                cy={y + (up ? -5 : 5.5)}
                rx="9"
                ry="2.9"
                transform={`rotate(${rot} ${x + 6} ${y + (up ? -5 : 5.5)})`}
              />
            );
          })}
          {week.map((d, i) => {
            const x = 30 + i * 40;
            const y = STEM_Y(x) + 12;
            const on = active.has(d);
            return (
              <g key={d}>
                <title>{d}</title>
                <path className="o-stalk" d={`M${x} ${STEM_Y(x) + 1} C${x + 1.5} ${y - 7} ${x} ${y - 8} ${x} ${y - 8}`} />
                <ellipse className={on ? 'o-on' : 'o-off'} cx={x} cy={y} rx="6.2" ry="7.8" />
                {on && <ellipse className="o-shine" cx={x - 2} cy={y - 2.6} rx="1.7" ry="2.3" />}
                {d === today && <ellipse className="o-today" cx={x} cy={y} rx="9.6" ry="11" />}
              </g>
            );
          })}
        </svg>
      ))}
    </div>
  );
}

/** Two laurel leaves — marks a quiz passed with 80% or more. */
export function LaurelMark() {
  return (
    <svg className="rd-laurel" viewBox="0 0 20 16" aria-hidden="true" focusable="false">
      <path className="l-stem" d="M10 15 C10 11 10 8 10 6" />
      <ellipse className="l-leaf" cx="6.2" cy="7.5" rx="5" ry="2" transform="rotate(38 6.2 7.5)" />
      <ellipse className="l-leaf" cx="13.8" cy="7.5" rx="5" ry="2" transform="rotate(-38 13.8 7.5)" />
      <ellipse className="l-leaf" cx="10" cy="3.4" rx="1.8" ry="3.4" />
    </svg>
  );
}
