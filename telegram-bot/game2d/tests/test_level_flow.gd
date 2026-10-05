extends TestCase


func test_scene_paths_exist() -> void:
	var gs := tree.root.get_node("GameState")
	for id in gs.level["scenes"]:
		check(ResourceLoader.exists(gs.level["scenes"][id]), "scene file for " + id)


func test_whole_level_logic_and_persistence() -> void:
	var gs := tree.root.get_node("GameState")
	gs.new_game()
	var pier: Node = load("res://levels/level1/pier.tscn").instantiate()
	tree.root.add_child(pier)
	for w in pier.PIER_WORDS:
		gs.see(w)
		gs.notebook.assign(w, gs.lex.picto(w))
	SignalBus.page_checked.emit("pier", gs.notebook.check_page("pier"))
	pier.free()
	var conv: Node = load("res://levels/level1/conveyor.tscn").instantiate()
	tree.root.add_child(conv)
	while conv.crate != null:
		conv.sort_crate(conv.crate, conv.belt_for(conv.crate.word_id))
	conv.free()
	var cust: Node = load("res://levels/level1/customs.tscn").instantiate()
	tree.root.add_child(cust)
	cust.ask()
	cust.handle_sentence(cust.cfg["target"], {"kind": ErrorClassifier.OK, "slot": -1})
	cust.handle_item("diavatirio")
	cust.free()
	for f in ["pier_open", "conveyor_done", "customs_done"]:
		eq(gs.has_flag(f), true, f)
	var end: Node = load("res://levels/level1/level_end.tscn").instantiate()
	tree.root.add_child(end)
	eq(gs.has_flag("level1_done"), true, "end card sets flag")
	end.free()
	gs.new_game()
	eq(gs.load_game(), true, "saved during play")
	eq(gs.has_flag("customs_done"), true, "progress persisted")
	eq(gs.notebook.is_page_solved("pier"), true, "notebook persisted")
