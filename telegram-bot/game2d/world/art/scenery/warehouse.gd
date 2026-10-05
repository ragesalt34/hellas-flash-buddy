class_name WarehouseInterior
extends Node2D
## Port warehouse interior: coursed stone back wall, two arched openings onto sky and sea, a timber
## ceiling, hanging lamps, shelves with amphorae and sacks, slanting light shafts with drifting dust,
## and a plank floor in perspective. Everything behind the actors.

const WALL := Color("#EAD9C3")
const JOINT := Color(0.5, 0.33, 0.3, 0.16)
const BEAM := Color("#8F6646")
const BEAM_DARK := Color("#6E4C35")
const PLANK := Color("#D9B98E")
const AMPHORA := Color("#C8643B")
const SACK := Color("#E3CFA4")
const ARCHES := [Rect2(110, 260, 250, 420), Rect2(1600, 260, 250, 420)]

@export var floor_y := 760.0

var _t := 0.0
var _motes: Array = []


func _ready() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 5
	for i in 46:
		_motes.append(Vector3(rng.randf_range(0, 1920), rng.randf_range(200, 900), rng.randf_range(0, TAU)))


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw() -> void:
	draw_rect(Rect2(0, 0, 1920, floor_y), WALL)
	_stone_courses()
	for a in ARCHES:
		_arch_opening(a)
	_ceiling()
	_shelves(Vector2(420, 700))
	_light_shafts()
	_planks()
	_lamps()
	_dust()


func _stone_courses() -> void:
	var y := 150.0
	var row := 0
	while y < floor_y:
		draw_line(Vector2(0, y), Vector2(1920, y), JOINT, 2.0)
		var x := 40.0 if row % 2 == 0 else 110.0
		while x < 1920.0:
			draw_line(Vector2(x, y), Vector2(x, y + 46), JOINT, 2.0)
			x += 140.0
		y += 46.0
		row += 1


func _arch_pts(r: Rect2) -> PackedVector2Array:
	var p := PackedVector2Array([Vector2(r.position.x, r.end.y)])
	var cx := r.get_center().x
	var rad := r.size.x / 2.0
	for i in 17:
		var a := PI + PI * i / 16.0
		p.append(Vector2(cx + cos(a) * rad, r.position.y + rad + sin(a) * rad))
	p.append(r.end)
	return p


func _arch_opening(r: Rect2) -> void:
	var outer := r.grow(18)
	Ink.poly(self, _arch_pts(outer), WALL.darkened(0.06), 3.0)
	var hole := _arch_pts(r)
	# sky and sea seen through the opening
	draw_colored_polygon(hole, Color("#F8D9C9"))
	var horizon := r.position.y + r.size.y * 0.62
	draw_rect(Rect2(r.position.x, horizon, r.size.x, r.end.y - horizon), Palette.SEA)
	for i in 4:
		var yy := horizon + 16.0 + i * 22.0
		draw_line(Vector2(r.position.x + 20 + sin(_t + i) * 8.0, yy), Vector2(r.position.x + 90 + sin(_t + i) * 8.0, yy), Color(1, 1, 1, 0.45), 2.0)
	draw_line(Vector2(r.position.x, horizon), Vector2(r.end.x, horizon), Color(Palette.INK, 0.5), 2.0)
	# shaded right jamb with hatching
	draw_colored_polygon(Ink.pts([r.end.x - 22, r.position.y + r.size.x * 0.5, r.end.x, r.position.y + r.size.x * 0.5, r.end.x, r.end.y, r.end.x - 22, r.end.y]), Palette.SHADE)
	var y := r.position.y + r.size.x * 0.5 + 8.0
	while y < r.end.y:
		draw_line(Vector2(r.end.x - 20, y + 10), Vector2(r.end.x - 2, y), Color(0.62, 0.30, 0.38, 0.3), 1.2)
		y += 9.0
	var closed := hole.duplicate()
	closed.append(hole[0])
	draw_polyline(closed, Palette.INK, 3.0, true)


func _ceiling() -> void:
	Ink.rect(self, Rect2(-10, 0, 1940, 120), BEAM_DARK.lightened(0.25), 0.0)
	for i in 12:
		var x := -40.0 + i * 180.0
		Ink.poly(self, Ink.pts([x, 0, x + 34, 0, x + 64, 120, x + 30, 120]), BEAM, 2.0)
	Ink.rect(self, Rect2(-10, 108, 1940, 34), BEAM, 3.0)
	draw_line(Vector2(0, 116), Vector2(1920, 116), Color(1, 1, 1, 0.15), 2.0)
	for x in [40.0, 720.0, 1870.0]:
		Ink.rect(self, Rect2(x, 142, 36, floor_y - 142), BEAM, 3.0)
		draw_line(Vector2(x + 8, 150), Vector2(x + 8, floor_y - 6), Color(1, 1, 1, 0.15), 2.0)


func _shelves(base: Vector2) -> void:
	for k in 3:
		var y := base.y - k * 110.0
		Ink.rect(self, Rect2(base.x - 10, y, 220, 14), BEAM, 2.0)
		for j in 4:
			var p := Vector2(base.x + 20 + j * 52, y)
			if (j + k) % 2 == 0:
				_amphora(p)
			else:
				_sack(p)


func _amphora(p: Vector2) -> void:
	var body := PackedVector2Array()
	for i in 13:
		var a := PI * 0.15 + PI * 1.7 * i / 12.0
		body.append(p + Vector2(sin(a) * 18.0, -40.0 - cos(a) * 34.0))
	Ink.poly(self, body, AMPHORA, 2.0)
	Ink.rect(self, Rect2(p.x - 6, p.y - 90, 12, 18), AMPHORA.darkened(0.1), 2.0)
	draw_arc(p + Vector2(-12, -76), 8.0, PI * 0.5, PI * 1.5, 8, Palette.INK, 2.0, true)
	draw_arc(p + Vector2(12, -76), 8.0, -PI * 0.5, PI * 0.5, 8, Palette.INK, 2.0, true)
	draw_line(p + Vector2(-14, -44), p + Vector2(14, -44), Color(Palette.INK, 0.4), 2.0)


func _sack(p: Vector2) -> void:
	Ink.poly(self, Ink.pts([p.x - 20, p.y, p.x + 20, p.y, p.x + 22, p.y - 40, p.x + 10, p.y - 58, p.x - 12, p.y - 58, p.x - 22, p.y - 38]), SACK, 2.0)
	draw_line(p + Vector2(-10, -54), p + Vector2(10, -54), Palette.INK, 2.0)


func _light_shafts() -> void:
	var a := 0.10 + 0.03 * sin(_t * 0.7)
	for r in ARCHES:
		var top_l := Vector2(r.position.x + 30, r.position.y + 60)
		var top_r := Vector2(r.end.x - 20, r.position.y + 60)
		var shaft := PackedVector2Array([top_l, top_r, top_r + Vector2(260, floor_y + 160 - top_r.y), top_l + Vector2(200, floor_y + 160 - top_l.y)])
		draw_colored_polygon(shaft, Color(1.0, 0.96, 0.84, a))


func _planks() -> void:
	draw_rect(Rect2(0, floor_y, 1920, 1080 - floor_y), PLANK)
	var ys := [floor_y, floor_y + 22, floor_y + 50, floor_y + 86, floor_y + 132, floor_y + 192, floor_y + 268, 1080.0]
	var rng := RandomNumberGenerator.new()
	rng.seed = 33
	for i in ys.size() - 1:
		var y0: float = ys[i]
		var y1: float = ys[i + 1]
		draw_rect(Rect2(0, y0, 1920, y1 - y0), PLANK.darkened(rng.randf_range(0.0, 0.08)))
		draw_line(Vector2(0, y0), Vector2(1920, y0), Color(Palette.INK, 0.35), 2.0)
		var x := rng.randf_range(0, 300)
		while x < 1920:
			draw_line(Vector2(x, y0), Vector2(x, y1), Color(Palette.INK, 0.25), 2.0)
			x += rng.randf_range(260, 520)
	draw_line(Vector2(0, floor_y), Vector2(1920, floor_y), Palette.INK, 4.0)


func _lamps() -> void:
	for x in [1110.0, 1410.0, 560.0]:
		draw_line(Vector2(x, 142), Vector2(x, 200), Palette.INK, 2.0)
		var glow := 0.16 + 0.04 * sin(_t * 2.3 + x)
		draw_circle(Vector2(x, 222), 46.0, Color(1.0, 0.92, 0.65, glow))
		Ink.poly(self, Ink.pts([x - 22, 214, x + 22, 214, x + 12, 198, x - 12, 198]), BEAM_DARK, 2.0)
		Ink.rect(self, Rect2(x - 9, 214, 18, 18), Color("#FFE4A0"), 2.0)


func _dust() -> void:
	for m in _motes:
		var p := Vector2(m.x + sin(_t * 0.3 + m.z) * 20.0, fmod(m.y - _t * 6.0 + 2000.0, 900.0) + 150.0)
		draw_circle(p, 1.8, Color(1, 0.97, 0.88, 0.45))
