class_name RopeGate
extends Node2D
## Two posts with a red rope. Closed: rope across. Open: rope hangs from the left post.

var openness := 0.0
var _post: Texture2D


func _ready() -> void:
	_post = ArtLibrary.tex("prop_gate_post")


func set_open(open: bool, animate: bool = true) -> void:
	var v := 1.0 if open else 0.0
	if animate:
		create_tween().tween_property(self, "openness", v, 0.6)
	else:
		openness = v


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	if _post:
		for x in [-61.0, 61.0]:
			draw_texture_rect(_post, Rect2(x - 14, -122, 28, 122), false)
	else:
		Ink.rect(self, Rect2(-70, -110, 18, 110), Palette.WOOD)
		Ink.rect(self, Rect2(52, -110, 18, 110), Palette.WOOD)
	var p := PackedVector2Array()
	for i in 13:
		var k := i / 12.0
		var across := Vector2(lerpf(-61, 61, k), -100 + sin(k * PI) * 30)
		var hang := Vector2(-61 + sin(k * PI * 0.5) * 10, -100 + k * 95)
		p.append(across.lerp(hang, openness))
	draw_polyline(p, Palette.INK.darkened(0.2), 7.0, true)
	draw_polyline(p, Palette.TERRA, 4.5, true)
