# Greek artwork

Decorative PNGs for the round (soft) theme. Pure ornament: rendered through
`src/components/greek.tsx` with empty alt, `aria-hidden`, no pointer events,
and hidden by the square theme.

## `common/` — shared set

Used on the home screen, flashcards and the quiz topic picker.

| file | use |
|---|---|
| column.png | column at the page edge |
| temple.png, hill-temple.png | temple / temple on a hill, background |
| amphora.png | amphora, lower side |
| olive-branch.png, olive-branch-small.png, laurel-branch.png | branches |
| greek-key.png, greek-key-small.png | meander bands |
| decorative-corner.png | meander corner for card corners |
| decorative-diamond.png | small gold diamond |
| decorative-line.png | small sprig–diamond–sprig composition |
| bg-shape-1..3.png | soft background washes |

## Screen-specific sets

Artwork cut for one particular screen lives next to that screen's name under
`public/assets/menus/`, not here:

- `assets/menus/vocabulary/` — Vocabulary / flashcard-answer screen only.
  Each file has one slot, listed in `VOCABULARY_DECOR`
  (`src/screens/vocabularyDecor.tsx`); see the README in that folder.
