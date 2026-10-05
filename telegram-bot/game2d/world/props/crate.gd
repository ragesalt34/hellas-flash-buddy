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
var _mouse := Vector2.ZERO     # last pointer position in canvas space, taken from events
var _busy := false
var _hint := false


func _ready() -> void:
	z_index = 5
	label = InteractiveText.new(34)
	label.capitalize = false
	label.click_holds = false
	label.plain = true
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
		_mouse = _to_canvas(event.position)
		_offset = global_position - _mouse


func _input(event: InputEvent) -> void:
	if not dragging or not (event is InputEventMouse):
		return
	_mouse = _to_canvas(event.position)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		dragging = false
		dropped.emit(self, _mouse)


func _process(_delta: float) -> void:
	if dragging:
		global_position = _mouse + _offset


func _to_canvas(p: Vector2) -> Vector2:
	return get_canvas_transform().affine_inverse() * p


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
