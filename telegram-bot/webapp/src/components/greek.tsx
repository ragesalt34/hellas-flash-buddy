// Greek decorative artwork — the supplied PNG sets in public/greek/
// (common/ for the shared set, vocab/ for the vocabulary screen only; see
// public/greek/README.md).
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
      src={`${import.meta.env.BASE_URL}greek/common/${name}.png`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={`hs-deco greek${className ? ` ${className}` : ''}`}
    />
  );
}

/** The vocabulary screen's own set (public/greek/vocab/), cut from that
 * screen's reference. Used there and nowhere else. */
export type VocabArtAsset =
  | '01_column_left'
  | '02_olive_branch_top_left'
  | '03_parthenon_top_right'
  | '04_greek_meander_top_right'
  | '05_sparkle_right'
  | '06_amphora_bottom_left'
  | '07_olive_branch_bottom_left'
  | '08_olive_branch_bottom_right'
  | '09_card_greek_corner'
  | '10_card_olive_branch'
  | '11_card_temple_icon'
  | '12_greek_corner_bottom_button';

export function VocabArt({ name, className }: { name: VocabArtAsset; className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}greek/vocab/${name}.png`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={`hs-deco greek${className ? ` ${className}` : ''}`}
    />
  );
}
