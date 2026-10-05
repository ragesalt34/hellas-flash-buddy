class_name WordCard
extends PanelContainer
## One notebook card: the word (with hoverable anatomy) framed by its class, and the pictogram the
## player assigned ("?" if none; a faded sketch once hint level 3 fired).

signal picked(word_id: String)
signal to_world(word_id: String)

var word_id := ""


func setup(id: String, is_selected: bool) -> void:
	word_id = id
	var nb: NotebookModel = GameState.notebook
	var lex: Lexicon = GameState.lex
	custom_minimum_size = Vector2(380, 140)
	add_theme_stylebox_override("panel", Ui.card_style(lex.gender(id), is_selected, nb.is_locked(id)))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 12)
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(h)
	if not nb.is_seen(id):
		h.add_child(Ui.label("· · ·", 32))
		return
	var txt := InteractiveText.new(34)
	txt.capitalize = false
	txt.click_holds = false
	txt.mouse_filter = Control.MOUSE_FILTER_PASS
	txt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	txt.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(txt)
	txt.set_line([[id, "1s" if lex.pos(id) == "verb" else ""]])
	var a := nb.assignment(id)
	var pic := Picto.new()
	pic.custom_minimum_size = Vector2(96, 96)
	pic.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if a != "":
		pic.picto_id = a
	elif GameState.sketches.has(id):
		pic.picto_id = lex.picto(id)
		pic.sketch = true
	else:
		pic.picto_id = "unknown"
	h.add_child(pic)
	if a != "" and a != lex.picto(id) and GameState.sketches.has(id):
		var hint := Picto.new()
		hint.custom_minimum_size = Vector2(48, 48)
		hint.picto_id = lex.picto(id)
		hint.sketch = true
		hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
		h.add_child(hint)
	if not nb.is_locked(id):
		var w := Ui.button("в мир", 18)
		w.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		w.pressed.connect(func(): to_world.emit(word_id))
		h.add_child(w)
	gui_input.connect(_on_gui_input)


func _on_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if GameState.notebook.is_seen(word_id) and not GameState.notebook.is_locked(word_id):
			picked.emit(word_id)
