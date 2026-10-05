extends TestCase


func _scene() -> Node:
	tree.root.get_node("GameState").new_game()
	var s: Node = load("res://levels/level1/pier.tscn").instantiate()
	tree.root.add_child(s)
	return s


func _solve_pier(gs: Node, correct: bool) -> String:
	for w in ["limani", "ploio", "faros", "varka"]:
		gs.see(w)
		gs.notebook.assign(w, gs.lex.picto(w) if correct else "sack")
	var r: String = gs.notebook.check_page("pier")
	SignalBus.page_checked.emit("pier", r)
	return r


func test_gate_locked_until_page_solved() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	check(s.gate_x < INF, "locked at start")
	eq(s.active_puzzle, "pier", "puzzle active")
	eq(gs.notebook.is_seen("limani"), true, "sign word seen on arrival")
	eq(_solve_pier(gs, true), NotebookModel.SOLVED, "page solved")
	eq(s.gate_x, INF, "gate open")
	eq(gs.has_flag("pier_open"), true, "flag")
	s.free()


func test_wrong_page_is_a_wrong_attempt() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	eq(_solve_pier(gs, false), NotebookModel.WRONG, "wrong page")
	eq(s.hints["pier"].wrong, 1, "counted")
	check(s.gate_x < INF, "still locked")
	s.free()


func test_hint_level_three_sketches_first_unsolved_word() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	gs.notebook.assign("limani", "port")
	s.hints["pier"].tick(91.0)
	eq(s.hints["pier"].level, 3, "level 3")
	eq(gs.sketches.has("ploio"), true, "first unsolved word sketched")
	eq(gs.sketches.has("limani"), false, "solved word not sketched")
	s.free()


func test_reentry_after_open_keeps_gate_open() -> void:
	var gs := tree.root.get_node("GameState")
	gs.new_game()
	gs.set_flag("pier_open")
	var s: Node = load("res://levels/level1/pier.tscn").instantiate()
	tree.root.add_child(s)
	eq(s.gate_x, INF, "open on re-entry")
	eq(s.active_puzzle, "", "no active puzzle")
	s.free()


func test_arriving_near_the_edge_leaves_only_when_open() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	s.right_exit = ""          # do not actually change scene in the test
	s.player.position = Vector2(s.walk_rect.end.x - 30.0, 900)
	s._check_exit()
	eq(s._leaving, false, "no exit configured")
	s.right_exit = "conveyor"
	check(s.walk_rect.end.x - 30.0 >= s.walk_rect.end.x - s.EXIT_MARGIN, "30 px from the edge is inside the exit zone")
	s.free()
