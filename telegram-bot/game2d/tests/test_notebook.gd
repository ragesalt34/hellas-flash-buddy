extends TestCase


func _nb() -> NotebookModel:
	var lex := Lexicon.from_dict({
		"a": {"pos": "noun", "article": "ο", "gender": "m", "stem": "α", "ending": "ος", "picto": "pa"},
		"b": {"pos": "noun", "article": "η", "gender": "f", "stem": "β", "ending": "α", "picto": "pb"},
		"c": {"pos": "noun", "article": "το", "gender": "n", "stem": "γ", "ending": "ο", "picto": "pc"},
	})
	return NotebookModel.new(lex, {"p1": ["a", "b"], "p2": ["c"]})


func test_see_reports_new_words_only() -> void:
	var nb := _nb()
	eq(nb.see("a"), true, "first sight")
	eq(nb.see("a"), false, "repeat")
	eq(nb.see("zzz"), false, "unknown id")
	eq(nb.seen, ["a"] as Array[String], "seen list")


func test_assign_requires_seen() -> void:
	var nb := _nb()
	nb.assign("a", "pa")
	eq(nb.assignment("a"), "", "unseen ignored")
	nb.see("a")
	nb.assign("a", "pb")
	eq(nb.assignment("a"), "pb", "any hypothesis allowed")
	nb.assign("a", "")
	eq(nb.assignment("a"), "", "cleared")


func test_page_is_all_or_nothing() -> void:
	var nb := _nb()
	nb.see("a")
	nb.see("b")
	nb.assign("a", "pa")
	eq(nb.check_page("p1"), NotebookModel.INCOMPLETE, "one card empty")
	nb.assign("b", "pa")
	eq(nb.check_page("p1"), NotebookModel.WRONG, "one wrong card")
	eq(nb.is_page_solved("p1"), false, "not solved")
	eq(nb.assignment("a"), "pa", "hypotheses kept after wrong check")
	nb.assign("b", "pb")
	eq(nb.check_page("p1"), NotebookModel.SOLVED, "all correct")
	eq(nb.is_page_solved("p1"), true, "solved")


func test_solved_page_locks_cards() -> void:
	var nb := _nb()
	nb.see("a")
	nb.see("b")
	nb.assign("a", "pa")
	nb.assign("b", "pb")
	nb.check_page("p1")
	eq(nb.is_locked("a"), true, "locked")
	nb.assign("a", "pc")
	eq(nb.assignment("a"), "pa", "locked card unchanged")
	eq(nb.known_count(), 2, "known words")


func test_palette_and_visible_pages_follow_seen_words() -> void:
	var nb := _nb()
	eq(nb.visible_pages(), [] as Array[String], "nothing seen")
	nb.see("c")
	nb.see("a")
	eq(nb.palette(), ["pa", "pc"] as Array[String], "sorted pictos of seen words")
	eq(nb.visible_pages(), ["p1", "p2"] as Array[String], "pages in definition order")


func test_dict_roundtrip_drops_unknown_ids() -> void:
	var nb := _nb()
	nb.see("a")
	nb.see("b")
	nb.assign("a", "pa")
	nb.assign("b", "pb")
	nb.check_page("p1")
	var d := nb.to_dict()
	d["seen"].append("ghost")
	d["solved"].append("ghost_page")
	var nb2 := _nb()
	nb2.load_dict(d)
	eq(nb2.seen, ["a", "b"] as Array[String], "seen restored")
	eq(nb2.assignment("b"), "pb", "assignment restored")
	eq(nb2.solved_pages, ["p1"] as Array[String], "solved restored")
