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
