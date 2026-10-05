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
	var wood := Color("#B98A5E")
	var panel := Color("#E8CFA6")
	var roof := Color("#C8643B")
	# body panels around the window
	for r in [Rect2(-200, -380, 80, 380), Rect2(120, -380, 80, 380), Rect2(-120, -380, 240, 90), Rect2(-120, -140, 240, 140)]:
		Ink.rect(self, r, panel)
	for r in [Rect2(-188, -360, 56, 150), Rect2(-188, -190, 56, 170), Rect2(132, -360, 56, 150), Rect2(132, -190, 56, 170), Rect2(-104, -120, 96, 100), Rect2(8, -120, 96, 100)]:
		draw_rect(r, Color(wood, 0.25))
		draw_rect(r, Color(Palette.INK, 0.45), false, 2.0)
	# corner posts
	for x in [-206.0, 194.0]:
		Ink.rect(self, Rect2(x, -392, 12, 392), wood.darkened(0.15), 2.5)
	# window frame + glass glint
	draw_rect(Rect2(WINDOW.position - Vector2(6, 6), WINDOW.size + Vector2(12, 12)), wood.darkened(0.1), false, 8.0)
	draw_line(WINDOW.position + Vector2(170, 12), WINDOW.position + Vector2(220, 60), Color(1, 1, 1, 0.35), 4.0)
	# counter
	Ink.rect(self, Rect2(-150, -152, 300, 18), wood)
	# number plate
	Ink.rect(self, Rect2(-34, -372, 68, 40), Palette.PAPER, 2.5)
	draw_string(Fonts.greek(), Vector2(-14, -342), "1", HORIZONTAL_ALIGNMENT_LEFT, -1, 30, Palette.INK)
	# tiled roof with scalloped edge
	Ink.poly(self, Ink.pts([-236, -392, 236, -392, 190, -452, -190, -452]), roof)
	for k in 3:
		var y := -400.0 - k * 18.0
		var x := -228.0 + k * 14.0
		while x < 228.0 - k * 14.0:
			draw_arc(Vector2(x + 13, y), 13.0, 0, PI, 8, roof.darkened(0.25), 2.0, true)
			x += 26.0
	Ink.rect(self, Rect2(-200, -462, 400, 12), roof.darkened(0.2), 2.5)
