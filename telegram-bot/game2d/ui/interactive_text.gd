class_name InteractiveText
extends RichTextLabel
## A Greek line with hoverable/clickable word parts (meta "w|id|part|form", see LineFormat).
## Hover stem → tooltip with the player's hypothesis ("?" if none); hover article/ending → class glyph
## (nouns) or person glyph (verbs). Click a seen word → its card is held on the cursor (two-click
## binding). With object_word set (signs), a click while a card is held binds that card to the object.

var line: Array = []
var caps := false
var capitalize := true
var click_holds := true
var object_word := ""
var _bound_frame := -1


func _init(px: int = 30) -> void:
	bbcode_enabled = true
	fit_content = true
	autowrap_mode = TextServer.AUTOWRAP_OFF
	scroll_active = false
	meta_underlined = false
	add_theme_font_override("normal_font", Fonts.greek())
	add_theme_font_override("bold_font", Fonts.greek_bold())
	add_theme_font_size_override("normal_font_size", px)
	add_theme_font_size_override("bold_font_size", px)
	add_theme_color_override("default_color", Palette.INK)
	meta_hover_started.connect(_on_hover)
	meta_hover_ended.connect(_on_unhover)
	meta_clicked.connect(_on_click)


func set_line(l: Array) -> void:
	line = l
	text = LineFormat.bbcode(l, GameState.lex, capitalize, caps)


func _gui_input(event: InputEvent) -> void:
	if object_word == "" or not CursorManager.is_holding():
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		GameState.bind_held_card(object_word)
		_bound_frame = Engine.get_process_frames()
		accept_event()


func _on_click(meta: Variant) -> void:
	if _bound_frame == Engine.get_process_frames():
		return
	var p := str(meta).split("|")
	if p.size() < 4 or CursorManager.is_holding():
		return
	if click_holds and GameState.notebook.is_seen(p[1]):
		CursorManager.hold(p[1])


func _on_hover(meta: Variant) -> void:
	var p := str(meta).split("|")
	if p.size() < 4:
		return
	var id := p[1]
	var lex: Lexicon = GameState.lex
	if p[2] == "stem":
		var a: String = GameState.notebook.assignment(id)
		CursorManager.show_tip(a if a != "" else "unknown")
	elif lex.pos(id) == "noun":
		CursorManager.show_tip("g_" + lex.gender(id))
	elif lex.pos(id) == "verb":
		CursorManager.show_tip("p" + (p[3] if p[3] != "" else "1s").left(1))


func _on_unhover(_meta: Variant) -> void:
	CursorManager.hide_tip()


func _exit_tree() -> void:
	CursorManager.hide_tip()
