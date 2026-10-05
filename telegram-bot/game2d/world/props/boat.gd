class_name Boat
extends Node2D
## Small sailing boat (η βάρκα). Origin = waterline centre.

const HIT := Rect2(-120, -210, 240, 230)


func _draw() -> void:
	Ink.poly(self, Ink.pts([-110, -30, 110, -30, 80, 10, -80, 10]), Palette.WOOD)
	Ink.poly(self, Ink.pts([-104, -22, 104, -22, 98, -12, -98, -12]), Palette.PAPER, 2.0)
	draw_line(Vector2(0, -30), Vector2(0, -200), Palette.INK, 6.0)
	Ink.poly(self, Ink.pts([6, -40, 6, -196, 92, -40]), Palette.PAPER)
