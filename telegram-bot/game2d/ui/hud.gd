class_name Hud
extends CanvasLayer
## Screen-space UI of a level scene: notebook button + notebook, inventory bar, phrase builder.
## Runs while the tree is paused (the notebook pauses the world).

var notebook: NotebookUI
var inventory: InventoryBar
var builder: SentenceBuilder
var book_button: Button
var _book_tween: Tween


func _ready() -> void:
	layer = 10
	process_mode = Node.PROCESS_MODE_ALWAYS
	inventory = InventoryBar.new()
	inventory.position = Vector2(24, 1080 - 24 - 120)
	add_child(inventory)
	builder = SentenceBuilder.new()
	add_child(builder)
	book_button = Ui.icon_button("book", 116)
	book_button.position = Vector2(1920 - 24 - 116, 24)
	book_button.pivot_offset = Vector2(58, 58)
	book_button.pressed.connect(open_notebook)
	add_child(book_button)
	notebook = NotebookUI.new()
	add_child(notebook)
	SignalBus.word_seen.connect(_on_word_seen)


func open_notebook(word_id: String = "") -> void:
	notebook.open_notebook(word_id)


func pulse_book() -> void:
	if _book_tween and _book_tween.is_valid():
		_book_tween.kill()
	_book_tween = create_tween()
	for i in 2:
		_book_tween.tween_property(book_button, "scale", Vector2(1.18, 1.18), 0.15)
		_book_tween.tween_property(book_button, "scale", Vector2.ONE, 0.15)


func _on_word_seen(_word_id: String) -> void:
	pulse_book()
