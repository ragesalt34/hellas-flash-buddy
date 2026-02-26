
## Add Weekly Performance & Active Flashcard Sections to Dashboard

### What the design adds to the existing dashboard

The provided mockup matches the current app's visual style exactly (bone background, glass panels, DM Sans, topic colors). The dashboard (`/`) already has the greeting, streak, focus card, stats row, and topic grid. The design introduces two new sections currently missing from the home page:

1. **Active Session** — an embedded flip-card showing a random due flashcard, with ✕ / ↺ / ✓ controls
2. **Weekly Performance** — a bar chart (Mon–Sun activity) + two achievement badges (ranking & mastered count)

---

### Plan

#### 1. Add "Active Session" mini-flashcard to Index.tsx

- Pull one random flashcard from the user's progress (prioritising cards that are due for review today, falling back to any unseen card)
- Render a 3D flip-card inside a glass panel using the existing CSS 3D technique already present in `Flashcards.tsx`
- Three controls below: ✕ (wrong → mark incorrect), ↺ (skip), ✓ (correct → mark correct) — reusing the existing `upsert_progress` RPC
- Card shows the question face ("History • topic tag" + Greek question text) and answer face (Greek answer + transliteration)

#### 2. Add "Weekly Performance" section to Index.tsx

- A glass panel showing a 7-bar chart (Mon–Sun of current week) using Recharts `BarChart` — same library already used in Stats.tsx
- Bar height = number of questions answered that day (from `user_progress.last_reviewed_at` grouped by day of week)
- Two right-side badge panels:
  - 🏆 Ranking pill (computes percentile from total `user_progress` mastered count across all users, or shows a static encouraging label if insufficient data)
  - 🔥 Cards mastered count

#### 3. Technical details

- All new queries use existing `supabase` client and existing tables: `user_progress`, `questions`
- No DB migrations needed
- Flip-card CSS is already defined in `index.css` (`.flashcard-face`, `.flipped` classes) — reuse directly
- The new sections are appended below the existing Learning Modes section in the authenticated branch of `Index.tsx`
- Bar chart uses `recharts` `BarChart` already imported in the project

#### Files changed

- `src/pages/Index.tsx` — add two new sections (Active Session + Weekly Performance) to the authenticated dashboard view only
