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
	Ink.poly(self, Ink.pts([-W / 2, 40, W / 2, 40, W / 2 - 40, -200, -W / 2 + 40, -200]), Color("#5A4A55"))
	for i in 6:
		var y := 40.0 - fmod(i * 40.0 + _scroll, 240.0)
		var hw := W / 2.0 - 40.0 * (40.0 - y) / 240.0
		draw_line(Vector2(-hw, y), Vector2(hw, y), Color(Palette.PAPER, 0.35), 3.0)
	var c := Vector2(0, -300)
	match gender:
		"m":
			Ink.rect(self, Rect2(c + Vector2(-48, -82), Vector2(96, 164)), col, 5.0)
		"f":
			Ink.circle(self, c, 76, col, 5.0)
		_:
			Ink.rect(self, Rect2(c + Vector2(-76, -76), Vector2(152, 152)), col, 5.0)
	var font := Fonts.greek()
	var art: String = ARTICLE[gender]
	var sz := font.get_string_size(art, HORIZONTAL_ALIGNMENT_LEFT, -1, 80)
	draw_string(font, c + Vector2(-sz.x / 2.0, sz.y * 0.32), art, HORIZONTAL_ALIGNMENT_LEFT, -1, 80, Palette.PAPER)
	if _pulse:
		draw_arc(c, 100, 0, TAU, 48, Color(Palette.HAZE_DEEP, 0.4 + 0.4 * sin(_t * 6.0)), 6.0, true)
