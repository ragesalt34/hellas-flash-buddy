@tool
class_name Picto
extends Control
## Painted document icons; semantic pictograms use a 100×100 design box scaled to the control.
## Meanings in the notebook, inventory items, tooltips. sketch = faded hint-level-3 look.

const ALL := ["port", "ship", "lighthouse", "boat", "sailor", "sack", "suitcase", "box", "guard",
	"passport", "ticket", "exit", "be", "have", "yes", "no"]
const GLYPHS := ["g_m", "g_f", "g_n", "p1", "p2", "p3", "unknown", "book"]
const PAINTED := {"passport": "prop_icon_passport", "ticket": "prop_icon_ticket", "book": "prop_icon_book"}

@export var picto_id := "":
	set(v):
		picto_id = v
		queue_redraw()
@export var sketch := false:
	set(v):
		sketch = v
		queue_redraw()

var _c := Palette.INK
var _image_id := ""
var _image: Texture2D


func _draw() -> void:
	if _image_id != picto_id:
		_image_id = picto_id
		_image = ArtLibrary.tex(PAINTED[picto_id]) if PAINTED.has(picto_id) else null
	if _image:
		var available := size * 0.84
		var image_size := Vector2(_image.get_width(), _image.get_height())
		var fit := minf(available.x / image_size.x, available.y / image_size.y)
		var fitted := image_size * fit
		draw_texture_rect(_image, Rect2((size - fitted) / 2.0, fitted), false, Color(1, 1, 1, 0.38 if sketch else 1.0))
		return
	var s := minf(size.x, size.y) / 100.0
	if s <= 0.0:
		return
	draw_set_transform((size - Vector2(100, 100) * s) / 2.0, 0.0, Vector2(s, s))
	_c = Color(Palette.INK, 0.4) if sketch else Palette.INK
	match picto_id:
		"port":
			_fill([8, 58, 92, 58, 92, 70, 8, 70])
			_fill([41, 40, 53, 40, 52, 58, 42, 58])
			draw_circle(Vector2(47, 40), 8, _c)
			_waves(84)
		"ship":
			_fill([6, 58, 94, 58, 82, 80, 18, 80])
			_ring([30, 38, 68, 38, 68, 58, 30, 58])
			_fill([54, 22, 64, 22, 64, 38, 54, 38])
			_waves(90)
		"lighthouse":
			_ring([40, 88, 60, 88, 56, 34, 44, 34])
			_line([42, 52, 58, 52], 4)
			_line([41, 70, 59, 70], 4)
			_fill([42, 22, 58, 22, 58, 34, 42, 34])
			_fill([40, 22, 60, 22, 50, 10])
			_line([18, 24, 34, 27], 4)
			_line([66, 27, 82, 24], 4)
		"boat":
			_fill([12, 62, 88, 62, 74, 80, 26, 80])
			_line([50, 62, 50, 16])
			_ring([54, 18, 54, 58, 82, 58])
			_waves(90)
		"sailor":
			_person(50, 26, 1.4)
			for y in [56, 66, 76]:
				draw_line(Vector2(37, y), Vector2(63, y), Palette.PAPER, 3.0)
			_fill([38, 14, 62, 14, 58, 6, 42, 6])
		"sack":
			_fill([30, 88, 70, 88, 80, 62, 64, 34, 36, 34, 20, 62])
			_fill([42, 22, 58, 22, 55, 36, 45, 36])
			_line([36, 32, 50, 40, 64, 32], 4)
		"suitcase":
			_ring([16, 38, 84, 38, 84, 84, 16, 84])
			_line([38, 38, 38, 26, 62, 26, 62, 38])
			_line([36, 38, 36, 84], 4)
			_line([64, 38, 64, 84], 4)
		"box":
			_ring([22, 34, 78, 34, 78, 86, 22, 86])
			_line([22, 34, 34, 20])
			_line([78, 34, 66, 20])
			_line([50, 34, 50, 86], 4)
		"guard":
			_person(50, 28, 1.4)
			_fill([36, 18, 64, 18, 62, 6, 38, 6])
			_fill([33, 18, 67, 18, 67, 23, 33, 23])
			draw_circle(Vector2(44, 56), 4, Palette.PAPER)
		"passport":
			_fill([28, 12, 72, 12, 72, 88, 28, 88])
			draw_arc(Vector2(50, 42), 11, 0, TAU, 24, Palette.PAPER, 3.0, true)
			draw_line(Vector2(38, 70), Vector2(62, 70), Palette.PAPER, 3.0)
		"ticket":
			_ring([12, 34, 88, 34, 88, 66, 12, 66])
			for y in range(37, 64, 8):
				draw_line(Vector2(66, y), Vector2(66, y + 4), _c, 3.0)
			_line([20, 44, 56, 44], 3)
			_line([20, 54, 48, 54], 3)
		"exit":
			_ring([18, 14, 50, 14, 50, 88, 18, 88])
			draw_circle(Vector2(44, 52), 3, _c)
			_line([58, 52, 86, 52], 6)
			_fill([80, 42, 94, 52, 80, 62])
		"be":
			_person(26, 26, 1.2)
			_line([44, 46, 58, 46], 5)
			_line([44, 58, 58, 58], 5)
			draw_arc(Vector2(76, 26), 10, 0, TAU, 24, _c, 4.0, true)
			_ring([64, 40, 88, 40, 85, 76, 67, 76], 4)
		"have":
			_person(22, 26, 1.2)
			_line([32, 52, 54, 44], 5)
			_line([56, 50, 56, 38, 78, 38, 78, 50], 4)
			_fill([48, 50, 86, 50, 82, 88, 52, 88])
		"yes":
			_line([18, 52, 40, 74, 84, 26], 10)
		"no":
			_line([22, 22, 78, 78], 10)
			_line([78, 22, 22, 78], 10)
		"g_m":
			_fill([44, 40, 56, 40, 56, 92, 44, 92])
			draw_circle(Vector2(50, 24), 14, _c)
			for i in 8:
				var a := TAU * i / 8.0
				draw_line(Vector2(50, 24) + Vector2.from_angle(a) * 18, Vector2(50, 24) + Vector2.from_angle(a) * 24, _c, 3.0)
		"g_f":
			draw_arc(Vector2(50, 50), 32, 0, TAU, 40, _c, 6.0, true)
			_line([26, 54, 34, 46, 42, 54, 50, 46, 58, 54, 66, 46, 74, 54], 4)
		"g_n":
			_fill([24, 24, 76, 24, 76, 76, 24, 76])
			draw_line(Vector2(30, 42), Vector2(70, 42), Palette.PAPER, 3.0)
			draw_line(Vector2(30, 58), Vector2(70, 58), Palette.PAPER, 3.0)
		"p1":
			_person(30, 26, 1.3)
			_line([92, 52, 58, 52], 5)
			_fill([50, 52, 62, 44, 62, 60])
		"p2":
			_person(20, 30, 1.0)
			_line([34, 52, 62, 52], 5)
			_fill([70, 52, 60, 44, 60, 60])
			draw_arc(Vector2(82, 30), 9, 0, TAU, 20, _c, 3.0, true)
			_ring([70, 42, 94, 42, 91, 72, 73, 72], 3)
		"p3":
			_person(16, 40, 0.8)
			_person(36, 40, 0.8)
			_line([26, 26, 70, 22, 80, 36], 4)
			_fill([74, 36, 86, 34, 82, 46])
			draw_arc(Vector2(84, 56), 8, 0, TAU, 20, _c, 3.0, true)
			_ring([74, 66, 94, 66, 91, 92, 77, 92], 3)
		"book":
			_ring([8, 24, 47, 30, 47, 84, 8, 78])
			_ring([53, 30, 92, 24, 92, 78, 53, 84])
			for y in [44, 56, 68]:
				_line([16, y - 4, 40, y], 3)
				_line([60, y, 84, y - 4], 3)
		"unknown":
			draw_string(ThemeDB.fallback_font, Vector2(30, 80), "?", HORIZONTAL_ALIGNMENT_LEFT, -1, 80, Color(_c, 0.5))


func _person(x: float, y: float, k: float) -> void:
	draw_circle(Vector2(x, y), 9.0 * k, _c)
	_fill([x - 12 * k, y + 12 * k, x + 12 * k, y + 12 * k, x + 9 * k, y + 42 * k, x - 9 * k, y + 42 * k])


func _fill(flat: Array) -> void:
	draw_colored_polygon(Ink.pts(flat), _c)


func _line(flat: Array, w: float = 5.0) -> void:
	draw_polyline(Ink.pts(flat), _c, w, true)


func _ring(flat: Array, w: float = 5.0) -> void:
	var p := Ink.pts(flat)
	p.append(p[0])
	draw_polyline(p, _c, w, true)


func _waves(y: float) -> void:
	_line([8, y, 20, y - 6, 32, y, 44, y - 6, 56, y, 68, y - 6, 80, y, 92, y - 6], 4)
