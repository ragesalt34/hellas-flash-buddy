class_name Ship
extends Node2D
## Moored ship (το πλοίο). Origin = waterline centre.

const HIT := Rect2(-320, -300, 640, 300)


func _draw() -> void:
	Ink.poly(self, Ink.pts([-320, -110, 320, -110, 280, 0, -280, 0]), Palette.PAPER)
	Ink.poly(self, Ink.pts([-306, -48, 306, -48, 285, 0, -285, 0]), Palette.SEA_DEEP, 3.0)
	Ink.rect(self, Rect2(-170, -200, 270, 90), Palette.PAPER)
	Ink.rect(self, Rect2(-110, -262, 150, 62), Palette.PAPER)
	for i in 6:
		Ink.circle(self, Vector2(-140 + i * 44, -156), 9, Palette.SEA, 3.0)
	Ink.poly(self, Ink.pts([70, -300, 120, -300, 110, -200, 80, -200]), Color("#3A3550"))
	Ink.poly(self, Ink.pts([70, -300, 120, -300, 118, -282, 72, -282]), Palette.HAZE_LIGHT, 3.0)
