@tool
class_name Backdrop
extends Node2D
## Painted backdrop: sky in paper→shade bands with a magenta haze, per-style scenery, then the stone
## floor with a faint ink tile grid (Chants look). Always the first child of a level scene.

@export_enum("pier", "warehouse", "customs") var style := "pier":
	set(v):
		style = v
		queue_redraw()
@export var floor_y := 760.0


func _draw() -> void:
	var bands := 10
	for i in bands:
		var c := Palette.PAPER.lerp(Palette.SHADE, 0.8 * i / (bands - 1))
		draw_rect(Rect2(0, floor_y * i / bands, 1920, floor_y / bands + 1.0), c)
	match style:
		"pier":
			_pier()
		"warehouse":
			_warehouse()
		"customs":
			_customs()
	draw_rect(Rect2(0, floor_y, 1920, 1080 - floor_y), Palette.STONE)
	var grid := Color(Palette.INK, 0.10)
	for x in range(-480, 2400, 120):
		draw_line(Vector2(x, floor_y), Vector2(x + (x - 960) * 0.35, 1080), grid, 2.0)
	for y in [800.0, 860.0, 940.0, 1040.0]:
		draw_line(Vector2(0, y), Vector2(1920, y), grid, 2.0)
	draw_line(Vector2(0, floor_y), Vector2(1920, floor_y), Palette.INK, 5.0)


func _pier() -> void:
	draw_colored_polygon(Ink.pts([0, 472, 0, 420, 240, 400, 520, 440, 780, 380, 1100, 430, 1400, 390, 1700, 430, 1920, 400, 1920, 472]), Color(Palette.HAZE_LIGHT, 0.25))
	draw_rect(Rect2(0, 470, 1920, floor_y - 470), Palette.SEA)
	for i in 6:
		var y := 500.0 + i * 42.0
		var p := PackedVector2Array()
		for x in range(0, 1960, 40):
			p.append(Vector2(x, y + sin(x * 0.02 + i) * 4.0))
		draw_polyline(p, Color(Palette.SEA_DEEP, 0.5), 3.0, true)
	draw_line(Vector2(0, 470), Vector2(1920, 470), Palette.INK, 3.0)


func _warehouse() -> void:
	Ink.rect(self, Rect2(-10, 120, 1940, floor_y - 120), Palette.STONE.lerp(Palette.SHADE, 0.35))
	for i in 5:
		var x := 120.0 + i * 380.0
		Ink.rect(self, Rect2(x, 190, 220, 160), Palette.PAPER.lerp(Palette.SHADE, 0.5))
		draw_line(Vector2(x + 110, 190), Vector2(x + 110, 350), Palette.INK, 3.0)
	for i in 7:
		Ink.rect(self, Rect2(40.0 + i * 310.0, 120, 34, floor_y - 120), Palette.WOOD, 3.0)
	Ink.rect(self, Rect2(-10, 100, 1940, 40), Palette.WOOD, 3.0)


func _customs() -> void:
	Ink.rect(self, Rect2(-10, 160, 1940, floor_y - 160), Palette.PAPER.lerp(Palette.STONE, 0.6))
	for i in 4:
		var cx := 240.0 + i * 480.0
		var arch := PackedVector2Array([Vector2(cx - 120, floor_y)])
		for k in 13:
			arch.append(Vector2(cx - 120 + 240.0 * k / 12.0, 330.0 - sin(PI * k / 12.0) * 90.0))
		arch.append(Vector2(cx + 120, floor_y))
		Ink.poly(self, arch, Palette.SHADE.lerp(Palette.PAPER, 0.3))
	Ink.rect(self, Rect2(-10, 130, 1940, 44), Palette.STONE.darkened(0.08), 3.0)
