class_name Poster
extends Node2D
## Wall poster with a passport picture (no words). The guard taps it; clicking it with a held card
## binds that card to «passport».

var hit: Interactable


func _ready() -> void:
	var p := Picto.new()
	p.picto_id = "passport"
	p.position = Vector2(-60, -60)
	p.size = Vector2(120, 120)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(p)
	hit = Interactable.new().setup("diavatirio", Rect2(-80, -80, 160, 160))
	add_child(hit)


func _draw() -> void:
	Ink.rect(self, Rect2(-80, -80, 160, 160), Palette.PAPER)
	Ink.circle(self, Vector2(-66, -66), 5, Palette.BAD, 2.0)
	Ink.circle(self, Vector2(66, -66), 5, Palette.BAD, 2.0)


func flash() -> void:
	var t := create_tween()
	t.tween_property(self, "scale", Vector2(1.15, 1.15), 0.12)
	t.tween_property(self, "scale", Vector2.ONE, 0.2)
