extends TestCase



func T(w: String, f: String = "") -> Dictionary:
	return {"w": w, "f": f}


func _scene() -> Node:
	tree.root.get_node("GameState").new_game()
	var s: Node = load("res://levels/level1/customs.tscn").instantiate()
	tree.root.add_child(s)
	return s


func _judge(s: Node, built: Array) -> void:
	s.handle_sentence(built, ErrorClassifier.classify(built, s.cfg["target"]))


func test_full_flow_with_every_error_class() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	eq(s.stage, "idle", "starts idle")
	check(s.gate_x < INF, "barrier closed")
	s.ask()
	eq(s.stage, "ask", "asking")
	eq(s.hud.builder.visible, true, "builder open")
	eq(gs.notebook.is_seen("fylakas"), true, "question words seen")
	_judge(s, [T("nai"), T("echo", "1s"), T("eisitirio", "nom")])
	eq(s.stage, "ask", "semantic keeps asking")
	_judge(s, [T("nai"), T("echo", "2s"), T("diavatirio", "nom")])
	eq(s.hints["customs_sentence"].level, 1, "2 wrong → kinetic hint")
	_judge(s, [T("diavatirio", "nom"), T("echo", "1s"), T("nai")])
	eq(s.hints["customs_sentence"].wrong, 3, "syntactic counted")
	_judge(s, [T("nai"), T("echo", "1s"), T("diavatirio", "nom")])
	eq(s.stage, "item", "now the document")
	eq(s.hud.builder.visible, false, "builder closed")
	eq(s.booth.window.active, true, "window accepts drops")
	s.handle_item("eisitirio")
	eq(s.stage, "item", "ticket refused")
	s.handle_item("diavatirio")
	eq(s.stage, "done", "passport accepted")
	eq(gs.has_flag("customs_done"), true, "flag")
	eq(s.gate_x, INF, "barrier open")
	s.free()


func test_reaction_lines() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	eq(LineFormat.plain(s.wrong_item_line("eisitirio"), gs.lex), "Όχι! Αυτό δεν είναι διαβατήριο. Αυτό είναι εισιτήριο!", "wrong item")
	eq(LineFormat.plain(s.echo_line(1), gs.lex), "Α, ναι, έχω το διαβατήριο.", "echo correction")
	check(LineFormat.bbcode(s.echo_line(1), gs.lex).contains("[wave"), "echo emphasises the slot")
	eq(LineFormat.plain(s.person_line(), gs.lex), "Έχεις το διαβατήριο;", "person repeat")
	check(LineFormat.bbcode(s.person_line(), gs.lex).contains("[wave"), "ending pulses")
	eq(LineFormat.plain(s.semantic_line(2), gs.lex), "Όχι! Έχεις το διαβατήριο;", "semantic re-ask")
	s.free()


func test_item_before_answer_is_ignored() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	s.handle_item("diavatirio")
	eq(s.stage, "idle", "nothing happens before the question")
	eq(gs.has_flag("customs_done"), false, "no flag")
	s.free()
