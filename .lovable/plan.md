
## Fix Topic Card Buttons — "Тест" Should Not Look Pre-Pressed

### Problem
The "Тест" button uses `.learn-action-primary` which gives it a dark filled background (`#2F3532`) — same as a "pressed/active" state. Both buttons should look equally neutral and unselected by default, with the "Тест" button distinguished only by a subtle visual cue (not a fully filled dark style).

### Solution: Two equally light pill buttons with subtle differentiation

Replace the current approach:
- **"Карточки"** — glass/white pill (current, keep as-is)
- **"Тест"** — dark filled pill (REMOVE this, looks "active/selected")

New approach — both buttons are light glass pills, but "Тест" gets a slightly darker border and bold text, or a thin accent outline to differentiate it without looking "pressed":

**Option A (recommended):** Both buttons are the same ghost/glass pill style. "Тест" gets a slightly stronger border and slightly darker text color so it's visually distinct but not "active-looking".

**Option B:** "Карточки" is a ghost pill, "Тест" is a soft-colored pill with one of the topic accent colors (thin fill, not dark).

Going with **Option A** — clean, minimal, consistent with the design language:

```css
/* Both buttons — glass pill, same base */
.learn-action-btn {
  background: rgba(255,255,255,0.55);
  border: 1.5px solid rgba(47,53,50,0.12);
  color: var(--text-dark);
}

/* Тест — slightly stronger border, no dark fill */
.learn-action-primary {
  background: rgba(255,255,255,0.55);
  border: 1.5px solid rgba(47,53,50,0.30);
  color: #2F3532;
  font-weight: 700;
}
```

### File to edit
**`src/pages/Learn.tsx`** — only the `.learn-action-primary` CSS block (lines 350–359).

Change `background: #2F3532; color: #fff` → `background: rgba(255,255,255,0.55); color: #2F3532` with a slightly stronger border so the button looks like a clickable action, not a selected state.
