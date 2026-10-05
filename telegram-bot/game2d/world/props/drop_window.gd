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
