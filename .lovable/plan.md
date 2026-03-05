
## Current Problems

The Learn page has good data but poor visual design:
- Cards feel cramped — accent bar + icon + ring + text + bar + stats + 2 buttons in a narrow vertical column
- Progress ring (44px) is too small to be impactful
- Left accent bar (5px) is too subtle to anchor the card visually
- Buttons feel generic — equal ghost/filled pills lack visual weight contrast
- Section divider "Финальный этап" is thin and forgettable
- Exam block is good but can be bolder and more dramatic

## New Design Direction: "Magazine Cards"

Redesign from scratch with a top-banner approach instead of the side-accent-bar layout:

### Topic Cards — New Layout

```text
┌─────────────────────────────────────┐
│  [colored gradient top strip 80px]  │
│  Large icon (left)  Progress ring   │
├─────────────────────────────────────┤
│  Topic Name (bold 18px)             │
│  Description text (muted, 2 lines)  │
│  ━━━━━━━━━━━━━━━━━━━━━ progress bar │
│  [📚 12/80] [✓ 87%]  → mastery pills│
│  [  Карточки  ]  [  Тест ▶  ]       │
└─────────────────────────────────────┘
```

Key changes:
1. **Top banner** — colored gradient banner at top of card (80px) with the icon centred and large (56px) and a floating progress ring in the corner
2. **Bigger icon box** — Icon in a white/glass circle sits on the banner, partially overlapping the content below
3. **Wider progress ring** — 60px SVG ring, bold percentage
4. **Stronger button contrast** — ghost button uses transparent+border, filled button uses solid color with white text + stronger glow on hover
5. **Cards use `liquid-glass-card-v2`** class from the existing CSS system for the specular hover effect

### Exam Section
- Replace the flat dark rectangle with a dramatic **full-width hero banner**
- Add a subtle Greek key pattern as background texture (CSS, no images)
- Three stat chips in a horizontal row above the CTA button
- Golden shimmer on the title

### Header
- Add a small decorative subtitle below the main heading
- Animate the "due for review" badge with a subtle pulse

## Files to Change

**`src/pages/Learn.tsx`** — Complete visual overhaul of the JSX + inline `<style>` block:

1. Cards: switch to top-banner layout (`learn-card-banner` div, icon floating at bottom of banner)
2. Progress ring: enlarge to 60px
3. Buttons: increase height to 38px, add `box-shadow` on filled button
4. Exam card: add subtle radial gradient overlay, larger title (26px), add a Greek ε decorative element
5. Mobile: keep 1-col stack, adjust banner height to 64px

No other files touched. Desktop vs mobile split at `max-width: 600px` stays intact.
