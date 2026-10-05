class_name Quay
extends Node2D
## Stone quay floor in perspective: slab rows that grow towards the viewer, per-slab tone variation,
## a lit curb along the water and iron bollards.

const SLAB := Color("#EADFCC")
const CURB := Color("#F4ECDD")
const IRON := Color("#3C3346")

@export var top_y := 760.0
@export var bollards: PackedFloat32Array = PackedFloat32Array([560.0, 1620.0])
@export var with_curb := true


func _draw() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 21
	var ys := [top_y, top_y + 26, top_y + 60, top_y + 104, top_y + 160, top_y + 230, top_y + 320, 1100.0]
	for r in ys.size() - 1:
		var y0: float = ys[r]
		var y1: float = ys[r + 1]
		var w := 120.0 + r * 48.0
		var off := fmod(r * w * 0.5, w)
		var x := -off
		while x < 1920.0:
			var tone := rng.randf_range(-0.035, 0.035)
			var c := SLAB.lightened(tone) if tone > 0 else SLAB.darkened(-tone)
			draw_rect(Rect2(x, y0, w, y1 - y0), c)
			draw_rect(Rect2(x, y0, w, y1 - y0), Color(Palette.INK, 0.22), false, 2.0)
			if rng.randf() < 0.25:
				var cx := x + rng.randf_range(10, w - 30)
				var cy := rng.randf_range(y0 + 4, y1 - 6)
				draw_line(Vector2(cx, cy), Vector2(cx + rng.randf_range(10, 26), cy + rng.randf_range(-3, 3)), Color(Palette.INK, 0.12), 1.5)
			x += w
	if with_curb:
		draw_rect(Rect2(0, top_y - 4, 1920, 18), CURB)
		draw_line(Vector2(0, top_y + 14), Vector2(1920, top_y + 14), Color(Palette.INK, 0.5), 2.0)
		draw_line(Vector2(0, top_y - 4), Vector2(1920, top_y - 4), Palette.INK, 4.0)
		for bx in bollards:
			_bollard(Vector2(bx, top_y + 8))


func _bollard(p: Vector2) -> void:
	Ink.poly(self, Ink.pts([p.x - 14, p.y, p.x + 14, p.y, p.x + 11, p.y - 30, p.x - 11, p.y - 30]), IRON, 2.5)
	var cap := Ink.pts([p.x - 19, p.y - 30, p.x + 19, p.y - 30, p.x + 15, p.y - 40, p.x - 15, p.y - 40])
	Ink.poly(self, cap, IRON.lightened(0.15), 2.5)
	draw_line(p + Vector2(-7, -36), p + Vector2(-7, -4), Color(1, 1, 1, 0.18), 2.0)
