extends TestCase

var checked: Array = []
var results: Array = []


func _hud() -> Hud:
	tree.root.get_node("GameState").new_game()
	var h := Hud.new()
	tree.root.add_child(h)
	return h


func _on_checked(p: String, r: String) -> void:
	checked.append([p, r])


func _on_submitted(_built: Array, r: Dictionary) -> void:
	results.append(r["kind"])


func test_notebook_assign_and_check() -> void:
	var gs := tree.root.get_node("GameState")
	var h := _hud()
	for w in ["limani", "ploio", "faros", "varka"]:
		gs.see(w)
	h.notebook.open_notebook("faros")
	eq(h.notebook.page_id, "pier", "opens on the word's page")
	eq(h.notebook.selected, "faros", "word selected")
	eq(tree.paused, true, "world paused while open")
	for w in ["limani", "ploio", "faros", "varka"]:
		h.notebook.select(w)
		h.notebook.choose_picto(gs.lex.picto(w))
	checked = []
	SignalBus.page_checked.connect(_on_checked)
	h.notebook.check()
	SignalBus.page_checked.disconnect(_on_checked)
	eq(checked, [["pier", NotebookModel.SOLVED]], "page solved signal")
	tree.paused = false
	h.free()


func test_builder_flow() -> void:
	var gs := tree.root.get_node("GameState")
	var h := _hud()
	results = []
	h.builder.submitted.connect(_on_submitted)
	var cfg: Dictionary = gs.level["customs"]
	h.builder.open(cfg["target"], cfg["tiles"])
	eq(h.builder.visible, true, "shown")
	eq(gs.notebook.is_seen("eisitirio"), true, "tiles are seen words")
	h.builder.tap_tile({"w": "nai", "f": ""})
	h.builder.tap_tile({"w": "echo", "f": "2s"})
	eq(h.builder.next_needed(), {"w": "echo", "f": "1s"}, "next needed token")
	h.builder.tap_tile({"w": "diavatirio", "f": "nom"})
	h.builder.say()
	h.builder.clear_slot(1)
	h.builder.place(1, {"w": "echo", "f": "1s"})
	h.builder.say()
	eq(results, [ErrorClassifier.MORPHOLOGICAL, ErrorClassifier.OK], "results")
	h.free()
