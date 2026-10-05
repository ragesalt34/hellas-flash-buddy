class_name Belt
extends Node2D
## Conveyor belt running into the back wall, under a big class sign: Ο (amber, tall), Η (azure,
## round), ΤΟ (terracotta, square) — the same affordances as the notebook frames.

const W := 220.0
const ARTICLE := {"m": "Ο", "f": "Η", "n": "ΤΟ"}

var gender := "m"
var _pulse := false
var _t := 0.0
var _scroll := 0.0


func drop_rect() -> Rect2:
	return Rect2(global_position + Vector2(-W / 2.0 - 20.0, -380.0), Vector2(W + 40.0, 440.0))


func set_pulse(on: bool) -> void:
	_pulse = on


func flash() -> void:
	var t := create_tween()
	t.tween_property(self, "modulate", Palette.gender_color(gender).lightened(0.4), 0.12)
	t.tween_property(self, "modulate", Color.WHITE, 0.3)


func _process(delta: float) -> void:
	_t += delta
	_scroll = fmod(_scroll + delta * 60.0, 40.0)
	queue_redraw()


func _draw() -> void:
	var col := Palette.gender_color(gender)
	var wood := Color("#9A6B47")
	# opening in the wall the chute runs into
	Ink.poly(self, Ink.pts([-W / 2 + 30, -196, W / 2 - 30, -196, W / 2 - 30, -246, 0, -270, -W / 2 + 30, -246]), Color("#4A3A40"), 3.0)
	# chute: canvas belt between wooden rails, perspective towards the wall
	Ink.poly(self, Ink.pts([-W / 2, 40, W / 2, 40, W / 2 - 40, -200, -W / 2 + 40, -200]), Color("#D7C4A0"))
	for i in 7:
		var y := 40.0 - fmod(i * 36.0 + _scroll, 240.0)
		var hw := W / 2.0 - 40.0 * (40.0 - y) / 240.0
		draw_line(Vector2(-hw, y), Vector2(hw, y), Color(Palette.INK, 0.22), 3.0)
	for sgn in [-1.0, 1.0]:
		Ink.poly(self, Ink.pts([sgn * W / 2, 40, sgn * (W / 2 + 18), 40, sgn * (W / 2 - 26), -200, sgn * (W / 2 - 40), -200]), wood, 2.5)
		for k in 4:
			var t := k / 3.0
			draw_circle(Vector2(sgn * lerpf(W / 2 + 9, W / 2 - 33, t), lerpf(30, -190, t)), 3.0, Palette.INK)
	for sgn in [-1.0, 1.0]:
		Ink.rect(self, Rect2(sgn * (W / 2 + 4) - 7, 40, 14, 40), wood.darkened(0.2), 2.0)
	# enamel plaque hanging on chains from the ceiling beam
	var c := Vector2(0, -300)
	for cx in [-34.0, 34.0]:
		var top := Vector2(cx, -618)
		var bottom := c + Vector2(cx, -80)
		var n := 12
		for i in n:
			var a1 := top.lerp(bottom, float(i) / n)
			draw_arc(a1 + (bottom - top) / n * 0.5, 5.0, 0, TAU, 8, Color(Palette.INK, 0.8), 1.6, true)
	match gender:
		"m":
			Ink.rect(self, Rect2(c + Vector2(-50, -84), Vector2(100, 168)), col, 4.0)
			draw_rect(Rect2(c + Vector2(-40, -74), Vector2(80, 148)), Color(1, 1, 1, 0.55), false, 3.0)
		"f":
			Ink.circle(self, c, 78, col, 4.0)
			draw_arc(c, 66, 0, TAU, 48, Color(1, 1, 1, 0.55), 3.0, true)
		_:
			Ink.rect(self, Rect2(c + Vector2(-78, -78), Vector2(156, 156)), col, 4.0)
			draw_rect(Rect2(c + Vector2(-66, -66), Vector2(132, 132)), Color(1, 1, 1, 0.55), false, 3.0)
	draw_line(c + Vector2(-30, -60), c + Vector2(-8, -70), Color(1, 1, 1, 0.35), 4.0)
	var font := Fonts.greek()
	var art: String = ARTICLE[gender]
	var sz := font.get_string_size(art, HORIZONTAL_ALIGNMENT_LEFT, -1, 80)
	draw_string(font, c + Vector2(-sz.x / 2.0, sz.y * 0.32), art, HORIZONTAL_ALIGNMENT_LEFT, -1, 80, Palette.PAPER)
	if _pulse:
		draw_arc(c, 104, 0, TAU, 48, Color(Palette.HAZE_DEEP, 0.4 + 0.4 * sin(_t * 6.0)), 6.0, true)
