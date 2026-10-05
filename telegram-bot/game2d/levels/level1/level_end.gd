extends Control
## End card of Level 1: what was deciphered (word + its pictogram, now earned), replay or quit.


func _ready() -> void:
	GameState.set_flag("level1_done")
	GameState.save_game()
	_build()


func _build() -> void:
	var nb: NotebookModel = GameState.notebook
	var bg := ColorRect.new()
	bg.color = Palette.PAPER
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var harbour := ArtLibrary.tex("bg_pier")
	if harbour:
		var view := TextureRect.new()
		view.texture = harbour
		view.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		view.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		view.set_anchors_preset(Control.PRESET_FULL_RECT)
		view.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(view)
		var wash := ColorRect.new()
		wash.color = Color(Palette.PAPER, 0.60)
		wash.set_anchors_preset(Control.PRESET_FULL_RECT)
		wash.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(wash)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var paper := PanelContainer.new()
	paper.add_theme_stylebox_override("panel", Ui.paper_style(48))
	center.add_child(paper)
	var v := VBoxContainer.new()
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 22)
	paper.add_child(v)
	var title := Ui.greek_label(Greek.caps("λιμάνι"), 84)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(title)
	var sub := Ui.label("Глава 1 пройдена", 36)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(sub)
	v.add_child(Ui.label("Страниц расшифровано: %d из %d" % [nb.solved_pages.size(), nb.pages.size()], 28))
	v.add_child(Ui.label("Слов понято: %d из %d" % [nb.known_count(), GameState.lex.ids().size()], 28))
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 28)
	grid.add_theme_constant_override("v_separation", 12)
	for p in nb.solved_pages:
		for w in nb.pages[p]:
			var row := HBoxContainer.new()
			var pic := Picto.new()
			pic.picto_id = GameState.lex.picto(w)
			pic.custom_minimum_size = Vector2(56, 56)
			row.add_child(pic)
			row.add_child(Ui.greek_label(GameState.lex.surface(w), 28))
			grid.add_child(row)
	v.add_child(grid)
	if nb.solved_pages.size() < nb.pages.size():
		v.add_child(Ui.label("Нерасшифрованные страницы можно дорешать — блокнот сохраняется.", 22))
	var buttons := HBoxContainer.new()
	buttons.alignment = BoxContainer.ALIGNMENT_CENTER
	buttons.add_theme_constant_override("separation", 24)
	var back := Ui.button("Вернуться к таможне", 26)
	back.pressed.connect(func(): GameState.goto_scene("customs", "right"))
	buttons.add_child(back)
	var again := Ui.button("Начать заново", 26)
	again.pressed.connect(_restart)
	buttons.add_child(again)
	var quit := Ui.button("Выход", 26)
	quit.pressed.connect(func(): get_tree().quit())
	buttons.add_child(quit)
	v.add_child(buttons)


func _restart() -> void:
	GameState.wipe_save()
	GameState.goto_scene("pier", "left")


func debug_setup(_case: String) -> void:
	for p in ["pier", "cargo"]:
		for w in GameState.notebook.pages[p]:
			GameState.see(w)
			GameState.notebook.assign(w, GameState.lex.picto(w))
		GameState.notebook.check_page(p)
	for c in get_children():
		remove_child(c)
		c.queue_free()
	_build()
