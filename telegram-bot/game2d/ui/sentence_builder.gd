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
	add_theme_stylebox_override("panel", Ui.paper_style(26))
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
