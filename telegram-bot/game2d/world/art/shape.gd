class_name Shape
extends Node2D
## One ink-outlined flat polygon as a node, so limbs can rotate around their own origin.

var pts := PackedVector2Array()
var fill := Color.WHITE
var width := 4.0


static func make(points: PackedVector2Array, color: Color, w: float = 4.0) -> Shape:
	var s := Shape.new()
	s.pts = points
	s.fill = color
	s.width = w
	return s


func _draw() -> void:
	Ink.poly(self, pts, fill, width)
