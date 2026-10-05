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
	sailor.position = Vector2(1340, 900)
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
