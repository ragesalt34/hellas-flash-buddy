@tool
class_name Backdrop
extends Node2D
## Background of a level scene. "pier" is built from layered scenery nodes (shader sky with drifting
## clouds and gulls, distant islands, hillside town, shader sea, stone quay); the other styles are
## still painted in _draw. Always the first child of a level scene.

const HORIZON := 470.0

@export_enum("pier", "warehouse", "customs") var style := "pier":
	set(v):
		style = v
		if is_inside_tree():
			_build()
		queue_redraw()
@export var floor_y := 760.0


func _ready() -> void:
	_build()


func _build() -> void:
	for c in get_children():
		remove_child(c)
		c.queue_free()
	if style == "pier":
		_build_pier()


func _build_pier() -> void:
	var sky := ColorRect.new()
	sky.size = Vector2(1920, HORIZON)
	sky.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sm := ShaderMaterial.new()
	sm.shader = load("res://world/art/shaders/sky.gdshader")
	sm.set_shader_parameter("aspect", 1920.0 / HORIZON)
	sky.material = sm
	add_child(sky)
	add_child(Clouds.new())
	add_child(Gulls.new())
	var far := Node2D.new()
	far.add_child(Shape.make(Ink.pts([980, 472, 1080, 440, 1180, 452, 1260, 430, 1380, 458, 1420, 472]), Color("#E9B9B6"), 0.0))
	far.add_child(Shape.make(Ink.pts([1650, 472, 1760, 446, 1860, 455, 1920, 448, 1920, 472]), Color("#E3B0B2"), 0.0))
	add_child(far)
	var town := Town.new()
	town.position = Vector2(0, HORIZON + 2)
	add_child(town)
	var sea := ColorRect.new()
	sea.position = Vector2(0, HORIZON)
	sea.size = Vector2(1920, floor_y - HORIZON)
	sea.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var wm := ShaderMaterial.new()
	wm.shader = load("res://world/art/shaders/sea.gdshader")
	sea.material = wm
	add_child(sea)
	var quay := Quay.new()
	quay.top_y = floor_y
	add_child(quay)


func _draw() -> void:
	if style == "pier":
		return
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
