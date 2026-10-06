# Blue Pureplay implementation plan

**Goal:** Apply the owner's approved blue, Preply-inspired direction to Hellas Study's web app.

**Architecture:** Keep the `soft` theme identifier and all study/auth/API behavior. Give that theme a coherent white-and-blue system, a horizontal desktop header and the supplied reference layouts; retain `brut` styling. Defer imagery and hide the superseded ornamental artwork in Pureplay.

**Tech Stack:** React 18, TypeScript, Vite, existing Inter webfont, lucide-react, CSS custom properties.

**Spec:** Owner-approved home/landing/study mockups in this conversation, called “Синий Pureplay”.

## Constraints

- Edit `telegram-bot/webapp` only; translations belong in `src/i18n.tsx` (RU/EL).
- Preserve quiz, SRS, vocabulary, readiness, homework and authentication behavior.
- Use `[data-theme='soft']` and screen selectors; preserve the alternate theme.
- Check desktop 1440px, both languages and answer/reveal states. The owner explicitly deferred mobile implementation and QA; do not spend further work on that pass.
- Commit on `main`; do not push. Existing game/mobile edits remain in the original checkout.

## Tasks

- [x] Set Pureplay tokens and shared controls in `src/styles.css`; rename the soft theme in `src/i18n.tsx` and document it in `src/theme.ts`.
- [x] Refresh `src/components/Logo.tsx` and navigation glyphs in `src/App.tsx`; use white surfaces, blue active indication and a persistent desktop header.
- [x] Arrange `src/screens/Home.tsx` into welcome/metrics, study launchers and word-of-day/plan areas, preserving handlers and actual data.
- [x] Restyle landing, auth, topic picker, quiz, flashcards, vocabulary, homework and readiness with scoped rules. Keep landing's interactive demo and six FAQs.
- [x] Run `npx tsc --noEmit` and `npm run build` in the webapp. Exercise screens at 1440px and RU/EL through the browser; inspect overflow and answer/reveal states.
- [x] Review changed files, record browser evidence and commit only Pureplay changes to `main` without pushing.

## Baseline

- Clean native managed worktree from `main`, then attached to branch `main`.
- Initial webapp `npx tsc --noEmit`: passed.
- Existing dependencies reused through a local junction; no package changes required.

## Verification

- Final TypeScript check, production build and `git diff --check`: passed.
- Desktop browser (1440 × 1000): landing, home, topic picker, quiz answer feedback, flashcard reveal/SRS controls, vocabulary translation, readiness, new-homework form and auth gate checked. No horizontal overflow on inspected views.
- RU/EL switches, landing demo reveal, FAQ expansion and the stats-before-steps order checked.
- Reviewer found an alternate-theme logo sizing regression and nested legacy icon styling; corrected both. Readiness supplementary counts remain visible.
- Alternate-theme landing wordmark measured 270.66 × 56px after the correction. No browser console errors on the final pass.
- New illustrations and mobile layout/QA remain deferred by the owner's explicit instruction.

## Landing reference correction

- Corrected the desktop landing against the owner's approved PNG: hero proportions, headline and short copy, compact word card, header, stats strip, step spacing, feature icons, FAQ and final CTA.
- Added the supplied reference PNG unchanged as temporary artwork. CSS shows only the hero and footer illustration regions; interface text and controls remain native elements. Replace this temporary source when the final illustrations are chosen.
- Desktop RU/EL at 1440px: no horizontal overflow or console errors; word-card cycling and FAQ expansion checked. TypeScript, production build and diff whitespace checks passed.
- Reviewer found a static accessible name hiding the demo word/translation; the button now includes both in its accessible name.
- The owner's narrow preview panel was 767px wide. Desktop comparison requires an expanded browser; mobile work remains deferred.
