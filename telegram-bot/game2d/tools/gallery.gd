extends Control
## Visual check sheet for snapshot.gd: every pictogram and glyph; later tasks add actors and text.


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Palette.PAPER
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var x := 40.0
	var y := 30.0
	for id in Picto.ALL + Picto.GLYPHS:
		var p := Picto.new()
		p.picto_id = id
		p.position = Vector2(x, y)
		p.size = Vector2(110, 110)
		add_child(p)
		var l := Ui.label(id, 16)
		l.position = Vector2(x, y + 112)
		add_child(l)
		x += 150.0
		if x > 1800.0:
			x = 40.0
			y += 160.0
	_extra()


func _extra() -> void:
	var world := Node2D.new()
	add_child(world)
	var coats := [Palette.HAZE_DEEP, Color("#2F5D8A"), Color("#2E3A5C"), Color("#6B8E5A"), Color("#2F5D8A")]
	var hats := ["beret", "cap", "peaked", "cap", "none"]
	for i in 5:
		var a := Actor.new()
		a.coat = coats[i]
		a.hat = hats[i]
		a.position = Vector2(160 + i * 250, 1040)
		world.add_child(a)
		match i:
			1:
				a.arm_r.rotation = Actor.arm_rotation(a.arm_r.global_position, a.global_position + Vector2(220, -300))
			2:
				a.arm_r.rotation = Actor.arm_rotation(a.arm_r.global_position, a.global_position + Vector2(-10, -126))
				a.say(GameState.line("guard_question"), 60.0)
			3:
				a.head.rotation = 0.28
			4:
				a.arm_l.rotation = Actor.arm_rotation(a.arm_l.global_position, a.global_position + Vector2(-220, -150))
				a.arm_r.rotation = Actor.arm_rotation(a.arm_r.global_position, a.global_position + Vector2(-220, -150))
	var signs := [[["limani", "nom"]], [["faros", "nom"]], [["varka", "nom"]]]
	for i in 3:
		var s := SignBoard.new().setup(signs[i], 110.0)
		s.position = Vector2(1560, 560 + i * 240)
		world.add_child(s)
