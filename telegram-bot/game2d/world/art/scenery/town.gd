class_name Town
extends Node2D
## A Cycladic hillside town drawn in code: ochre hill, white cubic houses lit from the left (pink shade
## side with ink hatching, as in Chants of Sennaar), blue doors and windows, a domed chapel, cypresses
## and bougainvillea. Origin = bottom-left of the hill (on the horizon). Deterministic per seed.

const WALL := Color("#FBF6EE")
const ROOF := Color("#FFFDF8")
const SIDE := Color("#EFC3B8")
const HATCH := Color(0.62, 0.30, 0.38, 0.35)
const BLUE := Color("#2F6FA8")
const DEEP := Color("#24507E")
const HILL := Color("#E5CFA6")
const HILL_SHADE := Color("#D9B98E")
const CYPRESS := Color("#4C6B4A")
const BOUGAIN := Color("#D8609C")

@export var town_seed := 11
@export var width := 780.0
@export var hill: PackedVector2Array = Ink.pts([0, 0, 0, -150, 110, -205, 300, -240, 470, -222, 620, -160, 780, -50, 780, 0])

var _houses: Array = []
var _trees: Array = []


func _ready() -> void:
	_layout()


func _layout() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = town_seed
	_houses.clear()
	_trees.clear()
	var row_y := -150.0
	while row_y <= 0.0:
		var x := 10.0 + rng.randf_range(0.0, 40.0)
		while x < width - 40.0:
			var w := rng.randf_range(46.0, 88.0)
			var h := rng.randf_range(34.0, 62.0)
			if _hill_top(x) < row_y - h + 6.0 and _hill_top(x + w + 18.0) < row_y - h + 6.0 and rng.randf() < 0.82:
				_houses.append({"x": x, "y": row_y, "w": w, "h": h, "door": rng.randf() < 0.45,
					"win": rng.randi_range(1, 2), "flower": rng.randf() < 0.18})
			x += w + rng.randf_range(4.0, 26.0)
		row_y += rng.randf_range(34.0, 44.0)
	for i in 7:
		var tx := rng.randf_range(20.0, width - 40.0)
		_trees.append(Vector2(tx, _hill_top(tx) + rng.randf_range(30.0, 110.0)))
	queue_redraw()


func _hill_top(x: float) -> float:
	for i in range(1, hill.size() - 1):
		var a := hill[i]
		var b := hill[i + 1]
		if x >= a.x and x <= b.x and b.x > a.x:
			return lerpf(a.y, b.y, (x - a.x) / (b.x - a.x))
	return 0.0


func _draw() -> void:
	Ink.poly(self, hill, HILL, 3.0)
	# shaded right flank of the hill with hatching
	var flank := Ink.pts([470, -222, 620, -160, 780, -50, 780, 0, 560, 0])
	draw_colored_polygon(flank, HILL_SHADE)
	for k in 22:
		var x0 := 480.0 + k * 14.0
		draw_line(Vector2(x0, _hill_top(x0) + 6.0), Vector2(x0 - 30.0, minf(0.0, _hill_top(x0) + 60.0)), HATCH, 1.5)
	_chapel(Vector2(270, -236))
	for hs in _houses:
		_house(hs)
	for t in _trees:
		_cypress(t)


func _house(hs: Dictionary) -> void:
	var x: float = hs["x"]
	var y: float = hs["y"]
	var w: float = hs["w"]
	var h: float = hs["h"]
	var d := 16.0
	var lift := d * 0.6
	var top := Ink.pts([x, y - h, x + d, y - h - lift, x + w + d, y - h - lift, x + w, y - h])
	var side := Ink.pts([x + w, y - h, x + w + d, y - h - lift, x + w + d, y - lift, x + w, y])
	Ink.poly(self, side, SIDE, 2.0)
	var j := 1
	while y - j * 6.0 > y - h + 2.0:
		draw_line(Vector2(x + w + 1.0, y - j * 6.0), Vector2(x + w + d - 1.0, y - j * 6.0 - lift + 1.0), HATCH, 1.2)
		j += 1
	Ink.poly(self, top, ROOF, 2.0)
	Ink.rect(self, Rect2(x, y - h, w, h), WALL, 2.0)
	var wins: int = hs["win"]
	for i in wins:
		var wx := x + w * (0.22 + 0.42 * i)
		Ink.rect(self, Rect2(wx, y - h * 0.72, 10, 12), BLUE, 1.5)
	if hs["door"]:
		var dx := x + w * 0.62
		var door := Ink.pts([dx, y, dx, y - 20, dx + 6, y - 25, dx + 12, y - 20, dx + 12, y])
		Ink.poly(self, door, DEEP, 1.5)
	if hs["flower"]:
		for k in 5:
			draw_circle(Vector2(x + 4.0 + k * 5.0, y - h + 4.0 + (k % 2) * 4.0), 5.0, BOUGAIN)


func _chapel(base: Vector2) -> void:
	var w := 70.0
	var h := 58.0
	Ink.poly(self, Ink.pts([base.x + w, base.y - h, base.x + w + 16, base.y - h - 10, base.x + w + 16, base.y - 10, base.x + w, base.y]), SIDE, 2.0)
	Ink.rect(self, Rect2(base.x, base.y - h, w, h), WALL, 2.0)
	var dome := PackedVector2Array()
	for i in 17:
		var a := PI + PI * i / 16.0
		dome.append(base + Vector2(w / 2.0, -h) + Vector2(cos(a) * 28.0, sin(a) * 30.0))
	Ink.poly(self, dome, BLUE, 2.0)
	var top := base + Vector2(w / 2.0, -h - 30.0)
	draw_line(top, top + Vector2(0, -18), Palette.INK, 3.0)
	draw_line(top + Vector2(-7, -12), top + Vector2(7, -12), Palette.INK, 3.0)
	var door := Ink.pts([base.x + 27, base.y, base.x + 27, base.y - 24, base.x + 35, base.y - 31, base.x + 43, base.y - 24, base.x + 43, base.y])
	Ink.poly(self, door, DEEP, 1.5)


func _cypress(p: Vector2) -> void:
	var pts := PackedVector2Array()
	for i in 16:
		var a := TAU * i / 16.0
		pts.append(p + Vector2(cos(a) * 9.0, sin(a) * 34.0 - 30.0))
	Ink.poly(self, pts, CYPRESS, 2.0)
	draw_line(p + Vector2(2, -52), p + Vector2(2, -8), Color(1, 1, 1, 0.12), 2.0)
