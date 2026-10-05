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
	var d := Node2D.new()
	add_child(d)
	var bd := Backdrop.new()
	bd.style = "pier"
	bd.scale = Vector2(0.45, 0.45)
	bd.position = Vector2(40, 420)
	d.add_child(bd)
	var gl := Ui.greek_label("Το λιμάνι · ΕΞΟΔΟΣ · έχεις;", 40)
	gl.position = Vector2(1000, 450)
	add_child(gl)
