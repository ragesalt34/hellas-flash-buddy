class_name Boat
extends Node2D
## Greek fishing caique (η βάρκα): curved two-tone wooden hull with a painted stripe, a short mast with
## a furled sail, oars and a coiled rope. Rocks gently. Origin = waterline centre.

const HIT := Rect2(-130, -200, 260, 220)
const HULL := Color("#F6EFE3")
const STRIPE := Color("#2F6FA8")
const KEEL := Color("#C8643B")

var _t := 1.7


func _process(delta: float) -> void:
	_t += delta
	rotation = sin(_t * 1.4) * 0.03
	queue_redraw()


func _draw() -> void:
	var hull := PackedVector2Array()
	for i in 15:
		var k := i / 14.0
		hull.append(Vector2(lerpf(-128, 128, k), -34 - pow(absf(k - 0.5) * 2.0, 3.0) * 26.0))
	hull.append(Vector2(92, 8))
	hull.append(Vector2(-92, 8))
	Ink.poly(self, hull, HULL)
	draw_polyline(Ink.pts([-120, -26, -60, -18, 0, -16, 60, -18, 120, -26]), STRIPE, 7.0, true)
	Ink.poly(self, Ink.pts([-96, 0, 96, 0, 92, 8, -92, 8]), KEEL, 2.0)
	# eye on the bow (traditional)
	draw_circle(Vector2(104, -34), 5.0, Palette.INK)
	draw_circle(Vector2(104, -34), 2.0, HULL)
	# mast, furled sail, yard
	draw_line(Vector2(-6, -40), Vector2(-6, -196), Palette.INK, 5.0)
	draw_line(Vector2(-60, -150), Vector2(64, -184), Palette.INK, 3.0)
	Ink.poly(self, Ink.pts([-56, -150, 60, -182, 58, -170, -54, -140]), Color("#F2E6D0"), 2.0)
	draw_line(Vector2(-6, -196), Vector2(120, -40), Color(Palette.INK, 0.5), 1.5)
	# oars
	draw_line(Vector2(-40, -46), Vector2(-110, 6), Color("#8A6440"), 4.0)
	draw_line(Vector2(30, -46), Vector2(-30, 8), Color("#8A6440"), 4.0)
	# coiled rope
	for r in [10.0, 6.0]:
		draw_arc(Vector2(-70, -46), r, 0, TAU, 18, Color("#B98A5E"), 2.5, true)
