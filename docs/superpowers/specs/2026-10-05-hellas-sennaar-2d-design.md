# Hellas Sennaar 2D — Godot 4 vertical slice (Level 1 «Λιμάνι»)

Date: 2026-10-05
Status: approved in chat (user delegated all design choices: "как ты думаешь будет лучше, так и сделай")
Supersedes for new work: `2026-10-05-hellas-sennaar-design.md` (three.js 3D version, kept as reference, not deleted)

Sources:
- «Геймификация новогреческого языка A1–A2» — pedagogy spec (inductive grammar, gender affordances,
  case vectors, 4-level scaffolding, 3 error classes, biome progression, load limits).
- «Godot 4 2D Game Blueprint» — technical spec (sliding notebook CanvasLayer, interactive RichTextLabel,
  two-click binding, 3 puzzles, node trees, 1920×1080 art pipeline).

## 1. Goal

A native 2D PC game in Godot 4 where the player learns A1 Greek by deciphering, Chants-of-Sennaar style:
no grammar tables, no translations shown, meaning comes from context, gestures and the player's own notebook.
This slice delivers **Level 1 «Port / Customs»** complete and playable, exported as a Windows `.exe`.
Levels 2 (Market) and 3 (Tavern) are later content on the same engine.

Success criteria:
- Player can finish Level 1 start-to-end without reading any Russian/English gloss of a Greek word.
- All three error classes (semantic, morphological, syntactic) are detected and get a distinct NPC reaction.
- Scaffolding levels 0–3 fire on the documented thresholds.
- Progress survives quitting and relaunching.
- `.exe` runs on a clean Windows machine without installing anything.

## 2. Platform and project

- Engine: Godot **4.7.2-stable** (standard, not mono), GDScript only. Binary at `C:\Users\user\Tools\godot\`.
- Project: `telegram-bot/game2d/` in the repo, branch `game/godot-2d`.
- Display: 1920×1080 base, `stretch/mode = canvas_items`, `aspect = keep`.
- Offline: no network calls in this slice. Account sync with the existing API is a later phase.

## 3. Level 1 content

Budget (pedagogy: ≤15 new units per biome, 3–4 per micro-scene, 1 new grammar phenomenon per scene).

| # | Unit | Class | Scene |
|---|------|-------|-------|
| 1 | το λιμάνι | neuter | Pier (sign) |
| 2 | το πλοίο | neuter | Pier |
| 3 | ο φάρος | masc. | Pier |
| 4 | η βάρκα | fem. | Pier |
| 5 | ο ναύτης | masc. | Pier (NPC self-intro) |
| 6 | ο σάκος | masc. | Conveyor |
| 7 | η βαλίτσα | fem. | Conveyor |
| 8 | το κουτί | neuter | Conveyor |
| 9 | ο φύλακας | masc. | Customs (NPC) |
| 10 | το διαβατήριο | neuter | Customs |
| 11 | το εισιτήριο | neuter | Customs (distractor) |
| 12 | είμαι (είμαι / είσαι / είναι) | verb | Pier + Customs |
| 13 | έχω (έχω / έχεις / έχει) | verb | Customs |
| 14 | ναι / όχι | particle | Customs |
| 15 | η έξοδος | fem. (-ος exception) | Exit sign |

Scenes (one Godot scene each, connected by walking off-screen edges):

1. **Pier (Αποβάθρα).** Arrival by ship. Sign `ΛΙΜΑΝΙ`. Sailor points at himself: `Είμαι ο ναύτης.`
   then at objects. Player binds words to objects (two-click). Grammar focus: articles ο/η/το exist.
   Gate: notebook page «Λιμάνι» (φάρος, βάρκα, πλοίο, λιμάνι) confirmed → dockmaster lets player through.
2. **Conveyor (Ταινία).** Crates labelled with bare nouns (no article) roll in: σάκος, βαλίτσα, κουτί,
   plus repeats of φάρος/βάρκα/πλοίο-shaped cargo labels for recirculation. Three belts marked Ο / Η / ΤΟ
   with gender affordances. Grammar focus: gender by ending. 6 correct sorts in a row → ticket-free pass.
3. **Customs (Τελωνείο).** Guard (hand to chest, then reaching to the player): `Είμαι ο φύλακας. Έχεις το διαβατήριο;`
   (no `Εγώ`: Greek is pro-drop, the ending carries the person; keeps the budget at 15) Player builds an answer
   from tiles and drags an item to the window. Correct: `Ναι, έχω το διαβατήριο.` + passport.
   Grammar focus: person ending -ω vs -εις. Barrier opens; sign `ΕΞΟΔΟΣ`; level-complete card.

## 4. Pedagogical mechanics (from the pedagogy spec)

### 4.1 Gender affordances
| Class | Article | Colour | Shape / icon | Notebook pictogram |
|-------|---------|--------|--------------|--------------------|
| A | ο | amber `#D9A13B` | vertical, tall frame | sun / vertical bar |
| B | η | azure `#3B8FD9` | rounded frame | wave / circle |
| C | το | terracotta `#C8643B` | square block frame | earth / square |

Every sign, crate label and notebook card of a noun carries its class frame. In-world signs highlight the
article and the ending (e.g. **ο** χώρ**ος**).

### 4.2 Word anatomy
Each lexeme in data has `stem` + `ending` (+ `article`). Rendered through `InteractiveText`
(RichTextLabel, BBCode `[url=token:stem:…]` / `[url=token:ending:…]`). Hover stem → highlight stem and show
the player's assigned pictogram (or `?`). Hover ending → highlight ending and show class/person pictogram.
Never show a translation.

### 4.3 Deciphering (notebook)
- Each Greek word the player has *seen* gets a card in the notebook (auto-collected on first sight).
- Player assigns a meaning by picking a **pictogram** from a palette (no typing). Palette = pictograms of
  all objects/actions the player has *seen in the world* this level (so the choice set grows naturally).
- Two-click binding also works world-side: pick a card (in the notebook via «в мир», or by clicking the word
  in a speech bubble) → click an object in the world. This assigns that object's pictogram to the card as a
  *hypothesis* with neutral feedback (ink stamp). It is NOT validated on the spot — validation happens only
  at page level, otherwise the page check would be meaningless (Chants rule).
- **Pages**: cards group into pages (e.g. «Λιμάνι» page = 4 cards). A page is checked only when *all* its
  cards are filled, all-or-nothing (Chants rule). Correct page → cards lock in gold, words become "known".
  Wrong → page shakes, no hint which card is wrong.

### 4.4 Sentence builder
Tiles: words the player knows/has seen, including inflected variants (έχω/έχεις/έχει, ο/τον…).
Player drags tiles into slots. `ErrorClassifier` compares the built sentence to the target:
- **Semantic**: a slot's lemma ≠ target lemma (e.g. εισιτήριο for διαβατήριο).
- **Morphological**: lemma correct, form wrong (έχεις instead of έχω).
- **Syntactic**: all the right lemmas, wrong order/roles (same multiset of lemmas, different positions) —
  covers subject↔object swaps in later levels and word salad like `Το διαβατήριο έχω ναι` here.
Priority when several apply: syntactic > semantic > morphological (most meaning-breaking first).

### 4.5 Diegetic reactions
| Error | NPC reaction (anim + line) |
|-------|---------------------------|
| semantic | frowns, returns item, taps the passport poster: `Όχι! Αυτό δεν είναι διαβατήριο. Αυτό είναι εισιτήριο!` |
| morphological | leans in, echo-correction with the right ending pulsing: `Α, έχ**ω**! Ναι, έχ**εις** το διαβατήριο.` |
| syntactic | comic re-enactment (passport "asks" the guard): `Το διαβατήριο δεν έχει φύλακα!` |
| choosing `-εις` for self | player character points at the guard; guard scratches head and repeats the question |

### 4.6 Scaffolding (HintDirector)
Per active puzzle, timer resets on any meaningful input.
| Level | Trigger | Effect |
|-------|---------|--------|
| 0 | 0–30 s | nothing |
| 1 kinetic | 30 s idle or 2 wrong | NPC gesture loop (points at target, nods/shakes) |
| 2 audiovisual | 60 s idle or 4 wrong | target object pulses + SFX cue |
| 3 graphic | 90 s idle | sketched pictogram appears beside the unresolved card in the notebook |
Level never decreases within a puzzle; resets when the puzzle is solved.

### 4.7 Recirculation (in-slice SRS)
Known words reappear with new grammar context in later scenes (φάρος/βάρκα/πλοίο as crate labels without
article; είμαι reused by the guard). A per-lemma `seen/correct/wrong` counter is saved; it drives which
words appear as conveyor repeats (weakest first). Full cross-session SRS comes with Level 2.

## 5. Architecture

Logic is separated from presentation so it can be unit-tested headless.

```
game2d/
  project.godot
  autoload/
    signal_bus.gd        # global signals only
    game_state.gd        # lexicon access, notebook state, inventory, flags, save/load (user://save.json)
    cursor_manager.gd    # two-click "held tag" state + cursor sprite
  core/                  # pure logic, no nodes required (RefCounted / static)
    lexicon.gd           # loads data/lexicon.json; lookup by id, forms, gender
    notebook_model.gd    # cards, assignments, page check (all-or-nothing)
    error_classifier.gd  # semantic / morphological / syntactic
    hint_director.gd     # time + attempt thresholds -> level 0..3 (tick-driven, testable)
    sentence.gd          # tile/slot model + target matching
    save_codec.gd        # dict <-> json, versioned
  data/
    lexicon.json         # lemmas, stems, endings, forms, gender, pictogram id
    level1.json          # pages, puzzles, targets, NPC lines
  ui/
    notebook/            # NotebookUI.tscn (+ card, pictogram palette)
    interactive_text.gd  # RichTextLabel with token meta
    dialogue_bubble.tscn
    sentence_builder.tscn
    inventory_bar.tscn
    hud_layer.tscn       # CanvasLayer layer=10
  world/
    art/                 # procedural drawing helpers (palette, ink outline, shapes)
    actors/              # player.tscn, npc.tscn (+ gesture anims)
    props/               # sign.tscn, crate.tscn, belt.tscn, barrier.tscn, ship etc.
    interactable.gd      # Area2D base: entity_id, binds via CursorManager
  levels/
    level1/pier.tscn, conveyor.tscn, customs.tscn, level_end.tscn
  tests/
    run_tests.gd         # `godot --headless -s tests/run_tests.gd`, exit code = failures
    test_*.gd
  tools/
    snapshot.gd          # scripted scenario -> PNG screenshots for visual verification
```

Signals (`SignalBus`): `word_seen(word_id)`, `card_assigned(word_id, picto_id)`, `page_checked(page_id, ok)`,
`binding_attempt(entity_id, word_id, ok)`, `sentence_submitted(puzzle_id, result)`, `crate_sorted(ok)`,
`hint_level_changed(puzzle_id, level)`, `puzzle_solved(puzzle_id)`, `notebook_opened/closed`.

Pause: level root `PROCESS_MODE_PAUSABLE`; notebook and HUD `PROCESS_MODE_ALWAYS`; opening the notebook
sets `get_tree().paused = true` (blueprint §1.1). HintDirector does not tick while paused, so reading the
notebook never escalates hints.

## 6. Visual style ($0, no third-party assets)

Flat Chants-like look drawn in code: `Polygon2D` + `Line2D` ink outlines, `_draw()` for props.
Palette carried over from the 3D version: paper white `#FBF7F0`, peach shade `#FAC2B8`, maroon ink
`#80294D`, magenta haze `#A0206E → #D8609C` (background depth layers), plus gender colours above.
Characters: simple silhouette figures (head, body, arms as separate polygons) so gestures (point, shake,
nod, hand-to-chest) are tweens of limb rotation. Blueprint asset file names (`npc_customs_officer.png` …)
are kept as optional texture slots so drawn shapes can be swapped for PNG art later.
Fonts: GFS Didot (Greek, OFL, copied from `@fontsource/gfs-didot`) for in-world Greek; Godot default font
(covers Cyrillic) for UI chrome. Minimum sizes: 28 px world signs, 24 px notebook.

Controls: mouse-first. Click-to-walk (horizontal + shallow depth band, Y-sorted), click interactables,
`Tab`/`N` toggles notebook, `Esc` closes overlays.

## 7. Save

`user://save.json`, versioned `{version: 1, scene, flags, notebook: {word_id: picto_id}, locked_pages,
inventory, lemma_stats}`. Autosave on puzzle solve and scene change. Corrupt/unknown version → start fresh,
keep a `.bak` copy.

## 8. Testing and verification

- Unit tests (headless): lexicon loading, notebook page all-or-nothing, error classifier (each class +
  priority), hint director thresholds (time and attempts, no escalation while paused), sentence matching,
  save round-trip + corrupt-file fallback.
- Visual: `tools/snapshot.gd` loads each scene, runs a scripted sequence, saves PNGs to `user://snapshots/`;
  screenshots inspected before claiming a scene done.
- Final: Windows export (needs export templates `Godot_v4.7.2-stable_export_templates.tpz`, ~1 GB —
  separate download, ask the user first), launch the `.exe`, play through.

## 9. Out of scope for this slice

Levels 2–3, account/API sync, TTS audio of Greek lines (SFX only), mobile/web export, case-vector
animation (accusative is a Level 2 topic), localization of UI chrome beyond Russian.
