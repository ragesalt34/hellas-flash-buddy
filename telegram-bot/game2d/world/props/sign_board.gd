class_name SignBoard
extends Node2D
## A sign on a post: Greek caption in capitals, framed in its noun's class colour and shape
## (ο pillared, η rounded, το square). Its word is seen on sight.

var line: Array = []
var word_id := ""
var text: InteractiveText
var hit: Interactable
var _post := 120.0
var _board := Rect2()


func setup(l: Array, post_height: float = 120.0) -> SignBoard:
	line = l
	word_id = LineFormat.word_ids(l)[0]
	_post = post_height
	return self


func _ready() -> void:
	text = InteractiveText.new(44)
	text.caps = true
	text.object_word = word_id
	add_child(text)
	text.set_line(line)
	GameState.see_line(line)
	hit = Interactable.new().setup(word_id, Rect2(-100, -_post - 90, 200, 90))
	add_child(hit)
	_layout()
	_layout.call_deferred()


func _layout() -> void:
	text.reset_size()
	var pad := Vector2(36, 20)
	_board = Rect2(Vector2(-text.size.x / 2.0, -_post - text.size.y) - pad, text.size + pad * 2.0)
	text.position = _board.position + pad
	hit.set_rect(_board)
	queue_redraw()


const BOARD := Color("#F2E3C8")


func _draw() -> void:
	Ink.rect(self, Rect2(-8, -_post, 16, _post), Palette.WOOD)
	draw_line(Vector2(-3, -_post + 4), Vector2(-3, -6), Color(1, 1, 1, 0.25), 2.0)
	var g := GameState.lex.gender(word_id)
	var col := Palette.gender_color(g)
	match g:
		"m":
			_board_fill(_board)
			Ink.rect(self, Rect2(_board.position - Vector2(16, 10), Vector2(16, _board.size.y + 20)), col, 3.0)
			Ink.rect(self, Rect2(Vector2(_board.end.x, _board.position.y - 10), Vector2(16, _board.size.y + 20)), col, 3.0)
		"f":
			var sb := Ui.panel_style(int(_board.size.y / 2.0), 7, BOARD)
			sb.border_color = col
			draw_style_box(sb, _board)
		_:
			Ink.rect(self, _board.grow(6), col, 3.0)
			_board_fill(_board)


## Painted plank: warm board with faint wood grain and two nails.
func _board_fill(r: Rect2) -> void:
	Ink.rect(self, r, BOARD)
	for i in 3:
		var y := r.position.y + r.size.y * (0.25 + 0.25 * i)
		draw_line(Vector2(r.position.x + 6, y), Vector2(r.end.x - 6, y + (i - 1) * 2.0), Color(Palette.WOOD, 0.35), 1.5)
	for nx in [r.position.x + 10, r.end.x - 10]:
		draw_circle(Vector2(nx, r.position.y + 10), 3.0, Palette.INK.lightened(0.2))
