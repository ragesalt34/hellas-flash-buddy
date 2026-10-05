extends TestCase

var seen_signal: Array = []


func _gs() -> Node:
	var gs := tree.root.get_node("GameState")
	gs.new_game()
	return gs


func _on_seen(w: String) -> void:
	seen_signal.append(w)


func test_level_data_integrity() -> void:
	var gs := _gs()
	var paged := {}
	for p in gs.level["pages"]:
		for w in gs.level["pages"][p]:
			check(gs.lex.has(w), "page word in lexicon: " + w)
			check(not paged.has(w), "word on one page only: " + w)
			paged[w] = true
	eq(paged.size(), gs.lex.ids().size(), "every lexicon word is on a page")
	for t in gs.level["customs"]["target"] + gs.level["customs"]["tiles"]:
		check(gs.lex.has(t["w"]), "customs token: " + t["w"])
	for key in gs.level["lines"]:
		for w in LineFormat.word_ids(gs.level["lines"][key]):
			check(gs.lex.has(w), "line %s word %s" % [key, w])


func test_new_game_defaults() -> void:
	var gs := _gs()
	eq(gs.scene_id, "pier", "start scene")
	eq(gs.inventory, ["diavatirio", "eisitirio"] as Array[String], "start inventory")
	eq(gs.notebook.seen.size(), 0, "empty notebook")


func test_see_line_emits_new_words_once() -> void:
	var gs := _gs()
	seen_signal = []
	SignalBus.word_seen.connect(_on_seen)
	gs.see_line(gs.line("sailor_intro"))
	gs.see_line(gs.line("sailor_intro"))
	SignalBus.word_seen.disconnect(_on_seen)
	eq(seen_signal, ["eimai", "naftis"], "emitted once each")


func test_save_load_roundtrip() -> void:
	var gs := _gs()
	gs.see("faros")
	gs.notebook.assign("faros", "lighthouse")
	gs.stats.record("faros", true)
	gs.set_flag("pier_open")
	gs.scene_id = "conveyor"
	gs.save_game()
	gs.new_game()
	eq(gs.notebook.is_seen("faros"), false, "fresh state")
	eq(gs.load_game(), true, "loaded")
	eq(gs.notebook.assignment("faros"), "lighthouse", "assignment")
	eq(gs.has_flag("pier_open"), true, "flag")
	eq(gs.scene_id, "conveyor", "scene")
	eq(gs.stats.data["faros"]["correct"], 1, "stats as int")
	gs.wipe_save()
	eq(gs.load_game(), false, "wiped")
