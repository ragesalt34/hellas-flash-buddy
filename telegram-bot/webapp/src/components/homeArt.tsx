/* Line drawings for the home screen, in the same hand as the topic emblems
   (statsArt.tsx): 32×32, stroke = currentColor, soft fills at low opacity.
   Parts that move on hover carry an ha-* class; the motion lives in CSS and
   is dropped under prefers-reduced-motion. */

import type { ReactNode } from 'react';

function Svg({ className, children }: { className: string; children: ReactNode }) {
  return (
    <svg className={`ha ${className}`} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** Wax writing tablet (δέλτος) with a stylus — the quiz. */
export function WaxTablet({ className = '' }: { className?: string }) {
  return (
    <Svg className={`ha-tablet ${className}`}>
      <rect x="4.5" y="7" width="19" height="20.5" rx="2.2" />
      <rect className="ha-soft" x="7.2" y="9.7" width="13.6" height="15.1" rx="1" />
      <path d="M10 13.4 H18 M10 16.6 H15.6" />
      <path className="ha-check" d="M10.4 20.6 L12.8 22.9 L17.6 18.4" />
      <g className="ha-stylus">
        <path d="M21.6 25.2 L28.2 5.6" />
        <path d="M27.1 4.9 L29.6 5.8 L29 7.6 L26.5 6.7 Z" />
        <path d="M21.6 25.2 L21.1 27.3 L22.5 25.6" />
      </g>
    </Svg>
  );
}

/** Three potsherds (ostraka) with letters — the flashcards. */
export function Ostraka({ className = '' }: { className?: string }) {
  return (
    <Svg className={`ha-ostraka ${className}`}>
      <g className="ha-sherd back">
        <path className="ha-soft" d="M11 4.6 L21.5 3.5 L25.4 8.2 L24 14.6 L13.6 16 L9.4 10.6 Z" />
        <path d="M11 4.6 L21.5 3.5 L25.4 8.2 L24 14.6 L13.6 16 L9.4 10.6 Z" />
        <path d="M15.4 11.8 L17.4 7 L19.4 11.8" />
      </g>
      <g className="ha-sherd front">
        <path className="ha-soft" d="M5.4 13.4 L16.8 11.2 L21.4 15.8 L20 25.6 L9.6 27.8 L4.6 22 Z" />
        <path d="M5.4 13.4 L16.8 11.2 L21.4 15.8 L20 25.6 L9.6 27.8 L4.6 22 Z" />
        <path d="M9.8 23.6 L12.6 16.2 L15.4 23.6 M10.9 21 H14.3" />
      </g>
    </Svg>
  );
}

/** An unrolled papyrus with "ΑΩ", first to last letter — the vocabulary. */
export function Papyrus({ className = '' }: { className?: string }) {
  return (
    <Svg className={`ha-papyrus ${className}`}>
      <path className="ha-soft ha-sheet" d="M7 7.6 H25 V24.4 H7 Z" />
      <path className="ha-sheet" d="M7 7.6 H25 M7 24.4 H25" />
      <rect x="3" y="5.8" width="4.4" height="20.4" rx="2.2" />
      <g className="ha-roll">
        <rect x="24.6" y="5.8" width="4.4" height="20.4" rx="2.2" />
      </g>
      <path d="M9.2 19.4 L11.5 12.4 L13.8 19.4 M10.1 17.1 H12.9" />
      <path d="M15.6 19.4 H17.4 C15.9 18.2 15.5 16.4 16 14.9 C16.5 13.3 17.9 12.4 18.9 12.4 C19.9 12.4 21.3 13.3 21.8 14.9 C22.3 16.4 21.9 18.2 20.4 19.4 H22.2" />
      <path d="M9.6 22 H22" />
    </Svg>
  );
}

/** Three fluted columns of different heights on a stylobate — the statistics. */
export function ColumnChart({ className = '' }: { className?: string }) {
  const cols = [
    { x: 5.6, top: 16.5 },
    { x: 13.5, top: 11 },
    { x: 21.4, top: 6.5 },
  ];
  return (
    <Svg className={`ha-chart ${className}`}>
      {cols.map((c, i) => (
        <g key={i} className={`ha-col c${i + 1}`}>
          <rect className="ha-soft" x={c.x} y={c.top + 2} width="5" height={22.4 - c.top} />
          <path d={`M${c.x} ${c.top + 2} V24.4 M${c.x + 5} ${c.top + 2} V24.4`} />
          <path className="ha-flute" d={`M${c.x + 2.5} ${c.top + 4.2} V22.4`} />
          <path d={`M${c.x - 1.2} ${c.top} H${c.x + 6.2} M${c.x - 0.2} ${c.top + 2} H${c.x + 5.2}`} />
        </g>
      ))}
      <path d="M3.5 24.4 H28.5 M2.5 27.6 H29.5" />
    </Svg>
  );
}

/** Clay oil lamp (λύχνος) with a flickering flame — the day streak. */
export function OilLamp({ className = '' }: { className?: string }) {
  return (
    <Svg className={`ha-lamp ${className}`}>
      <path className="ha-flame" d="M26.6 15.2 C24.4 12.8 25.6 9.4 27 6.8 C28.8 9.6 30.2 12.6 26.6 15.2 Z" />
      <path className="ha-soft" d="M6.2 21.4 C6 17.8 11 16.2 16 16.6 C20 17 22.4 17.8 25.4 16.4 L27.4 15.6 C27 19.4 23.8 22.6 17.8 23 C12 23.4 6.6 23.2 6.2 21.4 Z" />
      <path d="M6.2 21.4 C6 17.8 11 16.2 16 16.6 C20 17 22.4 17.8 25.4 16.4 L27.4 15.6 C27 19.4 23.8 22.6 17.8 23 C12 23.4 6.6 23.2 6.2 21.4 Z" />
      <path d="M6.6 19.8 C3.4 19.4 3.4 15.4 6.8 15.8 C8.2 16 8.6 17 8.4 17.8" />
      <path d="M12.2 23.1 L11.2 25.8 H19.4 L18.4 23" />
      <path d="M15 18.6 C15.8 18 17.2 18 18 18.6" />
    </Svg>
  );
}

const LEAF = 'M0 0 C2.2 -2.4 6.2 -2.5 8.6 0 C6.2 2.5 2.2 2.4 0 0 Z';

/** Laurel sprig — words learned: pointed leaves in pairs along a curved stem. */
export function LaurelSprig({ className = '' }: { className?: string }) {
  const nodes = [
    { x: 10.2, y: 23.6 },
    { x: 13.8, y: 18.8 },
    { x: 17.6, y: 14 },
  ];
  return (
    <Svg className={`ha-laurel ${className}`}>
      <path d="M6.5 28 C10 24 15 17.5 21.5 9.5" />
      {nodes.map((n, i) => (
        <g key={i}>
          <path className="ha-soft" d={LEAF} transform={`translate(${n.x} ${n.y}) rotate(-128)`} />
          <path d={LEAF} transform={`translate(${n.x} ${n.y}) rotate(-128)`} />
          <path className="ha-soft" d={LEAF} transform={`translate(${n.x} ${n.y}) rotate(4)`} />
          <path d={LEAF} transform={`translate(${n.x} ${n.y}) rotate(4)`} />
        </g>
      ))}
      <path className="ha-soft" d={LEAF} transform="translate(21.4 9.6) rotate(-54)" />
      <path d={LEAF} transform="translate(21.4 9.6) rotate(-54)" />
    </Svg>
  );
}

/** Round hoplite shield (aspis) with its boss — accuracy. */
export function Aspis({ className = '' }: { className?: string }) {
  return (
    <Svg className={`ha-aspis ${className}`}>
      <circle className="ha-soft" cx="16" cy="16" r="12" />
      <circle cx="16" cy="16" r="12" />
      <circle cx="16" cy="16" r="8.4" />
      <circle className="ha-dot" cx="16" cy="16" r="2.6" />
      <path d="M16 7.6 V10 M16 22 V24.4 M7.6 16 H10 M22 16 H24.4" />
    </Svg>
  );
}

/** An hourglass — time left until the interview. */
export function Hourglass({ className = '' }: { className?: string }) {
  return (
    <Svg className={`ha-hourglass ${className}`}>
      <path d="M8 4.5 H24 M8 27.5 H24" />
      <path d="M10 4.5 C10 11 14.6 13.4 16 16 C17.4 13.4 22 11 22 4.5" />
      <path d="M10 27.5 C10 21 14.6 18.6 16 16 C17.4 18.6 22 21 22 27.5" />
      <path className="ha-soft ha-sand" d="M11.6 27 C12.4 23.4 14.6 21.6 16 20.2 C17.4 21.6 19.6 23.4 20.4 27 Z" />
      <path className="ha-soft" d="M12.4 8.2 H19.6 C19 10.6 17.2 12 16 13.4 C14.8 12 13 10.6 12.4 8.2 Z" />
      <path className="ha-stream" d="M16 16.6 V20" />
    </Svg>
  );
}

/** A Cycladic house with its dome — home (the temple is the logo's, not a nav item). */
export function CycladicHome({ className = '' }: { className?: string }) {
  return (
    <Svg className={`ha-house ${className}`}>
      <path className="ha-soft" d="M8.5 14.5 C8.5 9.6 13.8 8.6 16.4 8.6 C19 8.6 22.5 10.4 22.5 14.5 Z" />
      <path d="M8.5 14.5 C8.5 9.6 13.8 8.6 16.4 8.6 C19 8.6 22.5 10.4 22.5 14.5" />
      <path d="M15.5 8.7 V5.6 M14 6.9 H17" />
      <path d="M5.5 14.5 H26.5 M6.5 14.5 V27 H25.5 V14.5" />
      <path d="M13 27 V21.4 C13 19.6 14.4 18.4 16 18.4 C17.6 18.4 19 19.6 19 21.4 V27" />
      <path d="M4 27 H28" />
    </Svg>
  );
}

/** Athena's owl — the explanation after an answer. */
export function Owl({ className = '' }: { className?: string }) {
  return (
    <Svg className={`ha-owl ${className}`}>
      <path className="ha-soft" d="M9 27 C6.8 20 7.6 10.8 16 10.8 C24.4 10.8 25.2 20 23 27 Z" />
      <path d="M9 27 C6.8 20 7.6 10.8 16 10.8 C24.4 10.8 25.2 20 23 27 Z" />
      <path d="M10 12.6 L9.2 7 L13.4 10.4 M22 12.6 L22.8 7 L18.6 10.4" />
      <circle cx="12.8" cy="16" r="2.7" />
      <circle cx="19.2" cy="16" r="2.7" />
      <circle className="ha-dot" cx="12.9" cy="16.2" r="1" />
      <circle className="ha-dot" cx="19.1" cy="16.2" r="1" />
      <path d="M15.2 19 L16 20.8 L16.8 19" />
      <path d="M12.6 23.2 L14.3 24.4 L16 23.2 L17.7 24.4 L19.4 23.2" />
      <path d="M6 27 H26" />
    </Svg>
  );
}
