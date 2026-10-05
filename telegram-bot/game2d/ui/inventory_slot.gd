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
