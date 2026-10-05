class_name Lighthouse
extends Node2D
## Lighthouse on a rocky islet (ο φάρος): tapered white tower with red bands lit from the left
## (hatched shade side), a gallery with railing, a glowing lantern with a slowly pulsing halo and
## foam breaking around the rocks. Origin = base of the islet on the horizon.

const HIT := Rect2(-100, -300, 200, 300)
const ROCK := Color("#B7A79A")
const BAND := Color("#C8402F")

var _t := 0.0


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw() -> void:
	# halo
	var glow := 0.18 + 0.1 * sin(_t * 1.6)
	draw_circle(Vector2(0, -252), 70.0, Color(1.0, 0.95, 0.75, glow * 0.5))
	draw_circle(Vector2(0, -252), 38.0, Color(1.0, 0.95, 0.75, glow))
	# islet
	Ink.poly(self, Ink.pts([-100, 0, -78, -22, -40, -34, 10, -40, 56, -30, 92, -14, 104, 0]), ROCK, 3.0)
	Ink.poly(self, Ink.pts([10, -40, 56, -30, 92, -14, 104, 0, 30, 0]), ROCK.darkened(0.12), 0.0)
	for i in 5:
		var fx := -96.0 + i * 50.0
		draw_line(Vector2(fx - 12.0 + sin(_t * 1.5 + i) * 4.0, 2), Vector2(fx + 12.0 + sin(_t * 1.5 + i) * 4.0, 2), Color(1, 1, 1, 0.55), 3.0)
	# tower: lit side + shaded side
	Ink.poly(self, Ink.pts([-28, -36, 28, -36, 18, -224, -18, -224]), Palette.PAPER)
	draw_colored_polygon(Ink.pts([6, -36, 28, -36, 18, -224, 2, -224]), Palette.SHADE)
	for k in 14:
		var y := -44.0 - k * 13.0
		draw_line(Vector2(8 - k * 0.3, y), Vector2(24 - k * 0.7, y - 8), Color(0.62, 0.30, 0.38, 0.3), 1.2)
	for band in [[-96.0, -122.0], [-162.0, -186.0]]:
		var y0: float = band[0]
		var y1: float = band[1]
		var w0 := lerpf(28, 18, (-y0 - 36) / 188.0)
		var w1 := lerpf(28, 18, (-y1 - 36) / 188.0)
		Ink.poly(self, Ink.pts([-w0, y0, w0, y0, w1, y1, -w1, y1]), BAND, 2.0)
	Ink.poly(self, Ink.pts([-28, -36, 28, -36, 18, -224, -18, -224]), Color(0, 0, 0, 0), 3.0)
	Ink.rect(self, Rect2(-6, -70, 12, 18), Palette.SEA_DEEP, 2.0)
	# gallery + railing
	Ink.rect(self, Rect2(-30, -232, 60, 10), Palette.INK.lightened(0.2), 2.0)
	for x in range(-28, 30, 8):
		draw_line(Vector2(x, -232), Vector2(x, -246), Palette.INK, 1.5)
	draw_line(Vector2(-30, -246), Vector2(30, -246), Palette.INK, 2.0)
	# lantern + roof
	Ink.rect(self, Rect2(-16, -270, 32, 26), Color("#FFE7A0"), 2.5)
	draw_line(Vector2(0, -270), Vector2(0, -244), Color(Palette.INK, 0.6), 2.0)
	Ink.poly(self, Ink.pts([-22, -270, 22, -270, 0, -296]), BAND.darkened(0.2))
	draw_circle(Vector2(0, -299), 4.0, Palette.INK)
