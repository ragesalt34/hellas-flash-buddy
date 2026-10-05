# Hellas Sennaar 2D (Godot 4) — Level 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A native Godot 4 2D game that teaches A1 Greek by Chants-of-Sennaar-style deciphering; Level 1 «Port / Customs» complete and exported as a Windows `.exe`.

**Architecture:** Pure-logic classes (`core/`, `RefCounted`, unit-tested headless) hold all rules: lexicon, notebook pages (all-or-nothing), error classifier, hint director, stats, save codec, BBCode line formatting. Three autoloads (`SignalBus`, `GameState`, `CursorManager`) glue them to code-built UI (`ui/`) and code-drawn world (`world/`, `levels/`). No image assets: everything is drawn with `_draw()` / polygons.

**Tech Stack:** Godot 4.7.2-stable (standard build), GDScript, GL Compatibility renderer, JSON data files.

**Spec:** `docs/superpowers/specs/2026-10-05-hellas-sennaar-2d-design.md`

## Global Constraints

- Godot binary: `/c/Users/user/Tools/godot/Godot_v4.7.2-stable_win64_console.exe` (use the `_console` build for CLI).
- Project root: `C:\Users\user\Desktop\hellas-flash-buddy\telegram-bot\game2d\`; branch `game/godot-2d`.
- Run **git from the repo root** `C:\Users\user\Desktop\hellas-flash-buddy` (pathspecs misbehave from subdirs in this shell). Never `git add -A` — the repo has unrelated dirty files under `mobile/`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Base resolution 1920×1080, `stretch/mode=canvas_items`, `aspect=keep`. No camera: world coords == screen coords.
- Indentation in `.gd` files: **tabs**.
- No Greek translation is ever shown to the player. UI chrome (buttons, status) is Russian; in-world text is Greek.
- New-unit budget for Level 1: the 16 lexicon ids listed in Task 2 — nothing else gets a notebook card.
- Scripts run via `-s` cannot reference autoload identifiers at compile time — get them with `root.get_node("GameState")`. Scripts loaded at runtime (`load()`, scenes) may use `GameState` directly.
- JSON numbers load as `float`; convert counters with `int()`.
- Never connect `SignalBus` signals to lambdas — use methods so connections die with the node.
- Palette (from spec §6): paper `#FBF7F0`, shade `#FAC2B8`, ink `#80294D`, haze `#A0206E → #D8609C`; gender ο amber `#D9A13B`, η azure `#3B8FD9`, το terracotta `#C8643B`.
- Hint thresholds (spec §4.6): L1 30 s idle or 2 wrong, L2 60 s or 4 wrong, L3 90 s idle; never decreases until solved.
- Error priority (spec §4.4): syntactic > semantic > morphological.

## File map

```
telegram-bot/game2d/
  project.godot, .gitignore, test.sh, snap.sh, export_presets.cfg, main.tscn, main.gd
  assets/fonts/gfs-didot-greek-400-normal.woff2
  autoload/signal_bus.gd, game_state.gd, cursor_manager.gd
  core/greek.gd, lexicon.gd, notebook_model.gd, error_classifier.gd, sentence_model.gd,
       hint_director.gd, lemma_stats.gd, crate_queue.gd, save_codec.gd, line_format.gd
  data/lexicon.json, level1.json
  ui/ui.gd, fonts.gd, picto.gd, interactive_text.gd, dialogue_bubble.gd, hud.gd,
     inventory_bar.gd, inventory_slot.gd, sentence_builder.gd,
     notebook/notebook_ui.gd, notebook/word_card.gd
  world/art/palette.gd, ink.gd, shape.gd, backdrop.gd
  world/actors/actor.gd
  world/interactable.gd
  world/props/sign_board.gd, ship.gd, lighthouse.gd, boat.gd, rope_gate.gd, belt.gd, crate.gd,
              booth.gd, drop_window.gd, barrier.gd, poster.gd
  levels/level_scene.gd
  levels/level1/pier.tscn/.gd, conveyor.tscn/.gd, customs.tscn/.gd, level_end.tscn/.gd
  tests/run_tests.gd, tests/lib/test_case.gd, tests/test_*.gd
  tools/snapshot.gd, tools/gallery.tscn, tools/gallery.gd
```

Shell helpers used in every task:

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy/telegram-bot/game2d
./test.sh                 # all tests; ./test.sh test_notebook  → only files starting with that
./snap.sh gallery pier    # renders PNGs into tools/out/
```

---

### Task 1: Project scaffold, test runner, Greek helpers

**Files:**
- Create: `game2d/project.godot`, `game2d/.gitignore`, `game2d/test.sh`, `game2d/snap.sh`
- Create: `game2d/tests/run_tests.gd`, `game2d/tests/lib/test_case.gd`
- Create: `game2d/core/greek.gd`
- Test: `game2d/tests/test_greek.gd`

**Interfaces:**
- Produces: `TestCase` (fields `failures: Array[String]`, `tree: SceneTree`; methods `check(cond, msg)`, `eq(actual, expected, msg="")`); `Greek.caps(s) -> String`, `Greek.capitalize_first(s) -> String`.

- [ ] **Step 1: Create project files**

`game2d/project.godot`:
```ini
; Engine configuration file.
config_version=5

[application]

config/name="Hellas Sennaar 2D"
config/features=PackedStringArray("4.7", "GL Compatibility")

[display]

window/size/viewport_width=1920
window/size/viewport_height=1080
window/size/mode=2
window/stretch/mode="canvas_items"
window/stretch/aspect="keep"

[rendering]

renderer/rendering_method="gl_compatibility"
renderer/rendering_method.mobile="gl_compatibility"
environment/defaults/default_clear_color=Color(0.984, 0.969, 0.941, 1)
```

`game2d/.gitignore`:
```
.godot/
tools/out/
export/
```

`game2d/test.sh`:
```bash
#!/usr/bin/env bash
# Headless unit/integration tests. Usage: ./test.sh [file-prefix ...]
G="${GODOT:-/c/Users/user/Tools/godot/Godot_v4.7.2-stable_win64_console.exe}"
cd "$(dirname "$0")"
"$G" --headless --path . --import >/dev/null 2>&1
"$G" --headless --path . -s res://tests/run_tests.gd -- "$@"
```

`game2d/snap.sh`:
```bash
#!/usr/bin/env bash
# Off-screen 1920x1080 renders into tools/out/. Usage: ./snap.sh gallery pier pier:notebook
G="${GODOT:-/c/Users/user/Tools/godot/Godot_v4.7.2-stable_win64_console.exe}"
cd "$(dirname "$0")"
"$G" --headless --path . --import >/dev/null 2>&1
"$G" --path . -s res://tools/snapshot.gd -- "$@"
```

Run: `chmod +x test.sh snap.sh`

- [ ] **Step 2: Test harness**

`game2d/tests/lib/test_case.gd`:
```gdscript
class_name TestCase
extends RefCounted
## Minimal assertion base used by tests/run_tests.gd. Failures are recorded, not thrown,
## so one test reports every broken expectation at once.

var failures: Array[String] = []
var tree: SceneTree


func check(cond: bool, msg: String) -> void:
	if not cond:
		failures.append(msg)


func eq(actual: Variant, expected: Variant, msg: String = "") -> void:
	if typeof(actual) != typeof(expected) or actual != expected:
		failures.append("%s: expected %s (%s), got %s (%s)" % [
			msg, var_to_str(expected), type_string(typeof(expected)),
			var_to_str(actual), type_string(typeof(actual))])
```

`game2d/tests/run_tests.gd`:
```gdscript
extends SceneTree
## Headless test runner: godot --headless --path . -s res://tests/run_tests.gd -- [prefix ...]
## Loads every tests/test_*.gd (optionally filtered by file-name prefix) and calls each test_*
## method on a fresh instance. Exit code 1 when anything failed.

const SAVE_FOR_TESTS := "user://test_run_save.json"


func _initialize() -> void:
	var gs := root.get_node_or_null("GameState")
	if gs:
		gs.save_path = SAVE_FOR_TESTS
	var filters := OS.get_cmdline_user_args()
	var files: Array[String] = []
	for f in DirAccess.open("res://tests").get_files():
		if not (f.begins_with("test_") and f.ends_with(".gd")):
			continue
		if filters.is_empty() or filters.any(func(p): return f.begins_with(p)):
			files.append(f)
	files.sort()
	var total := 0
	var failed := 0
	for f in files:
		var script: GDScript = load("res://tests/" + f)
		for m in script.get_script_method_list():
			var name: String = m["name"]
			if not name.begins_with("test_"):
				continue
			total += 1
			var t = script.new()
			t.tree = self
			t.call(name)
			if t.failures.is_empty():
				print("  ok   %s::%s" % [f, name])
			else:
				failed += 1
				print("  FAIL %s::%s" % [f, name])
				for msg in t.failures:
					print("       " + msg)
	if FileAccess.file_exists(SAVE_FOR_TESTS):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_FOR_TESTS))
	print("%d tests, %d failed" % [total, failed])
	quit(1 if failed > 0 else 0)
```

- [ ] **Step 3: Write the failing test**

`game2d/tests/test_greek.gd`:
```gdscript
extends TestCase


func test_caps_strips_tonos() -> void:
	eq(Greek.caps("λιμάνι"), "ΛΙΜΑΝΙ", "tonos on alpha")
	eq(Greek.caps("έξοδος"), "ΕΞΟΔΟΣ", "tonos + final sigma")
	eq(Greek.caps("διαβατήριο"), "ΔΙΑΒΑΤΗΡΙΟ", "tonos on eta")
	eq(Greek.caps("το λιμάνι"), "ΤΟ ΛΙΜΑΝΙ", "two words")


func test_capitalize_first_keeps_tonos() -> void:
	eq(Greek.capitalize_first("όχι"), "Όχι", "accented first letter")
	eq(Greek.capitalize_first("ναι"), "Ναι", "plain")
	eq(Greek.capitalize_first(""), "", "empty")
```

- [ ] **Step 4: Run test to verify it fails**

Run: `./test.sh test_greek`
Expected: compile error for `Greek` (identifier not declared) and non-zero exit.

- [ ] **Step 5: Implement**

`game2d/core/greek.gd`:
```gdscript
class_name Greek
extends RefCounted
## Greek text helpers.

const _TONOS := {"Ά": "Α", "Έ": "Ε", "Ή": "Η", "Ί": "Ι", "Ό": "Ο", "Ύ": "Υ", "Ώ": "Ω", "ΐ": "Ϊ", "ΰ": "Ϋ"}


## All-caps for signage: Greek drops the tonos on capitals (ΛΙΜΑΝΙ, not ΛΙΜΆΝΙ).
static func caps(s: String) -> String:
	var out := s.to_upper()
	for k in _TONOS:
		out = out.replace(k, _TONOS[k])
	return out


## Sentence-start capital; keeps the tonos (όχι → Όχι).
static func capitalize_first(s: String) -> String:
	if s.is_empty():
		return s
	return s.substr(0, 1).to_upper() + s.substr(1)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `./test.sh`
Expected: `2 tests, 0 failed`, exit 0.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: Godot 4 project scaffold, headless test runner, Greek caps helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Lexicon (data + loader)

**Files:**
- Create: `game2d/data/lexicon.json`, `game2d/core/lexicon.gd`
- Test: `game2d/tests/test_lexicon.gd`

**Interfaces:**
- Produces: `Lexicon.from_file(path) -> Lexicon`, `Lexicon.from_dict(d) -> Lexicon`, `has(id) -> bool`, `ids() -> Array[String]` (sorted), `pos(id) -> String` ("noun"|"verb"|"particle"), `gender(id) -> String` ("m"|"f"|"n"|""), `picto(id) -> String`, `word_by_picto(picto) -> String`, `parts(id, form="") -> {"article","stem","ending"}`, `surface(id, form="") -> String`.
- Forms: noun `""`/`"nom"` = with article, `"bare"` = no article; verb `"1s"|"2s"|"3s"` (default `"1s"`); particle `""`.

- [ ] **Step 1: Data**

`game2d/data/lexicon.json`:
```json
{
	"limani": {"pos": "noun", "article": "το", "gender": "n", "stem": "λιμάν", "ending": "ι", "picto": "port"},
	"ploio": {"pos": "noun", "article": "το", "gender": "n", "stem": "πλοί", "ending": "ο", "picto": "ship"},
	"faros": {"pos": "noun", "article": "ο", "gender": "m", "stem": "φάρ", "ending": "ος", "picto": "lighthouse"},
	"varka": {"pos": "noun", "article": "η", "gender": "f", "stem": "βάρκ", "ending": "α", "picto": "boat"},
	"naftis": {"pos": "noun", "article": "ο", "gender": "m", "stem": "ναύτ", "ending": "ης", "picto": "sailor"},
	"sakos": {"pos": "noun", "article": "ο", "gender": "m", "stem": "σάκ", "ending": "ος", "picto": "sack"},
	"valitsa": {"pos": "noun", "article": "η", "gender": "f", "stem": "βαλίτσ", "ending": "α", "picto": "suitcase"},
	"kouti": {"pos": "noun", "article": "το", "gender": "n", "stem": "κουτ", "ending": "ί", "picto": "box"},
	"fylakas": {"pos": "noun", "article": "ο", "gender": "m", "stem": "φύλακ", "ending": "ας", "picto": "guard"},
	"diavatirio": {"pos": "noun", "article": "το", "gender": "n", "stem": "διαβατήρι", "ending": "ο", "picto": "passport"},
	"eisitirio": {"pos": "noun", "article": "το", "gender": "n", "stem": "εισιτήρι", "ending": "ο", "picto": "ticket"},
	"exodos": {"pos": "noun", "article": "η", "gender": "f", "stem": "έξοδ", "ending": "ος", "picto": "exit"},
	"eimai": {"pos": "verb", "stem": "εί", "endings": {"1s": "μαι", "2s": "σαι", "3s": "ναι"}, "picto": "be"},
	"echo": {"pos": "verb", "stem": "έχ", "endings": {"1s": "ω", "2s": "εις", "3s": "ει"}, "picto": "have"},
	"nai": {"pos": "particle", "stem": "ναι", "ending": "", "picto": "yes"},
	"ochi": {"pos": "particle", "stem": "όχι", "ending": "", "picto": "no"}
}
```

- [ ] **Step 2: Write the failing test**

`game2d/tests/test_lexicon.gd`:
```gdscript
extends TestCase

var lex := Lexicon.from_file("res://data/lexicon.json")


func test_budget_is_sixteen_units() -> void:
	eq(lex.ids().size(), 16, "level 1 budget")


func test_noun_surfaces() -> void:
	eq(lex.surface("faros"), "ο φάρος", "nom default")
	eq(lex.surface("faros", "nom"), "ο φάρος", "nom explicit")
	eq(lex.surface("faros", "bare"), "φάρος", "bare")
	eq(lex.surface("kouti"), "το κουτί", "neuter")
	eq(lex.surface("exodos"), "η έξοδος", "feminine in -ος")


func test_verb_and_particle_surfaces() -> void:
	eq(lex.surface("echo"), "έχω", "default 1s")
	eq(lex.surface("echo", "2s"), "έχεις", "2s")
	eq(lex.surface("eimai", "3s"), "είναι", "3s irregular")
	eq(lex.surface("ochi"), "όχι", "particle")


func test_parts_split_stem_and_ending() -> void:
	eq(lex.parts("naftis"), {"article": "ο", "stem": "ναύτ", "ending": "ης"}, "noun parts")
	eq(lex.parts("echo", "2s"), {"article": "", "stem": "έχ", "ending": "εις"}, "verb parts")


func test_article_matches_gender() -> void:
	var want := {"m": "ο", "f": "η", "n": "το"}
	for id in lex.ids():
		if lex.pos(id) == "noun":
			eq(lex.parts(id)["article"], want[lex.gender(id)], id)


func test_pictos_are_unique_and_reversible() -> void:
	var seen := {}
	for id in lex.ids():
		var p := lex.picto(id)
		check(not seen.has(p), "duplicate picto " + p)
		seen[p] = true
		eq(lex.word_by_picto(p), id, "reverse " + p)
	eq(lex.word_by_picto("nope"), "", "unknown picto")
```

- [ ] **Step 3: Run to verify failure**

Run: `./test.sh test_lexicon` — Expected: compile error, `Lexicon` not declared.

- [ ] **Step 4: Implement**

`game2d/core/lexicon.gd`:
```gdscript
class_name Lexicon
extends RefCounted
## Read-only word data (data/lexicon.json). Ids are ASCII keys ("faros").
## Forms: noun "" / "nom" (with article) or "bare"; verb "1s" "2s" "3s"; particle "".

var _words: Dictionary = {}


static func from_dict(d: Dictionary) -> Lexicon:
	var lex := Lexicon.new()
	lex._words = d
	return lex


static func from_file(path: String) -> Lexicon:
	var d = JSON.parse_string(FileAccess.get_file_as_string(path))
	assert(d is Dictionary, "bad lexicon json: " + path)
	return from_dict(d)


func has(id: String) -> bool:
	return _words.has(id)


func ids() -> Array[String]:
	var out: Array[String] = []
	for k in _words:
		out.append(k)
	out.sort()
	return out


func pos(id: String) -> String:
	return _words[id].get("pos", "")


func gender(id: String) -> String:
	return _words[id].get("gender", "")


func picto(id: String) -> String:
	return _words[id].get("picto", "")


func word_by_picto(picto_id: String) -> String:
	for k in _words:
		if _words[k].get("picto", "") == picto_id:
			return k
	return ""


func parts(id: String, form: String = "") -> Dictionary:
	var w: Dictionary = _words[id]
	match w.get("pos", ""):
		"noun":
			var art: String = "" if form == "bare" else w["article"]
			return {"article": art, "stem": w["stem"], "ending": w["ending"]}
		"verb":
			var f := form if form != "" else "1s"
			return {"article": "", "stem": w["stem"], "ending": w["endings"][f]}
		_:
			return {"article": "", "stem": w["stem"], "ending": w.get("ending", "")}


func surface(id: String, form: String = "") -> String:
	var p := parts(id, form)
	var word: String = p["stem"] + p["ending"]
	return word if p["article"] == "" else p["article"] + " " + word
```

- [ ] **Step 5: Run tests** — `./test.sh` → all pass.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: Level 1 lexicon (16 units) with stem/ending anatomy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Notebook model (seen words, hypotheses, all-or-nothing pages)

**Files:**
- Create: `game2d/core/notebook_model.gd`
- Test: `game2d/tests/test_notebook.gd`

**Interfaces:**
- Consumes: `Lexicon` (Task 2).
- Produces: `NotebookModel.new(lex, page_defs: Dictionary)`; constants `INCOMPLETE`, `WRONG`, `SOLVED`; fields `pages`, `seen: Array[String]`, `assigned: Dictionary`, `solved_pages: Array[String]`; methods `see(id) -> bool`, `is_seen(id)`, `assign(id, picto)` (picto `""` clears), `assignment(id) -> String`, `page_of(id) -> String`, `is_locked(id) -> bool`, `page_ready(page) -> bool`, `check_page(page) -> String`, `is_page_solved(page) -> bool`, `visible_pages() -> Array[String]`, `palette() -> Array[String]`, `known_count() -> int`, `to_dict()`, `load_dict(d)`.

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_notebook.gd`:
```gdscript
extends TestCase


func _nb() -> NotebookModel:
	var lex := Lexicon.from_dict({
		"a": {"pos": "noun", "article": "ο", "gender": "m", "stem": "α", "ending": "ος", "picto": "pa"},
		"b": {"pos": "noun", "article": "η", "gender": "f", "stem": "β", "ending": "α", "picto": "pb"},
		"c": {"pos": "noun", "article": "το", "gender": "n", "stem": "γ", "ending": "ο", "picto": "pc"},
	})
	return NotebookModel.new(lex, {"p1": ["a", "b"], "p2": ["c"]})


func test_see_reports_new_words_only() -> void:
	var nb := _nb()
	eq(nb.see("a"), true, "first sight")
	eq(nb.see("a"), false, "repeat")
	eq(nb.see("zzz"), false, "unknown id")
	eq(nb.seen, ["a"] as Array[String], "seen list")


func test_assign_requires_seen() -> void:
	var nb := _nb()
	nb.assign("a", "pa")
	eq(nb.assignment("a"), "", "unseen ignored")
	nb.see("a")
	nb.assign("a", "pb")
	eq(nb.assignment("a"), "pb", "any hypothesis allowed")
	nb.assign("a", "")
	eq(nb.assignment("a"), "", "cleared")


func test_page_is_all_or_nothing() -> void:
	var nb := _nb()
	nb.see("a")
	nb.see("b")
	nb.assign("a", "pa")
	eq(nb.check_page("p1"), NotebookModel.INCOMPLETE, "one card empty")
	nb.assign("b", "pa")
	eq(nb.check_page("p1"), NotebookModel.WRONG, "one wrong card")
	eq(nb.is_page_solved("p1"), false, "not solved")
	eq(nb.assignment("a"), "pa", "hypotheses kept after wrong check")
	nb.assign("b", "pb")
	eq(nb.check_page("p1"), NotebookModel.SOLVED, "all correct")
	eq(nb.is_page_solved("p1"), true, "solved")


func test_solved_page_locks_cards() -> void:
	var nb := _nb()
	nb.see("a")
	nb.see("b")
	nb.assign("a", "pa")
	nb.assign("b", "pb")
	nb.check_page("p1")
	eq(nb.is_locked("a"), true, "locked")
	nb.assign("a", "pc")
	eq(nb.assignment("a"), "pa", "locked card unchanged")
	eq(nb.known_count(), 2, "known words")


func test_palette_and_visible_pages_follow_seen_words() -> void:
	var nb := _nb()
	eq(nb.visible_pages(), [] as Array[String], "nothing seen")
	nb.see("c")
	nb.see("a")
	eq(nb.palette(), ["pa", "pc"] as Array[String], "sorted pictos of seen words")
	eq(nb.visible_pages(), ["p1", "p2"] as Array[String], "pages in definition order")


func test_dict_roundtrip_drops_unknown_ids() -> void:
	var nb := _nb()
	nb.see("a")
	nb.see("b")
	nb.assign("a", "pa")
	nb.assign("b", "pb")
	nb.check_page("p1")
	var d := nb.to_dict()
	d["seen"].append("ghost")
	d["solved"].append("ghost_page")
	var nb2 := _nb()
	nb2.load_dict(d)
	eq(nb2.seen, ["a", "b"] as Array[String], "seen restored")
	eq(nb2.assignment("b"), "pb", "assignment restored")
	eq(nb2.solved_pages, ["p1"] as Array[String], "solved restored")
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_notebook` → `NotebookModel` not declared.

- [ ] **Step 3: Implement**

`game2d/core/notebook_model.gd`:
```gdscript
class_name NotebookModel
extends RefCounted
## The player's deciphering notebook: words seen, the pictogram hypothesis for each,
## solved pages. A page is checked all-or-nothing (Chants rule): no hint which card is wrong.

const INCOMPLETE := "incomplete"
const WRONG := "wrong"
const SOLVED := "solved"

var pages: Dictionary = {}          # page_id -> Array of word ids, in display order
var seen: Array[String] = []        # discovery order
var assigned: Dictionary = {}       # word_id -> picto_id
var solved_pages: Array[String] = []
var _lex: Lexicon


func _init(lex: Lexicon, page_defs: Dictionary) -> void:
	_lex = lex
	pages = page_defs


## True when the word is new to the notebook. Unknown ids are ignored.
func see(word_id: String) -> bool:
	if not _lex.has(word_id) or seen.has(word_id):
		return false
	seen.append(word_id)
	return true


func is_seen(word_id: String) -> bool:
	return seen.has(word_id)


func assign(word_id: String, picto_id: String) -> void:
	if not is_seen(word_id) or is_locked(word_id):
		return
	if picto_id == "":
		assigned.erase(word_id)
	else:
		assigned[word_id] = picto_id


func assignment(word_id: String) -> String:
	return assigned.get(word_id, "")


func page_of(word_id: String) -> String:
	for p in pages:
		if word_id in pages[p]:
			return p
	return ""


func is_locked(word_id: String) -> bool:
	return solved_pages.has(page_of(word_id))


func page_ready(page_id: String) -> bool:
	for w in pages[page_id]:
		if not is_seen(w) or assignment(w) == "":
			return false
	return true


func check_page(page_id: String) -> String:
	if solved_pages.has(page_id):
		return SOLVED
	if not page_ready(page_id):
		return INCOMPLETE
	for w in pages[page_id]:
		if assignment(w) != _lex.picto(w):
			return WRONG
	solved_pages.append(page_id)
	return SOLVED


func is_page_solved(page_id: String) -> bool:
	return solved_pages.has(page_id)


## Pages with at least one seen word, in definition order.
func visible_pages() -> Array[String]:
	var out: Array[String] = []
	for p in pages:
		for w in pages[p]:
			if is_seen(w):
				out.append(p)
				break
	return out


## Pictograms the player can choose from: those of every seen word, sorted (order reveals nothing).
func palette() -> Array[String]:
	var out: Array[String] = []
	for w in seen:
		var p := _lex.picto(w)
		if p != "" and not out.has(p):
			out.append(p)
	out.sort()
	return out


func known_count() -> int:
	var n := 0
	for p in solved_pages:
		n += pages[p].size()
	return n


func to_dict() -> Dictionary:
	return {"seen": seen.duplicate(), "assigned": assigned.duplicate(), "solved": solved_pages.duplicate()}


func load_dict(d: Dictionary) -> void:
	seen.clear()
	for w in d.get("seen", []):
		if _lex.has(str(w)) and not seen.has(str(w)):
			seen.append(str(w))
	assigned = {}
	var a: Dictionary = d.get("assigned", {})
	for w in a:
		if is_seen(str(w)):
			assigned[str(w)] = str(a[w])
	solved_pages.clear()
	for p in d.get("solved", []):
		if pages.has(str(p)):
			solved_pages.append(str(p))
```

- [ ] **Step 4: Run tests** — `./test.sh` → all pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: notebook model with all-or-nothing page checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Error classifier + sentence slots

**Files:**
- Create: `game2d/core/error_classifier.gd`, `game2d/core/sentence_model.gd`
- Test: `game2d/tests/test_error_classifier.gd`

**Interfaces:**
- Produces: tokens are `{"w": word_id, "f": form}`; empty slot = `null`.
  `ErrorClassifier.classify(built: Array, target: Array) -> {"kind": String, "slot": int}` with kinds `OK`, `INCOMPLETE`, `SEMANTIC`, `MORPHOLOGICAL`, `SYNTACTIC` (string constants `"ok"`, `"incomplete"`, `"semantic"`, `"morphological"`, `"syntactic"`).
  `SentenceModel.new(target)`, fields `target`, `slots`; `place(i, tok)`, `place_next(tok) -> int`, `clear(i)`, `clear_all()`, `is_full() -> bool`, `evaluate() -> Dictionary`.

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_error_classifier.gd`:
```gdscript
extends TestCase

const C := ErrorClassifier


func T(w: String, f: String = "") -> Dictionary:
	return {"w": w, "f": f}


func _target() -> Array:
	return [T("nai"), T("echo", "1s"), T("diavatirio", "nom")]


func test_exact_match_is_ok() -> void:
	eq(C.classify([T("nai"), T("echo", "1s"), T("diavatirio", "nom")], _target()), {"kind": C.OK, "slot": -1}, "ok")


func test_empty_slot_is_incomplete() -> void:
	eq(C.classify([T("nai"), null, T("diavatirio", "nom")], _target()), {"kind": C.INCOMPLETE, "slot": 1}, "null slot")
	eq(C.classify([T("nai")], _target())["kind"], C.INCOMPLETE, "short")


func test_wrong_lemma_is_semantic() -> void:
	eq(C.classify([T("nai"), T("echo", "1s"), T("eisitirio", "nom")], _target()), {"kind": C.SEMANTIC, "slot": 2}, "ticket for passport")


func test_wrong_form_is_morphological() -> void:
	eq(C.classify([T("nai"), T("echo", "2s"), T("diavatirio", "nom")], _target()), {"kind": C.MORPHOLOGICAL, "slot": 1}, "-εις for self")


func test_same_lemmas_wrong_order_is_syntactic() -> void:
	eq(C.classify([T("diavatirio", "nom"), T("echo", "1s"), T("nai")], _target()), {"kind": C.SYNTACTIC, "slot": 0}, "word salad")


func test_priority_semantic_over_morphological() -> void:
	eq(C.classify([T("nai"), T("echo", "2s"), T("eisitirio", "nom")], _target()), {"kind": C.SEMANTIC, "slot": 2}, "semantic wins")


func test_priority_syntactic_over_morphological() -> void:
	eq(C.classify([T("echo", "2s"), T("nai"), T("diavatirio", "nom")], _target())["kind"], C.SYNTACTIC, "syntactic wins")


func test_sentence_model_slots() -> void:
	var s := SentenceModel.new(_target())
	eq(s.is_full(), false, "starts empty")
	eq(s.place_next(T("nai")), 0, "first slot")
	s.place(2, T("diavatirio", "nom"))
	eq(s.place_next(T("echo", "1s")), 1, "fills the gap")
	eq(s.place_next(T("ochi")), -1, "full")
	eq(s.is_full(), true, "full")
	eq(s.evaluate()["kind"], C.OK, "evaluates")
	s.clear(1)
	eq(s.evaluate(), {"kind": C.INCOMPLETE, "slot": 1}, "cleared slot")
	s.clear_all()
	eq(s.slots, [null, null, null], "all cleared")
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_error` → `ErrorClassifier` not declared.

- [ ] **Step 3: Implement**

`game2d/core/error_classifier.gd`:
```gdscript
class_name ErrorClassifier
extends RefCounted
## Diagnoses a built sentence against the target (pedagogy spec "Анализ и классификация ошибок").
## Tokens are {"w": word_id, "f": form}; empty slots are null.
## Priority: syntactic (right words, wrong order/roles) > semantic (wrong word) > morphological (wrong form).

const OK := "ok"
const INCOMPLETE := "incomplete"
const SEMANTIC := "semantic"
const MORPHOLOGICAL := "morphological"
const SYNTACTIC := "syntactic"


static func classify(built: Array, target: Array) -> Dictionary:
	if built.size() != target.size():
		return {"kind": INCOMPLETE, "slot": mini(built.size(), target.size())}
	for i in built.size():
		if built[i] == null:
			return {"kind": INCOMPLETE, "slot": i}
	var lb: Array = built.map(func(t): return t["w"])
	var lt: Array = target.map(func(t): return t["w"])
	if lb != lt:
		var sb := lb.duplicate()
		var st := lt.duplicate()
		sb.sort()
		st.sort()
		var kind := SYNTACTIC if sb == st else SEMANTIC
		return {"kind": kind, "slot": _first_diff(lb, lt)}
	for i in built.size():
		if built[i]["f"] != target[i]["f"]:
			return {"kind": MORPHOLOGICAL, "slot": i}
	return {"kind": OK, "slot": -1}


static func _first_diff(a: Array, b: Array) -> int:
	for i in a.size():
		if a[i] != b[i]:
			return i
	return -1
```

`game2d/core/sentence_model.gd`:
```gdscript
class_name SentenceModel
extends RefCounted
## Slot state of the phrase builder for one target sentence.

var target: Array
var slots: Array


func _init(target_tokens: Array) -> void:
	target = target_tokens
	slots = []
	slots.resize(target.size())


func place(slot: int, token: Dictionary) -> void:
	slots[slot] = token


## Fills the first empty slot; returns its index, or -1 when every slot is taken.
func place_next(token: Dictionary) -> int:
	for i in slots.size():
		if slots[i] == null:
			slots[i] = token
			return i
	return -1


func clear(slot: int) -> void:
	slots[slot] = null


func clear_all() -> void:
	for i in slots.size():
		slots[i] = null


func is_full() -> bool:
	return not slots.has(null)


func evaluate() -> Dictionary:
	return ErrorClassifier.classify(slots, target)
```

- [ ] **Step 4: Run tests** — `./test.sh` → all pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: semantic/morphological/syntactic error classifier + sentence slots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Hint director (scaffolding levels 0–3)

**Files:**
- Create: `game2d/core/hint_director.gd`
- Test: `game2d/tests/test_hint_director.gd`

**Interfaces:**
- Produces: `HintDirector` (RefCounted) with `signal level_changed(level: int)`; fields `level`, `idle`, `wrong`, `active`; methods `tick(delta)`, `on_input()`, `on_wrong()`, `solve()`, `restart()`, `computed_level() -> int`. Pause-awareness comes from the caller: `LevelScene` only calls `tick()` from a pausable `_process`.

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_hint_director.gd`:
```gdscript
extends TestCase

var got: Array = []


func _h() -> HintDirector:
	got = []
	var h := HintDirector.new()
	h.level_changed.connect(_on_level)
	return h


func _on_level(l: int) -> void:
	got.append(l)


func test_idle_thresholds() -> void:
	var h := _h()
	h.tick(29.9)
	eq(h.level, 0, "under 30 s")
	h.tick(0.2)
	eq(h.level, 1, "30 s kinetic")
	h.tick(30.0)
	eq(h.level, 2, "60 s audiovisual")
	h.tick(30.0)
	eq(h.level, 3, "90 s graphic")
	eq(got, [1, 2, 3], "each level emitted once")


func test_wrong_attempt_thresholds() -> void:
	var h := _h()
	h.on_wrong()
	eq(h.level, 0, "1 wrong")
	h.on_wrong()
	eq(h.level, 1, "2 wrong")
	h.on_wrong()
	h.on_wrong()
	eq(h.level, 2, "4 wrong")
	for i in 10:
		h.on_wrong()
	eq(h.level, 2, "mistakes alone never reach level 3")


func test_input_resets_idle_but_level_stays() -> void:
	var h := _h()
	h.tick(45.0)
	h.on_input()
	eq(h.idle, 0.0, "idle reset")
	eq(h.level, 1, "level does not drop")
	h.tick(20.0)
	eq(h.level, 1, "needs a full new idle period")


func test_solve_resets_and_stops() -> void:
	var h := _h()
	h.tick(61.0)
	h.solve()
	eq(h.level, 0, "back to 0")
	eq(got, [2, 0], "solve emits 0")
	h.tick(500.0)
	h.on_wrong()
	eq(h.level, 0, "inactive after solve")
	h.restart()
	h.tick(31.0)
	eq(h.level, 1, "restart re-arms")
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_hint` → `HintDirector` not declared.

- [ ] **Step 3: Implement**

`game2d/core/hint_director.gd`:
```gdscript
class_name HintDirector
extends RefCounted
## Non-verbal scaffolding level for one puzzle (pedagogy spec, "Иерархия невербального скаффолдинга"):
## 0 autonomous; 1 kinetic (30 s idle / 2 wrong); 2 audiovisual (60 s / 4 wrong); 3 graphic (90 s idle).
## The level only rises until the puzzle is solved. tick() is driven by a pausable node, so time
## spent in the (pausing) notebook never escalates hints.

signal level_changed(level: int)

const IDLE_THRESHOLDS := [30.0, 60.0, 90.0]
const WRONG_THRESHOLDS := [2, 4]

var level := 0
var idle := 0.0
var wrong := 0
var active := true


func tick(delta: float) -> void:
	if not active:
		return
	idle += delta
	_update()


func on_input() -> void:
	idle = 0.0


func on_wrong() -> void:
	if not active:
		return
	wrong += 1
	idle = 0.0
	_update()


func solve() -> void:
	active = false
	idle = 0.0
	wrong = 0
	if level != 0:
		level = 0
		level_changed.emit(0)


func restart() -> void:
	active = true
	idle = 0.0
	wrong = 0
	level = 0


func computed_level() -> int:
	var by_idle := 0
	for i in IDLE_THRESHOLDS.size():
		if idle >= IDLE_THRESHOLDS[i]:
			by_idle = i + 1
	var by_wrong := 0
	for i in WRONG_THRESHOLDS.size():
		if wrong >= WRONG_THRESHOLDS[i]:
			by_wrong = i + 1
	return maxi(by_idle, by_wrong)


func _update() -> void:
	var c := computed_level()
	if c > level:
		level = c
		level_changed.emit(level)
```

- [ ] **Step 4: Run tests** — `./test.sh` → all pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: hint director with idle/attempt thresholds (levels 0-3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Lemma stats + crate queue (recirculation)

**Files:**
- Create: `game2d/core/lemma_stats.gd`, `game2d/core/crate_queue.gd`
- Test: `game2d/tests/test_lemma_stats.gd`

**Interfaces:**
- Produces: `LemmaStats` with `data: Dictionary` (`id -> {"seen","correct","wrong"}` ints), `record(id, correct: bool)`, `score(id) -> float` (higher = weaker), `weakest_first(ids: Array) -> Array`, `to_dict()`, `load_dict(d)`.
  `CrateQueue.build(ids: Array, stats: LemmaStats, count: int) -> Array` — weakest first, cycling, no immediate repeats.

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_lemma_stats.gd`:
```gdscript
extends TestCase


func test_record_counts() -> void:
	var s := LemmaStats.new()
	s.record("a", true)
	s.record("a", false)
	s.record("a", false)
	eq(s.data["a"], {"seen": 3, "correct": 1, "wrong": 2}, "counters")


func test_weakest_first_orders_by_mistakes_then_id() -> void:
	var s := LemmaStats.new()
	s.record("good", true)
	s.record("bad", false)
	eq(s.weakest_first(["good", "new", "bad"]), ["bad", "new", "good"], "wrong > unseen > correct")
	eq(s.weakest_first(["y", "x"]), ["x", "y"], "ties by id")


func test_load_dict_converts_json_floats() -> void:
	var s := LemmaStats.new()
	s.load_dict({"a": {"seen": 2.0, "correct": 1.0, "wrong": 1.0}})
	eq(s.data["a"]["seen"], 2, "int after load")


func test_crate_queue_cycles_without_repeats() -> void:
	var s := LemmaStats.new()
	s.record("b", false)
	var q := CrateQueue.build(["a", "b", "c"], s, 7)
	eq(q.size(), 7, "length")
	eq(q[0], "b", "weakest first")
	for i in range(1, q.size()):
		check(q[i] != q[i - 1], "no immediate repeat at %d" % i)
	eq(CrateQueue.build([], s, 3), [], "empty input")
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_lemma` → `LemmaStats` not declared.

- [ ] **Step 3: Implement**

`game2d/core/lemma_stats.gd`:
```gdscript
class_name LemmaStats
extends RefCounted
## Per-word practice counters. Drives recirculation: weaker words come back first.

var data: Dictionary = {}   # word_id -> {"seen": int, "correct": int, "wrong": int}


func record(word_id: String, correct: bool) -> void:
	var s: Dictionary = data.get(word_id, {"seen": 0, "correct": 0, "wrong": 0})
	s["seen"] += 1
	if correct:
		s["correct"] += 1
	else:
		s["wrong"] += 1
	data[word_id] = s


## Higher = weaker. An unseen word ranks like a word with one mistake on a fresh start.
func score(word_id: String) -> float:
	if not data.has(word_id):
		return 1.0
	var s: Dictionary = data[word_id]
	return float(s["wrong"]) * 2.0 - float(s["correct"]) + 1.0 / (1.0 + float(s["seen"]))


func weakest_first(ids: Array) -> Array:
	var out := ids.duplicate()
	out.sort_custom(_weaker)
	return out


func _weaker(a: Variant, b: Variant) -> bool:
	var sa := score(str(a))
	var sb := score(str(b))
	if not is_equal_approx(sa, sb):
		return sa > sb
	return str(a) < str(b)


func to_dict() -> Dictionary:
	return data.duplicate(true)


func load_dict(d: Dictionary) -> void:
	data = {}
	for k in d:
		var s: Dictionary = d[k]
		data[str(k)] = {
			"seen": int(s.get("seen", 0)),
			"correct": int(s.get("correct", 0)),
			"wrong": int(s.get("wrong", 0)),
		}
```

`game2d/core/crate_queue.gd`:
```gdscript
class_name CrateQueue
extends RefCounted
## Order of nouns on the conveyor: weakest first, cycling, never the same word twice in a row.


static func build(ids: Array, stats: LemmaStats, count: int) -> Array:
	var order := stats.weakest_first(ids)
	var out: Array = []
	if order.is_empty():
		return out
	var i := 0
	while out.size() < count:
		var w = order[i % order.size()]
		i += 1
		if not out.is_empty() and out[-1] == w and order.size() > 1:
			continue
		out.append(w)
	return out
```

- [ ] **Step 4: Run tests** — `./test.sh` → all pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: lemma stats and weakest-first crate queue

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Save codec (versioned JSON, corrupt-file fallback)

**Files:**
- Create: `game2d/core/save_codec.gd`
- Test: `game2d/tests/test_save_codec.gd`

**Interfaces:**
- Produces: `SaveCodec.VERSION = 1`; `encode(state) -> String`; `decode(text) -> Dictionary` (`{}` when invalid/foreign); `write(path, state) -> bool`; `read(path) -> Dictionary` (missing → `{}`; corrupt → moved to `path + ".bak"`, returns `{}`).

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_save_codec.gd`:
```gdscript
extends TestCase

const P := "user://test_codec.json"


func _cleanup() -> void:
	for p in [P, P + ".bak"]:
		if FileAccess.file_exists(p):
			DirAccess.remove_absolute(ProjectSettings.globalize_path(p))


func test_roundtrip() -> void:
	_cleanup()
	var state := {"scene": "pier", "flags": {"pier_open": true}, "inventory": ["diavatirio"]}
	eq(SaveCodec.write(P, state), true, "write")
	eq(SaveCodec.read(P), state, "read back without version key")
	_cleanup()


func test_missing_file_is_empty() -> void:
	_cleanup()
	eq(SaveCodec.read(P), {}, "missing")


func test_corrupt_file_moves_to_bak() -> void:
	_cleanup()
	var f := FileAccess.open(P, FileAccess.WRITE)
	f.store_string("{not json")
	f.close()
	eq(SaveCodec.read(P), {}, "corrupt → empty")
	eq(FileAccess.file_exists(P + ".bak"), true, "backup kept")
	eq(FileAccess.file_exists(P), false, "bad file removed")
	_cleanup()


func test_foreign_version_rejected() -> void:
	eq(SaveCodec.decode('{"version": 99, "scene": "pier"}'), {}, "future version")
	eq(SaveCodec.decode('[1, 2]'), {}, "not an object")
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_save` → `SaveCodec` not declared.

- [ ] **Step 3: Implement**

`game2d/core/save_codec.gd`:
```gdscript
class_name SaveCodec
extends RefCounted
## Versioned JSON save. A corrupt or foreign file is moved aside to <path>.bak and treated as no save,
## so a broken file never blocks starting the game.

const VERSION := 1


static func encode(state: Dictionary) -> String:
	var d := state.duplicate(true)
	d["version"] = VERSION
	return JSON.stringify(d, "\t")


static func decode(text: String) -> Dictionary:
	var d = JSON.parse_string(text)
	if not (d is Dictionary) or int(d.get("version", -1)) != VERSION:
		return {}
	d.erase("version")
	return d


static func write(path: String, state: Dictionary) -> bool:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		push_warning("save failed: %s" % error_string(FileAccess.get_open_error()))
		return false
	f.store_string(encode(state))
	f.close()
	return true


static func read(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var d := decode(FileAccess.get_file_as_string(path))
	if d.is_empty():
		var abs := ProjectSettings.globalize_path(path)
		DirAccess.copy_absolute(abs, abs + ".bak")
		DirAccess.remove_absolute(abs)
	return d
```

- [ ] **Step 4: Run tests** — `./test.sh` → all pass (a JSON parse error line in the log for the corrupt case is expected).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: versioned save codec with corrupt-file backup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Line format (Greek lines → interactive BBCode)

**Files:**
- Create: `game2d/core/line_format.gd`
- Test: `game2d/tests/test_line_format.gd`

**Interfaces:**
- Consumes: `Lexicon`, `Greek`.
- Produces: a *line* is an `Array` of literal `String`s and word tokens `[word_id, form]` or `[word_id, form, "emph"]`.
  `LineFormat.word_ids(line) -> Array[String]`; `LineFormat.plain(line, lex, capitalize := true) -> String`; `LineFormat.bbcode(line, lex, capitalize := true, caps := false) -> String`.
  Meta links: `w|<id>|<part>|<form>` where part ∈ `article|stem|ending`.
  Capitalisation rule: first word of the line and any word after a literal whose trimmed text ends with `.`, `!`, `;` or `?`. Literals are never modified.

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_line_format.gd`:
```gdscript
extends TestCase

var lex := Lexicon.from_file("res://data/lexicon.json")
var question := [["eimai", "1s"], " ", ["fylakas", "nom"], ". ", ["echo", "2s"], " ", ["diavatirio", "nom"], ";"]


func test_plain_capitalises_sentence_starts() -> void:
	eq(LineFormat.plain(question, lex), "Είμαι ο φύλακας. Έχεις το διαβατήριο;", "guard question")
	eq(LineFormat.plain([["nai", ""], ", ", ["echo", "1s"], " ", ["diavatirio", "nom"], "."], lex),
		"Ναι, έχω το διαβατήριο.", "answer, comma keeps lowercase")
	eq(LineFormat.plain([["faros", "nom"], "."], lex), "Ο φάρος.", "article capitalised")
	eq(LineFormat.plain([["ochi", ""]], lex, false), "όχι", "capitalize off")


func test_word_ids_unique_in_order() -> void:
	eq(LineFormat.word_ids(question), ["eimai", "fylakas", "echo", "diavatirio"] as Array[String], "ids")


func test_bbcode_links_each_part() -> void:
	var b := LineFormat.bbcode([["faros", "nom"]], lex)
	check(b.contains("[url=w|faros|article|nom]"), "article meta: " + b)
	check(b.contains("[url=w|faros|stem|nom]φάρ[/url]"), "stem meta: " + b)
	check(b.contains("[url=w|faros|ending|nom]"), "ending meta: " + b)
	check(b.contains(LineFormat.ARTICLE_COLORS["m"]), "gender colour")
	check(b.contains("Ο[/color]"), "capitalised article")


func test_bbcode_verb_ending_and_emphasis() -> void:
	var b := LineFormat.bbcode([["echo", "2s", "emph"]], lex, false)
	check(b.contains("[url=w|echo|stem|2s]έχ[/url]"), "verb stem: " + b)
	check(b.contains(LineFormat.VERB_ENDING_COLOR), "verb ending colour")
	check(b.contains("[wave"), "emphasis wave")


func test_bbcode_caps_for_signs() -> void:
	var b := LineFormat.bbcode([["limani", "nom"]], lex, true, true)
	check(b.contains("ΛΙΜΑΝ[/url]"), "caps stem without tonos: " + b)
	check(b.contains("ΤΟ[/color]"), "caps article")
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_line` → `LineFormat` not declared.

- [ ] **Step 3: Implement**

`game2d/core/line_format.gd`:
```gdscript
class_name LineFormat
extends RefCounted
## Renders a line — literal Strings mixed with word tokens [id, form] / [id, form, "emph"] — to plain
## text or to BBCode for InteractiveText. In BBCode every word part is a meta link
## "w|<id>|<part>|<form>" so hovering the stem can show the player's hypothesis and hovering the
## ending can show the class (noun) or person (verb) glyph. Article and ending carry the gender colour.

const ARTICLE_COLORS := {"m": "#A8731A", "f": "#2A6FB5", "n": "#A84E2A"}
const VERB_ENDING_COLOR := "#A0206E"
const _SENTENCE_END := [".", "!", ";", "?"]


static func word_ids(line: Array) -> Array[String]:
	var out: Array[String] = []
	for t in line:
		if t is Array and not out.has(str(t[0])):
			out.append(str(t[0]))
	return out


static func plain(line: Array, lex: Lexicon, capitalize: bool = true) -> String:
	return _render(line, lex, capitalize, false, false)


static func bbcode(line: Array, lex: Lexicon, capitalize: bool = true, caps: bool = false) -> String:
	return _render(line, lex, capitalize, caps, true)


static func _render(line: Array, lex: Lexicon, capitalize: bool, caps: bool, rich: bool) -> String:
	var s := ""
	var cap_next := capitalize
	for t in line:
		if t is String:
			s += Greek.caps(t) if caps else t
			var st: String = t.strip_edges()
			if st != "":
				cap_next = capitalize and st.right(1) in _SENTENCE_END
		else:
			s += _word(t, lex, cap_next, caps, rich)
			cap_next = false
	return s


static func _word(t: Array, lex: Lexicon, cap: bool, caps: bool, rich: bool) -> String:
	var id: String = t[0]
	var form: String = t[1] if t.size() > 1 else ""
	var emph: bool = t.size() > 2 and t[2] == "emph"
	var p := lex.parts(id, form)
	var art: String = p["article"]
	var stem: String = p["stem"]
	var ending: String = p["ending"]
	if caps:
		art = Greek.caps(art)
		stem = Greek.caps(stem)
		ending = Greek.caps(ending)
	elif cap:
		if art != "":
			art = Greek.capitalize_first(art)
		else:
			stem = Greek.capitalize_first(stem)
	if not rich:
		return (art + " " if art != "" else "") + stem + ending
	var g := lex.gender(id)
	var out := ""
	if art != "":
		out += "[url=w|%s|article|%s][b][color=%s]%s[/color][/b][/url] " % [id, form, ARTICLE_COLORS[g], art]
	out += "[url=w|%s|stem|%s]%s[/url]" % [id, form, stem]
	if ending != "":
		var e := "[color=%s]%s[/color]" % [ARTICLE_COLORS.get(g, VERB_ENDING_COLOR), ending]
		if emph:
			e = "[wave amp=40 freq=6][b]%s[/b][/wave]" % e
		out += "[url=w|%s|ending|%s]%s[/url]" % [id, form, e]
	return out
```

- [ ] **Step 4: Run tests** — `./test.sh` → all pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: line format — Greek lines to interactive stem/ending BBCode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Level data, palette, autoloads (SignalBus, GameState, CursorManager)

**Files:**
- Create: `game2d/data/level1.json`, `game2d/world/art/palette.gd`
- Create: `game2d/autoload/signal_bus.gd`, `game2d/autoload/game_state.gd`, `game2d/autoload/cursor_manager.gd`
- Modify: `game2d/project.godot` (add `[autoload]`)
- Test: `game2d/tests/test_game_state.gd`

**Interfaces:**
- Consumes: Tasks 2–8.
- Produces:
  - `Palette` constants `PAPER SHADE INK HAZE_DEEP HAZE_LIGHT SEA SEA_DEEP STONE WOOD GOLD AZURE TERRA OK BAD`, `Palette.gender_color(g) -> Color`.
  - `SignalBus` signals: `word_seen(word_id)`, `card_assigned(word_id, picto_id)`, `page_checked(page_id, result)`, `entity_clicked(entity)`, `crate_sorted(word_id, ok)`, `sentence_submitted(puzzle_id, result)`, `item_given(item_id, ok)`, `hint_level_changed(puzzle_id, level)`, `puzzle_solved(puzzle_id)`, `notebook_opened`, `notebook_closed`.
  - `GameState`: fields `lex: Lexicon`, `level: Dictionary`, `notebook: NotebookModel`, `stats: LemmaStats`, `inventory: Array[String]`, `flags: Dictionary`, `sketches: Dictionary`, `scene_id`, `entry_side`, `save_path`; methods `new_game()`, `load_game() -> bool`, `save_game()`, `wipe_save()`, `see(id)`, `see_line(line)`, `line(key) -> Array`, `set_flag(name)`, `has_flag(name) -> bool`, `goto_scene(id, side="left")`. Registers input action `toggle_notebook` (Tab, N).
  - `CursorManager` (CanvasLayer, layer 20): `signal changed(word_id)`, `hold(id)`, `held() -> String`, `is_holding() -> bool`, `clear()`, `show_tip(picto_id)`, `hide_tip()` (tooltip uses `Picto`, created in Task 10 — until then `show_tip` is called by nobody).

- [ ] **Step 1: Level data**

`game2d/data/level1.json`:
```json
{
	"start_scene": "pier",
	"start_inventory": ["diavatirio", "eisitirio"],
	"scenes": {
		"pier": "res://levels/level1/pier.tscn",
		"conveyor": "res://levels/level1/conveyor.tscn",
		"customs": "res://levels/level1/customs.tscn",
		"end": "res://levels/level1/level_end.tscn"
	},
	"pages": {
		"pier": ["limani", "ploio", "faros", "varka"],
		"people": ["naftis", "fylakas", "eimai"],
		"cargo": ["sakos", "valitsa", "kouti"],
		"customs": ["diavatirio", "eisitirio", "echo", "nai", "ochi"],
		"exit": ["exodos"]
	},
	"conveyor": {"goal": 6, "words": ["sakos", "valitsa", "kouti", "faros", "varka", "ploio"]},
	"customs": {
		"target": [{"w": "nai", "f": ""}, {"w": "echo", "f": "1s"}, {"w": "diavatirio", "f": "nom"}],
		"tiles": [
			{"w": "echo", "f": "2s"}, {"w": "nai", "f": ""}, {"w": "eisitirio", "f": "nom"},
			{"w": "echo", "f": "1s"}, {"w": "ochi", "f": ""}, {"w": "diavatirio", "f": "nom"},
			{"w": "echo", "f": "3s"}
		],
		"item": "diavatirio"
	},
	"lines": {
		"sailor_intro": [["eimai", "1s"], " ", ["naftis", "nom"], "."],
		"sailor_yes": [["nai", ""], "!"],
		"sailor_no": [["ochi", ""], "."],
		"worker_no": [["ochi", ""], "."],
		"worker_yes": [["nai", ""], "!"],
		"guard_question": [["eimai", "1s"], " ", ["fylakas", "nom"], ". ", ["echo", "2s"], " ", ["diavatirio", "nom"], ";"],
		"guard_answer": [["nai", ""], ", ", ["echo", "1s"], " ", ["diavatirio", "nom"], "."],
		"guard_yes": [["nai", ""], "!"],
		"guard_syntactic": [["diavatirio", "nom"], " ", ["echo", "3s"], ";", " ", ["ochi", ""], "!"]
	}
}
```

- [ ] **Step 2: Palette**

`game2d/world/art/palette.gd`:
```gdscript
class_name Palette
extends RefCounted
## Colours of the Piraeus look (carried over from the 3D version) + gender classes (pedagogy spec).

const PAPER := Color("#FBF7F0")
const SHADE := Color("#FAC2B8")
const INK := Color("#80294D")
const HAZE_DEEP := Color("#A0206E")
const HAZE_LIGHT := Color("#D8609C")
const SEA := Color("#7FB9C4")
const SEA_DEEP := Color("#4F8FA3")
const STONE := Color("#EADFCF")
const WOOD := Color("#C39467")
const GOLD := Color("#D9A13B")    # class ο: amber, vertical
const AZURE := Color("#3B8FD9")   # class η: azure, round
const TERRA := Color("#C8643B")   # class το: terracotta, square
const OK := Color("#4E9A5B")
const BAD := Color("#C8402F")


static func gender_color(g: String) -> Color:
	match g:
		"m":
			return GOLD
		"f":
			return AZURE
		"n":
			return TERRA
	return INK
```

- [ ] **Step 3: Autoloads**

`game2d/autoload/signal_bus.gd`:
```gdscript
extends Node
## Global signals. Emitters and listeners never reference each other directly.

signal word_seen(word_id: String)
signal card_assigned(word_id: String, picto_id: String)
signal page_checked(page_id: String, result: String)
signal entity_clicked(entity: Node)
signal crate_sorted(word_id: String, ok: bool)
signal sentence_submitted(puzzle_id: String, result: Dictionary)
signal item_given(item_id: String, ok: bool)
signal hint_level_changed(puzzle_id: String, level: int)
signal puzzle_solved(puzzle_id: String)
signal notebook_opened
signal notebook_closed
```

`game2d/autoload/game_state.gd`:
```gdscript
extends Node
## Session state and persistence: lexicon, level data, notebook, inventory, flags, word stats.

const LEXICON_PATH := "res://data/lexicon.json"
const LEVEL_PATH := "res://data/level1.json"

var lex: Lexicon
var level: Dictionary
var notebook: NotebookModel
var stats := LemmaStats.new()
var inventory: Array[String] = []
var flags: Dictionary = {}
var sketches: Dictionary = {}    # word_id -> true; hint level 3 sketches (not saved)
var scene_id := "pier"
var entry_side := "left"
var save_path := "user://save.json"


func _ready() -> void:
	lex = Lexicon.from_file(LEXICON_PATH)
	level = JSON.parse_string(FileAccess.get_file_as_string(LEVEL_PATH))
	_register_inputs()
	new_game()
	load_game()


func new_game() -> void:
	notebook = NotebookModel.new(lex, level["pages"])
	stats = LemmaStats.new()
	inventory.assign(level.get("start_inventory", []))
	flags = {}
	sketches = {}
	scene_id = level.get("start_scene", "pier")
	entry_side = "left"


func load_game() -> bool:
	var d := SaveCodec.read(save_path)
	if d.is_empty():
		return false
	new_game()
	notebook.load_dict(d.get("notebook", {}))
	stats.load_dict(d.get("stats", {}))
	inventory.assign(d.get("inventory", inventory))
	flags = d.get("flags", {})
	var sid: String = d.get("scene", scene_id)
	if level["scenes"].has(sid):
		scene_id = sid
	return true


func save_game() -> void:
	SaveCodec.write(save_path, {
		"scene": scene_id,
		"notebook": notebook.to_dict(),
		"stats": stats.to_dict(),
		"inventory": inventory,
		"flags": flags,
	})


func wipe_save() -> void:
	if FileAccess.file_exists(save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))
	new_game()


func see(word_id: String) -> void:
	if notebook.see(word_id):
		SignalBus.word_seen.emit(word_id)


## Every word of a line goes into the notebook (dual coding: heard + shown → card).
func see_line(l: Array) -> void:
	for w in LineFormat.word_ids(l):
		see(w)


func line(key: String) -> Array:
	return level["lines"][key]


func set_flag(name: String) -> void:
	flags[name] = true


func has_flag(name: String) -> bool:
	return flags.get(name, false)


func goto_scene(id: String, side: String = "left") -> void:
	scene_id = id
	entry_side = side
	save_game()
	get_tree().paused = false
	get_tree().change_scene_to_file(level["scenes"][id])


func _register_inputs() -> void:
	if InputMap.has_action("toggle_notebook"):
		return
	InputMap.add_action("toggle_notebook")
	for key in [KEY_TAB, KEY_N]:
		var ev := InputEventKey.new()
		ev.physical_keycode = key
		InputMap.action_add_event("toggle_notebook", ev)
```

`game2d/autoload/cursor_manager.gd`:
```gdscript
extends CanvasLayer
## Two-click binding (blueprint §1.3): a notebook card is "held" on the cursor until the player
## clicks a world object (that assigns the object's pictogram to the card) or cancels with
## Esc / right click. Also hosts the single hover tooltip used by InteractiveText.

signal changed(word_id: String)

var _held := ""
var _label: Label
var _tip: PanelContainer
var _tip_picto: Control


func _ready() -> void:
	layer = 20
	process_mode = Node.PROCESS_MODE_ALWAYS
	_label = Label.new()
	_label.visible = false
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_label.add_theme_font_size_override("font_size", 28)
	_label.add_theme_color_override("font_color", Palette.INK)
	_label.add_theme_color_override("font_outline_color", Palette.PAPER)
	_label.add_theme_constant_override("outline_size", 8)
	add_child(_label)


func hold(word_id: String) -> void:
	_held = word_id
	_label.text = "• " + GameState.lex.surface(word_id)
	_label.visible = true
	changed.emit(_held)


func held() -> String:
	return _held


func is_holding() -> bool:
	return _held != ""


func clear() -> void:
	_held = ""
	_label.visible = false
	changed.emit("")


func show_tip(picto_id: String) -> void:
	if _tip == null:
		_build_tip()
	_tip_picto.picto_id = picto_id
	_tip.visible = true


func hide_tip() -> void:
	if _tip:
		_tip.visible = false


func _build_tip() -> void:
	_tip = PanelContainer.new()
	_tip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PAPER
	sb.border_color = Palette.INK
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(10)
	sb.set_content_margin_all(6)
	_tip.add_theme_stylebox_override("panel", sb)
	_tip_picto = Picto.new()
	_tip_picto.custom_minimum_size = Vector2(72, 72)
	_tip_picto.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_tip.add_child(_tip_picto)
	add_child(_tip)


func _process(_delta: float) -> void:
	var m := get_viewport().get_mouse_position()
	if _label.visible:
		_label.position = m + Vector2(18, 14)
	if _tip and _tip.visible:
		_tip.position = m + Vector2(16, -100)


func _unhandled_input(event: InputEvent) -> void:
	if not is_holding():
		return
	var right_click := event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_RIGHT
	if event.is_action_pressed("ui_cancel") or right_click:
		clear()
		get_viewport().set_input_as_handled()
```

Append to `game2d/project.godot` (after `[application]` section):
```ini
[autoload]

SignalBus="*res://autoload/signal_bus.gd"
GameState="*res://autoload/game_state.gd"
CursorManager="*res://autoload/cursor_manager.gd"
```

Note: `cursor_manager.gd` references `Picto` (Task 10). Until Task 10, create a stub so the project compiles — `game2d/ui/picto.gd`:
```gdscript
class_name Picto
extends Control
## Stub; replaced by the full pictogram renderer in Task 10.

var picto_id := ""
var sketch := false
```

- [ ] **Step 4: Write the failing test**

`game2d/tests/test_game_state.gd`:
```gdscript
extends TestCase

var seen_signal: Array = []


func _gs() -> Node:
	var gs := tree.root.get_node("GameState")
	gs.new_game()
	return gs


func _on_seen(w: String) -> void:
	seen_signal.append(w)


func test_level_data_integrity() -> void:
	var gs := _gs()
	var paged := {}
	for p in gs.level["pages"]:
		for w in gs.level["pages"][p]:
			check(gs.lex.has(w), "page word in lexicon: " + w)
			check(not paged.has(w), "word on one page only: " + w)
			paged[w] = true
	eq(paged.size(), gs.lex.ids().size(), "every lexicon word is on a page")
	for t in gs.level["customs"]["target"] + gs.level["customs"]["tiles"]:
		check(gs.lex.has(t["w"]), "customs token: " + t["w"])
	for key in gs.level["lines"]:
		for w in LineFormat.word_ids(gs.level["lines"][key]):
			check(gs.lex.has(w), "line %s word %s" % [key, w])


func test_new_game_defaults() -> void:
	var gs := _gs()
	eq(gs.scene_id, "pier", "start scene")
	eq(gs.inventory, ["diavatirio", "eisitirio"] as Array[String], "start inventory")
	eq(gs.notebook.seen.size(), 0, "empty notebook")


func test_see_line_emits_new_words_once() -> void:
	var gs := _gs()
	seen_signal = []
	SignalBus.word_seen.connect(_on_seen)
	gs.see_line(gs.line("sailor_intro"))
	gs.see_line(gs.line("sailor_intro"))
	SignalBus.word_seen.disconnect(_on_seen)
	eq(seen_signal, ["eimai", "naftis"], "emitted once each")


func test_save_load_roundtrip() -> void:
	var gs := _gs()
	gs.see("faros")
	gs.notebook.assign("faros", "lighthouse")
	gs.stats.record("faros", true)
	gs.set_flag("pier_open")
	gs.scene_id = "conveyor"
	gs.save_game()
	gs.new_game()
	eq(gs.notebook.is_seen("faros"), false, "fresh state")
	eq(gs.load_game(), true, "loaded")
	eq(gs.notebook.assignment("faros"), "lighthouse", "assignment")
	eq(gs.has_flag("pier_open"), true, "flag")
	eq(gs.scene_id, "conveyor", "scene")
	eq(gs.stats.data["faros"]["correct"], 1, "stats as int")
	gs.wipe_save()
	eq(gs.load_game(), false, "wiped")
```

- [ ] **Step 5: Run tests** — `./test.sh` → all pass (the runner redirects `save_path` to `user://test_run_save.json`).

- [ ] **Step 6: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: level 1 data, palette, SignalBus/GameState/CursorManager autoloads

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: Art kit — ink drawing, pictograms, backdrop, UI helpers, snapshot tool

**Files:**
- Create: `game2d/assets/fonts/gfs-didot-greek-400-normal.woff2` (copy), `game2d/assets/fonts/LICENSE.txt`
- Create: `game2d/world/art/ink.gd`, `game2d/world/art/shape.gd`, `game2d/world/art/backdrop.gd`
- Replace stub: `game2d/ui/picto.gd`
- Create: `game2d/ui/fonts.gd`, `game2d/ui/ui.gd`
- Create: `game2d/tools/snapshot.gd`, `game2d/tools/gallery.tscn`, `game2d/tools/gallery.gd`
- Test: `game2d/tests/test_art.gd`

**Interfaces:**
- Produces: `Ink.pts(flat: Array) -> PackedVector2Array`, `Ink.circle_pts(c, r, n=28)`, `Ink.poly(ci, pts, fill, width=4)`, `Ink.rect(ci, r: Rect2, fill, width=4)`, `Ink.circle(ci, c, r, fill, width=4)`;
  `Shape.make(pts, fill, width=4) -> Shape` (Node2D drawing one ink polygon);
  `Picto` (Control; `picto_id`, `sketch`; consts `ALL`, `GLYPHS`);
  `Backdrop` (Node2D; `style` "pier"|"warehouse"|"customs", `floor_y = 760`);
  `Fonts.greek() -> Font`, `Fonts.greek_bold() -> Font`;
  `Ui.panel_style(radius=0, border=4, bg=PAPER) -> StyleBoxFlat`, `Ui.label(text, px=24) -> Label`, `Ui.greek_label(text, px=32) -> Label`, `Ui.style_button(b, text, px=24) -> Button`, `Ui.button(text, px=24) -> Button`, `Ui.icon_button(picto_id, side=96) -> Button`, `Ui.card_style(gender, selected, locked) -> StyleBoxFlat`.
  `./snap.sh <name>[:case] ...` → `tools/out/<name>[_case].png`; names: `gallery` or a key of `level1.json` `scenes`. Scenes may implement `debug_setup(case: String)`.

- [ ] **Step 1: Font asset**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy/telegram-bot
mkdir -p game2d/assets/fonts
cp game/node_modules/@fontsource/gfs-didot/files/gfs-didot-greek-400-normal.woff2 game2d/assets/fonts/
```

`game2d/assets/fonts/LICENSE.txt`:
```
GFS Didot — Copyright (c) Greek Font Society. Licensed under the SIL Open Font License 1.1
(https://openfontlicense.org). Greek-subset woff2 taken from the @fontsource/gfs-didot package.
```

- [ ] **Step 2: Write the failing test**

`game2d/tests/test_art.gd`:
```gdscript
extends TestCase


func test_ink_points() -> void:
	eq(Ink.pts([1, 2, 3, 4]), PackedVector2Array([Vector2(1, 2), Vector2(3, 4)]), "pairs")
	eq(Ink.circle_pts(Vector2.ZERO, 10.0, 4).size(), 4, "circle point count")


func test_every_lexicon_picto_is_drawable() -> void:
	var lex := Lexicon.from_file("res://data/lexicon.json")
	for id in lex.ids():
		check(lex.picto(id) in Picto.ALL, "picto drawn for " + id)


func test_greek_font_loads_with_fallback() -> void:
	var f := Fonts.greek()
	check(f != null, "font loaded")
	check(f.fallbacks.size() > 0, "fallback for punctuation/latin")
```

- [ ] **Step 3: Run to verify failure** — `./test.sh test_art` → `Ink` not declared.

- [ ] **Step 4: Implement drawing kit**

`game2d/world/art/ink.gd`:
```gdscript
class_name Ink
extends RefCounted
## Flat fill + maroon ink outline: the line look of the whole game.


static func pts(flat: Array) -> PackedVector2Array:
	var p := PackedVector2Array()
	for i in range(0, flat.size() - 1, 2):
		p.append(Vector2(flat[i], flat[i + 1]))
	return p


static func circle_pts(c: Vector2, r: float, n: int = 28) -> PackedVector2Array:
	var p := PackedVector2Array()
	for i in n:
		p.append(c + Vector2.from_angle(TAU * i / n) * r)
	return p


static func poly(ci: CanvasItem, p: PackedVector2Array, fill: Color, width: float = 4.0) -> void:
	ci.draw_colored_polygon(p, fill)
	if width > 0.0:
		var closed := p.duplicate()
		closed.append(p[0])
		ci.draw_polyline(closed, Palette.INK, width, true)


static func rect(ci: CanvasItem, r: Rect2, fill: Color, width: float = 4.0) -> void:
	poly(ci, PackedVector2Array([r.position, Vector2(r.end.x, r.position.y), r.end, Vector2(r.position.x, r.end.y)]), fill, width)


static func circle(ci: CanvasItem, c: Vector2, r: float, fill: Color, width: float = 4.0) -> void:
	poly(ci, circle_pts(c, r), fill, width)
```

`game2d/world/art/shape.gd`:
```gdscript
class_name Shape
extends Node2D
## One ink-outlined flat polygon as a node, so limbs can rotate around their own origin.

var pts := PackedVector2Array()
var fill := Color.WHITE
var width := 4.0


static func make(points: PackedVector2Array, color: Color, w: float = 4.0) -> Shape:
	var s := Shape.new()
	s.pts = points
	s.fill = color
	s.width = w
	return s


func _draw() -> void:
	Ink.poly(self, pts, fill, width)
```

`game2d/ui/picto.gd` (replaces the Task 9 stub):
```gdscript
@tool
class_name Picto
extends Control
## Pictogram drawn in code (no image files) in a 100×100 design box scaled to the control.
## Meanings in the notebook, inventory items, tooltips. sketch = faded hint-level-3 look.

const ALL := ["port", "ship", "lighthouse", "boat", "sailor", "sack", "suitcase", "box", "guard",
	"passport", "ticket", "exit", "be", "have", "yes", "no"]
const GLYPHS := ["g_m", "g_f", "g_n", "p1", "p2", "p3", "unknown", "book"]

@export var picto_id := "":
	set(v):
		picto_id = v
		queue_redraw()
@export var sketch := false:
	set(v):
		sketch = v
		queue_redraw()

var _c := Palette.INK


func _draw() -> void:
	var s := minf(size.x, size.y) / 100.0
	if s <= 0.0:
		return
	draw_set_transform((size - Vector2(100, 100) * s) / 2.0, 0.0, Vector2(s, s))
	_c = Color(Palette.INK, 0.4) if sketch else Palette.INK
	match picto_id:
		"port":
			_fill([8, 58, 92, 58, 92, 70, 8, 70])
			_fill([41, 40, 53, 40, 52, 58, 42, 58])
			draw_circle(Vector2(47, 40), 8, _c)
			_waves(84)
		"ship":
			_fill([6, 58, 94, 58, 82, 80, 18, 80])
			_ring([30, 38, 68, 38, 68, 58, 30, 58])
			_fill([54, 22, 64, 22, 64, 38, 54, 38])
			_waves(90)
		"lighthouse":
			_ring([40, 88, 60, 88, 56, 34, 44, 34])
			_line([42, 52, 58, 52], 4)
			_line([41, 70, 59, 70], 4)
			_fill([42, 22, 58, 22, 58, 34, 42, 34])
			_fill([40, 22, 60, 22, 50, 10])
			_line([18, 24, 34, 27], 4)
			_line([66, 27, 82, 24], 4)
		"boat":
			_fill([12, 62, 88, 62, 74, 80, 26, 80])
			_line([50, 62, 50, 16])
			_ring([54, 18, 54, 58, 82, 58])
			_waves(90)
		"sailor":
			_person(50, 26, 1.4)
			for y in [56, 66, 76]:
				draw_line(Vector2(37, y), Vector2(63, y), Palette.PAPER, 3.0)
			_fill([38, 14, 62, 14, 58, 6, 42, 6])
		"sack":
			_fill([30, 88, 70, 88, 80, 62, 64, 34, 36, 34, 20, 62])
			_fill([42, 22, 58, 22, 55, 36, 45, 36])
			_line([36, 32, 50, 40, 64, 32], 4)
		"suitcase":
			_ring([16, 38, 84, 38, 84, 84, 16, 84])
			_line([38, 38, 38, 26, 62, 26, 62, 38])
			_line([36, 38, 36, 84], 4)
			_line([64, 38, 64, 84], 4)
		"box":
			_ring([22, 34, 78, 34, 78, 86, 22, 86])
			_line([22, 34, 34, 20])
			_line([78, 34, 66, 20])
			_line([50, 34, 50, 86], 4)
		"guard":
			_person(50, 28, 1.4)
			_fill([36, 18, 64, 18, 62, 6, 38, 6])
			_fill([33, 18, 67, 18, 67, 23, 33, 23])
			draw_circle(Vector2(44, 56), 4, Palette.PAPER)
		"passport":
			_fill([28, 12, 72, 12, 72, 88, 28, 88])
			draw_arc(Vector2(50, 42), 11, 0, TAU, 24, Palette.PAPER, 3.0, true)
			draw_line(Vector2(38, 70), Vector2(62, 70), Palette.PAPER, 3.0)
		"ticket":
			_ring([12, 34, 88, 34, 88, 66, 12, 66])
			for y in range(37, 64, 8):
				draw_line(Vector2(66, y), Vector2(66, y + 4), _c, 3.0)
			_line([20, 44, 56, 44], 3)
			_line([20, 54, 48, 54], 3)
		"exit":
			_ring([18, 14, 50, 14, 50, 88, 18, 88])
			draw_circle(Vector2(44, 52), 3, _c)
			_line([58, 52, 86, 52], 6)
			_fill([80, 42, 94, 52, 80, 62])
		"be":
			_person(26, 26, 1.2)
			_line([44, 46, 58, 46], 5)
			_line([44, 58, 58, 58], 5)
			draw_arc(Vector2(76, 26), 10, 0, TAU, 24, _c, 4.0, true)
			_ring([64, 40, 88, 40, 85, 76, 67, 76], 4)
		"have":
			_person(22, 26, 1.2)
			_line([32, 52, 54, 44], 5)
			_line([56, 50, 56, 38, 78, 38, 78, 50], 4)
			_fill([48, 50, 86, 50, 82, 88, 52, 88])
		"yes":
			_line([18, 52, 40, 74, 84, 26], 10)
		"no":
			_line([22, 22, 78, 78], 10)
			_line([78, 22, 22, 78], 10)
		"g_m":
			_fill([44, 40, 56, 40, 56, 92, 44, 92])
			draw_circle(Vector2(50, 24), 14, _c)
			for i in 8:
				var a := TAU * i / 8.0
				draw_line(Vector2(50, 24) + Vector2.from_angle(a) * 18, Vector2(50, 24) + Vector2.from_angle(a) * 24, _c, 3.0)
		"g_f":
			draw_arc(Vector2(50, 50), 32, 0, TAU, 40, _c, 6.0, true)
			_line([26, 54, 34, 46, 42, 54, 50, 46, 58, 54, 66, 46, 74, 54], 4)
		"g_n":
			_fill([24, 24, 76, 24, 76, 76, 24, 76])
			draw_line(Vector2(30, 42), Vector2(70, 42), Palette.PAPER, 3.0)
			draw_line(Vector2(30, 58), Vector2(70, 58), Palette.PAPER, 3.0)
		"p1":
			_person(30, 26, 1.3)
			_line([92, 52, 58, 52], 5)
			_fill([50, 52, 62, 44, 62, 60])
		"p2":
			_person(20, 30, 1.0)
			_line([34, 52, 62, 52], 5)
			_fill([70, 52, 60, 44, 60, 60])
			draw_arc(Vector2(82, 30), 9, 0, TAU, 20, _c, 3.0, true)
			_ring([70, 42, 94, 42, 91, 72, 73, 72], 3)
		"p3":
			_person(16, 40, 0.8)
			_person(36, 40, 0.8)
			_line([26, 26, 70, 22, 80, 36], 4)
			_fill([74, 36, 86, 34, 82, 46])
			draw_arc(Vector2(84, 56), 8, 0, TAU, 20, _c, 3.0, true)
			_ring([74, 66, 94, 66, 91, 92, 77, 92], 3)
		"book":
			_ring([8, 24, 47, 30, 47, 84, 8, 78])
			_ring([53, 30, 92, 24, 92, 78, 53, 84])
			for y in [44, 56, 68]:
				_line([16, y - 4, 40, y], 3)
				_line([60, y, 84, y - 4], 3)
		"unknown":
			draw_string(ThemeDB.fallback_font, Vector2(30, 80), "?", HORIZONTAL_ALIGNMENT_LEFT, -1, 80, Color(_c, 0.5))


func _person(x: float, y: float, k: float) -> void:
	draw_circle(Vector2(x, y), 9.0 * k, _c)
	_fill([x - 12 * k, y + 12 * k, x + 12 * k, y + 12 * k, x + 9 * k, y + 42 * k, x - 9 * k, y + 42 * k])


func _fill(flat: Array) -> void:
	draw_colored_polygon(Ink.pts(flat), _c)


func _line(flat: Array, w: float = 5.0) -> void:
	draw_polyline(Ink.pts(flat), _c, w, true)


func _ring(flat: Array, w: float = 5.0) -> void:
	var p := Ink.pts(flat)
	p.append(p[0])
	draw_polyline(p, _c, w, true)


func _waves(y: float) -> void:
	_line([8, y, 20, y - 6, 32, y, 44, y - 6, 56, y, 68, y - 6, 80, y, 92, y - 6], 4)
```

`game2d/world/art/backdrop.gd`:
```gdscript
@tool
class_name Backdrop
extends Node2D
## Painted backdrop: sky in paper→shade bands with a magenta haze, per-style scenery, then the stone
## floor with a faint ink tile grid (Chants look). Always the first child of a level scene.

@export_enum("pier", "warehouse", "customs") var style := "pier":
	set(v):
		style = v
		queue_redraw()
@export var floor_y := 760.0


func _draw() -> void:
	var bands := 10
	for i in bands:
		var c := Palette.PAPER.lerp(Palette.SHADE, 0.8 * i / (bands - 1))
		draw_rect(Rect2(0, floor_y * i / bands, 1920, floor_y / bands + 1.0), c)
	match style:
		"pier":
			_pier()
		"warehouse":
			_warehouse()
		"customs":
			_customs()
	draw_rect(Rect2(0, floor_y, 1920, 1080 - floor_y), Palette.STONE)
	var grid := Color(Palette.INK, 0.10)
	for x in range(-480, 2400, 120):
		draw_line(Vector2(x, floor_y), Vector2(x + (x - 960) * 0.35, 1080), grid, 2.0)
	for y in [800.0, 860.0, 940.0, 1040.0]:
		draw_line(Vector2(0, y), Vector2(1920, y), grid, 2.0)
	draw_line(Vector2(0, floor_y), Vector2(1920, floor_y), Palette.INK, 5.0)


func _pier() -> void:
	draw_colored_polygon(Ink.pts([0, 472, 0, 420, 240, 400, 520, 440, 780, 380, 1100, 430, 1400, 390, 1700, 430, 1920, 400, 1920, 472]), Color(Palette.HAZE_LIGHT, 0.25))
	draw_rect(Rect2(0, 470, 1920, floor_y - 470), Palette.SEA)
	for i in 6:
		var y := 500.0 + i * 42.0
		var p := PackedVector2Array()
		for x in range(0, 1960, 40):
			p.append(Vector2(x, y + sin(x * 0.02 + i) * 4.0))
		draw_polyline(p, Color(Palette.SEA_DEEP, 0.5), 3.0, true)
	draw_line(Vector2(0, 470), Vector2(1920, 470), Palette.INK, 3.0)


func _warehouse() -> void:
	Ink.rect(self, Rect2(-10, 120, 1940, floor_y - 120), Palette.STONE.lerp(Palette.SHADE, 0.35))
	for i in 5:
		var x := 120.0 + i * 380.0
		Ink.rect(self, Rect2(x, 190, 220, 160), Palette.PAPER.lerp(Palette.SHADE, 0.5))
		draw_line(Vector2(x + 110, 190), Vector2(x + 110, 350), Palette.INK, 3.0)
	for i in 7:
		Ink.rect(self, Rect2(40.0 + i * 310.0, 120, 34, floor_y - 120), Palette.WOOD, 3.0)
	Ink.rect(self, Rect2(-10, 100, 1940, 40), Palette.WOOD, 3.0)


func _customs() -> void:
	Ink.rect(self, Rect2(-10, 160, 1940, floor_y - 160), Palette.PAPER.lerp(Palette.STONE, 0.6))
	for i in 4:
		var cx := 240.0 + i * 480.0
		var arch := PackedVector2Array([Vector2(cx - 120, floor_y)])
		for k in 13:
			arch.append(Vector2(cx - 120 + 240.0 * k / 12.0, 330.0 - sin(PI * k / 12.0) * 90.0))
		arch.append(Vector2(cx + 120, floor_y))
		Ink.poly(self, arch, Palette.SHADE.lerp(Palette.PAPER, 0.3))
	Ink.rect(self, Rect2(-10, 130, 1940, 44), Palette.STONE.darkened(0.08), 3.0)
```

`game2d/ui/fonts.gd`:
```gdscript
class_name Fonts
extends RefCounted
## GFS Didot (Greek subset) for in-world Greek; falls back to Godot's default font for
## punctuation, Latin and Cyrillic.

static var _greek: Font
static var _greek_bold: Font


static func greek() -> Font:
	if _greek == null:
		var f: FontFile = load("res://assets/fonts/gfs-didot-greek-400-normal.woff2")
		f.fallbacks = [ThemeDB.fallback_font]
		_greek = f
	return _greek


static func greek_bold() -> Font:
	if _greek_bold == null:
		var v := FontVariation.new()
		v.base_font = greek()
		v.variation_embolden = 0.9
		_greek_bold = v
	return _greek_bold
```

`game2d/ui/ui.gd`:
```gdscript
class_name Ui
extends RefCounted
## Shared look for code-built UI: paper panels, ink borders, ink text, class-coloured word cards.


static func panel_style(radius: int = 0, border: int = 4, bg: Color = Palette.PAPER) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = Palette.INK
	sb.set_border_width_all(border)
	sb.set_corner_radius_all(radius)
	sb.set_content_margin_all(14)
	sb.anti_aliasing = true
	return sb


static func label(text: String, px: int = 24) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", px)
	l.add_theme_color_override("font_color", Palette.INK)
	return l


static func greek_label(text: String, px: int = 32) -> Label:
	var l := label(text, px)
	l.add_theme_font_override("font", Fonts.greek())
	return l


static func style_button(b: Button, text: String, px: int = 24) -> Button:
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_size_override("font_size", px)
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color", "font_hover_pressed_color"]:
		b.add_theme_color_override(c, Palette.INK)
	b.add_theme_color_override("font_disabled_color", Color(Palette.INK, 0.35))
	b.add_theme_stylebox_override("normal", panel_style(12, 3))
	b.add_theme_stylebox_override("hover", panel_style(12, 3, Palette.SHADE.lerp(Palette.PAPER, 0.5)))
	b.add_theme_stylebox_override("pressed", panel_style(12, 3, Palette.SHADE))
	b.add_theme_stylebox_override("hover_pressed", panel_style(12, 3, Palette.SHADE))
	b.add_theme_stylebox_override("disabled", panel_style(12, 2, Palette.PAPER.darkened(0.04)))
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	return b


static func button(text: String, px: int = 24) -> Button:
	return style_button(Button.new(), text, px)


static func icon_button(picto_id: String, side: float = 96.0) -> Button:
	var b := button("", 20)
	b.custom_minimum_size = Vector2(side, side)
	var p := Picto.new()
	p.picto_id = picto_id
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.set_anchors_preset(Control.PRESET_FULL_RECT)
	p.offset_left = 10
	p.offset_top = 10
	p.offset_right = -10
	p.offset_bottom = -10
	b.add_child(p)
	return b


## Word card frame by class (pedagogy §4.1): ο tall side bars, η round, το square; verbs/particles plain ink.
static func card_style(gender: String, selected: bool, locked: bool) -> StyleBoxFlat:
	var bg := Palette.PAPER
	if locked:
		bg = Palette.GOLD.lerp(Palette.PAPER, 0.72)
	elif selected:
		bg = Palette.SHADE
	var sb := panel_style(0, 4, bg)
	sb.border_color = Palette.gender_color(gender)
	match gender:
		"m":
			sb.border_width_left = 12
			sb.border_width_right = 12
			sb.border_width_top = 3
			sb.border_width_bottom = 3
		"f":
			sb.set_corner_radius_all(36)
			sb.set_border_width_all(6)
		"n":
			sb.set_border_width_all(7)
		_:
			sb.border_color = Palette.INK
			sb.set_corner_radius_all(12)
			sb.set_border_width_all(3)
	return sb
```

- [ ] **Step 5: Snapshot tool + gallery**

`game2d/tools/snapshot.gd`:
```gdscript
extends SceneTree
## Renders scenes off-screen at 1920×1080 into res://tools/out/<name>[_case].png.
## Usage: ./snap.sh gallery pier pier:notebook   (names: "gallery" or a level1.json scene key)
## A scene may implement debug_setup(case: String) to stage a state before the capture.
## Uses its own save file so the player's progress is never touched.


func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://tools/out"))
	var gs := root.get_node("GameState")
	gs.save_path = "user://snapshot_save.json"
	for arg in OS.get_cmdline_user_args():
		var name := arg.get_slice(":", 0)
		var case_name := arg.get_slice(":", 1) if arg.contains(":") else ""
		var path: String = "res://tools/gallery.tscn" if name == "gallery" else gs.level["scenes"][name]
		gs.new_game()
		paused = false
		var vp := SubViewport.new()
		vp.size = Vector2i(1920, 1080)
		vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
		root.add_child(vp)
		var scene: Node = load(path).instantiate()
		vp.add_child(scene)
		await process_frame
		if scene.has_method("debug_setup"):
			await scene.debug_setup(case_name)
		for i in 40:
			await process_frame
		await RenderingServer.frame_post_draw
		var out := "res://tools/out/%s.png" % arg.replace(":", "_")
		vp.get_texture().get_image().save_png(ProjectSettings.globalize_path(out))
		print("snapshot ", ProjectSettings.globalize_path(out))
		vp.queue_free()
		await process_frame
	if FileAccess.file_exists(gs.save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(gs.save_path))
	quit(0)
```

`game2d/tools/gallery.tscn`:
```
[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://tools/gallery.gd" id="1"]

[node name="Gallery" type="Control"]
layout_mode = 3
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0
script = ExtResource("1")
```

`game2d/tools/gallery.gd`:
```gdscript
extends Control
## Visual check sheet for snapshot.gd: every pictogram and glyph; later tasks add actors and text.


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Palette.PAPER
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var x := 40.0
	var y := 30.0
	for id in Picto.ALL + Picto.GLYPHS:
		var p := Picto.new()
		p.picto_id = id
		p.position = Vector2(x, y)
		p.size = Vector2(110, 110)
		add_child(p)
		var l := Ui.label(id, 16)
		l.position = Vector2(x, y + 112)
		add_child(l)
		x += 150.0
		if x > 1800.0:
			x = 40.0
			y += 160.0
	_extra()


func _extra() -> void:
	var d := Node2D.new()
	add_child(d)
	var bd := Backdrop.new()
	bd.style = "pier"
	bd.scale = Vector2(0.45, 0.45)
	bd.position = Vector2(40, 420)
	d.add_child(bd)
	var gl := Ui.greek_label("Το λιμάνι · ΕΞΟΔΟΣ · έχεις;", 40)
	gl.position = Vector2(1000, 450)
	add_child(gl)
```

- [ ] **Step 6: Run tests + snapshot**

Run: `./test.sh` → all pass.
Run: `./snap.sh gallery` then open `tools/out/gallery.png` (Read tool).
Expected: 24 recognisable ink pictograms with labels, a small pier backdrop (sky bands, sea, stone floor), a Greek line in GFS Didot with `·`/`;` rendered through the fallback font. Fix any glyph that reads wrong before committing.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: ink art kit, 24 code-drawn pictograms, backdrops, UI helpers, snapshot tool

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Interactive text, speech bubbles, actors, signs, world interactables

**Files:**
- Create: `game2d/ui/interactive_text.gd`, `game2d/ui/dialogue_bubble.gd`
- Create: `game2d/world/actors/actor.gd`, `game2d/world/interactable.gd`, `game2d/world/props/sign_board.gd`
- Modify: `game2d/autoload/game_state.gd` (add `bind_held_card`)
- Modify: `game2d/tools/gallery.gd` (`_extra()` shows actors, bubble, signs)
- Test: `game2d/tests/test_world_basics.gd`

**Interfaces:**
- Consumes: Tasks 8–10.
- Produces:
  - `InteractiveText.new(px := 30)` (RichTextLabel): fields `line`, `caps := false`, `capitalize := true`, `click_holds := true`, `object_word := ""`; `set_line(line)`.
  - `DialogueBubble` (Node2D): `text: InteractiveText`, `show_line(line, seconds := 4.5)`.
  - `Actor` (Node2D, feet at origin): exports `coat`, `trousers`, `skin`, `hat` ("none"|"cap"|"peaked"|"beret"), `speed`; `signal arrived`; fields `body`, `head`, `arm_l`, `arm_r`, `walking`; `static arm_rotation(shoulder, target) -> float`; `walk_to(pos)`, `point_at(pos, hold := 1.4)`, `hand_to_chest(hold := 1.2)`, `shake_head()`, `nod()`, `scratch_head()`, `reach_toward(pos, hold := 2.0)`, `laugh()`, `say(line, seconds := 4.5)`.
  - `Interactable` (Area2D): `signal clicked(entity)`, `word_id`, `rect`, `setup(id, rect) -> Interactable`, `set_rect(r)`, `set_pulse(on)`.
  - `SignBoard` (Node2D): `setup(line, post_height := 120.0) -> SignBoard`, fields `line`, `word_id`, `text`, `hit: Interactable`.
  - `GameState.bind_held_card(object_word)`.

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_world_basics.gd`:
```gdscript
extends TestCase


func test_arm_rotation_directions() -> void:
	check(is_equal_approx(Actor.arm_rotation(Vector2.ZERO, Vector2(0, 10)), 0.0), "down = rest")
	check(is_equal_approx(Actor.arm_rotation(Vector2.ZERO, Vector2(10, 0)), -PI / 2.0), "right")
	check(is_equal_approx(Actor.arm_rotation(Vector2.ZERO, Vector2(-10, 0)), PI / 2.0), "left")


func test_interactive_text_renders_line() -> void:
	var gs := tree.root.get_node("GameState")
	var t := InteractiveText.new()
	t.set_line(gs.line("sailor_intro"))
	eq(t.text, LineFormat.bbcode(gs.line("sailor_intro"), gs.lex), "bbcode")
	t.free()


func test_actor_say_marks_words_seen() -> void:
	var gs := tree.root.get_node("GameState")
	gs.new_game()
	var a := Actor.new()
	tree.root.add_child(a)
	a.say(gs.line("sailor_intro"))
	eq(gs.notebook.is_seen("naftis"), true, "naftis seen")
	eq(gs.notebook.is_seen("eimai"), true, "eimai seen")
	a.free()


func test_bind_held_card_assigns_object_picto() -> void:
	var gs := tree.root.get_node("GameState")
	var cm := tree.root.get_node("CursorManager")
	gs.new_game()
	gs.see("faros")
	cm.hold("faros")
	gs.bind_held_card("varka")
	eq(gs.notebook.assignment("faros"), "boat", "hypothesis = object picto")
	eq(cm.is_holding(), false, "cursor released")
	gs.bind_held_card("ploio")
	eq(gs.notebook.assignment("faros"), "boat", "nothing held → no change")


func test_sign_board_sees_its_word() -> void:
	var gs := tree.root.get_node("GameState")
	gs.new_game()
	var s := SignBoard.new().setup([["limani", "nom"]])
	tree.root.add_child(s)
	eq(gs.notebook.is_seen("limani"), true, "sign word seen")
	eq(s.hit.word_id, "limani", "sign interactable")
	s.free()
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_world` → `Actor` not declared.

- [ ] **Step 3: GameState.bind_held_card**

Add to `game2d/autoload/game_state.gd` (after `see_line`):
```gdscript
## Two-click binding: the card held on the cursor gets this object's pictogram as a hypothesis.
func bind_held_card(object_word: String) -> void:
	var w: String = CursorManager.held()
	if w == "":
		return
	var p := lex.picto(object_word)
	notebook.assign(w, p)
	SignalBus.card_assigned.emit(w, p)
	CursorManager.clear()
```

- [ ] **Step 4: InteractiveText + DialogueBubble**

`game2d/ui/interactive_text.gd`:
```gdscript
class_name InteractiveText
extends RichTextLabel
## A Greek line with hoverable/clickable word parts (meta "w|id|part|form", see LineFormat).
## Hover stem → tooltip with the player's hypothesis ("?" if none); hover article/ending → class glyph
## (nouns) or person glyph (verbs). Click a seen word → its card is held on the cursor (two-click
## binding). With object_word set (signs), a click while a card is held binds that card to the object.

var line: Array = []
var caps := false
var capitalize := true
var click_holds := true
var object_word := ""
var _bound_frame := -1


func _init(px: int = 30) -> void:
	bbcode_enabled = true
	fit_content = true
	autowrap_mode = TextServer.AUTOWRAP_OFF
	scroll_active = false
	meta_underlined = false
	add_theme_font_override("normal_font", Fonts.greek())
	add_theme_font_override("bold_font", Fonts.greek_bold())
	add_theme_font_size_override("normal_font_size", px)
	add_theme_font_size_override("bold_font_size", px)
	add_theme_color_override("default_color", Palette.INK)
	meta_hover_started.connect(_on_hover)
	meta_hover_ended.connect(_on_unhover)
	meta_clicked.connect(_on_click)


func set_line(l: Array) -> void:
	line = l
	text = LineFormat.bbcode(l, GameState.lex, capitalize, caps)


func _gui_input(event: InputEvent) -> void:
	if object_word == "" or not CursorManager.is_holding():
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		GameState.bind_held_card(object_word)
		_bound_frame = Engine.get_process_frames()
		accept_event()


func _on_click(meta: Variant) -> void:
	if _bound_frame == Engine.get_process_frames():
		return
	var p := str(meta).split("|")
	if p.size() < 4 or CursorManager.is_holding():
		return
	if click_holds and GameState.notebook.is_seen(p[1]):
		CursorManager.hold(p[1])


func _on_hover(meta: Variant) -> void:
	var p := str(meta).split("|")
	if p.size() < 4:
		return
	var id := p[1]
	var lex: Lexicon = GameState.lex
	if p[2] == "stem":
		var a: String = GameState.notebook.assignment(id)
		CursorManager.show_tip(a if a != "" else "unknown")
	elif lex.pos(id) == "noun":
		CursorManager.show_tip("g_" + lex.gender(id))
	elif lex.pos(id) == "verb":
		CursorManager.show_tip("p" + (p[3] if p[3] != "" else "1s").left(1))


func _on_unhover(_meta: Variant) -> void:
	CursorManager.hide_tip()


func _exit_tree() -> void:
	CursorManager.hide_tip()
```

`game2d/ui/dialogue_bubble.gd`:
```gdscript
class_name DialogueBubble
extends Node2D
## Paper speech bubble with an ink border and tail, bottom-centred on its position, sized to the line.

var text: InteractiveText
var _panel: PanelContainer
var _fade: Tween


func _init() -> void:
	z_index = 50
	z_as_relative = false
	_panel = PanelContainer.new()
	_panel.add_theme_stylebox_override("panel", Ui.panel_style(18, 4))
	text = InteractiveText.new(32)
	_panel.add_child(text)
	add_child(_panel)
	visible = false


func show_line(line: Array, seconds: float = 4.5) -> void:
	text.set_line(line)
	visible = true
	modulate.a = 1.0
	_layout()
	_layout.call_deferred()
	if _fade and _fade.is_valid():
		_fade.kill()
	_fade = create_tween()
	_fade.tween_interval(seconds)
	_fade.tween_property(self, "modulate:a", 0.0, 0.4)
	_fade.tween_callback(hide)


func _layout() -> void:
	_panel.reset_size()
	_panel.position = Vector2(-_panel.size.x / 2.0, -_panel.size.y - 18.0)
	queue_redraw()


func _draw() -> void:
	draw_colored_polygon(Ink.pts([-14, -20, 14, -20, 0, 0]), Palette.PAPER)
	draw_polyline(Ink.pts([-14, -20, 0, 0, 14, -20]), Palette.INK, 4.0, true)
```

- [ ] **Step 5: Actor**

`game2d/world/actors/actor.gd`:
```gdscript
class_name Actor
extends Node2D
## Flat procedural figure (feet at the origin) with ink outlines. Limbs are separate Shape nodes,
## so every gesture (point, hand-to-chest, nod, shake, scratch, reach) is a tween of a rotation.
## Gestures are the non-verbal channel of the pedagogy: person endings, yes/no, scaffolding.

signal arrived

const SHOULDER_Y := -160.0
const HEAD_Y := -196.0

@export var coat := Color("#3F7F95")
@export var trousers := Color("#4A3A48")
@export var skin := Color("#E8B89A")
@export_enum("none", "cap", "peaked", "beret") var hat := "none"
@export var speed := 420.0

var body: Node2D
var head: Node2D
var arm_l: Node2D
var arm_r: Node2D
var walking := false
var _target := Vector2.ZERO
var _t := 0.0
var _gesture: Tween
var _bubble: DialogueBubble


func _ready() -> void:
	body = Node2D.new()
	add_child(body)
	body.add_child(Shape.make(Ink.pts([-22, 0, -4, 0, -4, -84, -22, -84]), trousers))
	body.add_child(Shape.make(Ink.pts([4, 0, 22, 0, 22, -84, 4, -84]), trousers))
	body.add_child(Shape.make(Ink.pts([-36, -80, 36, -80, 30, -172, -30, -172]), coat))
	arm_l = _arm(Vector2(-34, SHOULDER_Y))
	arm_r = _arm(Vector2(34, SHOULDER_Y))
	head = Node2D.new()
	head.position = Vector2(0, HEAD_Y)
	body.add_child(head)
	head.add_child(Shape.make(Ink.circle_pts(Vector2.ZERO, 25), skin))
	head.add_child(Shape.make(Ink.circle_pts(Vector2(-9, -2), 3, 10), Palette.INK, 0.0))
	head.add_child(Shape.make(Ink.circle_pts(Vector2(9, -2), 3, 10), Palette.INK, 0.0))
	_add_hat()


func _arm(shoulder: Vector2) -> Node2D:
	var a := Node2D.new()
	a.position = shoulder
	body.add_child(a)
	a.add_child(Shape.make(Ink.pts([-9, -4, 9, -4, 8, 74, -8, 74]), coat))
	a.add_child(Shape.make(Ink.circle_pts(Vector2(0, 80), 10), skin))
	return a


func _add_hat() -> void:
	match hat:
		"cap":
			head.add_child(Shape.make(Ink.pts([-26, -8, 26, -8, 22, -30, 0, -36, -22, -30]), Palette.PAPER))
		"peaked":
			head.add_child(Shape.make(Ink.pts([-24, -14, 24, -14, 28, -36, -28, -36]), Color("#2E3A5C")))
			head.add_child(Shape.make(Ink.pts([-30, -14, 34, -14, 34, -7, -30, -7]), Color("#1F2740")))
		"beret":
			head.add_child(Shape.make(Ink.pts([-30, -12, 28, -16, 20, -32, -8, -36, -26, -28]), Palette.HAZE_DEEP))


## Rotation that makes a downward-hanging arm at `shoulder` point at `target` (both global).
static func arm_rotation(shoulder: Vector2, target: Vector2) -> float:
	return (target - shoulder).angle() - PI / 2.0


func walk_to(pos: Vector2) -> void:
	_target = pos
	walking = true


func _process(delta: float) -> void:
	if not walking:
		return
	var d := _target - position
	var step := speed * delta
	if d.length() <= step:
		position = _target
		walking = false
		body.position.y = 0.0
		arrived.emit()
	else:
		position += d.normalized() * step
		_t += delta
		body.position.y = -absf(sin(_t * 12.0)) * 6.0


func say(line: Array, seconds: float = 4.5) -> void:
	GameState.see_line(line)
	if _bubble == null:
		_bubble = DialogueBubble.new()
		_bubble.position = Vector2(0, -250)
		add_child(_bubble)
	_bubble.show_line(line, seconds)


func point_at(world_pos: Vector2, hold: float = 1.4) -> void:
	var arm := arm_r if world_pos.x >= global_position.x else arm_l
	var r := arm_rotation(arm.global_position, world_pos)
	var t := _play()
	t.tween_property(arm, "rotation", r, 0.25)
	t.tween_interval(hold)
	t.tween_property(arm, "rotation", 0.0, 0.3)


func hand_to_chest(hold: float = 1.2) -> void:
	var r := arm_rotation(arm_r.global_position, global_position + Vector2(-10, -126))
	var t := _play()
	t.tween_property(arm_r, "rotation", r, 0.25)
	t.tween_interval(hold)
	t.tween_property(arm_r, "rotation", 0.0, 0.3)


func shake_head() -> void:
	var t := _play()
	for i in 3:
		t.tween_property(head, "rotation", 0.28, 0.08)
		t.tween_property(head, "rotation", -0.28, 0.08)
	t.tween_property(head, "rotation", 0.0, 0.08)


func nod() -> void:
	var t := _play()
	for i in 2:
		t.tween_property(head, "position:y", HEAD_Y + 10.0, 0.12)
		t.tween_property(head, "position:y", HEAD_Y, 0.12)


func scratch_head() -> void:
	var r := arm_rotation(arm_r.global_position, global_position + Vector2(18, HEAD_Y - 28))
	var t := _play()
	t.tween_property(arm_r, "rotation", r, 0.25)
	for i in 3:
		t.tween_property(arm_r, "rotation", r + 0.18, 0.1)
		t.tween_property(arm_r, "rotation", r, 0.1)
	t.tween_property(head, "rotation", 0.15, 0.2)
	t.tween_interval(0.4)
	t.tween_property(arm_r, "rotation", 0.0, 0.3)
	t.tween_property(head, "rotation", 0.0, 0.2)


func reach_toward(world_pos: Vector2, hold: float = 2.0) -> void:
	var t := _play()
	t.set_parallel(true)
	t.tween_property(arm_l, "rotation", arm_rotation(arm_l.global_position, world_pos), 0.3)
	t.tween_property(arm_r, "rotation", arm_rotation(arm_r.global_position, world_pos), 0.3)
	t.chain().tween_interval(hold)
	t.chain().tween_property(arm_l, "rotation", 0.0, 0.3)
	t.tween_property(arm_r, "rotation", 0.0, 0.3)


func laugh() -> void:
	var t := _play()
	for i in 4:
		t.tween_property(body, "position:y", -10.0, 0.08)
		t.tween_property(body, "position:y", 0.0, 0.08)
	t.tween_property(head, "rotation", -0.2, 0.15)
	t.tween_interval(0.4)
	t.tween_property(head, "rotation", 0.0, 0.2)


func _play() -> Tween:
	if _gesture and _gesture.is_valid():
		_gesture.kill()
	arm_l.rotation = 0.0
	arm_r.rotation = 0.0
	head.rotation = 0.0
	head.position.y = HEAD_Y
	_gesture = create_tween()
	return _gesture
```

- [ ] **Step 6: Interactable + SignBoard**

`game2d/world/interactable.gd`:
```gdscript
class_name Interactable
extends Area2D
## A clickable world object that *is* a word. With a card held on the cursor, a click binds the card
## to this object's pictogram — a hypothesis, checked only at page level. Otherwise the click is
## broadcast so the scene can react (an NPC names the object, the guard repeats a question...).

signal clicked(entity: Interactable)

var word_id := ""
var rect := Rect2(-60, -120, 120, 120)
var _hover := false
var _pulse := false
var _t := 0.0
var _shape: CollisionShape2D


func setup(id: String, r: Rect2) -> Interactable:
	word_id = id
	rect = r
	return self


func _ready() -> void:
	input_pickable = true
	monitoring = false
	monitorable = false
	_shape = CollisionShape2D.new()
	add_child(_shape)
	set_rect(rect)
	mouse_entered.connect(_on_enter)
	mouse_exited.connect(_on_exit)


func set_rect(r: Rect2) -> void:
	rect = r
	if _shape:
		var box := RectangleShape2D.new()
		box.size = r.size
		_shape.shape = box
		_shape.position = r.get_center()
	queue_redraw()


func set_pulse(on: bool) -> void:
	_pulse = on
	queue_redraw()


func _input_event(_vp: Viewport, event: InputEvent, _idx: int) -> void:
	if not (event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT):
		return
	if CursorManager.is_holding():
		GameState.bind_held_card(word_id)
	else:
		clicked.emit(self)
		SignalBus.entity_clicked.emit(self)


func _on_enter() -> void:
	_hover = true
	Input.set_default_cursor_shape(Input.CURSOR_POINTING_HAND)
	queue_redraw()


func _on_exit() -> void:
	_hover = false
	Input.set_default_cursor_shape(Input.CURSOR_ARROW)
	queue_redraw()


func _process(delta: float) -> void:
	if _pulse:
		_t += delta
		queue_redraw()


func _draw() -> void:
	if _pulse:
		draw_rect(rect.grow(8), Color(Palette.HAZE_DEEP, 0.35 + 0.35 * sin(_t * 6.0)), false, 5.0)
	elif _hover:
		var c := Palette.HAZE_DEEP if CursorManager.is_holding() else Color(Palette.INK, 0.55)
		draw_rect(rect.grow(6), c, false, 3.0)
```

`game2d/world/props/sign_board.gd`:
```gdscript
class_name SignBoard
extends Node2D
## A sign on a post: Greek caption in capitals, framed in its noun's class colour and shape
## (ο pillared, η rounded, το square). Its word is seen on sight.

var line: Array = []
var word_id := ""
var text: InteractiveText
var hit: Interactable
var _post := 120.0
var _board := Rect2()


func setup(l: Array, post_height: float = 120.0) -> SignBoard:
	line = l
	word_id = LineFormat.word_ids(l)[0]
	_post = post_height
	return self


func _ready() -> void:
	text = InteractiveText.new(44)
	text.caps = true
	text.object_word = word_id
	add_child(text)
	text.set_line(line)
	GameState.see_line(line)
	hit = Interactable.new().setup(word_id, Rect2(-100, -_post - 90, 200, 90))
	add_child(hit)
	_layout()
	_layout.call_deferred()


func _layout() -> void:
	text.reset_size()
	var pad := Vector2(36, 20)
	_board = Rect2(Vector2(-text.size.x / 2.0, -_post - text.size.y) - pad, text.size + pad * 2.0)
	text.position = _board.position + pad
	hit.set_rect(_board)
	queue_redraw()


func _draw() -> void:
	Ink.rect(self, Rect2(-8, -_post, 16, _post), Palette.WOOD)
	var g := GameState.lex.gender(word_id)
	var col := Palette.gender_color(g)
	match g:
		"m":
			Ink.rect(self, _board, Palette.PAPER)
			Ink.rect(self, Rect2(_board.position - Vector2(16, 10), Vector2(16, _board.size.y + 20)), col, 3.0)
			Ink.rect(self, Rect2(Vector2(_board.end.x, _board.position.y - 10), Vector2(16, _board.size.y + 20)), col, 3.0)
		"f":
			var sb := Ui.panel_style(int(_board.size.y / 2.0), 7, Palette.PAPER)
			sb.border_color = col
			draw_style_box(sb, _board)
		_:
			Ink.rect(self, _board.grow(6), col, 3.0)
			Ink.rect(self, _board, Palette.PAPER)
```

- [ ] **Step 7: Gallery extras**

Replace `_extra()` in `game2d/tools/gallery.gd`:
```gdscript
func _extra() -> void:
	var world := Node2D.new()
	add_child(world)
	var bd := Backdrop.new()
	bd.style = "pier"
	bd.scale = Vector2(0.3, 0.3)
	bd.position = Vector2(1360, 360)
	world.add_child(bd)
	var coats := [Palette.HAZE_DEEP, Color("#2F5D8A"), Color("#2E3A5C"), Color("#6B8E5A"), Color("#2F5D8A")]
	var hats := ["beret", "cap", "peaked", "cap", "none"]
	for i in 5:
		var a := Actor.new()
		a.coat = coats[i]
		a.hat = hats[i]
		a.position = Vector2(160 + i * 250, 1040)
		world.add_child(a)
		match i:
			1:
				a.arm_r.rotation = Actor.arm_rotation(a.arm_r.global_position, a.global_position + Vector2(220, -300))
			2:
				a.arm_r.rotation = Actor.arm_rotation(a.arm_r.global_position, a.global_position + Vector2(-10, -126))
				a.say(GameState.line("guard_question"), 60.0)
			3:
				a.head.rotation = 0.28
			4:
				a.arm_l.rotation = Actor.arm_rotation(a.arm_l.global_position, a.global_position + Vector2(-220, -150))
				a.arm_r.rotation = Actor.arm_rotation(a.arm_r.global_position, a.global_position + Vector2(-220, -150))
	var signs := [[["limani", "nom"]], [["faros", "nom"]], [["varka", "nom"]]]
	for i in 3:
		var s := SignBoard.new().setup(signs[i], 110.0)
		s.position = Vector2(1460 + i * 160, 1040)
		world.add_child(s)
```

- [ ] **Step 8: Run tests + snapshot**

Run: `./test.sh` → all pass.
Run: `./snap.sh gallery` → open `tools/out/gallery.png`.
Expected: five figures (rest; pointing up-right; hand on chest under the guard-question bubble — Greek text, coloured articles/endings, bubble sized to the text, tail toward the head; head tilted; both arms reaching left); three signs ΤΟ ΛΙΜΑΝΙ / Ο ΦΑΡΟΣ / Η ΒΑΡΚΑ with square, pillared and rounded frames. If the bubble panel collapses or wraps per letter, set `text.custom_minimum_size.x = text.get_content_width()` inside `DialogueBubble._layout()` before `reset_size()` and re-snap.

- [ ] **Step 9: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: interactive Greek text, bubbles, gesturing actors, signs, world binding

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: HUD — notebook, inventory, phrase builder

**Files:**
- Create: `game2d/ui/hud.gd`, `game2d/ui/notebook/notebook_ui.gd`, `game2d/ui/notebook/word_card.gd`
- Create: `game2d/ui/inventory_bar.gd`, `game2d/ui/inventory_slot.gd`, `game2d/ui/sentence_builder.gd`
- Test: `game2d/tests/test_hud.gd`

**Interfaces:**
- Consumes: Tasks 3, 4, 9–11.
- Produces:
  - `Hud` (CanvasLayer, layer 10, PROCESS_MODE_ALWAYS): `notebook: NotebookUI`, `inventory: InventoryBar`, `builder: SentenceBuilder`, `book_button: Button`; `open_notebook(word_id := "")`, `pulse_book()`.
  - `NotebookUI` (Control): `page_id`, `selected`; `open_notebook(word_id := "")`, `close_notebook()`, `toggle()`, `is_open() -> bool`, `refresh()`, `select(word_id)`, `choose_picto(picto_id)`, `check()` (emits `SignalBus.page_checked`).
  - `WordCard` (PanelContainer): `signal picked(word_id)`, `signal to_world(word_id)`, `setup(word_id, selected)`.
  - `InventoryBar` (HBoxContainer): `refresh()`, `pulse(item_id, on)`. `InventorySlot`: drag data `{"item_id": id}`.
  - `SentenceBuilder` (PanelContainer): `signal submitted(built: Array, result: Dictionary)`, `signal changed`; `model: SentenceModel`; `open(target, tiles)`, `close()`, `place(i, tok)`, `clear_slot(i)`, `tap_tile(tok)`, `say()`, `next_needed() -> Dictionary`, `pulse_token(tok)`, `stop_pulse()`, `show_sketches(on)`.

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_hud.gd`:
```gdscript
extends TestCase

var checked: Array = []
var results: Array = []


func _hud() -> Hud:
	tree.root.get_node("GameState").new_game()
	var h := Hud.new()
	tree.root.add_child(h)
	return h


func _on_checked(p: String, r: String) -> void:
	checked.append([p, r])


func _on_submitted(_built: Array, r: Dictionary) -> void:
	results.append(r["kind"])


func test_notebook_assign_and_check() -> void:
	var gs := tree.root.get_node("GameState")
	var h := _hud()
	for w in ["limani", "ploio", "faros", "varka"]:
		gs.see(w)
	h.notebook.open_notebook("faros")
	eq(h.notebook.page_id, "pier", "opens on the word's page")
	eq(h.notebook.selected, "faros", "word selected")
	eq(tree.paused, true, "world paused while open")
	for w in ["limani", "ploio", "faros", "varka"]:
		h.notebook.select(w)
		h.notebook.choose_picto(gs.lex.picto(w))
	checked = []
	SignalBus.page_checked.connect(_on_checked)
	h.notebook.check()
	SignalBus.page_checked.disconnect(_on_checked)
	eq(checked, [["pier", NotebookModel.SOLVED]], "page solved signal")
	tree.paused = false
	h.free()


func test_builder_flow() -> void:
	var gs := tree.root.get_node("GameState")
	var h := _hud()
	results = []
	h.builder.submitted.connect(_on_submitted)
	var cfg: Dictionary = gs.level["customs"]
	h.builder.open(cfg["target"], cfg["tiles"])
	eq(h.builder.visible, true, "shown")
	eq(gs.notebook.is_seen("eisitirio"), true, "tiles are seen words")
	h.builder.tap_tile({"w": "nai", "f": ""})
	h.builder.tap_tile({"w": "echo", "f": "2s"})
	eq(h.builder.next_needed(), {"w": "echo", "f": "1s"}, "next needed token")
	h.builder.tap_tile({"w": "diavatirio", "f": "nom"})
	h.builder.say()
	h.builder.clear_slot(1)
	h.builder.place(1, {"w": "echo", "f": "1s"})
	h.builder.say()
	eq(results, [ErrorClassifier.MORPHOLOGICAL, ErrorClassifier.OK], "results")
	h.free()
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_hud` → `Hud` not declared.

- [ ] **Step 3: Implement HUD pieces**

`game2d/ui/notebook/word_card.gd`:
```gdscript
class_name WordCard
extends PanelContainer
## One notebook card: the word (with hoverable anatomy) framed by its class, and the pictogram the
## player assigned ("?" if none; a faded sketch once hint level 3 fired).

signal picked(word_id: String)
signal to_world(word_id: String)

var word_id := ""


func setup(id: String, is_selected: bool) -> void:
	word_id = id
	var nb: NotebookModel = GameState.notebook
	var lex: Lexicon = GameState.lex
	custom_minimum_size = Vector2(380, 140)
	add_theme_stylebox_override("panel", Ui.card_style(lex.gender(id), is_selected, nb.is_locked(id)))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 12)
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(h)
	if not nb.is_seen(id):
		h.add_child(Ui.label("· · ·", 32))
		return
	var txt := InteractiveText.new(34)
	txt.capitalize = false
	txt.click_holds = false
	txt.mouse_filter = Control.MOUSE_FILTER_PASS
	txt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	txt.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(txt)
	txt.set_line([[id, "1s" if lex.pos(id) == "verb" else ""]])
	var a := nb.assignment(id)
	var pic := Picto.new()
	pic.custom_minimum_size = Vector2(96, 96)
	pic.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if a != "":
		pic.picto_id = a
	elif GameState.sketches.has(id):
		pic.picto_id = lex.picto(id)
		pic.sketch = true
	else:
		pic.picto_id = "unknown"
	h.add_child(pic)
	if a != "" and a != lex.picto(id) and GameState.sketches.has(id):
		var hint := Picto.new()
		hint.custom_minimum_size = Vector2(48, 48)
		hint.picto_id = lex.picto(id)
		hint.sketch = true
		hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
		h.add_child(hint)
	if not nb.is_locked(id):
		var w := Ui.button("в мир", 18)
		w.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		w.pressed.connect(func(): to_world.emit(word_id))
		h.add_child(w)
	gui_input.connect(_on_gui_input)


func _on_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if GameState.notebook.is_seen(word_id) and not GameState.notebook.is_locked(word_id):
			picked.emit(word_id)
```

`game2d/ui/notebook/notebook_ui.gd`:
```gdscript
class_name NotebookUI
extends Control
## Sliding deciphering notebook (blueprint §1): 864 px panel from the right, world paused while open.
## Pick a word card, then a pictogram from the palette — or «в мир» and click an object. A page is
## checked all-or-nothing; solved pages turn gold and lock.

const WIDTH := 864.0
const SLIDE := 0.35
enum State { CLOSED, OPENING, OPEN, CLOSING }

var state := State.CLOSED
var page_id := ""
var selected := ""
var _dimmer: ColorRect
var _panel: PanelContainer
var _tabs: HBoxContainer
var _cards: GridContainer
var _palette: HFlowContainer
var _check: Button
var _status: Label


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_dimmer = ColorRect.new()
	_dimmer.color = Color(Palette.INK, 0.25)
	_dimmer.set_anchors_preset(Control.PRESET_FULL_RECT)
	_dimmer.visible = false
	_dimmer.gui_input.connect(_on_dimmer_input)
	add_child(_dimmer)
	_panel = PanelContainer.new()
	_panel.add_theme_stylebox_override("panel", Ui.panel_style(0, 5))
	_panel.custom_minimum_size = Vector2(WIDTH, 1080)
	_panel.position = Vector2(1920, 0)
	add_child(_panel)
	var margin := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 24)
	_panel.add_child(margin)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 16)
	margin.add_child(v)
	var head := HBoxContainer.new()
	head.add_child(Ui.greek_label("Σημειωματάριο", 44))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	_status = Ui.label("", 24)
	head.add_child(_status)
	var close := Ui.button("×", 32)
	close.pressed.connect(close_notebook)
	head.add_child(close)
	v.add_child(head)
	_tabs = HBoxContainer.new()
	_tabs.add_theme_constant_override("separation", 10)
	v.add_child(_tabs)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_cards = GridContainer.new()
	_cards.columns = 2
	_cards.add_theme_constant_override("h_separation", 16)
	_cards.add_theme_constant_override("v_separation", 16)
	scroll.add_child(_cards)
	v.add_child(scroll)
	_check = Ui.button("Проверить страницу", 26)
	_check.pressed.connect(check)
	v.add_child(_check)
	v.add_child(Ui.label("Значения", 22))
	_palette = HFlowContainer.new()
	_palette.add_theme_constant_override("h_separation", 10)
	_palette.add_theme_constant_override("v_separation", 10)
	v.add_child(_palette)
	var help := Ui.label("Выбери слово, потом значение. «в мир» — кликни предмет в мире.", 20)
	help.autowrap_mode = TextServer.AUTOWRAP_WORD
	v.add_child(help)


func is_open() -> bool:
	return state == State.OPEN or state == State.OPENING


func toggle() -> void:
	if state == State.CLOSED:
		open_notebook()
	elif state == State.OPEN:
		close_notebook()


func open_notebook(word_id: String = "") -> void:
	var nb: NotebookModel = GameState.notebook
	if word_id != "" and nb.is_seen(word_id):
		page_id = nb.page_of(word_id)
		selected = word_id if not nb.is_locked(word_id) else ""
	elif page_id == "" or not nb.visible_pages().has(page_id):
		var pages := nb.visible_pages()
		page_id = pages[0] if not pages.is_empty() else ""
	refresh()
	if state != State.CLOSED:
		return
	state = State.OPENING
	_dimmer.visible = true
	get_tree().paused = true
	SignalBus.notebook_opened.emit()
	var t := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	t.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	t.tween_property(_panel, "position:x", 1920.0 - WIDTH, SLIDE)
	t.tween_callback(func(): state = State.OPEN)


func close_notebook() -> void:
	if state == State.CLOSED or state == State.CLOSING:
		return
	state = State.CLOSING
	var t := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	t.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	t.tween_property(_panel, "position:x", 1920.0, SLIDE)
	t.tween_callback(_closed)


func _closed() -> void:
	state = State.CLOSED
	_dimmer.visible = false
	get_tree().paused = false
	SignalBus.notebook_closed.emit()


func select(word_id: String) -> void:
	selected = word_id
	refresh()


func choose_picto(picto_id: String) -> void:
	if selected == "":
		return
	GameState.notebook.assign(selected, picto_id)
	SignalBus.card_assigned.emit(selected, picto_id)
	refresh()


func check() -> void:
	if page_id == "":
		return
	var r: String = GameState.notebook.check_page(page_id)
	SignalBus.page_checked.emit(page_id, r)
	var t := create_tween()
	t.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	if r == NotebookModel.SOLVED:
		selected = ""
		GameState.save_game()
		t.tween_property(_panel, "modulate", Palette.GOLD.lerp(Color.WHITE, 0.4), 0.15)
		t.tween_property(_panel, "modulate", Color.WHITE, 0.4)
	elif r == NotebookModel.WRONG:
		var x := _cards.position.x
		for i in 3:
			t.tween_property(_cards, "position:x", x + 14.0, 0.05)
			t.tween_property(_cards, "position:x", x - 14.0, 0.05)
		t.tween_property(_cards, "position:x", x, 0.05)
	else:
		t.kill()
	refresh()


func refresh() -> void:
	var nb: NotebookModel = GameState.notebook
	_status.text = "Расшифровано %d/%d  " % [nb.known_count(), GameState.lex.ids().size()]
	_clear(_tabs)
	var i := 0
	for p in nb.visible_pages():
		i += 1
		var b := Ui.button(str(i), 26)
		b.custom_minimum_size = Vector2(64, 56)
		if p == page_id:
			b.add_theme_stylebox_override("normal", Ui.panel_style(12, 3, Palette.SHADE))
		if nb.is_page_solved(p):
			b.add_theme_color_override("font_color", Palette.GOLD.darkened(0.3))
			b.text = str(i) + " •"
		b.pressed.connect(_on_tab.bind(p))
		_tabs.add_child(b)
	_clear(_cards)
	if page_id != "":
		for w in nb.pages[page_id]:
			var card := WordCard.new()
			_cards.add_child(card)
			card.setup(w, w == selected)
			card.picked.connect(select)
			card.to_world.connect(_on_to_world)
	_clear(_palette)
	for p in nb.palette():
		var b := Ui.icon_button(p, 88)
		b.disabled = selected == ""
		b.pressed.connect(choose_picto.bind(p))
		_palette.add_child(b)
	_check.disabled = page_id == "" or not nb.page_ready(page_id) or nb.is_page_solved(page_id)


func _on_tab(p: String) -> void:
	page_id = p
	selected = ""
	refresh()


func _on_to_world(word_id: String) -> void:
	CursorManager.hold(word_id)
	close_notebook()


func _on_dimmer_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		close_notebook()


func _input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_notebook"):
		toggle()
		get_viewport().set_input_as_handled()
	elif is_open() and event.is_action_pressed("ui_cancel"):
		close_notebook()
		get_viewport().set_input_as_handled()


func _clear(n: Node) -> void:
	for c in n.get_children():
		n.remove_child(c)
		c.queue_free()
```

`game2d/ui/inventory_slot.gd`:
```gdscript
class_name InventorySlot
extends PanelContainer
## One inventory item as a picture (objects are not words). Drag it onto a drop zone in the world.

var item_id := ""
var _picto: Picto
var _pulse: Tween


func _init(id: String = "") -> void:
	item_id = id


func _ready() -> void:
	custom_minimum_size = Vector2(120, 120)
	add_theme_stylebox_override("panel", Ui.panel_style(14, 4))
	_picto = Picto.new()
	_picto.picto_id = GameState.lex.picto(item_id)
	_picto.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_picto)


func _get_drag_data(_at: Vector2) -> Variant:
	var prev := Picto.new()
	prev.picto_id = _picto.picto_id
	prev.size = Vector2(96, 96)
	set_drag_preview(prev)
	return {"item_id": item_id}


func set_pulse(on: bool) -> void:
	if _pulse:
		_pulse.kill()
		_pulse = null
	modulate = Color.WHITE
	if on:
		_pulse = create_tween().set_loops()
		_pulse.tween_property(self, "modulate", Palette.HAZE_LIGHT, 0.4)
		_pulse.tween_property(self, "modulate", Color.WHITE, 0.4)
```

`game2d/ui/inventory_bar.gd`:
```gdscript
class_name InventoryBar
extends HBoxContainer
## Bottom-left row of inventory slots.


func _ready() -> void:
	add_theme_constant_override("separation", 12)
	refresh()


func refresh() -> void:
	for c in get_children():
		remove_child(c)
		c.queue_free()
	for item in GameState.inventory:
		add_child(InventorySlot.new(item))


func pulse(item_id: String, on: bool) -> void:
	for s in get_children():
		if s.item_id == item_id:
			s.set_pulse(on)
```

`game2d/ui/sentence_builder.gd`:
```gdscript
class_name SentenceBuilder
extends PanelContainer
## Phrase builder (pedagogy "конструктор фраз"): tiles of seen word forms go into slots.
## Click a tile → first empty slot; drag a tile onto a slot; click a filled slot → empty it.
## «Сказать» is enabled when every slot is filled; the scene judges the result.

signal submitted(built: Array, result: Dictionary)
signal changed

var model: SentenceModel
var _slots_box: HBoxContainer
var _tiles_box: HFlowContainer
var _say: Button
var _sketch := false
var _pulse: Tween
var _pulse_target: Control


class TileButton extends Button:
	var token: Dictionary

	func _get_drag_data(_at: Vector2) -> Variant:
		var prev := Ui.style_button(Button.new(), text, 32)
		prev.add_theme_font_override("font", Fonts.greek())
		set_drag_preview(prev)
		return {"token": token}


class SlotBox extends PanelContainer:
	var index := 0
	var builder: SentenceBuilder

	func _can_drop_data(_at: Vector2, data: Variant) -> bool:
		return data is Dictionary and data.has("token")

	func _drop_data(_at: Vector2, data: Variant) -> void:
		builder.place(index, data["token"])

	func _gui_input(event: InputEvent) -> void:
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			builder.clear_slot(index)


func _ready() -> void:
	visible = false
	add_theme_stylebox_override("panel", Ui.panel_style(18, 4))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 16)
	add_child(v)
	_slots_box = HBoxContainer.new()
	_slots_box.alignment = BoxContainer.ALIGNMENT_CENTER
	_slots_box.add_theme_constant_override("separation", 14)
	v.add_child(_slots_box)
	_tiles_box = HFlowContainer.new()
	_tiles_box.alignment = FlowContainer.ALIGNMENT_CENTER
	_tiles_box.custom_minimum_size = Vector2(1000, 0)
	_tiles_box.add_theme_constant_override("h_separation", 12)
	_tiles_box.add_theme_constant_override("v_separation", 12)
	v.add_child(_tiles_box)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 20)
	var clear := Ui.button("Стереть", 24)
	clear.pressed.connect(_on_clear)
	row.add_child(clear)
	_say = Ui.button("Сказать", 28)
	_say.pressed.connect(say)
	row.add_child(_say)
	v.add_child(row)


func open(target: Array, tiles: Array) -> void:
	model = SentenceModel.new(target)
	_clear(_slots_box)
	for i in target.size():
		var s := SlotBox.new()
		s.index = i
		s.builder = self
		s.custom_minimum_size = Vector2(250, 84)
		s.add_theme_stylebox_override("panel", Ui.panel_style(10, 3, Palette.PAPER.darkened(0.03)))
		var box := HBoxContainer.new()
		box.alignment = BoxContainer.ALIGNMENT_CENTER
		box.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var pic := Picto.new()
		pic.custom_minimum_size = Vector2(56, 56)
		pic.sketch = true
		pic.visible = false
		pic.mouse_filter = Control.MOUSE_FILTER_IGNORE
		box.add_child(pic)
		var lbl := Ui.greek_label("…", 34)
		lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		box.add_child(lbl)
		s.add_child(box)
		_slots_box.add_child(s)
	_clear(_tiles_box)
	for tok in tiles:
		var b := TileButton.new()
		b.token = tok
		Ui.style_button(b, GameState.lex.surface(tok["w"], tok["f"]), 32)
		b.add_theme_font_override("font", Fonts.greek())
		b.pressed.connect(tap_tile.bind(tok))
		_tiles_box.add_child(b)
		GameState.see(tok["w"])
	_sketch = false
	_refresh()
	visible = true
	_place.call_deferred()


func close() -> void:
	stop_pulse()
	visible = false


func place(i: int, tok: Dictionary) -> void:
	model.place(i, tok)
	_refresh()
	changed.emit()


func clear_slot(i: int) -> void:
	model.clear(i)
	_refresh()
	changed.emit()


func tap_tile(tok: Dictionary) -> void:
	model.place_next(tok)
	_refresh()
	changed.emit()


func say() -> void:
	if model and model.is_full():
		submitted.emit(model.slots.duplicate(), model.evaluate())


## The target token of the first empty or wrong slot ({} when the sentence is right).
func next_needed() -> Dictionary:
	for i in model.slots.size():
		if model.slots[i] == null or model.slots[i] != model.target[i]:
			return model.target[i]
	return {}


func pulse_token(tok: Dictionary) -> void:
	stop_pulse()
	for b in _tiles_box.get_children():
		if b.token == tok:
			_pulse_target = b
			_pulse = create_tween().set_loops()
			_pulse.tween_property(b, "modulate", Palette.HAZE_LIGHT, 0.4)
			_pulse.tween_property(b, "modulate", Color.WHITE, 0.4)
			return


func stop_pulse() -> void:
	if _pulse:
		_pulse.kill()
		_pulse = null
	if is_instance_valid(_pulse_target):
		_pulse_target.modulate = Color.WHITE


func show_sketches(on: bool) -> void:
	_sketch = on
	if model:
		_refresh()


func _on_clear() -> void:
	model.clear_all()
	_refresh()
	changed.emit()


func _refresh() -> void:
	for s in _slots_box.get_children():
		var tok = model.slots[s.index]
		var box := s.get_child(0)
		var pic: Picto = box.get_child(0)
		var lbl: Label = box.get_child(1)
		lbl.text = "…" if tok == null else GameState.lex.surface(tok["w"], tok["f"])
		pic.visible = _sketch and tok == null
		if pic.visible:
			pic.picto_id = GameState.lex.picto(model.target[s.index]["w"])
	_say.disabled = not model.is_full()


func _place() -> void:
	reset_size()
	position = Vector2((1920.0 - size.x) / 2.0, 1080.0 - size.y - 36.0)


func _clear(n: Node) -> void:
	for c in n.get_children():
		n.remove_child(c)
		c.queue_free()
```

`game2d/ui/hud.gd`:
```gdscript
class_name Hud
extends CanvasLayer
## Screen-space UI of a level scene: notebook button + notebook, inventory bar, phrase builder.
## Runs while the tree is paused (the notebook pauses the world).

var notebook: NotebookUI
var inventory: InventoryBar
var builder: SentenceBuilder
var book_button: Button
var _book_tween: Tween


func _ready() -> void:
	layer = 10
	process_mode = Node.PROCESS_MODE_ALWAYS
	inventory = InventoryBar.new()
	inventory.position = Vector2(24, 1080 - 24 - 120)
	add_child(inventory)
	builder = SentenceBuilder.new()
	add_child(builder)
	book_button = Ui.icon_button("book", 116)
	book_button.position = Vector2(1920 - 24 - 116, 24)
	book_button.pivot_offset = Vector2(58, 58)
	book_button.pressed.connect(open_notebook)
	add_child(book_button)
	notebook = NotebookUI.new()
	add_child(notebook)
	SignalBus.word_seen.connect(_on_word_seen)


func open_notebook(word_id: String = "") -> void:
	notebook.open_notebook(word_id)


func pulse_book() -> void:
	if _book_tween and _book_tween.is_valid():
		_book_tween.kill()
	_book_tween = create_tween()
	for i in 2:
		_book_tween.tween_property(book_button, "scale", Vector2(1.18, 1.18), 0.15)
		_book_tween.tween_property(book_button, "scale", Vector2.ONE, 0.15)


func _on_word_seen(_word_id: String) -> void:
	pulse_book()
```

- [ ] **Step 4: Run tests** — `./test.sh` → all pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: HUD — sliding notebook with class-framed cards, inventory, phrase builder

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 13: Level scene base + Pier (Αποβάθρα) + boot scene

**Files:**
- Create: `game2d/levels/level_scene.gd`
- Create: `game2d/world/props/ship.gd`, `lighthouse.gd`, `boat.gd`, `rope_gate.gd`
- Create: `game2d/levels/level1/pier.tscn`, `game2d/levels/level1/pier.gd`
- Create: `game2d/main.tscn`, `game2d/main.gd`; Modify: `game2d/project.godot` (`run/main_scene`)
- Test: `game2d/tests/test_pier.gd`

**Interfaces:**
- Consumes: Tasks 5, 9–12.
- Produces:
  - `LevelScene` (Node2D): fields `walk_rect`, `left_exit`, `right_exit`, `gate_x`, `backdrop`, `ysort`, `player`, `hud`, `hints`, `active_puzzle`; overridables `build()`, `on_enter()`, `apply_hint(puzzle_id, level)`, `on_gate_blocked()`; helpers `add_puzzle(id) -> HintDirector`, `solve_puzzle(id)`, `wrong_attempt()`, `open_gate()`, `walk_player_to(p)`, `back_layer(node) -> Node2D` (prop behind actors).
  - Props: `Ship`, `Lighthouse`, `Boat` (Node2D, const `HIT: Rect2`), `RopeGate.set_open(open, animate := true)`.
  - Pier scene: `PIER_WORDS`, `sailor`, `objects: Dictionary`, `debug_setup(case)` with cases `""`, `"notebook"`, `"hint"`.

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_pier.gd`:
```gdscript
extends TestCase


func _scene() -> Node:
	tree.root.get_node("GameState").new_game()
	var s: Node = load("res://levels/level1/pier.tscn").instantiate()
	tree.root.add_child(s)
	return s


func _solve_pier(gs: Node, correct: bool) -> String:
	for w in ["limani", "ploio", "faros", "varka"]:
		gs.see(w)
		gs.notebook.assign(w, gs.lex.picto(w) if correct else "sack")
	var r: String = gs.notebook.check_page("pier")
	SignalBus.page_checked.emit("pier", r)
	return r


func test_gate_locked_until_page_solved() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	check(s.gate_x < INF, "locked at start")
	eq(s.active_puzzle, "pier", "puzzle active")
	eq(gs.notebook.is_seen("limani"), true, "sign word seen on arrival")
	eq(_solve_pier(gs, true), NotebookModel.SOLVED, "page solved")
	eq(s.gate_x, INF, "gate open")
	eq(gs.has_flag("pier_open"), true, "flag")
	s.free()


func test_wrong_page_is_a_wrong_attempt() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	eq(_solve_pier(gs, false), NotebookModel.WRONG, "wrong page")
	eq(s.hints["pier"].wrong, 1, "counted")
	check(s.gate_x < INF, "still locked")
	s.free()


func test_hint_level_three_sketches_first_unsolved_word() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	gs.notebook.assign("limani", "port")
	s.hints["pier"].tick(91.0)
	eq(s.hints["pier"].level, 3, "level 3")
	eq(gs.sketches.has("ploio"), true, "first unsolved word sketched")
	eq(gs.sketches.has("limani"), false, "solved word not sketched")
	s.free()


func test_reentry_after_open_keeps_gate_open() -> void:
	var gs := tree.root.get_node("GameState")
	gs.new_game()
	gs.set_flag("pier_open")
	var s: Node = load("res://levels/level1/pier.tscn").instantiate()
	tree.root.add_child(s)
	eq(s.gate_x, INF, "open on re-entry")
	eq(s.active_puzzle, "", "no active puzzle")
	s.free()
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_pier` → cannot load `pier.tscn`.

- [ ] **Step 3: LevelScene**

`game2d/levels/level_scene.gd`:
```gdscript
class_name LevelScene
extends Node2D
## Base for a Level 1 screen: backdrop, Y-sorted actors, click-to-walk inside walk_rect, exits at the
## screen edges, HUD, and one HintDirector per puzzle (ticked only while unpaused, so the notebook
## never escalates hints). Subclasses override build(), on_enter(), apply_hint(), on_gate_blocked().

var walk_rect := Rect2(60, 820, 1800, 200)
var left_exit := ""
var right_exit := ""
var gate_x := INF
var backdrop: Backdrop
var ysort: Node2D
var player: Actor
var hud: Hud
var hints: Dictionary = {}
var active_puzzle := ""
var _leaving := false
var _back: Node2D


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_PAUSABLE
	var vp := get_viewport()
	vp.physics_object_picking = true
	vp.physics_object_picking_sort = true
	vp.physics_object_picking_first_only = true
	backdrop = Backdrop.new()
	add_child(backdrop)
	_back = Node2D.new()
	add_child(_back)
	ysort = Node2D.new()
	ysort.y_sort_enabled = true
	add_child(ysort)
	player = Actor.new()
	player.coat = Palette.HAZE_DEEP
	player.hat = "beret"
	ysort.add_child(player)
	player.arrived.connect(_check_exit)
	hud = Hud.new()
	add_child(hud)
	SignalBus.card_assigned.connect(_on_activity)
	build()
	_place_player()
	on_enter()


func build() -> void:
	pass


func on_enter() -> void:
	pass


func apply_hint(_puzzle_id: String, _level: int) -> void:
	pass


func on_gate_blocked() -> void:
	pass


## Props behind the actors (ships at sea, wall posters, belts).
func back_layer(node: Node2D) -> Node2D:
	_back.add_child(node)
	return node


func add_puzzle(id: String) -> HintDirector:
	var h := HintDirector.new()
	h.level_changed.connect(_on_hint_level.bind(id))
	hints[id] = h
	return h


func solve_puzzle(id: String) -> void:
	if hints.has(id):
		hints[id].solve()
	if active_puzzle == id:
		active_puzzle = ""
	SignalBus.puzzle_solved.emit(id)
	GameState.save_game()


func wrong_attempt() -> void:
	if active_puzzle != "":
		hints[active_puzzle].on_wrong()


func open_gate() -> void:
	gate_x = INF


func walk_player_to(p: Vector2) -> void:
	if p.x > gate_x:
		on_gate_blocked()
	var x := clampf(p.x, walk_rect.position.x, minf(walk_rect.end.x, gate_x))
	var y := clampf(p.y, walk_rect.position.y, walk_rect.end.y)
	player.walk_to(Vector2(x, y))


func _process(delta: float) -> void:
	if active_puzzle != "":
		hints[active_puzzle].tick(delta)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_on_activity()
		walk_player_to(get_global_mouse_position())


func _on_activity(_a: Variant = null, _b: Variant = null) -> void:
	if active_puzzle != "":
		hints[active_puzzle].on_input()


func _on_hint_level(level: int, id: String) -> void:
	SignalBus.hint_level_changed.emit(id, level)
	apply_hint(id, level)


func _place_player() -> void:
	var y := walk_rect.get_center().y
	if GameState.entry_side == "right":
		player.position = Vector2(walk_rect.end.x - 60.0, y)
	else:
		player.position = Vector2(walk_rect.position.x + 60.0, y)


func _check_exit() -> void:
	if _leaving:
		return
	if right_exit != "" and player.position.x >= walk_rect.end.x - 1.0:
		_leaving = true
		GameState.goto_scene(right_exit, "left")
	elif left_exit != "" and player.position.x <= walk_rect.position.x + 1.0:
		_leaving = true
		GameState.goto_scene(left_exit, "right")
```

- [ ] **Step 4: Pier props**

`game2d/world/props/ship.gd`:
```gdscript
class_name Ship
extends Node2D
## Moored ship (το πλοίο). Origin = waterline centre.

const HIT := Rect2(-320, -300, 640, 300)


func _draw() -> void:
	Ink.poly(self, Ink.pts([-320, -110, 320, -110, 280, 0, -280, 0]), Palette.PAPER)
	Ink.poly(self, Ink.pts([-306, -48, 306, -48, 285, 0, -285, 0]), Palette.SEA_DEEP, 3.0)
	Ink.rect(self, Rect2(-170, -200, 270, 90), Palette.PAPER)
	Ink.rect(self, Rect2(-110, -262, 150, 62), Palette.PAPER)
	for i in 6:
		Ink.circle(self, Vector2(-140 + i * 44, -156), 9, Palette.SEA, 3.0)
	Ink.poly(self, Ink.pts([70, -300, 120, -300, 110, -200, 80, -200]), Color("#3A3550"))
	Ink.poly(self, Ink.pts([70, -300, 120, -300, 118, -282, 72, -282]), Palette.HAZE_LIGHT, 3.0)
```

`game2d/world/props/lighthouse.gd`:
```gdscript
class_name Lighthouse
extends Node2D
## Distant lighthouse on a rock (ο φάρος). Origin = base of the rock on the horizon.

const HIT := Rect2(-90, -270, 180, 270)


func _draw() -> void:
	Ink.poly(self, Ink.pts([-90, 0, 90, 0, 60, -30, -60, -30]), Palette.STONE.darkened(0.15))
	Ink.poly(self, Ink.pts([-26, -30, 26, -30, 18, -200, -18, -200]), Palette.PAPER)
	Ink.poly(self, Ink.pts([-23, -80, 23, -80, 21, -110, -21, -110]), Palette.HAZE_LIGHT, 3.0)
	Ink.poly(self, Ink.pts([-20, -140, 20, -140, 19, -168, -19, -168]), Palette.HAZE_LIGHT, 3.0)
	Ink.rect(self, Rect2(-22, -232, 44, 32), Color("#FFE9A8"))
	Ink.poly(self, Ink.pts([-28, -232, 28, -232, 0, -262]), Palette.INK)
```

`game2d/world/props/boat.gd`:
```gdscript
class_name Boat
extends Node2D
## Small sailing boat (η βάρκα). Origin = waterline centre.

const HIT := Rect2(-120, -210, 240, 230)


func _draw() -> void:
	Ink.poly(self, Ink.pts([-110, -30, 110, -30, 80, 10, -80, 10]), Palette.WOOD)
	Ink.poly(self, Ink.pts([-104, -22, 104, -22, 98, -12, -98, -12]), Palette.PAPER, 2.0)
	draw_line(Vector2(0, -30), Vector2(0, -200), Palette.INK, 6.0)
	Ink.poly(self, Ink.pts([6, -40, 6, -196, 92, -40]), Palette.PAPER)
```

`game2d/world/props/rope_gate.gd`:
```gdscript
class_name RopeGate
extends Node2D
## Two posts with a red rope. Closed: rope across. Open: rope hangs from the left post.

var openness := 0.0


func set_open(open: bool, animate: bool = true) -> void:
	var v := 1.0 if open else 0.0
	if animate:
		create_tween().tween_property(self, "openness", v, 0.6)
	else:
		openness = v


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	Ink.rect(self, Rect2(-70, -110, 18, 110), Palette.WOOD)
	Ink.rect(self, Rect2(52, -110, 18, 110), Palette.WOOD)
	var p := PackedVector2Array()
	for i in 13:
		var k := i / 12.0
		var across := Vector2(lerpf(-61, 61, k), -100 + sin(k * PI) * 30)
		var hang := Vector2(-61 + sin(k * PI * 0.5) * 10, -100 + k * 95)
		p.append(across.lerp(hang, openness))
	draw_polyline(p, Palette.BAD, 7.0, true)
```

- [ ] **Step 5: Pier scene**

`game2d/levels/level1/pier.tscn`:
```
[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://levels/level1/pier.gd" id="1"]

[node name="Pier" type="Node2D"]
script = ExtResource("1")
```

`game2d/levels/level1/pier.gd`:
```gdscript
extends LevelScene
## Αποβάθρα — arrival. The sailor introduces himself (hand to chest: «Είμαι ο ναύτης.») and names
## whatever the player clicks, pointing at it. Gate: notebook page «pier» (λιμάνι, πλοίο, φάρος, βάρκα).

const PIER_WORDS := ["limani", "ploio", "faros", "varka"]

var sailor: Actor
var rope: RopeGate
var objects: Dictionary = {}
var _blocked_until := 0


func build() -> void:
	backdrop.style = "pier"
	right_exit = "conveyor"
	var ship := back_layer(Ship.new())
	ship.position = Vector2(430, 740)
	var light := back_layer(Lighthouse.new())
	light.position = Vector2(1540, 560)
	var boat := back_layer(Boat.new())
	boat.position = Vector2(1080, 724)
	objects["ploio"] = _hit(ship, "ploio", Ship.HIT)
	objects["faros"] = _hit(light, "faros", Lighthouse.HIT)
	objects["varka"] = _hit(boat, "varka", Boat.HIT)
	var sign := SignBoard.new().setup([["limani", "nom"]], 130.0)
	sign.position = Vector2(760, 850)
	ysort.add_child(sign)
	objects["limani"] = sign.hit
	for w in objects:
		objects[w].clicked.connect(_on_object_clicked)
	sailor = Actor.new()
	sailor.coat = Color("#2F5D8A")
	sailor.hat = "cap"
	sailor.position = Vector2(1200, 900)
	ysort.add_child(sailor)
	_hit(sailor, "naftis", Rect2(-50, -240, 100, 240)).clicked.connect(_on_sailor_clicked)
	rope = RopeGate.new()
	rope.position = Vector2(1770, 920)
	ysort.add_child(rope)
	SignalBus.page_checked.connect(_on_page_checked)
	if GameState.has_flag("pier_open"):
		rope.set_open(true, false)
	else:
		gate_x = 1690.0
		add_puzzle("pier")
		active_puzzle = "pier"


func on_enter() -> void:
	if GameState.has_flag("pier_intro"):
		return
	GameState.set_flag("pier_intro")
	await get_tree().create_timer(0.8, false).timeout
	_introduce()


func _hit(parent: Node2D, word: String, r: Rect2) -> Interactable:
	var h := Interactable.new().setup(word, r)
	parent.add_child(h)
	return h


func _introduce() -> void:
	sailor.hand_to_chest(1.6)
	sailor.say(GameState.line("sailor_intro"), 5.0)


func _on_sailor_clicked(_e: Interactable) -> void:
	_introduce()


func _on_object_clicked(e: Interactable) -> void:
	sailor.point_at(e.to_global(e.rect.get_center()))
	sailor.say([[e.word_id, "nom"], "."], 3.5)


func _on_page_checked(page_id: String, result: String) -> void:
	if result == NotebookModel.WRONG:
		sailor.shake_head()
		if page_id == "pier":
			wrong_attempt()
	elif result == NotebookModel.SOLVED:
		sailor.nod()
		if page_id == "pier" and not GameState.has_flag("pier_open"):
			_open()


func _open() -> void:
	GameState.set_flag("pier_open")
	open_gate()
	rope.set_open(true)
	solve_puzzle("pier")
	sailor.say(GameState.line("sailor_yes"), 3.0)


func on_gate_blocked() -> void:
	if Time.get_ticks_msec() < _blocked_until:
		return
	_blocked_until = Time.get_ticks_msec() + 3000
	sailor.point_at(hud.book_button.position + hud.book_button.size / 2.0)
	sailor.say(GameState.line("sailor_no"), 2.5)
	hud.pulse_book()


func apply_hint(id: String, level: int) -> void:
	if id != "pier":
		return
	for k in objects:
		objects[k].set_pulse(false)
	var w := _first_unsolved_word()
	if level == 0 or w == "":
		return
	sailor.point_at(objects[w].to_global(objects[w].rect.get_center()))
	sailor.say([[w, "nom"], "."], 3.0)
	if level >= 2:
		objects[w].set_pulse(true)
	if level >= 3:
		GameState.sketches[w] = true
		hud.pulse_book()


func _first_unsolved_word() -> String:
	for w in PIER_WORDS:
		if GameState.notebook.assignment(w) != GameState.lex.picto(w):
			return w
	return ""


func debug_setup(case_name: String) -> void:
	match case_name:
		"notebook":
			for w in PIER_WORDS + ["naftis", "eimai"]:
				GameState.see(w)
			GameState.notebook.assign("faros", "lighthouse")
			GameState.notebook.assign("varka", "ship")
			GameState.sketches["limani"] = true
			hud.open_notebook("faros")
		"hint":
			hints["pier"].tick(65.0)
		_:
			_introduce()
```

- [ ] **Step 6: Boot scene**

`game2d/main.tscn`:
```
[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://main.gd" id="1"]

[node name="Main" type="Node"]
script = ExtResource("1")
```

`game2d/main.gd`:
```gdscript
extends Node
## Boot: continue at the saved scene (or the level start).


func _ready() -> void:
	GameState.goto_scene.call_deferred(GameState.scene_id, GameState.entry_side)
```

In `game2d/project.godot` under `[application]` add:
```ini
run/main_scene="res://main.tscn"
```

- [ ] **Step 7: Run tests + snapshots**

Run: `./test.sh` → all pass.
Run: `./snap.sh pier pier:notebook pier:hint` → open the three PNGs.
Expected:
- `pier.png`: sky bands, sea with waves, ship left, boat mid, lighthouse far right, `ΤΟ ΛΙΜΑΝΙ` sign in a square terracotta frame, magenta-beret player at left, sailor with hand on chest and bubble «Είμαι ο ναύτης.», rope gate on the right, book button top-right, two inventory items bottom-left.
- `pier_notebook.png`: panel on the right with page tabs; four class-framed cards — φάρος shows the lighthouse picto, βάρκα shows the ship picto, λιμάνι shows a faded port sketch, πλοίο shows «?»; palette row of pictograms.
- `pier_hint.png`: the `ΤΟ ΛΙΜΑΝΙ` sign pulsing (first unsolved word) and the sailor pointing at it with bubble «Το λιμάνι.».
Fix layout issues (overlaps, clipped bubble, palette wrapping, missing glyphs) before committing.

- [ ] **Step 8: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: level scene base, pier scene with sailor naming + notebook gate, boot scene

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Conveyor (Ταινία) — gender sorting

**Files:**
- Create: `game2d/world/props/belt.gd`, `game2d/world/props/crate.gd`
- Create: `game2d/levels/level1/conveyor.tscn`, `game2d/levels/level1/conveyor.gd`
- Test: `game2d/tests/test_conveyor.gd`

**Interfaces:**
- Consumes: Tasks 6, 11, 13.
- Produces: `Belt` (`gender`, `drop_rect() -> Rect2` global, `set_pulse(on)`, `flash()`); `Crate` (`signal dropped(crate, at)`, `word_id`, `home`, `slide_in()`, `return_home(shake := false)`, `ride_away(to)`, `show_frame_hint(on)`); conveyor scene: `crate`, `belts`, `sorted_count`, `goal`, `sort_crate(crate, belt) -> bool`, `belt_for(word_id) -> Belt`, `belt_at(pos) -> Belt`.

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_conveyor.gd`:
```gdscript
extends TestCase


func _scene() -> Node:
	tree.root.get_node("GameState").new_game()
	var s: Node = load("res://levels/level1/conveyor.tscn").instantiate()
	tree.root.add_child(s)
	return s


func test_wrong_belt_bounces_and_counts() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	check(s.crate != null, "a crate is waiting")
	var w: String = s.crate.word_id
	eq(gs.notebook.is_seen(w), true, "crate word seen")
	var wrong: Belt = null
	for b in s.belts:
		if b.gender != gs.lex.gender(w):
			wrong = b
	eq(s.sort_crate(s.crate, wrong), false, "rejected")
	eq(s.sorted_count, 0, "not counted")
	eq(s.hints["conveyor"].wrong, 1, "wrong attempt")
	eq(gs.stats.data[w]["wrong"], 1, "stats")
	s.free()


func test_goal_opens_gate() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	for i in s.goal:
		var c: Crate = s.crate
		eq(s.sort_crate(c, s.belt_for(c.word_id)), true, "sort %d" % i)
	eq(s.sorted_count, s.goal, "count")
	eq(gs.has_flag("conveyor_done"), true, "flag")
	eq(s.gate_x, INF, "gate open")
	eq(s.crate, null, "no more crates")
	s.free()


func test_belt_at_uses_drop_rects() -> void:
	var s := _scene()
	var b: Belt = s.belts[1]
	eq(s.belt_at(b.drop_rect().get_center()), b, "inside")
	eq(s.belt_at(Vector2(10, 10)), null, "outside")
	s.free()
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_conveyor` → cannot load `conveyor.tscn`.

- [ ] **Step 3: Props**

`game2d/world/props/belt.gd`:
```gdscript
class_name Belt
extends Node2D
## Conveyor belt running into the back wall, under a big class sign: Ο (amber, tall), Η (azure,
## round), ΤΟ (terracotta, square) — the same affordances as the notebook frames.

const W := 220.0
const ARTICLE := {"m": "Ο", "f": "Η", "n": "ΤΟ"}

var gender := "m"
var _pulse := false
var _t := 0.0
var _scroll := 0.0


func drop_rect() -> Rect2:
	return Rect2(global_position + Vector2(-W / 2.0 - 20.0, -380.0), Vector2(W + 40.0, 440.0))


func set_pulse(on: bool) -> void:
	_pulse = on


func flash() -> void:
	var t := create_tween()
	t.tween_property(self, "modulate", Palette.gender_color(gender).lightened(0.4), 0.12)
	t.tween_property(self, "modulate", Color.WHITE, 0.3)


func _process(delta: float) -> void:
	_t += delta
	_scroll = fmod(_scroll + delta * 60.0, 40.0)
	queue_redraw()


func _draw() -> void:
	var col := Palette.gender_color(gender)
	Ink.poly(self, Ink.pts([-W / 2, 40, W / 2, 40, W / 2 - 40, -200, -W / 2 + 40, -200]), Color("#5A4A55"))
	for i in 6:
		var y := 40.0 - fmod(i * 40.0 + _scroll, 240.0)
		var hw := W / 2.0 - 40.0 * (40.0 - y) / 240.0
		draw_line(Vector2(-hw, y), Vector2(hw, y), Color(Palette.PAPER, 0.35), 3.0)
	var c := Vector2(0, -300)
	match gender:
		"m":
			Ink.rect(self, Rect2(c + Vector2(-48, -82), Vector2(96, 164)), col, 5.0)
		"f":
			Ink.circle(self, c, 76, col, 5.0)
		_:
			Ink.rect(self, Rect2(c + Vector2(-76, -76), Vector2(152, 152)), col, 5.0)
	var font := Fonts.greek()
	var art: String = ARTICLE[gender]
	var sz := font.get_string_size(art, HORIZONTAL_ALIGNMENT_LEFT, -1, 80)
	draw_string(font, c + Vector2(-sz.x / 2.0, sz.y * 0.32), art, HORIZONTAL_ALIGNMENT_LEFT, -1, 80, Palette.PAPER)
	if _pulse:
		draw_arc(c, 100, 0, TAU, 48, Color(Palette.HAZE_DEEP, 0.4 + 0.4 * sin(_t * 6.0)), 6.0, true)
```

`game2d/world/props/crate.gd`:
```gdscript
class_name Crate
extends Node2D
## Draggable wooden crate with a bare-noun label (no article — the class is the puzzle).
## Hint level 3 sketches the class frame around the label.

signal dropped(crate: Crate, at: Vector2)

const SIZE := Vector2(190, 150)

var word_id := ""
var home := Vector2.ZERO
var dragging := false
var label: InteractiveText
var hit: Area2D
var _offset := Vector2.ZERO
var _busy := false
var _hint := false


func _ready() -> void:
	z_index = 5
	label = InteractiveText.new(34)
	label.capitalize = false
	label.click_holds = false
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(label)
	label.set_line([[word_id, "bare"]])
	_center_label()
	_center_label.call_deferred()
	hit = Area2D.new()
	hit.input_pickable = true
	var cs := CollisionShape2D.new()
	var r := RectangleShape2D.new()
	r.size = SIZE
	cs.shape = r
	cs.position = Vector2(0, -SIZE.y / 2.0)
	hit.add_child(cs)
	add_child(hit)
	hit.input_event.connect(_on_hit_input)


func _center_label() -> void:
	label.reset_size()
	label.position = Vector2(-label.size.x / 2.0, -SIZE.y + 54.0 - label.size.y / 2.0)


func _on_hit_input(_vp: Node, event: InputEvent, _idx: int) -> void:
	if _busy:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		dragging = true
		_offset = global_position - get_global_mouse_position()


func _input(event: InputEvent) -> void:
	if dragging and event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		dragging = false
		dropped.emit(self, get_global_mouse_position())


func _process(_delta: float) -> void:
	if dragging:
		global_position = get_global_mouse_position() + _offset


func slide_in() -> void:
	_busy = true
	var t := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	t.tween_property(self, "position", home, 0.6)
	t.tween_callback(func(): _busy = false)


func return_home(shake: bool = false) -> void:
	_busy = true
	var t := create_tween()
	if shake:
		for i in 2:
			t.tween_property(self, "rotation", 0.12, 0.06)
			t.tween_property(self, "rotation", -0.12, 0.06)
		t.tween_property(self, "rotation", 0.0, 0.06)
	t.tween_property(self, "position", home, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	t.tween_callback(func(): _busy = false)


func ride_away(to: Vector2) -> void:
	_busy = true
	hit.input_pickable = false
	var t := create_tween().set_parallel(true)
	t.tween_property(self, "global_position", to, 0.5)
	t.tween_property(self, "scale", Vector2(0.45, 0.45), 0.5)
	t.chain().tween_property(self, "modulate:a", 0.0, 0.25)
	t.chain().tween_callback(queue_free)


func show_frame_hint(on: bool) -> void:
	_hint = on
	queue_redraw()


func _draw() -> void:
	Ink.rect(self, Rect2(-SIZE.x / 2.0, -SIZE.y, SIZE.x, SIZE.y), Palette.WOOD)
	for y in [-SIZE.y + 30.0, -40.0]:
		draw_line(Vector2(-SIZE.x / 2.0, y), Vector2(SIZE.x / 2.0, y), Color(Palette.INK, 0.5), 3.0)
	var plate := Rect2(-84, -SIZE.y + 22, 168, 64)
	Ink.rect(self, plate, Palette.PAPER, 3.0)
	if _hint:
		var col := Color(Palette.gender_color(GameState.lex.gender(word_id)), 0.55)
		draw_rect(plate.grow(8), col, false, 5.0)
```

- [ ] **Step 4: Conveyor scene**

`game2d/levels/level1/conveyor.tscn`:
```
[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://levels/level1/conveyor.gd" id="1"]

[node name="Conveyor" type="Node2D"]
script = ExtResource("1")
```

`game2d/levels/level1/conveyor.gd`:
```gdscript
extends LevelScene
## Ταινία — crates labelled with bare nouns; drag each onto the belt of its class (Ο / Η / ΤΟ).
## The ending → class mapping is learned inductively: a wrong belt bounces the crate back, a right one
## makes the worker say the noun *with* its article.

const SPAWN := Vector2(560, 720)

var worker: Actor
var belts: Array = []
var queue: Array = []
var crate: Crate
var sorted_count := 0
var goal := 6
var rope: RopeGate


func build() -> void:
	backdrop.style = "warehouse"
	left_exit = "pier"
	right_exit = "customs"
	walk_rect = Rect2(60, 860, 1800, 150)
	var genders := ["m", "f", "n"]
	for i in 3:
		var b := Belt.new()
		b.gender = genders[i]
		b.position = Vector2(960 + i * 300, 760)
		back_layer(b)
		belts.append(b)
	var table := back_layer(Node2D.new())
	table.position = SPAWN
	table.add_child(Shape.make(Ink.pts([-130, 0, 130, 0, 130, 30, -130, 30]), Palette.WOOD))
	worker = Actor.new()
	worker.coat = Color("#6B8E5A")
	worker.hat = "cap"
	worker.position = Vector2(330, 900)
	ysort.add_child(worker)
	rope = RopeGate.new()
	rope.position = Vector2(1800, 920)
	ysort.add_child(rope)
	goal = int(GameState.level["conveyor"]["goal"])
	if GameState.has_flag("conveyor_done"):
		rope.set_open(true, false)
		return
	gate_x = 1720.0
	add_puzzle("conveyor")
	active_puzzle = "conveyor"
	queue = CrateQueue.build(GameState.level["conveyor"]["words"], GameState.stats, goal)
	_spawn_next()


func _spawn_next() -> void:
	if queue.is_empty():
		crate = null
		return
	var w: String = queue.pop_front()
	GameState.see(w)
	crate = Crate.new()
	crate.word_id = w
	crate.home = SPAWN
	crate.position = SPAWN + Vector2(-420, 0)
	add_child(crate)
	crate.dropped.connect(_on_crate_dropped)
	crate.slide_in()
	if hints.has("conveyor"):
		apply_hint("conveyor", hints["conveyor"].level)


func belt_at(pos: Vector2) -> Belt:
	for b in belts:
		if b.drop_rect().has_point(pos):
			return b
	return null


func belt_for(word_id: String) -> Belt:
	for b in belts:
		if b.gender == GameState.lex.gender(word_id):
			return b
	return null


func _on_crate_dropped(c: Crate, at: Vector2) -> void:
	var b := belt_at(at)
	if b == null:
		c.return_home()
	else:
		sort_crate(c, b)


func sort_crate(c: Crate, b: Belt) -> bool:
	var ok: bool = GameState.lex.gender(c.word_id) == b.gender
	GameState.stats.record(c.word_id, ok)
	SignalBus.crate_sorted.emit(c.word_id, ok)
	if not ok:
		wrong_attempt()
		worker.shake_head()
		worker.say(GameState.line("worker_no"), 2.5)
		c.return_home(true)
		return false
	_on_activity()
	sorted_count += 1
	worker.say([[c.word_id, "nom"], "."], 3.0)
	c.ride_away(b.global_position + Vector2(0, -60))
	b.flash()
	for x in belts:
		x.set_pulse(false)
	if sorted_count >= goal:
		crate = null
		_finish()
	else:
		_spawn_next()
	return true


func _finish() -> void:
	GameState.set_flag("conveyor_done")
	open_gate()
	rope.set_open(true)
	solve_puzzle("conveyor")
	worker.nod()
	worker.say(GameState.line("worker_yes"), 3.0)


func apply_hint(id: String, level: int) -> void:
	if id != "conveyor" or crate == null:
		return
	for b in belts:
		b.set_pulse(false)
	crate.show_frame_hint(false)
	if level == 0:
		return
	var target := belt_for(crate.word_id)
	worker.point_at(target.global_position + Vector2(0, -300))
	if level >= 2:
		target.set_pulse(true)
	if level >= 3:
		crate.show_frame_hint(true)


func debug_setup(case_name: String) -> void:
	if case_name == "hint":
		hints["conveyor"].tick(91.0)
```

- [ ] **Step 5: Run tests + snapshots**

Run: `./test.sh` → all pass.
Run: `./snap.sh conveyor conveyor:hint` → open both PNGs.
Expected: warehouse wall with windows and posts; three belts under Ο / Η / ΤΟ signs (tall amber, round azure, square terracotta, paper-coloured letters); a crate with a bare noun on the feeder table; worker on the left; rope gate right. `conveyor_hint.png`: worker pointing at the correct belt, its sign ringed, the crate label framed in the class colour.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: conveyor scene — sort bare nouns onto Ο/Η/ΤΟ belts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Customs (Τελωνείο) — phrase builder, NPC reactions, document handover

**Files:**
- Create: `game2d/world/props/booth.gd`, `drop_window.gd`, `barrier.gd`, `poster.gd`
- Create: `game2d/levels/level1/customs.tscn`, `game2d/levels/level1/customs.gd`
- Test: `game2d/tests/test_customs.gd`

**Interfaces:**
- Consumes: Tasks 4, 11–13.
- Produces: `Booth.window: DropWindow`; `DropWindow` (`signal item_dropped(item_id)`, `active`); `Barrier.set_open(open, animate := true)`; `Poster` (`hit`, `flash()`); customs scene: `cfg`, `stage` ("idle"|"ask"|"item"|"done"), `booth`, `ask()`, `handle_sentence(built, result)`, `handle_item(item_id)`, `semantic_line(slot) -> Array`, `person_line() -> Array`, `echo_line(slot) -> Array`, `wrong_item_line(item_id) -> Array`.

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_customs.gd`:
```gdscript
extends TestCase

const C := ErrorClassifier


func T(w: String, f: String = "") -> Dictionary:
	return {"w": w, "f": f}


func _scene() -> Node:
	tree.root.get_node("GameState").new_game()
	var s: Node = load("res://levels/level1/customs.tscn").instantiate()
	tree.root.add_child(s)
	return s


func _judge(s: Node, built: Array) -> void:
	s.handle_sentence(built, C.classify(built, s.cfg["target"]))


func test_full_flow_with_every_error_class() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	eq(s.stage, "idle", "starts idle")
	check(s.gate_x < INF, "barrier closed")
	s.ask()
	eq(s.stage, "ask", "asking")
	eq(s.hud.builder.visible, true, "builder open")
	eq(gs.notebook.is_seen("fylakas"), true, "question words seen")
	_judge(s, [T("nai"), T("echo", "1s"), T("eisitirio", "nom")])
	eq(s.stage, "ask", "semantic keeps asking")
	_judge(s, [T("nai"), T("echo", "2s"), T("diavatirio", "nom")])
	eq(s.hints["customs_sentence"].level, 1, "2 wrong → kinetic hint")
	_judge(s, [T("diavatirio", "nom"), T("echo", "1s"), T("nai")])
	eq(s.hints["customs_sentence"].wrong, 3, "syntactic counted")
	_judge(s, [T("nai"), T("echo", "1s"), T("diavatirio", "nom")])
	eq(s.stage, "item", "now the document")
	eq(s.hud.builder.visible, false, "builder closed")
	eq(s.booth.window.active, true, "window accepts drops")
	s.handle_item("eisitirio")
	eq(s.stage, "item", "ticket refused")
	s.handle_item("diavatirio")
	eq(s.stage, "done", "passport accepted")
	eq(gs.has_flag("customs_done"), true, "flag")
	eq(s.gate_x, INF, "barrier open")
	s.free()


func test_reaction_lines() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	eq(LineFormat.plain(s.wrong_item_line("eisitirio"), gs.lex), "Όχι! Αυτό δεν είναι διαβατήριο. Αυτό είναι εισιτήριο!", "wrong item")
	eq(LineFormat.plain(s.echo_line(1), gs.lex), "Α, ναι, έχω το διαβατήριο.", "echo correction")
	check(LineFormat.bbcode(s.echo_line(1), gs.lex).contains("[wave"), "echo emphasises the slot")
	eq(LineFormat.plain(s.person_line(), gs.lex), "Έχεις το διαβατήριο;", "person repeat")
	check(LineFormat.bbcode(s.person_line(), gs.lex).contains("[wave"), "ending pulses")
	eq(LineFormat.plain(s.semantic_line(2), gs.lex), "Όχι! Έχεις το διαβατήριο;", "semantic re-ask")
	s.free()


func test_item_before_answer_is_ignored() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	s.handle_item("diavatirio")
	eq(s.stage, "idle", "nothing happens before the question")
	eq(gs.has_flag("customs_done"), false, "no flag")
	s.free()
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_customs` → cannot load `customs.tscn`.

- [ ] **Step 3: Props**

`game2d/world/props/drop_window.gd`:
```gdscript
class_name DropWindow
extends Control
## Document drop zone (blueprint "reception window"): accepts {"item_id"} drags while active.

signal item_dropped(item_id: String)

var active := false:
	set(v):
		active = v
		queue_redraw()
var _t := 0.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS


func _can_drop_data(_at: Vector2, data: Variant) -> bool:
	return active and data is Dictionary and data.has("item_id")


func _drop_data(_at: Vector2, data: Variant) -> void:
	item_dropped.emit(str(data["item_id"]))


func _process(delta: float) -> void:
	if active:
		_t += delta
		queue_redraw()


func _draw() -> void:
	if active:
		draw_rect(Rect2(Vector2.ZERO, size).grow(-4), Color(Palette.HAZE_DEEP, 0.35 + 0.3 * sin(_t * 5.0)), false, 6.0)
```

`game2d/world/props/booth.gd`:
```gdscript
class_name Booth
extends Node2D
## Customs booth drawn around an open window (the guard stands behind it); the window is a drop zone.

const WINDOW := Rect2(-120, -290, 240, 150)

var window: DropWindow


func _ready() -> void:
	window = DropWindow.new()
	window.position = WINDOW.position
	window.size = WINDOW.size
	add_child(window)


func _draw() -> void:
	var c := Palette.STONE.lerp(Palette.SHADE, 0.4)
	Ink.rect(self, Rect2(-200, -380, 80, 380), c)
	Ink.rect(self, Rect2(120, -380, 80, 380), c)
	Ink.rect(self, Rect2(-120, -380, 240, 90), c)
	Ink.rect(self, Rect2(-120, -140, 240, 140), c)
	Ink.rect(self, Rect2(-150, -150, 300, 18), Palette.WOOD)
	for i in 8:
		var x := -210.0 + i * 52.5
		Ink.poly(self, Ink.pts([x, -404, x + 52.5, -404, x + 52.5, -364, x, -364]), Palette.HAZE_LIGHT if i % 2 == 0 else Palette.PAPER, 3.0)
```

`game2d/world/props/barrier.gd`:
```gdscript
class_name Barrier
extends Node2D
## Striped barrier arm on a post; swings up when opened.

var arm: Node2D


func _ready() -> void:
	add_child(Shape.make(Ink.pts([-12, 0, 12, 0, 12, -120, -12, -120]), Palette.STONE.darkened(0.2)))
	arm = Node2D.new()
	arm.position = Vector2(0, -110)
	add_child(arm)
	arm.add_child(Shape.make(Ink.pts([0, -9, -280, -9, -280, 9, 0, 9]), Palette.PAPER))
	for i in 5:
		var x := -30.0 - i * 54.0
		arm.add_child(Shape.make(Ink.pts([x, -9, x - 26, -9, x - 26, 9, x, 9]), Palette.BAD, 0.0))


func set_open(open: bool, animate: bool = true) -> void:
	var r := 1.35 if open else 0.0
	if animate:
		create_tween().tween_property(arm, "rotation", r, 0.6).set_trans(Tween.TRANS_BACK)
	else:
		arm.rotation = r
```

`game2d/world/props/poster.gd`:
```gdscript
class_name Poster
extends Node2D
## Wall poster with a passport picture (no words). The guard taps it; clicking it with a held card
## binds that card to «passport».

var hit: Interactable


func _ready() -> void:
	var p := Picto.new()
	p.picto_id = "passport"
	p.position = Vector2(-60, -60)
	p.size = Vector2(120, 120)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(p)
	hit = Interactable.new().setup("diavatirio", Rect2(-80, -80, 160, 160))
	add_child(hit)


func _draw() -> void:
	Ink.rect(self, Rect2(-80, -80, 160, 160), Palette.PAPER)
	Ink.circle(self, Vector2(-66, -66), 5, Palette.BAD, 2.0)
	Ink.circle(self, Vector2(66, -66), 5, Palette.BAD, 2.0)


func flash() -> void:
	var t := create_tween()
	t.tween_property(self, "scale", Vector2(1.15, 1.15), 0.12)
	t.tween_property(self, "scale", Vector2.ONE, 0.2)
```

- [ ] **Step 4: Customs scene**

`game2d/levels/level1/customs.tscn`:
```
[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://levels/level1/customs.gd" id="1"]

[node name="Customs" type="Node2D"]
script = ExtResource("1")
```

`game2d/levels/level1/customs.gd`:
```gdscript
extends LevelScene
## Τελωνείο — the guard (hand to chest, then reaching to the player): «Είμαι ο φύλακας. Έχεις το
## διαβατήριο;». The player answers in the phrase builder; ErrorClassifier picks a diegetic reaction:
## semantic → shake + re-ask; verb person → the hero points at the guard, the guard scratches his head
## and repeats with the ending pulsing; other morphology → echo correction; syntactic → comic laugh.
## Then the right document must be dragged into the window.

const ASK_X := 820.0

var cfg: Dictionary
var guard: Actor
var booth: Booth
var barrier: Barrier
var poster: Poster
var stage := "idle"


func build() -> void:
	cfg = GameState.level["customs"]
	backdrop.style = "customs"
	left_exit = "conveyor"
	right_exit = "end"
	walk_rect = Rect2(60, 850, 1800, 160)
	poster = back_layer(Poster.new())
	poster.position = Vector2(930, 520)
	guard = Actor.new()
	guard.coat = Color("#2E3A5C")
	guard.hat = "peaked"
	guard.position = Vector2(1200, 832)
	ysort.add_child(guard)
	var guard_hit := Interactable.new().setup("fylakas", Rect2(-50, -240, 100, 110))
	guard.add_child(guard_hit)
	guard_hit.clicked.connect(_on_guard_clicked)
	booth = Booth.new()
	booth.position = Vector2(1200, 848)
	ysort.add_child(booth)
	booth.window.item_dropped.connect(handle_item)
	barrier = Barrier.new()
	barrier.position = Vector2(1480, 930)
	ysort.add_child(barrier)
	var exit_sign := SignBoard.new().setup([["exodos", "nom"]], 170.0)
	exit_sign.position = Vector2(1720, 860)
	ysort.add_child(exit_sign)
	add_puzzle("customs_sentence")
	add_puzzle("customs_item")
	hud.builder.submitted.connect(handle_sentence)
	hud.builder.changed.connect(_on_activity)
	if GameState.has_flag("customs_done"):
		stage = "done"
		barrier.set_open(true, false)
	else:
		gate_x = 1420.0


func _process(delta: float) -> void:
	super(delta)
	if stage == "idle" and player.position.x >= ASK_X:
		ask()


func ask() -> void:
	stage = "ask"
	active_puzzle = "customs_sentence"
	guard.hand_to_chest()
	guard.say(GameState.line("guard_question"), 6.0)
	hud.builder.open(cfg["target"], cfg["tiles"])


func _on_guard_clicked(_e: Interactable) -> void:
	match stage:
		"idle", "ask":
			ask()
		"item":
			guard.reach_toward(player.global_position + Vector2(0, -120))


func handle_sentence(built: Array, result: Dictionary) -> void:
	if stage != "ask":
		return
	SignalBus.sentence_submitted.emit("customs_sentence", result)
	var slot: int = maxi(result["slot"], 0)
	var slot_word: String = cfg["target"][slot]["w"]
	match result["kind"]:
		ErrorClassifier.OK:
			for t in cfg["target"]:
				GameState.stats.record(t["w"], true)
			hud.builder.close()
			solve_puzzle("customs_sentence")
			stage = "item"
			active_puzzle = "customs_item"
			booth.window.active = true
			guard.reach_toward(player.global_position + Vector2(0, -120), 3.0)
		ErrorClassifier.SEMANTIC:
			GameState.stats.record(slot_word, false)
			wrong_attempt()
			guard.shake_head()
			guard.say(semantic_line(slot), 5.0)
		ErrorClassifier.MORPHOLOGICAL:
			GameState.stats.record(slot_word, false)
			wrong_attempt()
			if GameState.lex.pos(slot_word) == "verb":
				player.point_at(guard.global_position + Vector2(0, -170))
				guard.scratch_head()
				guard.say(person_line(), 5.0)
			else:
				guard.nod()
				guard.say(echo_line(slot), 5.0)
		ErrorClassifier.SYNTACTIC:
			wrong_attempt()
			guard.laugh()
			guard.say(GameState.line("guard_syntactic"), 5.0)


func handle_item(item_id: String) -> void:
	if stage != "item":
		return
	var ok: bool = item_id == cfg["item"]
	SignalBus.item_given.emit(item_id, ok)
	GameState.stats.record(item_id, ok)
	if not ok:
		wrong_attempt()
		guard.shake_head()
		guard.say(wrong_item_line(item_id), 5.0)
		poster.flash()
		return
	stage = "done"
	booth.window.active = false
	hud.inventory.pulse(cfg["item"], false)
	guard.nod()
	guard.say(GameState.line("guard_yes"), 3.0)
	barrier.set_open(true)
	open_gate()
	GameState.set_flag("customs_done")
	solve_puzzle("customs_item")


## «Όχι! Έχεις το διαβατήριο;» — re-ask; the noun pulses when it was the wrong word.
func semantic_line(slot: int) -> Array:
	var noun: Array = ["diavatirio", "nom", "emph"] if slot == 2 else ["diavatirio", "nom"]
	return [["ochi", ""], "! ", ["echo", "2s"], " ", noun, ";"]


## «Έχεις το διαβατήριο;» with -εις pulsing: "you have" — the guard means the player.
func person_line() -> Array:
	return [["echo", "2s", "emph"], " ", ["diavatirio", "nom"], ";"]


## «Α, ναι, έχω το διαβατήριο.» with the corrected word pulsing (pedagogy: эхо-поправка).
func echo_line(slot: int) -> Array:
	var out: Array = ["Α, "]
	var i := 0
	for t in GameState.line("guard_answer"):
		if t is Array:
			out.append([t[0], t[1], "emph"] if i == slot else t)
			i += 1
		else:
			out.append(t)
	return out


func wrong_item_line(item_id: String) -> Array:
	return [["ochi", ""], "! Αυτό δεν ", ["eimai", "3s"], " ", [cfg["item"], "bare"], ". Αυτό ",
		["eimai", "3s"], " ", [item_id, "bare"], "!"]


func apply_hint(id: String, level: int) -> void:
	match id:
		"customs_sentence":
			hud.builder.stop_pulse()
			hud.builder.show_sketches(false)
			if level == 0:
				return
			guard.reach_toward(player.global_position + Vector2(0, -120))
			guard.say(GameState.line("guard_question"), 5.0)
			if level >= 2:
				hud.builder.pulse_token(hud.builder.next_needed())
			if level >= 3:
				hud.builder.show_sketches(true)
		"customs_item":
			hud.inventory.pulse(cfg["item"], false)
			if level == 0:
				return
			guard.point_at(poster.global_position)
			if level >= 2:
				hud.inventory.pulse(cfg["item"], true)
				poster.flash()


func debug_setup(case_name: String) -> void:
	match case_name:
		"builder":
			ask()
			hud.builder.tap_tile({"w": "nai", "f": ""})
		"wrong":
			ask()
			var built := [{"w": "nai", "f": ""}, {"w": "echo", "f": "2s"}, {"w": "diavatirio", "f": "nom"}]
			handle_sentence(built, ErrorClassifier.classify(built, cfg["target"]))
		"item":
			ask()
			handle_sentence(cfg["target"], {"kind": ErrorClassifier.OK, "slot": -1})
		"done":
			ask()
			handle_sentence(cfg["target"], {"kind": ErrorClassifier.OK, "slot": -1})
			handle_item("diavatirio")
```

- [ ] **Step 5: Run tests + snapshots**

Run: `./test.sh` → all pass.
Run: `./snap.sh customs:builder customs:wrong customs:item customs:done` → open the PNGs.
Expected: arched wall with the passport poster; booth with a striped awning, the guard's head and torso visible in the window; barrier and `Η ΕΞΟΔΟΣ` sign (rounded azure frame) on the right. `builder`: guard bubble with the question; builder centred at the bottom with 3 slots (first = «ναι») and 7 tiles. `wrong`: hero pointing at the guard, guard scratching, bubble «Έχεις το διαβατήριο;». `item`: builder gone, window glowing. `done`: barrier up, bubble «Ναι!».

- [ ] **Step 6: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: customs — phrase builder with diegetic error reactions, passport handover

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Level end card + end-to-end run

**Files:**
- Create: `game2d/levels/level1/level_end.tscn`, `game2d/levels/level1/level_end.gd`
- Test: `game2d/tests/test_level_flow.gd`

**Interfaces:**
- Consumes: everything above.
- Produces: end scene (Control) with buttons «Вернуться к таможне», «Начать заново», «Выход»; sets flag `level1_done`.

- [ ] **Step 1: Write the failing test**

`game2d/tests/test_level_flow.gd`:
```gdscript
extends TestCase


func test_scene_paths_exist() -> void:
	var gs := tree.root.get_node("GameState")
	for id in gs.level["scenes"]:
		check(ResourceLoader.exists(gs.level["scenes"][id]), "scene file for " + id)


func test_whole_level_logic_and_persistence() -> void:
	var gs := tree.root.get_node("GameState")
	gs.new_game()
	var pier: Node = load("res://levels/level1/pier.tscn").instantiate()
	tree.root.add_child(pier)
	for w in pier.PIER_WORDS:
		gs.see(w)
		gs.notebook.assign(w, gs.lex.picto(w))
	SignalBus.page_checked.emit("pier", gs.notebook.check_page("pier"))
	pier.free()
	var conv: Node = load("res://levels/level1/conveyor.tscn").instantiate()
	tree.root.add_child(conv)
	while conv.crate != null:
		conv.sort_crate(conv.crate, conv.belt_for(conv.crate.word_id))
	conv.free()
	var cust: Node = load("res://levels/level1/customs.tscn").instantiate()
	tree.root.add_child(cust)
	cust.ask()
	cust.handle_sentence(cust.cfg["target"], {"kind": ErrorClassifier.OK, "slot": -1})
	cust.handle_item("diavatirio")
	cust.free()
	for f in ["pier_open", "conveyor_done", "customs_done"]:
		eq(gs.has_flag(f), true, f)
	var end: Node = load("res://levels/level1/level_end.tscn").instantiate()
	tree.root.add_child(end)
	eq(gs.has_flag("level1_done"), true, "end card sets flag")
	end.free()
	gs.new_game()
	eq(gs.load_game(), true, "saved during play")
	eq(gs.has_flag("customs_done"), true, "progress persisted")
	eq(gs.notebook.is_page_solved("pier"), true, "notebook persisted")
```

- [ ] **Step 2: Run to verify failure** — `./test.sh test_level_flow` → `scene file for end` fails.

- [ ] **Step 3: Implement**

`game2d/levels/level1/level_end.tscn`:
```
[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://levels/level1/level_end.gd" id="1"]

[node name="LevelEnd" type="Control"]
layout_mode = 3
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0
script = ExtResource("1")
```

`game2d/levels/level1/level_end.gd`:
```gdscript
extends Control
## End card of Level 1: what was deciphered (word + its pictogram, now earned), replay or quit.


func _ready() -> void:
	GameState.set_flag("level1_done")
	GameState.save_game()
	_build()


func _build() -> void:
	var nb: NotebookModel = GameState.notebook
	var bg := ColorRect.new()
	bg.color = Palette.PAPER
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var v := VBoxContainer.new()
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 22)
	center.add_child(v)
	var title := Ui.greek_label(Greek.caps("λιμάνι"), 84)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(title)
	var sub := Ui.label("Глава 1 пройдена", 36)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(sub)
	v.add_child(Ui.label("Страниц расшифровано: %d из %d" % [nb.solved_pages.size(), nb.pages.size()], 28))
	v.add_child(Ui.label("Слов понято: %d из %d" % [nb.known_count(), GameState.lex.ids().size()], 28))
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 28)
	grid.add_theme_constant_override("v_separation", 12)
	for p in nb.solved_pages:
		for w in nb.pages[p]:
			var row := HBoxContainer.new()
			var pic := Picto.new()
			pic.picto_id = GameState.lex.picto(w)
			pic.custom_minimum_size = Vector2(56, 56)
			row.add_child(pic)
			row.add_child(Ui.greek_label(GameState.lex.surface(w), 28))
			grid.add_child(row)
	v.add_child(grid)
	if nb.solved_pages.size() < nb.pages.size():
		v.add_child(Ui.label("Нерасшифрованные страницы можно дорешать — блокнот сохраняется.", 22))
	var buttons := HBoxContainer.new()
	buttons.alignment = BoxContainer.ALIGNMENT_CENTER
	buttons.add_theme_constant_override("separation", 24)
	var back := Ui.button("Вернуться к таможне", 26)
	back.pressed.connect(func(): GameState.goto_scene("customs", "right"))
	buttons.add_child(back)
	var again := Ui.button("Начать заново", 26)
	again.pressed.connect(_restart)
	buttons.add_child(again)
	var quit := Ui.button("Выход", 26)
	quit.pressed.connect(func(): get_tree().quit())
	buttons.add_child(quit)
	v.add_child(buttons)


func _restart() -> void:
	GameState.wipe_save()
	GameState.goto_scene("pier", "left")


func debug_setup(_case: String) -> void:
	for p in ["pier", "cargo"]:
		for w in GameState.notebook.pages[p]:
			GameState.see(w)
			GameState.notebook.assign(w, GameState.lex.picto(w))
		GameState.notebook.check_page(p)
	for c in get_children():
		remove_child(c)
		c.queue_free()
	_build()
```

- [ ] **Step 4: Run tests + snapshot**

Run: `./test.sh` → all pass.
Run: `./snap.sh end` → open `tools/out/end.png`: big ΛΙΜΑΝΙ, «Глава 1 пройдена», 2 of 5 pages and 7 of 16 words, a grid of 7 word+picto pairs, three buttons.

- [ ] **Step 5: Play it for real (windowed)**

The snapshot/test runs use separate save files, but a real run uses the player save — wipe it first:
```bash
rm -f "$APPDATA/Godot/app_userdata/Hellas Sennaar 2D/save.json"
/c/Users/user/Tools/godot/Godot_v4.7.2-stable_win64.exe --path /c/Users/user/Desktop/hellas-flash-buddy/telegram-bot/game2d
```
Play through: click objects (sailor names them), open the notebook (Tab), assign pictograms, use «в мир» on the boat, check the page, walk right; sort 6 crates (try one wrong); at customs build one wrong sentence of each kind, then the right one; drag the ticket, then the passport; reach the end card. Fix every bug found; add a regression test when it is logic. Quit, relaunch, confirm it resumes at the saved scene.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d
git commit -m "game2d: level 1 end card and end-to-end flow test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Windows export (.exe)

**Files:**
- Create: `game2d/export_presets.cfg`, `game2d/README.md`

**Interfaces:**
- Produces: `game2d/export/HellasSennaar.exe` (gitignored), one file with the PCK embedded.

- [ ] **Step 1: Ask the user before downloading export templates**

Check the size: `curl -sIL --ssl-no-revoke https://github.com/godotengine/godot/releases/download/4.7.2-stable/Godot_v4.7.2-stable_export_templates.tpz | grep -i content-length | tail -1`
Tell the user the exact size and wait for an explicit yes. Then:
```bash
mkdir -p "$APPDATA/Godot/export_templates/4.7.2.stable"
cd "$TEMP" && curl -L --ssl-no-revoke -o tpl.tpz https://github.com/godotengine/godot/releases/download/4.7.2-stable/Godot_v4.7.2-stable_export_templates.tpz
unzip -j -o tpl.tpz "templates/windows_*" "templates/version.txt" -d "$APPDATA/Godot/export_templates/4.7.2.stable/" && rm tpl.tpz
ls "$APPDATA/Godot/export_templates/4.7.2.stable/"
```
Expected: `windows_release_x86_64.exe`, `windows_debug_x86_64.exe` (+ console variants), `version.txt`.

- [ ] **Step 2: Export preset**

`game2d/export_presets.cfg`:
```ini
[preset.0]

name="Windows Desktop"
platform="Windows Desktop"
runnable=true
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter="*.json"
exclude_filter="tests/*, tools/*"
export_path="export/HellasSennaar.exe"
encryption_include_filters=""
encryption_exclude_filters=""
encrypt_pck=false
encrypt_directory=false

[preset.0.options]

custom_template/debug=""
custom_template/release=""
debug/export_console_wrapper=0
binary_format/embed_pck=true
texture_format/s3tc_bptc=true
texture_format/etc2_astc=false
binary_format/architecture="x86_64"
application/modify_resources=false
application/product_name="Hellas Sennaar"
application/file_description="Hellas Sennaar — learn Greek by deciphering"
```

- [ ] **Step 3: Export**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy/telegram-bot/game2d
mkdir -p export
/c/Users/user/Tools/godot/Godot_v4.7.2-stable_win64_console.exe --headless --path . --export-release "Windows Desktop" export/HellasSennaar.exe
ls -la export/
```
Expected: `HellasSennaar.exe` (~70–100 MB), exit 0.

- [ ] **Step 4: Smoke-test the exe**

Launch `export/HellasSennaar.exe`; confirm the pier loads with Greek text (JSON + font packed), the notebook opens, quitting and relaunching resumes. If it fails with `bad lexicon json`, `*.json` was not packed — fix `include_filter` and re-export.

- [ ] **Step 5: README**

`game2d/README.md`:
```markdown
# Hellas Sennaar 2D (Godot 4.7)

Chants-of-Sennaar-style Greek deciphering game, Level 1 «Λιμάνι».
Spec: docs/superpowers/specs/2026-10-05-hellas-sennaar-2d-design.md

- Play from source: `Godot_v4.7.2-stable_win64.exe --path telegram-bot/game2d`
- Tests (headless): `./test.sh` (or `./test.sh test_customs`)
- Screenshots: `./snap.sh gallery pier pier:notebook conveyor customs:builder end` → `tools/out/`
- Export: `Godot_v4.7.2-stable_win64_console.exe --headless --path . --export-release "Windows Desktop" export/HellasSennaar.exe`
- Save file: `%APPDATA%\Godot\app_userdata\Hellas Sennaar 2D\save.json`
- Controls: click to walk / interact, Tab or N = notebook, Esc / right click = drop the held card.
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/user/Desktop/hellas-flash-buddy
git add telegram-bot/game2d/export_presets.cfg telegram-bot/game2d/README.md
git commit -m "game2d: Windows export preset and README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
