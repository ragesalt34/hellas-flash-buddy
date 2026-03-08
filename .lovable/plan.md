
## Redesign: Desktop Header — More Attractive

### Current state
The pill header has: logo left → nav links center → language switcher + user button right. It works but looks plain — white glass pill, flat dark text, no visual hierarchy, user avatar is a grey circle.

### What to improve (based on the screenshot reference)
The uploaded screenshot shows the current state — the goal is to make it more visually premium:

1. **Logo area** — add a subtle gradient or warm-tinted background to the "Ελ" monogram, make the brand name slightly more styled with tracking
2. **Nav links** — add an active indicator: a small filled pill/dot under or behind the active item instead of just opacity change, with smooth transition
3. **Active nav pill** — a subtle background highlight (small rounded rectangle) behind the active nav link
4. **User button** — replace the grey circle with an initials-based avatar using the project's pebble-green (`#7D8A57`) as background, show initials dynamically; improve pill styling with a gentle gradient border
5. **Header pill itself** — add a very subtle warm inner gradient tint (hint of peach/sage from the palette), make the box-shadow warmer, add a faint inner top highlight line (specular)
6. **Language switcher** — give the globe button a small pill background on hover, consistent with the active nav treatment
7. **Spacing & proportions** — slight increase in nav gap, more breathing room

### Files to change
- `src/components/layout/Header.tsx` — restructure JSX, add active pill indicator, initials avatar
- `src/index.css` — update `.pill-header` styles + add `.nav-pill-active` and `.header-avatar` classes (no mobile impact, desktop only)

### Key design decisions
- Active nav item gets a small rounded `background: rgba(47,53,50,0.07)` pill behind it, `border-radius: 9999px`, `padding: 5px 14px`
- User avatar uses first 2 chars of username, background `#C5DEA7` (sage from GLP palette), dark text — matches the organic warmth of the brand
- Header pill gets a whisper of warm gradient: `rgba(247,245,241,0.75)` → `rgba(255,255,255,0.55)` at 135deg, with stronger `box-shadow: 0 4px 32px rgba(47,53,50,0.08), inset 0 1px 0 rgba(255,255,255,0.8)`
- All changes scoped to `sm:` breakpoint and above, mobile unaffected

### ASCII layout
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  [Ελ] Hellas Flash Buddy      Главная  [Темы]  Статистика      🌐   [◉ EA username] │
│                              ──────                                                 │
│                              active pill bg                                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
         brand (left)              nav (center, active has bg)      lang + user (right)
```

Active link: small rounded-full bg chip behind the text (not underline)
User avatar: initials in sage-green circle, dark text, pill container has warm border

### Strictly desktop-only changes
All visual changes stay within the existing `sm:` and above breakpoints. Mobile header and bottom nav untouched.
