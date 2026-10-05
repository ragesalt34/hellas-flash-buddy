class_name PostFx
extends CanvasLayer
## Finishing pass over the world (paper grain, vignette, warm grade). Sits below the HUD (layer 10).


func _ready() -> void:
	layer = 5
	var r := ColorRect.new()
	r.size = Vector2(1920, 1080)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var m := ShaderMaterial.new()
	m.shader = load("res://world/art/shaders/paper.gdshader")
	r.material = m
	add_child(r)
