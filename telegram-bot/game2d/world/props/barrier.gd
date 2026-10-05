class_name Barrier
extends Node2D
## Striped barrier arm on a post; swings up when opened.

var arm: Node2D


func _ready() -> void:
	var post := ArtLibrary.tex("prop_gate_post")
	if post:
		var sprite := Sprite2D.new()
		sprite.texture = post
		sprite.scale = Vector2(32.0 / post.get_width(), 140.0 / post.get_height())
		sprite.position = Vector2(0, -70)
		add_child(sprite)
	else:
		add_child(Shape.make(Ink.pts([-12, 0, 12, 0, 12, -120, -12, -120]), Palette.STONE.darkened(0.2)))
	arm = Node2D.new()
	arm.position = Vector2(0, -110)
	add_child(arm)
	arm.add_child(Shape.make(Ink.pts([0, -9, -230, -9, -230, 9, 0, 9]), Palette.PAPER))
	for i in 4:
		var x := -30.0 - i * 54.0
		arm.add_child(Shape.make(Ink.pts([x, -9, x - 26, -9, x - 26, 9, x, 9]), Palette.BAD, 0.0))


func set_open(open: bool, animate: bool = true) -> void:
	var r := 1.35 if open else 0.0
	if animate:
		create_tween().tween_property(arm, "rotation", r, 0.6).set_trans(Tween.TRANS_BACK)
	else:
		arm.rotation = r
