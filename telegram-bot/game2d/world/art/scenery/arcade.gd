class_name Arcade
extends Node2D
## Customs courtyard: sky strip, whitewashed wall with a Greek-key (meander) frieze, deep arches between
## columns (hatched inner shade), blue shuttered windows, climbing bougainvillea, potted lemon trees,
## and a terracotta/cream tiled floor in perspective.

const WALL := Color("#F8F1E6")
const SHADOW := Color("#EBC9BD")
const HATCH := Color(0.62, 0.30, 0.38, 0.32)
const BLUE := Color("#2F6FA8")
const TILE_A := Color("#E6BFA0")
const TILE_B := Color("#F3E6D2")
const LEAF := Color("#5E7F4E")
const LEMON := Color("#F2C94C")

@export var floor_y := 760.0
const ARCHES := [240.0, 720.0, 1680.0]


func _ready() -> void:
	var sky := ColorRect.new()
	sky.size = Vector2(1920, 180)
	sky.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sm := ShaderMaterial.new()
	sm.shader = load("res://world/art/shaders/sky.gdshader")
	sm.set_shader_parameter("aspect", 1920.0 / 180.0)
	sm.set_shader_parameter("sun_uv", Vector2(0.2, 0.55))
	sky.material = sm
	add_child(sky)
	move_child(sky, 0)
	var clouds := Clouds.new()
	clouds.area = Rect2(0, 20, 1920, 120)
	clouds.count = 3
	add_child(clouds)


func _draw() -> void:
	draw_rect(Rect2(0, 180, 1920, floor_y - 180), WALL)
	_frieze(180.0)
	for cx in ARCHES:
		_arch(cx)
	_window(Vector2(1180, 300))
	_window(Vector2(1420, 300))
	_bougainvillea(Vector2(1000, 250))
	_tiles()
	_pot(Vector2(470, floor_y + 30))
	_pot(Vector2(1910, floor_y + 30))


func _frieze(y: float) -> void:
	Ink.rect(self, Rect2(-10, y, 1940, 46), Color("#E4D3BC"), 3.0)
	var x := 0.0
	while x < 1920.0:
		draw_polyline(Ink.pts([x, y + 38, x, y + 8, x + 30, y + 8, x + 30, y + 30, x + 12, y + 30, x + 12, y + 18, x + 22, y + 18]), BLUE, 3.0)
		draw_line(Vector2(x, y + 38), Vector2(x + 40, y + 38), BLUE, 3.0)
		x += 40.0
	Ink.rect(self, Rect2(-10, y + 46, 1940, 10), WALL.darkened(0.05), 2.0)


func _arch(cx: float) -> void:
	var w := 250.0
	var top := 300.0
	var left := cx - w / 2.0
	var p := PackedVector2Array([Vector2(left, floor_y)])
	for i in 17:
		var a := PI + PI * i / 16.0
		p.append(Vector2(cx + cos(a) * w / 2.0, top + w / 2.0 + sin(a) * w / 2.0))
	p.append(Vector2(left + w, floor_y))
	draw_colored_polygon(p, SHADOW)
	var y := top + 20.0
	while y < floor_y:
		draw_line(Vector2(left + 8, y + 20), Vector2(left + 40, y), HATCH, 1.4)
		y += 11.0
	draw_colored_polygon(Ink.pts([left + 40, floor_y, left + 40, top + w / 2.0, cx + w / 2.0, top + w / 2.0, cx + w / 2.0, floor_y]), SHADOW.lightened(0.25))
	var closed := p.duplicate()
	closed.append(p[0])
	draw_polyline(closed, Palette.INK, 3.0, true)
	for side in [left - 34.0, left + w + 4.0]:
		Ink.rect(self, Rect2(side, top + 40, 30, floor_y - top - 40), WALL, 3.0)
		Ink.rect(self, Rect2(side - 6, top + 26, 42, 16), WALL.darkened(0.06), 2.5)
		draw_line(Vector2(side + 22, top + 46), Vector2(side + 22, floor_y - 4), Color(0.62, 0.30, 0.38, 0.25), 3.0)


func _window(p: Vector2) -> void:
	Ink.rect(self, Rect2(p.x - 50, p.y, 100, 130), Color("#3A4E6A"), 3.0)
	for sx in [p.x - 90.0, p.x + 50.0]:      # open shutters on both sides
		Ink.rect(self, Rect2(sx, p.y - 4, 40, 138), BLUE, 3.0)
		for k in 9:
			var yy: float = p.y + 8.0 + k * 14.0
			draw_line(Vector2(sx + 4.0, yy), Vector2(sx + 36.0, yy), Color(1, 1, 1, 0.3), 2.0)
	Ink.rect(self, Rect2(p.x - 60, p.y + 130, 120, 12), WALL.darkened(0.06), 2.5)


func _bougainvillea(p: Vector2) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 41
	draw_polyline(Ink.pts([p.x, floor_y, p.x + 10, p.y + 300, p.x - 20, p.y + 160, p.x + 30, p.y + 40, p.x + 120, p.y]), Color("#7A5A3C"), 5.0, true)
	for i in 70:
		var q := p + Vector2(rng.randf_range(-70, 180), rng.randf_range(-20, 200))
		draw_circle(q, rng.randf_range(6, 12), LEAF if rng.randf() < 0.35 else Palette.HAZE_LIGHT.lerp(Palette.HAZE_DEEP, rng.randf() * 0.5))


func _tiles() -> void:
	var ys := [floor_y, floor_y + 24, floor_y + 54, floor_y + 92, floor_y + 140, floor_y + 202, floor_y + 280, 1080.0]
	for r in ys.size() - 1:
		var y0: float = ys[r]
		var y1: float = ys[r + 1]
		var w := 70.0 + r * 30.0
		var off := fmod(r * w * 0.5, w)
		var x := -off
		var k := 0
		while x < 1920.0:
			draw_rect(Rect2(x, y0, w, y1 - y0), TILE_A if (k + r) % 2 == 0 else TILE_B)
			draw_rect(Rect2(x, y0, w, y1 - y0), Color(Palette.INK, 0.2), false, 1.5)
			x += w
			k += 1
	draw_line(Vector2(0, floor_y), Vector2(1920, floor_y), Palette.INK, 4.0)


func _pot(p: Vector2) -> void:
	draw_line(p + Vector2(0, -50), p + Vector2(0, -130), Color("#7A5A3C"), 6.0)
	var rng := RandomNumberGenerator.new()
	rng.seed = int(p.x)
	for i in 26:
		draw_circle(p + Vector2(rng.randf_range(-60, 60), rng.randf_range(-210, -120)), rng.randf_range(12, 22), LEAF.darkened(rng.randf() * 0.2))
	for i in 7:
		draw_circle(p + Vector2(rng.randf_range(-50, 50), rng.randf_range(-200, -130)), 7.0, LEMON)
	Ink.poly(self, Ink.pts([p.x - 44, p.y - 50, p.x + 44, p.y - 50, p.x + 32, p.y, p.x - 32, p.y]), Palette.TERRA, 3.0)
	Ink.rect(self, Rect2(p.x - 50, p.y - 60, 100, 12), Palette.TERRA.lightened(0.1), 2.5)
