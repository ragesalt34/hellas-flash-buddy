class_name Ship
extends Node2D
## Moored island ferry (το πλοίο): two-tone hull with a red boot-top, railings, cabin windows, a mast
## with a fluttering pennant and a funnel that puffs smoke. Bobs on the swell. Origin = waterline centre.

const HIT := Rect2(-330, -320, 660, 330)
const HULL_LOW := Color("#2D4C74")
const HULL_HIGH := Color("#FBF6EE")
const BOOT := Color("#B8403A")

var _t := 0.0
var _puffs: Array = []
var _base_y := NAN    # taken on the first frame: the scene positions the ship after _ready


func _process(delta: float) -> void:
	_t += delta
	if is_nan(_base_y):
		_base_y = position.y
	position.y = _base_y + sin(_t * 1.1) * 3.0
	rotation = sin(_t * 0.8) * 0.006
	if fmod(_t, 0.9) < delta:
		_puffs.append({"p": Vector2(95, -312), "a": 1.0, "r": 10.0})
	for p in _puffs:
		p["p"] += Vector2(-14, -22) * delta
		p["r"] += 9.0 * delta
		p["a"] -= 0.22 * delta
	_puffs = _puffs.filter(func(p): return p["a"] > 0.0)
	queue_redraw()


func _draw() -> void:
	# hull: white upper, blue lower, red boot-top at the waterline
	Ink.poly(self, Ink.pts([-330, -120, 300, -120, 336, -150, 318, -60, 280, 0, -290, 0, -320, -60]), HULL_HIGH)
	Ink.poly(self, Ink.pts([-322, -64, 318, -64, 282, -8, -288, -8]), HULL_LOW, 3.0)
	Ink.poly(self, Ink.pts([-290, -8, 282, -8, 280, 0, -290, 0]), BOOT, 2.0)
	draw_line(Vector2(-326, -96), Vector2(312, -96), Color(Palette.INK, 0.35), 2.0)
	# railing along the main deck
	draw_line(Vector2(-320, -146), Vector2(300, -146), Palette.INK, 2.5)
	for x in range(-316, 300, 22):
		draw_line(Vector2(x, -146), Vector2(x, -120), Color(Palette.INK, 0.7), 1.5)
	# cabin, bridge, windows
	Ink.rect(self, Rect2(-200, -214, 300, 94), HULL_HIGH)
	Ink.poly(self, Ink.pts([100, -214, 120, -224, 120, -130, 100, -120]), Palette.SHADE, 2.5)
	for i in 7:
		var wx := -184.0 + i * 40.0
		Ink.rect(self, Rect2(wx, -190, 26, 22), Palette.SEA_DEEP, 2.0)
		draw_line(Vector2(wx + 4, -186), Vector2(wx + 12, -186), Color(1, 1, 1, 0.5), 2.0)
	Ink.rect(self, Rect2(-150, -268, 190, 54), HULL_HIGH)
	for i in 4:
		Ink.rect(self, Rect2(-138 + i * 44, -256, 32, 20), Palette.SEA_DEEP, 2.0)
	# lifeboat
	Ink.poly(self, Ink.pts([-290, -168, -214, -168, -224, -150, -282, -150]), Color("#E8A33B"), 2.0)
	# funnel
	Ink.poly(self, Ink.pts([70, -330, 120, -330, 112, -214, 78, -214]), HULL_LOW)
	Ink.poly(self, Ink.pts([72, -312, 118, -312, 116, -292, 74, -292]), HULL_HIGH, 2.0)
	# mast + pennant
	draw_line(Vector2(-60, -268), Vector2(-60, -380), Palette.INK, 4.0)
	draw_line(Vector2(-60, -370), Vector2(200, -268), Color(Palette.INK, 0.5), 1.5)
	draw_line(Vector2(-60, -370), Vector2(-318, -146), Color(Palette.INK, 0.5), 1.5)
	var flag := PackedVector2Array()
	for i in 7:
		var k := i / 6.0
		flag.append(Vector2(-60 + k * 54, -378 + k * 8 + sin(_t * 6.0 - k * 4.0) * 4.0 * k))
	for i in range(6, -1, -1):
		var k := i / 6.0
		flag.append(Vector2(-60 + k * 54, -366 + k * 2 + sin(_t * 6.0 - k * 4.0) * 4.0 * k))
	Ink.poly(self, flag, Palette.AZURE, 2.0)
	# smoke
	for p in _puffs:
		draw_circle(p["p"], p["r"], Color(0.95, 0.92, 0.9, p["a"] * 0.8))
