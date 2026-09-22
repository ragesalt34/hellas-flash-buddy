// Greek decorative artwork — the supplied PNG set in public/greek/.
//
// Purely ornamental: empty alt + aria-hidden, never draggable, never a click
// target (pointer-events: none in CSS), and it carries .hs-deco so the square
// theme hides it. Callers position and size it with their own class.

export type GreekAsset =
  | 'column'
  | 'temple'
  | 'amphora'
  | 'olive-branch'
  | 'olive-branch-small'
  | 'laurel-branch'
  | 'greek-key'
  | 'greek-key-small'
  | 'decorative-corner'
  | 'decorative-diamond'
  | 'decorative-line'
  | 'hill-temple'
  | 'bg-shape-1'
  | 'bg-shape-2'
  | 'bg-shape-3';

export function Greek({ name, className }: { name: GreekAsset; className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}greek/${name}.png`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={`hs-deco greek${className ? ` ${className}` : ''}`}
    />
  );
}
