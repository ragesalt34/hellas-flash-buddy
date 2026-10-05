extends CanvasLayer
## Two-click binding (blueprint §1.3): a notebook card is "held" on the cursor until the player
## clicks a world object (that assigns the object's pictogram to the card) or cancels with
## Esc / right click. Also hosts the single hover tooltip used by InteractiveText.

signal changed(word_id: String)

var _held := ""
var _label: Label
var _tip: PanelContainer
var _tip_picto: Control


## Built in _init so tests (run before autoload _ready) can use hold()/clear().
func _init() -> void:
	layer = 20
	process_mode = Node.PROCESS_MODE_ALWAYS
	_label = Label.new()
	_label.visible = false
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_label.add_theme_font_size_override("font_size", 28)
	_label.add_theme_color_override("font_color", Palette.INK)
	_label.add_theme_color_override("font_outline_color", Palette.PAPER)
	_label.add_theme_constant_override("outline_size", 8)
	add_child(_label)


func hold(word_id: String) -> void:
	_held = word_id
	_label.text = "• " + GameState.lex.surface(word_id)
	_label.visible = true
	changed.emit(_held)


func held() -> String:
	return _held


func is_holding() -> bool:
	return _held != ""


func clear() -> void:
	_held = ""
	_label.visible = false
	changed.emit("")


func show_tip(picto_id: String) -> void:
	if _tip == null:
		_build_tip()
	_tip_picto.picto_id = picto_id
	_tip.visible = true


func hide_tip() -> void:
	if _tip:
		_tip.visible = false


func _build_tip() -> void:
	_tip = PanelContainer.new()
	_tip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PAPER
	sb.border_color = Palette.INK
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(10)
	sb.set_content_margin_all(6)
	_tip.add_theme_stylebox_override("panel", sb)
	_tip_picto = Picto.new()
	_tip_picto.custom_minimum_size = Vector2(72, 72)
	_tip_picto.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_tip.add_child(_tip_picto)
	add_child(_tip)


func _process(_delta: float) -> void:
	var m := get_viewport().get_mouse_position()
	if _label.visible:
		_label.position = m + Vector2(18, 14)
	if _tip and _tip.visible:
		_tip.position = m + Vector2(16, -100)


func _unhandled_input(event: InputEvent) -> void:
	if not is_holding():
		return
	var right_click: bool = event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_RIGHT
	if event.is_action_pressed("ui_cancel") or right_click:
		clear()
		get_viewport().set_input_as_handled()
