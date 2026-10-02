/* Watercolour "rewards" pack (public/assets/rewards/): the golden wreath that
   frames a final score, and the prize amphora and olive bundle that stand on
   either side of a result card on wide screens. */

const BASE = `${import.meta.env.BASE_URL}assets/rewards/`;

/** The golden laurel wreath. Not .hs-deco: it carries the score, so the square
 * theme keeps it too. */
export function RewardWreath({ className = '' }: { className?: string }) {
  return (
    <img
      className={`reward-wreath${className ? ` ${className}` : ''}`}
      src={`${BASE}wreath.webp`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}

/** A prize on the left (the amphora, or the owl coin where the screen's own
 * frame already has an amphora), olive bundle on the right; both face the
 * card. Decorative; only shown where the gutter allows. */
export function RewardSides({ left = 'amphora' }: { left?: 'amphora' | 'coin' }) {
  return (
    <>
      <img className={`hs-deco reward-side rs-left rs-${left}`} src={`${BASE}${left}.webp`} alt="" aria-hidden="true" draggable={false} decoding="async" />
      <img className="hs-deco reward-side rs-right" src={`${BASE}olives.webp`} alt="" aria-hidden="true" draggable={false} decoding="async" />
    </>
  );
}
