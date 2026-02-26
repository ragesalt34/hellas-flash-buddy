
## Redesign Topics (Learn) and Stats Pages to Match Dashboard Style

### Problem
The **Topics** (`/learn`) and **Stats** (`/stats`) pages use an older visual style: `liquid-glass-card` Card components with dark aurora blobs, while the Dashboard (`/`) was redesigned to use the new bone-background glass panel aesthetic (DM Sans, `glass-panel` class, `--bg-bone`, transparent panels). The user wants consistent beautiful design across all pages.

### What Changes

#### 1. Stats page (`src/pages/Stats.tsx`) — Full visual redesign
Replace all `liquid-glass-card` Card components with `glass-panel` divs matching the dashboard style:

- **Header** — Remove old aurora blob. Add bone-style page title.
- **Tab bar** — Replace `TabsList` with custom glass pill switcher (matching dashboard button style).
- **Summary stat cards** — Replace 4 `Card` components with the same `glass-panel` stat boxes as Section 2 of Index.tsx (big number + label + micro uppercase header).
- **Topic accuracy chart** — Keep Recharts BarChart but wrap in `glass-panel`, remove CartesianGrid, style bars with topic colors.
- **Exam progress line chart** — Same treatment.
- **Readiness progress** — Replace Progress component with custom thin progress bar (same style as topic cards on dashboard).
- **Study calendar** — Keep the 30-day heatmap but style cells in bone palette.
- **Hardest questions / Errors tab** — Glass panels with clean rows.

#### 2. Learn page (`src/pages/Learn.tsx`) — Topics grid redesign
The `/learn` page hosts topic selection. It needs the same 4-column topic card grid as the dashboard but richer: each card shows topic color accent top border, icon, name, mastery progress bar, and a count of due cards.

### Technical Approach

**Stats page:**
- Remove Card/CardHeader/CardContent imports
- Remove `aurora-blob` div
- Replace `<Tabs>` styled tab triggers with custom glass buttons using `useState` for active tab
- Replace every `Card` block with `<div className="glass-panel">` inline-styled just like Index.tsx
- Keep all data-fetching logic identical — only UI changes

**Learn page:**
- Read the current file first to understand exact structure
- Replace old topic cards with the dashboard-style glass-panel cards that include: emoji circle, topic name, subtitle, progress bar, "due cards" count, and colored accent bar at top

### Files Changed
- `src/pages/Stats.tsx` — visual redesign
- `src/pages/Learn.tsx` — topic cards redesign
