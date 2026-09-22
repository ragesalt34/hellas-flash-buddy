// Decoration for the Vocabulary / flashcard-answer screen, and only that screen.
//
// Every piece is a PNG from public/assets/menus/vocabulary/, cut from that
// screen's reference, and each has exactly one place: the config below names
// the file for each slot, and Vocab.tsx is its only importer. Nothing here is
// meant for any other page.

const BASE = `${import.meta.env.BASE_URL}assets/menus/vocabulary/`;

export const VOCABULARY_DECOR = {
  columnLeft: `${BASE}01_column_left.png`,
  oliveTopLeft: `${BASE}02_olive_branch_top_left.png`,
  parthenonTopRight: `${BASE}03_parthenon_top_right.png`,
  meanderTopRight: `${BASE}04_greek_meander_top_right.png`,
  sparkleRight: `${BASE}05_sparkle_right.png`,
  amphoraBottomLeft: `${BASE}06_amphora_bottom_left.png`,
  oliveBottomLeft: `${BASE}07_olive_branch_bottom_left.png`,
  oliveBottomRight: `${BASE}08_olive_branch_bottom_right.png`,
  cardGreekCorner: `${BASE}09_card_greek_corner.png`,
  cardOliveBranch: `${BASE}10_card_olive_branch.png`,
  cardTemple: `${BASE}11_card_temple_icon.png`,
  buttonCorner: `${BASE}12_greek_corner_bottom_button.png`,
} as const;

export type VocabularyDecorSlot = keyof typeof VOCABULARY_DECOR;

/** One decorative piece: empty alt, aria-hidden, never draggable or a click
 * target, and .hs-deco so the square theme hides it. Position and size come
 * from the CSS class of its slot. */
export function VocabDecorImg({ slot, className }: { slot: VocabularyDecorSlot; className: string }) {
  return (
    <img
      src={VOCABULARY_DECOR[slot]}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={`hs-deco greek ${className}`}
    />
  );
}

/** The frame around the screen, one slot per piece, as in the reference. */
export function VocabularyFrame() {
  return (
    <div className="hs-deco vc-decor" aria-hidden="true">
      <span className="vc-wash w-tl" />
      <span className="vc-wash w-br" />
      <VocabDecorImg slot="columnLeft" className="va va-column" />
      <VocabDecorImg slot="oliveTopLeft" className="va va-olive-tl" />
      <VocabDecorImg slot="parthenonTopRight" className="va va-parthenon" />
      <VocabDecorImg slot="meanderTopRight" className="va va-meander" />
      <VocabDecorImg slot="sparkleRight" className="va va-sparkle s1" />
      <VocabDecorImg slot="sparkleRight" className="va va-sparkle s2" />
      <VocabDecorImg slot="amphoraBottomLeft" className="va va-amphora" />
      <VocabDecorImg slot="oliveBottomLeft" className="va va-olive-bl" />
      <VocabDecorImg slot="oliveBottomRight" className="va va-olive-br" />
    </div>
  );
}
