
## Remove Nav Buttons and Thumbs Counters from Flashcards

### What to remove
The screenshot shows two UI elements circled in red:
1. **"← Назад" / "Далее →" navigation buttons** — let the user jump to prev/next card manually. These are redundant since the card auto-advances after rating.
2. **👍 0 / 👎 0 known/unknown counters** shown below the control buttons.

### File changed
**`src/pages/Flashcards.tsx`** only:
- Delete the `<div className="flex justify-between ...">` block containing the two nav Buttons (goToPrev / goToNext), lines ~564–585
- Delete the `<div className="relative flex justify-center gap-6 ...">` block with ThumbsUp / ThumbsDown counters, lines ~591–600
- Remove `ThumbsUp`, `ThumbsDown` from lucide-react imports (cleanup)
- The `goToPrev` function and ArrowUp/ArrowDown keyboard shortcuts can also be removed since manual nav is gone

### What stays
- ✕ / ↺ / ✓ glass buttons (Not known / Replay / Known)
- All SRS logic, progress bar, card flip animation
- knownCount / unknownCount state variables (still used on the results screen)
