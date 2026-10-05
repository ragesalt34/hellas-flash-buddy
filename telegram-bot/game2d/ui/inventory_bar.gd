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
