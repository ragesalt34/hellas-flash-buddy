class_name Gulls
extends Node2D
## A few seagulls gliding across the sky with flapping ink wings.

@export var area := Rect2(0, 80, 1920, 260)
@export var count := 4

var _birds: Array = []


func _ready() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 9
	for i in count:
		_birds.append({
			"p": Vector2(rng.randf_range(0, 1920), rng.randf_range(area.position.y, area.end.y)),
			"v": Vector2(rng.randf_range(30, 60) * (1 if rng.randf() < 0.6 else -1), rng.randf_range(-4, 4)),
			"ph": rng.randf_range(0, TAU),
			"s": rng.randf_range(0.7, 1.2),
		})


func _process(delta: float) -> void:
	for b in _birds:
		b["p"] += b["v"] * delta
		b["ph"] += delta * 6.0
		if b["p"].x > area.end.x + 60:
			b["p"].x = area.position.x - 60
		elif b["p"].x < area.position.x - 60:
			b["p"].x = area.end.x + 60
	queue_redraw()


func _draw() -> void:
	for b in _birds:
		var p: Vector2 = b["p"]
		var s: float = b["s"]
		var f := sin(b["ph"]) * 0.8 + 0.4
		var pts := PackedVector2Array([
			p + Vector2(-16, 2 - 6 * f) * s, p + Vector2(-7, -5 * f) * s, p,
			p + Vector2(7, -5 * f) * s, p + Vector2(16, 2 - 6 * f) * s])
		draw_polyline(pts, Palette.INK, 2.6, true)
