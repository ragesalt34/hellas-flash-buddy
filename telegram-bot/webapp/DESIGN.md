# Hellas Study — Style Reference
> Warm sand paper, Aegean ink, terracotta stickers

**Theme:** light (two looks: `soft` = default, `brut` = alternate). All values below are the shipped tokens from `src/styles.css`; this file describes the system, it does not replace it.

This file started from the Preply DESIGN.md format and was rewritten around what Hellas Study actually is: a daily study app for the Greek citizenship interview, in Russian and Greek. The tone is a warm, hand-made notebook: sand ground, white cards, near-black ink, and a muted Greek palette (terracotta, ochre, olive, Aegean blue). Personality lives in three places only: the display type, one hard-offset "sticker" action per screen, and the Greek-inspired illustration set (watercolour ruins, amphora, helmet, olive branches, meander borders). Everything else is quiet.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Sand | `#f7f3ea` | `--bg` | Page ground (app and landing). Cards sit on it |
| Paper White | `#ffffff` | `--surface` | Cards, tiles, options, inputs |
| Inset Sand | `#efe9dc` | `--surface-2` | Chips, answer boxes, hover fills, insets |
| Ink | `#0a0a0a` | `--ink` `--text` `--border` | Text, primary buttons, 2px borders, active nav |
| Body Ink | `#2a2a2a` | `--text-body` | Reading copy (near-black, never grey) |
| Muted | `#6b6b6b` | `--muted` | Only true secondary meta: eyebrows, captions, footnotes |
| Terracotta | `#c04a3d` | `--accent` `--marsala` | Highlight colour: sticker words, shadow of the primary button, progress fill |
| Deep Terracotta | `#a33a30` | `--accent-2` | Bold accent text on white (6.6:1) |
| Ochre | `#d6a129` | `--amber` | Counters, badges, streak. Ink text on it (8.5:1) |
| Olive | `#2f8168` | `--mint` `--good` (`#2b7d5c`) | Correct, geography topic |
| Aegean Blue | `#2f5d92` | `--blue` | Links, info, history accents |
| Dusty Indigo | `#645b9c` | `--violet` `--purple` | Culture topic |
| Burnt Sienna | `#bf5c3c` | `--coral` | Laws topic |
| Error Red | `#bf3f3c` | `--bad` | Wrong answer, destructive |
| Lifted tints | `#d9776a` `#e3b64f` `#5fa98f` `#7ba3cf` | `--accent-lift` `--amber-lift` `--mint-lift` `--blue-lift` | Only on the ink plate (dark stats block); the base colours fail contrast there |
| Ring track | `#e5ddcd` | `--ring-track` | Empty progress rings and bars |

Topic colours: history = Aegean blue, culture = indigo, laws = sienna, geography = olive (`--topic-*`).

`brut` theme is the square neo-brutalist look with ideas from the Brave Leo page (not its colours): ground `#faf8f3`, 2px ink borders, 2px corners everywhere (square, never pills), hard offset shadows that carry the colour (saffron by default, terracotta on the Home greeting, topic colours on topic tiles and question cards), Aegean blue `#2456a4` for the main action, Source Serif 4 700 for titles over Inter. The landing page is walled off from it and always stays `soft`.

## Tokens — Typography

- **Display — Rubik 500–800** (`--font-display`): headings, buttons, numerals. Tight tracking (about -0.2px on buttons), tight line-height on big sizes.
- **Body — Onest 500–700** (`--font-body`): reading copy, labels.
- **Greek — Manrope 500–800**: Rubik and Onest ship no Greek glyphs, so the browser falls back to Manrope for Greek letters automatically. Never rely on system fonts for Greek.
- **Serif — EB Garamond 600**: landing quotes and large decorative numerals only. Not for questions, answers or UI text.
- `brut` uses Inter for everything.

### Type Scale (roles, not numbers)

| Role | Size | Token | Use |
|------|------|-------|-----|
| hero | clamp(40px, 9.5vw, 78px) | `--t-hero` | Landing h1 only |
| h2 | clamp(28px, 5vw, 44px) | `--t-h2` | Section and screen headings |
| title | clamp(22px, 3.2vw, 26px) | `--t-title` | Question, answer, auth and result titles |
| h3 | 20px | `--t-h3` | Card and tile titles |
| num | clamp(30px, 5.6vw, 52px) | `--t-num` | Display numerals (stats, streak) |
| lead | clamp(16px, 2.4vw, 20px) | `--t-lead` | Lead paragraph under a heading |
| body | 16px | `--t-body` | Reading copy and button labels |
| meta | 12.5px | `--t-meta` | Labels, captions, secondary meta |
| micro | 11px | `--t-micro` | Tiny uppercase tags |

Nine steps for the whole product. Add a role, not a one-off size.

## Tokens — Shapes, Depth, Motion

**Radius:** `--r-sm` 8px (chips, tags) · `--r-md` 14px (icon squares, options, inputs) · `--r-lg` 22px (cards, tiles, sheets) · `--r-btn` 8px (buttons, near-rectangular on purpose) · `--r-full` (circles, progress bars only). `brut` sets all but full to 2px.

**Depth — three tiers, only the top one is loud:**
- Tier A: 2px ink border + hard offset shadow (`--ec-accent`: 4px 5px 0 in the accent colour, `--e1`: 4px 4px 0 ink). One main action per screen, plus deliberate stickers (badges, floating chips, nav pill, modal sheet).
- Tier B: 2px border + soft ink shadow. Controls that carry a colour fill (grade buttons, answered options, tabs).
- Tier C (default): 1px hairline (`--hair`, ink at 20%) + `--e0` (2px 2px 0, ink at 20%). Every ordinary surface.
- Hover grows the shadow (`--e0-hover`, `--ec-accent-lg`) and lifts the element 2–3px. Press pushes it back 1px.

**Motion:** `--ease` cubic-bezier(0.22, 1, 0.36, 1) for movement, `--spring` cubic-bezier(0.34, 1.56, 0.64, 1) for playful pops. Fade-up on screen entry. Always respect `prefers-reduced-motion`.

**Layout:** focus-mode quiz column 640px (≥900px) / 680px (≥1200px), fixed action bar at the bottom; landing content up to about 1200px; phone first, no horizontal scroll at 375px.

## Components

### Primary Button (`.btn`)
Ink `#0a0a0a` fill, white text, Rubik 16px weight 700, 2px ink border, 8px radius, padding 15px 22px, hard accent shadow (4px 5px 0 terracotta). Hover: up-left 2px/3px with the large shadow. One per screen. Disabled: 35% opacity, no shadow.

### Secondary Button (`.btn.secondary`)
White fill, ink text, 1px hairline border, `--e0` shadow. Hover fills with Inset Sand and lifts 2px.

### Card / Tile / Option (`.card` `.tile` `.option`)
White, 1px hairline, `--e0`, radius 22px (cards, tiles) or 14px (options). Padding 16–24px. Answer options carry a round letter badge; answered options take the good/bad colour with a 2px border.

### Chip (`.chip`)
Inset Sand fill, 2px ink border, 8px radius, 12.5px weight 700, padding 7px 14px. Counters use Ochre.

### Highlight Sticker (`.highlight`)
The coloured word inside a headline: terracotta block, white text, tier-A border and `--e1` shadow, 8px radius. This is where the brand shouts; use once per heading.

### Progress
Quiz bar: track `#e5ddcd`, fill terracotta with a Greek-key (meander) pattern and an olive leaf at the tip. Rings use the same track colour.

### Navigation

All screens use the persistent `components/SiteHeader.tsx` shell and `siteHeader.css`.
The desktop bar is 80px high; below 600px it is 68px (plus the device safe-area inset).
The same ivory background, navy text, terracotta book tile, 30px EB Garamond brand,
14px Inter navigation, language controls and account action appear across both themes.
The mobile brand is 26px. Header layout never depends on the current study screen.

From 1280px the links sit inline. Narrower widths use an accessible menu with Escape,
outside-click dismissal and focus return. Landing links target page sections; study
links target the landing, quiz, flashcards, vocabulary, homework and progress. The
account action returns to the dashboard. The compact RU/EL disclosure groups language, labeled appearance choices and session
actions; a single navy account button remains the primary header action. Navigation links pair live RU/EL labels with generated paper miniatures from
`public/assets/header-paper-v1/` (nine transparent WebP assets, 192px each).
Active links use a terracotta shared underline; mobile links retain a pale blue selected surface. Mobile disclosures are compact
panels with gentle elevation, and close when keyboard focus leaves the header. The header is owned by App, not by individual screens; there is no
second sidebar, bottom navigation, auth header or fixed sign-out control.

Motion: Motion for React provides short spring lifts/tilts on hover, press compression
and a shared-layout active underline. Desktop and mobile have separate indicator IDs;
the fixed header uses layoutRoot. Reduced motion disables transforms and shared travel. The bar never changes height on navigation or scroll.
Native anchors reserve header clearance; Lenis anchors use the matching desktop offset.

### Topic Scene (quiz backdrop)
Per-topic illustration pack behind the question card: wide vignette top-left, object pair bottom-left, object pair top-right, one object lower right, olive branches in the top corners, a long ornamental band under the card, two tiny accents in the corner. One 40px outer margin on every side, upper pieces share a top line, pieces are sized from the free gutter so they never touch the card. Hidden below 900px (only the band stays). Marked `.hs-deco` and hidden in `brut`.

### Stats Plate
Ink `#0a0a0a` block with lifted-tint numerals (`--*-lift`) and `--t-num` numbers, meta labels in white at 12.5px.

## Do's and Don'ts

### Do
- Use ink `#0a0a0a` for the main action, with the terracotta hard shadow. One tier-A action per screen.
- Keep body copy near-black (`--text-body`); grey (`--muted`) only for genuinely secondary meta.
- Set Greek text through the Manrope fallback and check accents and capitals (`text-transform: uppercase` on Greek drops the tonos, which is correct).
- Add UI strings to `src/i18n.tsx` in both RU and EL. Never hard-code text.
- Scope new styles as `[data-theme='soft'] .<screen>-…`; give purely decorative elements `.hs-deco` so `brut` hides them.
- Use the topic colours consistently: history blue, culture indigo, laws sienna, geography olive.
- Check every visual change at ≥1440px and at 375px: no horizontal scroll, decoration never overlaps content.

### Don't
- Don't add loud saturated hues. The palette is muted on purpose; nine bright colours reads as a template.
- Don't put a 2px border and a hard shadow on everything. If everything is tier A, nothing leads.
- Don't use the serif for questions, answers or buttons; it clashes with the sans UI.
- Don't add ad-hoc font sizes or radii. Pick a role from the scales above.
- Don't use pill-shaped buttons or radii above 22px on functional surfaces.
- Don't use stock icons or stock illustration. Icons and art are drawn for this app (see `components/*Art.tsx`, `public/assets/topics/`).
- Don't touch the landing page from the `brut` theme.

## What was borrowed from Preply, and what was not

Borrowed (ideas that fit the existing system):
- One confident display face at heavy weight with tight tracking for headlines, and a calm text face for the interface.
- Flat "sticker" labels layered on a loud surface; already present as `.highlight` and the badge chips.
- A stat strip under the hero (numbers large, caption small below), already the pattern of the landing stats plate.
- A quiet, hairline-defined catalog below the loud top fold, which is how the topic tiles and question cards already work.

Not borrowed (conflicts with the existing system, which takes priority):
- The pink hero canvas `#ff7aac`, Signal Yellow, and Sky Pop. Ours is sand with terracotta and ochre.
- 4px radii and "no shadows". Ours uses 8/14/22px radii and the hard offset shadow, which is the app's character.
- The Platform and Figtree fonts. Ours are Rubik, Onest and Manrope (Greek).
- Real photography with stickers. Ours is watercolour and line illustration in the Greek style.
- A dark footer and a 1200px catalog grid as the only layout model; the app is a focused study flow.

## Similar Brands

- **Duolingo** — game-like feedback (sounds, streak, progress) around a study loop.
- **Preply** — display-type-led hero with sticker labels and a calm catalog beneath.
- **Babbel** — restrained product UI with one brand colour doing the talking.

### Paper flashcard ratings (approved 2026-10-08)

Soft-theme Flashcards use three generated, text-free paper faces in
`public/assets/rating-buttons-v1/`. Labels and per-card SRS intervals remain live
RU/EL text, centered on native buttons. Terracotta means difficult; sand means
good; ivory with forest-green ink means known. The olive filled answer strip
remains distinct from the known action. There are no arrows or decorative icons.
An ivory base stays still while the face and copy travel down 7px in 80ms on
press and return in 220ms on release; fine-pointer hover lifts only 2px. Reduced
motion retains shadow feedback with no spatial movement. Focus uses the existing
Aegean ring. These controls apply on desktop and mobile; brut keeps its native
square controls and hides the decorative paper layers.
### Hero liquid-metal feedback (2026-10-08)

The two hero CTAs share `components/ui/liquid-metal-button.tsx` on desktop and
mobile. The primary retains its light blue face with a restrained Paper liquid-metal
shader; the secondary keeps ivory with a faint reflection. Native button labels,
RU/EL copy, focus and navigation callbacks are unchanged. Fine-pointer hover lifts
2px and reveals the liquid-metal surface; cursor exit hides it and stops the shader.
Idle, keyboard focus and touch do not start the shader (hover-only update 2026-10-10).
Press compresses in 90ms; a 560ms contact wave is restricted to pointer hover. Navigation
is immediate. The library is lazy loaded, limited to 120,000 pixels per canvas,
and pauses outside the viewport or while the document is hidden. Reduced motion
uses a static surface and shadow feedback without a shader or spatial movement.
Brut retains its existing CTA presentation. WebGL/import failure leaves usable
CSS-backed native buttons. There is no Tailwind or shadcn setup for this effect;
it uses the app's existing React/TypeScript and scoped CSS.

### Individual vocabulary hints (2026-10-10)

The first ten vocabulary IDs have unique handmade paper collages in
`public/assets/vocabulary-hints-v1/`. The mapping lives in
`src/data/vocabularyHints.ts` and uses the permanent word ID, never the shuffled
SRS session index. All hints are text-free associative scenes; Greek words,
hidden translations, notes, pronunciation and grading remain unchanged.
Soft theme shows these pictures above the word on desktop and phones, using
`object-fit: contain` with reserved image space. Brut hides them as it does the
existing paper artwork. Words without a mapped asset keep their topic collage.
The original PNGs and generation prompts are preserved in the main clone's
`design-handoff/vocabulary-hints-01-10-v1/`; deployed WebP files are 960×640.
