class_name NotebookUI
extends Control
## Sliding deciphering notebook (blueprint §1): 864 px panel from the right, world paused while open.
## Pick a word card, then a pictogram from the palette — or «в мир» and click an object. A page is
## checked all-or-nothing; solved pages turn gold and lock.

const WIDTH := 864.0
const SLIDE := 0.35
enum State { CLOSED, OPENING, OPEN, CLOSING }

var state := State.CLOSED
var page_id := ""
var selected := ""
var _dimmer: ColorRect
var _panel: PanelContainer
var _tabs: HBoxContainer
var _cards: GridContainer
var _palette: HFlowContainer
var _check: Button
var _status: Label


func _ready() -> void:
	size = Vector2(1920, 1080)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_dimmer = ColorRect.new()
	_dimmer.color = Color(Palette.INK, 0.25)
	_dimmer.size = Vector2(1920, 1080)
	_dimmer.visible = false
	_dimmer.gui_input.connect(_on_dimmer_input)
	add_child(_dimmer)
	_panel = PanelContainer.new()
	_panel.add_theme_stylebox_override("panel", Ui.panel_style(0, 5))
	_panel.custom_minimum_size = Vector2(WIDTH, 1080)
	_panel.position = Vector2(1920, 0)
	add_child(_panel)
	var margin := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 24)
	_panel.add_child(margin)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 16)
	margin.add_child(v)
	var head := HBoxContainer.new()
	head.add_child(Ui.greek_label("Σημειωματάριο", 44))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	_status = Ui.label("", 24)
	head.add_child(_status)
	var close := Ui.button("×", 32)
	close.pressed.connect(close_notebook)
	head.add_child(close)
	v.add_child(head)
	_tabs = HBoxContainer.new()
	_tabs.add_theme_constant_override("separation", 10)
	v.add_child(_tabs)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_cards = GridContainer.new()
	_cards.columns = 2
	_cards.add_theme_constant_override("h_separation", 16)
	_cards.add_theme_constant_override("v_separation", 16)
	scroll.add_child(_cards)
	v.add_child(scroll)
	_check = Ui.button("Проверить страницу", 26)
	_check.pressed.connect(check)
	v.add_child(_check)
	v.add_child(Ui.label("Значения", 22))
	_palette = HFlowContainer.new()
	_palette.add_theme_constant_override("h_separation", 10)
	_palette.add_theme_constant_override("v_separation", 10)
	v.add_child(_palette)
	var help := Ui.label("Выбери слово, потом значение. «в мир» — кликни предмет в мире.", 20)
	help.autowrap_mode = TextServer.AUTOWRAP_WORD
	v.add_child(help)


func is_open() -> bool:
	return state == State.OPEN or state == State.OPENING


func toggle() -> void:
	if state == State.CLOSED:
		open_notebook()
	elif state == State.OPEN:
		close_notebook()


func open_notebook(word_id: String = "") -> void:
	var nb: NotebookModel = GameState.notebook
	if word_id != "" and nb.is_seen(word_id):
		page_id = nb.page_of(word_id)
		selected = word_id if not nb.is_locked(word_id) else ""
	elif page_id == "" or not nb.visible_pages().has(page_id):
		var pages := nb.visible_pages()
		page_id = pages[0] if not pages.is_empty() else ""
	refresh()
	if state != State.CLOSED:
		return
	state = State.OPENING
	_dimmer.visible = true
	get_tree().paused = true
	SignalBus.notebook_opened.emit()
	var t := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	t.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	t.tween_property(_panel, "position:x", 1920.0 - WIDTH, SLIDE)
	t.tween_callback(func(): state = State.OPEN)


func close_notebook() -> void:
	if state == State.CLOSED or state == State.CLOSING:
		return
	state = State.CLOSING
	var t := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	t.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	t.tween_property(_panel, "position:x", 1920.0, SLIDE)
	t.tween_callback(_closed)


func _closed() -> void:
	state = State.CLOSED
	_dimmer.visible = false
	get_tree().paused = false
	SignalBus.notebook_closed.emit()


func select(word_id: String) -> void:
	selected = word_id
	refresh()


func choose_picto(picto_id: String) -> void:
	if selected == "":
		return
	GameState.notebook.assign(selected, picto_id)
	SignalBus.card_assigned.emit(selected, picto_id)
	refresh()


func check() -> void:
	if page_id == "":
		return
	var r: String = GameState.notebook.check_page(page_id)
	SignalBus.page_checked.emit(page_id, r)
	var t := create_tween()
	t.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	if r == NotebookModel.SOLVED:
		selected = ""
		GameState.save_game()
		t.tween_property(_panel, "modulate", Palette.GOLD.lerp(Color.WHITE, 0.4), 0.15)
		t.tween_property(_panel, "modulate", Color.WHITE, 0.4)
	elif r == NotebookModel.WRONG:
		var x := _cards.position.x
		for i in 3:
			t.tween_property(_cards, "position:x", x + 14.0, 0.05)
			t.tween_property(_cards, "position:x", x - 14.0, 0.05)
		t.tween_property(_cards, "position:x", x, 0.05)
	else:
		t.kill()
	refresh()


func refresh() -> void:
	var nb: NotebookModel = GameState.notebook
	_status.text = "Расшифровано %d/%d  " % [nb.known_count(), GameState.lex.ids().size()]
	_clear(_tabs)
	var i := 0
	for p in nb.visible_pages():
		i += 1
		var b := Ui.button(str(i), 26)
		b.custom_minimum_size = Vector2(64, 56)
		if p == page_id:
			b.add_theme_stylebox_override("normal", Ui.panel_style(12, 3, Palette.SHADE))
		if nb.is_page_solved(p):
			b.add_theme_color_override("font_color", Palette.GOLD.darkened(0.3))
			b.text = str(i) + " •"
		b.pressed.connect(_on_tab.bind(p))
		_tabs.add_child(b)
	_clear(_cards)
	if page_id != "":
		for w in nb.pages[page_id]:
			var card := WordCard.new()
			_cards.add_child(card)
			card.setup(w, w == selected)
			card.picked.connect(select)
			card.to_world.connect(_on_to_world)
	_clear(_palette)
	for p in nb.palette():
		var b := Ui.icon_button(p, 88)
		b.disabled = selected == ""
		b.pressed.connect(choose_picto.bind(p))
		_palette.add_child(b)
	_check.disabled = page_id == "" or not nb.page_ready(page_id) or nb.is_page_solved(page_id)


func _on_tab(p: String) -> void:
	page_id = p
	selected = ""
	refresh()


func _on_to_world(word_id: String) -> void:
	CursorManager.hold(word_id)
	close_notebook()


func _on_dimmer_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		close_notebook()


func _input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_notebook"):
		toggle()
		get_viewport().set_input_as_handled()
	elif is_open() and event.is_action_pressed("ui_cancel"):
		close_notebook()
		get_viewport().set_input_as_handled()


func _clear(n: Node) -> void:
	for c in n.get_children():
		n.remove_child(c)
		c.queue_free()
