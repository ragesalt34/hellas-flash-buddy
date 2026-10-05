class_name Booth
extends Node2D
## Customs booth drawn around an open window (the guard stands behind it); the window is a drop zone.

const WINDOW := Rect2(-120, -290, 240, 150)

var window: DropWindow


func _ready() -> void:
	window = DropWindow.new()
	window.position = WINDOW.position
	window.size = WINDOW.size
	add_child(window)


func _draw() -> void:
	var c := Palette.STONE.lerp(Palette.SHADE, 0.4)
	Ink.rect(self, Rect2(-200, -380, 80, 380), c)
	Ink.rect(self, Rect2(120, -380, 80, 380), c)
	Ink.rect(self, Rect2(-120, -380, 240, 90), c)
	Ink.rect(self, Rect2(-120, -140, 240, 140), c)
	Ink.rect(self, Rect2(-150, -150, 300, 18), Palette.WOOD)
	for i in 8:
		var x := -210.0 + i * 52.5
		Ink.poly(self, Ink.pts([x, -404, x + 52.5, -404, x + 52.5, -364, x, -364]), Palette.HAZE_LIGHT if i % 2 == 0 else Palette.PAPER, 3.0)
