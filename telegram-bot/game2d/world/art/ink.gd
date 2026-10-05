class_name Ink
extends RefCounted
## Flat fill + maroon ink outline: the line look of the whole game.


static func pts(flat: Array) -> PackedVector2Array:
	var p := PackedVector2Array()
	for i in range(0, flat.size() - 1, 2):
		p.append(Vector2(flat[i], flat[i + 1]))
	return p


static func circle_pts(c: Vector2, r: float, n: int = 28) -> PackedVector2Array:
	var p := PackedVector2Array()
	for i in n:
		p.append(c + Vector2.from_angle(TAU * i / n) * r)
	return p


static func poly(ci: CanvasItem, p: PackedVector2Array, fill: Color, width: float = 4.0) -> void:
	ci.draw_colored_polygon(p, fill)
	if width > 0.0:
		var closed := p.duplicate()
		closed.append(p[0])
		ci.draw_polyline(closed, Palette.INK, width, true)


static func rect(ci: CanvasItem, r: Rect2, fill: Color, width: float = 4.0) -> void:
	poly(ci, PackedVector2Array([r.position, Vector2(r.end.x, r.position.y), r.end, Vector2(r.position.x, r.end.y)]), fill, width)


static func circle(ci: CanvasItem, c: Vector2, r: float, fill: Color, width: float = 4.0) -> void:
	poly(ci, circle_pts(c, r), fill, width)
