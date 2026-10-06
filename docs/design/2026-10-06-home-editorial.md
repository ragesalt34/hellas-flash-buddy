# Editorial Home — approved reference implementation

Approved reference: exec-23017232-b5ce-4e01-9fef-6de875b5fe7d.png, 1448 × 1086.
Implemented in the existing soft theme for desktop widths from 1100px.
Mobile redesign is deferred at the owner's explicit request.

## Composition

Cream page and header; large black Inter heading; cobalt primary action;
Greek paper collage on the right; vermilion separator and four real metrics.
A three-column study grid contains four numbered illustrated study cards,
a cobalt word-of-the-day panel, a terracotta interview plan, and a progress card.
The word panel and final grid row can grow for longer live vocabulary content.
Existing theme controls remain available in the header.

## Assets

`telegram-bot/webapp/public/assets/pureplay/home-editorial/` contains six
transparent PNG originals and WebP delivery files: hero, quiz, flashcards,
vocab, homework, and word. `paper-grain.svg` is a lightweight repeating
texture used on study cards, the word panel, and the plan.
Generation prompts are recorded in `2026-10-06-home-editorial-prompts.json`.
Earlier prepared `home-reference-v1` assets are retained separately.

## Behavior

Existing navigation, metrics, pronunciation handler, auth entry, plan date
editing/saving, and alternate theme remain in the same components.
All added UI text is in RU/EL translations. Decorative images are excluded
from the accessibility tree. Keyboard focus remains visible.

## Verification

- `npm run build`: TypeScript and Vite production build passed.
- `git diff --check`: passed.
- Browser: RU and EL at 1448px; narrower desktop bounds at 1280px and 1100px.
- Six delivery images loaded; no horizontal overflow; live word content fits.
- Home actions open quiz topic selection, flashcards, vocabulary, homework,
  and progress. Pronunciation control remains clickable.
- Alternate brut theme hides the new editorial elements and retains its layout.
- Review fixes: plan text contrast, signed-in header space for logout, and
  preserving the old low-streak visibility outside the desktop soft layout.
- Signed-in plan states were reviewed in code; no credentials or live plan
  changes were submitted. New audio synthesis depends on the existing API.

Desktop visual proof: pureplay-home-editorial.png, saved in the chat's
visualizations directory. No mobile implementation/QA or deployment performed.
