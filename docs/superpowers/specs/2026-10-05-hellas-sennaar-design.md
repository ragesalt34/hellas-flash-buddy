# Hellas Sennaar — design

Date: 2026-10-05
Status: approved direction ("развернуть текущую игру в сторону Chants", style spike accepted)
Supersedes: `2026-10-05-metroidvania-game-design.md` (combat metroidvania is dropped)

## Goal

A PC game in the spirit of *Chants of Sennaar*: you are a stranger in a Greek
town who does not speak Greek. You learn it the way Chants teaches its invented
languages — by seeing words in context, guessing, and confirming guesses in a
journal. The user plays it every day: deciphered words go into a spaced-
repetition queue and come back as in-world requests; an old historian asks the
citizenship-exam questions.

## Look

Same visual language as Chants of Sennaar, proven by the spike in
`telegram-bot/game/spike/` (throwaway, not committed):

- three.js, 3D dioramas, geometry built in code (Cycladic boxes, domes, columns).
- Two-step toon shading (`MeshToonMaterial` + 2-texel ramp), hard shadows.
- Ink outlines: `EdgesGeometry` → `LineSegments2` (3 px) on hard edges,
  inverted hull on round shapes; toon materials use `polygonOffset` so lines win.
- Warm screen-space sky gradient, fog, distant flat mountains, drifting clouds.
- Small hooded figure with a procedural walk cycle (legs, arms, bob, lean).
- Greek lettering in the world rendered to canvas textures with GFS Didot:
  `carved` (chiselled stone) and `painted` (blue on whitewash) styles.
- Each scene has 1–2 authored fixed camera shots (wide 3/4 + close), switched
  by trigger zones or the C key.

## Scope of v1 — Chapter 1 «Πειραιάς»

Premise: you step off a ship in Piraeus and must reach the road to Athens.

### Scenes (6)

| id | Scene | Role |
|---|---|---|
| `pier` | Αποβάθρα (pier) | arrival; sailor; carved ΛΙΜΑΝΙ |
| `fish` | Ψαραγορά (fish market) | fisherman, woman buying fish |
| `bakery` | Φούρνος (bakery) | baker, hungry child |
| `square` | Πλατεία (square with fountain) | water; the historian |
| `lane` | Σοκάκι (lane of houses) | locked door, key |
| `gate` | Πύλη (gate / ticket booth) | guard, ticket seller; chapter end |

Scenes connect left/right through exit zones, like rooms.

### Lexicon (34 lemmas)

People: άντρας, γυναίκα, παιδί, ψαράς, ναύτης, φύλακας, φούρναρης.
Things/places: ψάρι, ψωμί, νερό, πλοίο, θάλασσα, σπίτι, πόρτα, κλειδί,
εισιτήριο, λιμάνι, δρόμος, Αθήνα.
Actions: θέλω, έχω, δίνω, φέρνω, πηγαίνω, ανοίγω, τρώω, είμαι.
Function: ναι, όχι, εγώ, εσύ, ο/η/το (article), και, πού.

Each lemma: `id`, Greek lemma, Russian meaning, journal icon, optional
`serverVocabId` (none in chapter 1). Surface forms used in lines (e.g. ψάρια,
θέλει, φέρε, είναι, ο, η, το) map to a lemma. Lines use only lexicon forms —
no stray words.

### Where Greek appears

- Signs and inscriptions in the world (canvas lettering).
- NPC speech bubbles (HTML overlay projected above the speaker), 1–5 tokens,
  no translation. Speech is voiced with the browser's `el-GR` voice
  (`speechSynthesis`) when one is installed, otherwise silent.
- Every token is clickable: it opens the journal entry for its lemma, where the
  player can write their own guess (free text, like Chants' notes).
- The first time a lemma is seen it is added to the journal as *unknown*.

### Journal (Ημερολόγιο, Tab)

- Entries: every seen lemma with the player's note; deciphered ones also show
  the Russian meaning.
- Pages: 8 pages of 3–4 drawings (emoji/icon placeholders in v1). A page opens
  once all its lemmas have been seen. The player assigns seen lemmas to the
  drawings; the page validates only when every slot is right (no per-slot
  feedback — the Chants rule). Solving a page deciphers its lemmas.
- Two grammar pages: article (ο ψαράς / η γυναίκα / το παιδί) and plural
  (ψάρι → ψάρια, πλοίο → πλοία) — drawings of one vs many / man vs woman vs
  child.

### Puzzles (trade chain + replies)

The gate guard says «Όχι. Εισιτήριο;» — you need a ticket.
Ticket seller: «Θέλω ψάρι.» → fisherman: «Θέλω ψωμί.» → baker: «Το παιδί
θέλει νερό.» → fill a jug at the fountain → give water to the child → baker
gives bread → fisherman gives fish → seller gives ticket → guard: answer
«Ναι. Έχω εισιτήριο.» → gate opens; chapter complete.
Side puzzle: the lane door («Η πόρτα;») opens with a key the sailor gives when
you answer his question correctly; behind it is the historian's house.

Replies: when an NPC asks something, the player picks one of 2–3 Greek
phrases built only from seen lemmas. Wrong reply → NPC repeats with a gesture
(shake head); no penalty.

Inventory: up to 6 items shown as icons; give an item with E near an NPC.

### Daily loop

- Deciphered lemmas enter a **local** SRS (per account, `localStorage`):
  levels 0–6, intervals 0/1/2/4/7/14/30 days, grade 3 = right, 1 = wrong.
- Each day, NPCs in the chapter post *requests* for due lemmas:
  «Φέρε μου ψωμί» (bring), «Πού είναι το πλοίο;» (point/choose). Fulfilling
  one = a review graded 3; picking the wrong item/answer = graded 1 and the
  request stays. Up to 10 requests a day; extra due lemmas wait.
- HUD: «Сегодня: done/total» and streak (from `/api/me`).
- Next chapter unlocks when ≥ 80 % of the chapter's lemmas are at level ≥ 2
  (chapter 2 itself is out of v1 scope; the rule and a "coming soon" gate are in).
- The historian (ο ιστορικός, square) asks 5 exam questions a day through the
  existing `ChallengeDialog` + server flashcards SRS (`/api/flashcards`,
  `/api/flashcards/grade`), unchanged from the current code.

### Out of scope (v1)

Chapters 2+ (Plaka, Agora/town hall with the civics terms), ElevenLabs voice
for game lines (needs a server whitelist change), commissioned art, gamepad,
mouse click-to-move, sound/music.

## Architecture

`telegram-bot/game/` stays a standalone Vite + React 18 + TypeScript app. The
Phaser world (`src/world/`) is removed; three.js replaces it. Kept as is:
`src/bus.ts`, `src/kv.ts`, `src/learning/*` (exam flow), `src/session.ts`,
`src/ui/Login.tsx`, `Loading.tsx`, `ChallengeDialog.tsx`, `PauseMenu.tsx`,
`Toasts.tsx`, `strings.ts`, `useBus.ts`.

New layers:

1. **`src/content/`** — pure data: `lexicon.ts` (lemmas + forms),
   `chapter1.ts` (scenes' NPCs, lines, signs, items, dialogue rules, journal
   pages, request templates). No code paths depend on a specific word.
2. **`src/story/`** — pure TS, unit-tested:
   - `journal.ts`: seen lemmas, notes, page unlock/validation, deciphered set.
   - `wordSrs.ts`: local SRS (levels, due dates, grading).
   - `requests.ts`: pick today's requests from due lemmas.
   - `dialogue.ts`: evaluate an NPC's dialogue rules against state
     (flags, inventory) → line + replies + effects (give/take item, set flag).
   - `state.ts`: the story save (`hs_sennaar_save_<accountId>`): scene,
     position, inventory, flags, journal, SRS — with load/save.
3. **`src/world3d/`** — three.js, no learning logic:
   - `style.ts`: palette, toon/ink/hull helpers, lettering (from the spike).
   - `figure.ts`: hooded figure + walk cycle.
   - `engine.ts`: renderer, sky, fog, lights, resize, render loop, camera
     shots, WASD movement with 2D colliders, exit zones, interaction zones,
     projecting anchors to screen for bubbles.
   - `scenes/*.ts`: one builder per scene returning
     `{ colliders, exits, npcs: {id, anchor}, hotspots, shots, signs }`.
4. **`src/ui/`** additions: `Journal.tsx`, `SpeechBubbles.tsx`, `Replies.tsx`,
   `Inventory.tsx`, updated `Hud.tsx`, `Play.tsx` mounting `WorldCanvas.tsx`.

Bus events (added): `npc:talk {npcId}`, `world:scene {sceneId}`,
`world:item {itemId}` (picked from a hotspot), `dialogue:show {...}`,
`dialogue:reply {...}`. The world only reports what the player touched; the
story layer decides what happens.

## Error handling

- No `el-GR` voice: bubbles still show; nothing else changes.
- Server down: story mode is fully offline (all state local). The historian
  shows "сервер спит" and retries via the existing `withRetry`; buffered exam
  grades flush later (existing `Grader`).
- Corrupt save → new game (same pattern as `save.ts`).
- WebGL unavailable → message screen instead of the canvas.

## Testing

- Vitest, pure modules: journal (unlock, all-or-nothing validation, notes),
  wordSrs (intervals, due, lapses), requests (cap 10, only deciphered+due,
  deterministic order), dialogue (rule matching, effects), state (load/save,
  corrupt → new).
- Content integrity test: every token in every line/sign is a known form;
  every journal page's lemmas appear in some line/sign of the chapter; the
  trade chain is solvable from the start state (simulate the effects); every
  reply option uses only forms from the chapter lexicon.
- World: manual browser check per scene (console clean, walk, talk, exits) and
  screenshots of each shot.
- Release: Tauri build as in the previous plan's last task.
