@tool
class_name Backdrop
extends Node2D
## Background of a level scene, built from scenery nodes: "pier" (shader sky, clouds, gulls, islands,
## hillside town, shader sea, stone quay), "warehouse" (WarehouseInterior), "customs" (Arcade).
## Always the first child of a level scene.

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
	match style:
		"pier":
			_build_pier()
		"warehouse":
			var w := WarehouseInterior.new()
			w.floor_y = floor_y
			add_child(w)
		"customs":
			var a := Arcade.new()
			a.floor_y = floor_y
			add_child(a)


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
