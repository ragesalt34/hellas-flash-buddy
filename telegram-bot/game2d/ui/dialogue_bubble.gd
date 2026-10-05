class_name DialogueBubble
extends Node2D
## Paper speech bubble with an ink border and tail, bottom-centred on its position, sized to the line.

var text: InteractiveText
var _panel: PanelContainer
var _fade: Tween


func _init() -> void:
	z_index = 50
	z_as_relative = false
	_panel = PanelContainer.new()
	_panel.add_theme_stylebox_override("panel", Ui.panel_style(18, 4))
	text = InteractiveText.new(32)
	_panel.add_child(text)
	add_child(_panel)
	visible = false


func show_line(line: Array, seconds: float = 4.5) -> void:
	text.set_line(line)
	visible = true
	modulate.a = 1.0
	_layout()
	_layout.call_deferred()
	if _fade and _fade.is_valid():
		_fade.kill()
	_fade = create_tween()
	_fade.tween_interval(seconds)
	_fade.tween_property(self, "modulate:a", 0.0, 0.4)
	_fade.tween_callback(hide)


func _layout() -> void:
	_panel.reset_size()
	_panel.position = Vector2(-_panel.size.x / 2.0, -_panel.size.y - 18.0)
	queue_redraw()


func _draw() -> void:
	draw_colored_polygon(Ink.pts([-14, -20, 14, -20, 0, 0]), Palette.PAPER)
	draw_polyline(Ink.pts([-14, -20, 0, 0, 14, -20]), Palette.INK, 4.0, true)
