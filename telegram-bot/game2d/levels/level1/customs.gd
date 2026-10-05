extends LevelScene
## Τελωνείο — the guard (hand to chest, then reaching to the player): «Είμαι ο φύλακας. Έχεις το
## διαβατήριο;». The player answers in the phrase builder; ErrorClassifier picks a diegetic reaction:
## semantic → shake + re-ask; verb person → the hero points at the guard, the guard scratches his head
## and repeats with the ending pulsing; other morphology → echo correction; syntactic → comic laugh.
## Then the right document must be dragged into the window.


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
	poster.position = ArtLibrary.point("customs", "poster", Vector2(860, 520))
	guard = Actor.new()
	guard.coat = Color("#2E3A5C")
	guard.hat = "peaked"
	guard.art = "guard"
	var desk_x := ArtLibrary.point("customs", "desk", Vector2(1200, 848)).x
	guard.position = Vector2(desk_x, 832)
	ysort.add_child(guard)
	var guard_hit := Interactable.new().setup("fylakas", Rect2(-50, -240, 100, 110))
	guard.add_child(guard_hit)
	guard_hit.clicked.connect(_on_guard_clicked)
	booth = Booth.new()
	booth.position = Vector2(desk_x, 848)
	ysort.add_child(booth)
	booth.window.item_dropped.connect(handle_item)
	barrier = Barrier.new()
	barrier.position = ArtLibrary.point("customs", "barrier", Vector2(1530, 930))
	ysort.add_child(barrier)
	var exit_sign := SignBoard.new().setup([["exodos", "nom"]], 170.0)
	exit_sign.position = ArtLibrary.point("customs", "exit_sign", Vector2(1720, 860))
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
	if stage == "idle" and player.position.x >= booth.position.x - 380.0:
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
