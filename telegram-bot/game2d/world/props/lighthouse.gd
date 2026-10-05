class_name Lighthouse
extends Node2D
## Distant lighthouse on a rock (ο φάρος). Origin = base of the rock on the horizon.

const HIT := Rect2(-90, -270, 180, 270)


func _draw() -> void:
	Ink.poly(self, Ink.pts([-90, 0, 90, 0, 60, -30, -60, -30]), Palette.STONE.darkened(0.15))
	Ink.poly(self, Ink.pts([-26, -30, 26, -30, 18, -200, -18, -200]), Palette.PAPER)
	Ink.poly(self, Ink.pts([-23, -80, 23, -80, 21, -110, -21, -110]), Palette.HAZE_LIGHT, 3.0)
	Ink.poly(self, Ink.pts([-20, -140, 20, -140, 19, -168, -19, -168]), Palette.HAZE_LIGHT, 3.0)
	Ink.rect(self, Rect2(-22, -232, 44, 32), Color("#FFE9A8"))
	Ink.poly(self, Ink.pts([-28, -232, 28, -232, 0, -262]), Palette.INK)
