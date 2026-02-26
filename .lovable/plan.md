
## Remove Active Session from Dashboard

### What changes
The dashboard (`src/pages/Index.tsx`) has an "Активная сессия" (Active Session) section — a full embedded flip-card widget — that the user wants removed. The flashcard experience should live exclusively on the dedicated `/flashcards` page.

### Files changed
- **`src/pages/Index.tsx`** — remove:
  1. The `sessionCardFlipped`, `sessionCardIndex` state variables
  2. The `sessionCardData` / `refetchSessionCard` useQuery hook and its query function
  3. The `handleSessionAnswer` callback
  4. The entire "SECTION 5: Active Session" JSX block (heading + glass-panel with the flip card and ✕↺✓ buttons)
  - Keep the Weekly Performance section (Section 6) intact

Everything else on the dashboard (greeting, stats, topic grid, weekly performance) stays exactly as-is.
