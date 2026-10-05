class_name Clouds
extends Node2D
## Flat paper clouds with a soft shaded underside, drifting slowly and wrapping around the screen.

const PUFFS := [Vector3(-80, 0, 34), Vector3(-42, -20, 42), Vector3(6, -30, 50), Vector3(56, -14, 40), Vector3(92, 2, 28)]

@export var area := Rect2(0, 40, 1920, 230)
@export var count := 6

var _clouds: Array = []


func _ready() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 3
	for i in count:
		_clouds.append({
			"p": Vector2(rng.randf_range(-100, 1900), rng.randf_range(area.position.y + 30, area.end.y)),
			"s": rng.randf_range(0.55, 1.25),
			"v": rng.randf_range(5.0, 13.0),
		})


func _process(delta: float) -> void:
	for c in _clouds:
		c["p"].x += c["v"] * delta
		if c["p"].x > area.end.x + 220.0:
			c["p"].x = area.position.x - 220.0
	queue_redraw()


func _draw() -> void:
	for c in _clouds:
		var p: Vector2 = c["p"]
		var s: float = c["s"]
		var a := lerpf(0.55, 0.95, s - 0.5)
		for pf in PUFFS:
			draw_circle(p + Vector2(pf.x, pf.y + 8.0) * s, pf.z * s, Color(0.96, 0.80, 0.78, a * 0.55))
		for pf in PUFFS:
			draw_circle(p + Vector2(pf.x, pf.y) * s, pf.z * s, Color(1.0, 0.985, 0.965, a))
		draw_rect(Rect2(p + Vector2(-100, -2) * s, Vector2(205, 14) * s), Color(1.0, 0.985, 0.965, a))
