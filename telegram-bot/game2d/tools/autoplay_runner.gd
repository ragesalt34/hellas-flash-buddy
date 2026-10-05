extends Node
## Autoplay scenario (see tools/autoplay.gd). Runs as a node so it can use autoloads and class names.

var gs: Node
var cm: Node
var failures: Array[String] = []


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	await get_tree().process_frame
	gs = get_tree().root.get_node("GameState")
	cm = get_tree().root.get_node("CursorManager")
	gs.save_path = "user://autoplay_save.json"
	gs.wipe_save()
	get_tree().change_scene_to_file("res://levels/level1/pier.tscn")
	await _frames(5)
	await _pier()
	if failures.is_empty():
		await _conveyor()
	if failures.is_empty():
		await _customs()
	if failures.is_empty():
		await _until(func(): return get_tree().current_scene and get_tree().current_scene.name == "LevelEnd", 15.0, "end card")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(gs.save_path))
	if failures.is_empty():
		print("AUTOPLAY OK")
		get_tree().quit(0)
	else:
		for f in failures:
			print("AUTOPLAY FAIL: " + f)
		get_tree().quit(1)


func _pier() -> void:
	var s := get_tree().current_scene
	_expect(s.name == "Pier", "starts at the pier")
	# Clicking the boat makes the sailor name it.
	var boat: Interactable = s.objects["varka"]
	await _click(boat.to_global(boat.rect.get_center()))
	await _frames(3)
	_expect(s.sailor._bubble != null and s.sailor._bubble.text.line == [["varka", "nom"], "."], "sailor names the boat")
	var ship: Interactable = s.objects["ploio"]
	await _click(ship.to_global(ship.rect.get_center()))
	_expect(gs.notebook.is_seen("ploio"), "clicking the ship teaches «πλοίο»")
	# Two-click binding: hold the «φάρος» card, click the lighthouse.
	gs.see("faros")
	cm.hold("faros")
	var light: Interactable = s.objects["faros"]
	await _click(light.to_global(light.rect.get_center()))
	_expect(gs.notebook.assignment("faros") == "lighthouse", "world binding assigned the lighthouse")
	# Notebook through the keyboard and mouse.
	await _key(KEY_TAB)
	await _until(func(): return s.hud.notebook.state == NotebookUI.State.OPEN, 3.0, "notebook opens")
	for w in ["limani", "ploio", "varka"]:
		await _click_node(func(): return _card(s, w))
		_expect(s.hud.notebook.selected == w, "notebook: card selected " + w + " (got '%s', hovered %s)" % [s.hud.notebook.selected, get_viewport().gui_get_hovered_control()])
		await _click_node(func(): return _picto_button(s, gs.lex.picto(w)))
		_expect(gs.notebook.assignment(w) == gs.lex.picto(w), "notebook: picked a meaning for " + w)
	await _click_node(func(): return s.hud.notebook._check)
	_expect(gs.has_flag("pier_open"), "pier page solved → gate open")
	await _key(KEY_ESCAPE)
	await _until(func(): return s.hud.notebook.state == NotebookUI.State.CLOSED, 3.0, "notebook closes")
	await _click(Vector2(1855, 900))
	await _until(func(): return get_tree().current_scene and get_tree().current_scene.name == "Conveyor", 15.0, "walk to the conveyor")


func _conveyor() -> void:
	await _frames(5)
	var s := get_tree().current_scene
	var wrong_done := false
	while not gs.has_flag("conveyor_done"):
		await _until(func(): return s.crate != null and not s.crate._busy, 5.0, "crate ready")
		var c: Crate = s.crate
		var target: Belt = s.belt_for(c.word_id)
		if not wrong_done:
			for b in s.belts:
				if b != target:
					target = b
					break
		await _drag(c.global_position + Vector2(0, -60), target.drop_rect().get_center())
		await _frames(3)
		if not wrong_done:
			_expect(s.sorted_count == 0 and s.hints["conveyor"].wrong == 1, "wrong belt bounces")
			wrong_done = true
		if not failures.is_empty():
			return
	_expect(s.gate_x == INF, "conveyor gate open")
	await _click(Vector2(1855, 930))
	await _until(func(): return get_tree().current_scene and get_tree().current_scene.name == "Customs", 15.0, "walk to customs")


func _customs() -> void:
	await _frames(5)
	var s := get_tree().current_scene
	await _click(Vector2(900, 930))
	await _until(func(): return s.stage == "ask", 10.0, "guard asks")
	var b: SentenceBuilder = s.hud.builder
	await _frames(3)
	# Morphological mistake first (έχεις), then the right answer.
	for tok in [{"w": "nai", "f": ""}, {"w": "echo", "f": "2s"}, {"w": "diavatirio", "f": "nom"}]:
		await _click_node(func(): return _tile(b, tok))
	await _click(b._say.get_global_rect().get_center())
	_expect(s.hints["customs_sentence"].wrong == 1 and s.stage == "ask", "έχεις is a mistake")
	await _click(b._slots_box.get_child(1).get_global_rect().get_center())
	await _click_node(func(): return _tile(b, {"w": "echo", "f": "1s"}))
	await _click(b._say.get_global_rect().get_center())
	_expect(s.stage == "item", "right answer accepted")
	var slot: Control = null
	for sl in s.hud.inventory.get_children():
		if sl.item_id == "diavatirio":
			slot = sl
	var window: Control = s.booth.window
	await _drag(slot.get_global_rect().get_center(), window.get_global_rect().get_center())
	await _frames(3)
	_expect(s.stage == "done" and gs.has_flag("customs_done"), "passport dropped into the window")
	await _frames(40)
	await _click(Vector2(1855, 930))


# --- helpers ---------------------------------------------------------------

func _card(s: Node, w: String) -> Control:
	for c in s.hud.notebook._cards.get_children():
		if c.word_id == w:
			return c
	failures.append("no card " + w)
	return null


func _picto_button(s: Node, p: String) -> Control:
	for b in s.hud.notebook._palette.get_children():
		if b.get_child(0).picto_id == p:
			return b
	failures.append("no palette button " + p)
	return null


func _tile(b: SentenceBuilder, tok: Dictionary) -> Control:
	for t in b._tiles_box.get_children():
		if t.token == tok:
			return t
	failures.append("no tile %s" % tok)
	return null


## Waits for container layout (rebuilt UI is placed a frame later), then clicks the node's centre.
func _click_node(getter: Callable) -> void:
	await _frames(2)
	var n: Control = getter.call()
	if n == null:
		return
	await _click(n.get_global_rect().get_center())


func _expect(cond: bool, what: String) -> void:
	print(("  ok   " if cond else "  FAIL ") + what)
	if not cond:
		failures.append(what)


func _mouse(pos: Vector2, pressed: bool, mask: int) -> void:
	var ev := InputEventMouseButton.new()
	ev.button_index = MOUSE_BUTTON_LEFT
	ev.pressed = pressed
	ev.button_mask = mask
	ev.position = pos
	ev.global_position = pos
	get_tree().root.push_input(ev, true)


var _last_pos := Vector2.ZERO


func _move(pos: Vector2, mask: int) -> void:
	var ev := InputEventMouseMotion.new()
	ev.relative = pos - _last_pos      # GUI drag threshold accumulates relative motion
	_last_pos = pos
	ev.position = pos
	ev.global_position = pos
	ev.button_mask = mask
	get_tree().root.push_input(ev, true)


func _click(pos: Vector2) -> void:
	_move(pos, 0)
	await get_tree().physics_frame
	await get_tree().process_frame
	_mouse(pos, true, MOUSE_BUTTON_MASK_LEFT)
	_pick(pos, true)
	await get_tree().physics_frame
	await get_tree().process_frame
	_mouse(pos, false, 0)
	await get_tree().physics_frame
	await get_tree().process_frame


func _drag(from: Vector2, to: Vector2) -> void:
	_move(from, 0)
	await get_tree().physics_frame
	_mouse(from, true, MOUSE_BUTTON_MASK_LEFT)
	_pick(from, true)
	await get_tree().physics_frame
	await get_tree().process_frame
	for i in range(1, 13):
		_move(from.lerp(to, i / 12.0), MOUSE_BUTTON_MASK_LEFT)
		await get_tree().process_frame
	_mouse(to, false, 0)
	await get_tree().physics_frame
	await get_tree().process_frame


func _key(code: Key) -> void:
	for pressed in [true, false]:
		var ev := InputEventKey.new()
		ev.keycode = code
		ev.physical_keycode = code
		ev.pressed = pressed
		get_tree().root.push_input(ev)
		await get_tree().process_frame


func _frames(n: int) -> void:
	for i in n:
		await get_tree().process_frame


func _until(cond: Callable, seconds: float, what: String) -> void:
	var end := Time.get_ticks_msec() + int(seconds * 1000.0)
	while Time.get_ticks_msec() < end:
		if cond.call():
			print("  ok   " + what)
			return
		await get_tree().process_frame
	failures.append("timeout: " + what)
	print("  FAIL timeout: " + what)


## Headless has no OS window, so the engine never marks the mouse as inside the viewport and skips
## physics picking. Do what picking does: find the pickable area under the point (only if the GUI
## did not take the click) and hand it the press.
func _pick(pos: Vector2, pressed: bool) -> void:
	if get_viewport().gui_get_hovered_control() != null:
		return
	var q := PhysicsPointQueryParameters2D.new()
	q.position = pos
	q.collide_with_areas = true
	q.collide_with_bodies = false
	var hits: Array = get_viewport().world_2d.direct_space_state.intersect_point(q)
	var best: Node = null
	for h in hits:
		var c: Node = h["collider"]
		if c is CollisionObject2D and c.input_pickable and c.is_visible_in_tree() and c.can_process():
			if best == null or c.get_index() > best.get_index():
				best = c
	if best == null:
		return
	var ev := InputEventMouseButton.new()
	ev.button_index = MOUSE_BUTTON_LEFT
	ev.pressed = pressed
	ev.position = pos
	ev.global_position = pos
	if best.has_method("_input_event"):
		best._input_event(get_viewport(), ev, 0)
	best.input_event.emit(get_viewport(), ev, 0)
