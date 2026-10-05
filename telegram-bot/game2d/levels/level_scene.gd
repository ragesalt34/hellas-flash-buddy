class_name LevelScene
extends Node2D
## Base for a Level 1 screen: backdrop, Y-sorted actors, click-to-walk inside walk_rect, exits at the
## screen edges, HUD, and one HintDirector per puzzle (ticked only while unpaused, so the notebook
## never escalates hints). Subclasses override build(), on_enter(), apply_hint(), on_gate_blocked().

const EXIT_MARGIN := 60.0       # arriving this close to a screen edge leaves through it

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
	player.art = "traveler"
	ysort.add_child(player)
	player.arrived.connect(_check_exit)
	add_child(PostFx.new())
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
		# From the event, not get_global_mouse_position(): pushed/synthetic events carry their own position.
		walk_player_to(get_canvas_transform().affine_inverse() * event.position)


func _on_activity(_a: Variant = null, _b: Variant = null) -> void:
	if active_puzzle != "":
		hints[active_puzzle].on_input()


func _on_hint_level(level: int, id: String) -> void:
	SignalBus.hint_level_changed.emit(id, level)
	apply_hint(id, level)


func _place_player() -> void:
	var y := walk_rect.get_center().y
	if GameState.entry_side == "right":
		player.position = Vector2(walk_rect.end.x - EXIT_MARGIN * 2.0, y)
	else:
		player.position = Vector2(walk_rect.position.x + EXIT_MARGIN * 2.0, y)


func _check_exit() -> void:
	if _leaving:
		return
	if right_exit != "" and player.position.x >= walk_rect.end.x - EXIT_MARGIN:
		_leaving = true
		GameState.goto_scene(right_exit, "left")
	elif left_exit != "" and player.position.x <= walk_rect.position.x + EXIT_MARGIN:
		_leaving = true
		GameState.goto_scene(left_exit, "right")
