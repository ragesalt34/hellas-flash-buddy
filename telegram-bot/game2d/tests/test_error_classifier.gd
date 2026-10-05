extends TestCase


func T(w: String, f: String = "") -> Dictionary:
	return {"w": w, "f": f}


func _target() -> Array:
	return [T("nai"), T("echo", "1s"), T("diavatirio", "nom")]


func test_exact_match_is_ok() -> void:
	eq(ErrorClassifier.classify([T("nai"), T("echo", "1s"), T("diavatirio", "nom")], _target()), {"kind": ErrorClassifier.OK, "slot": -1}, "ok")


func test_empty_slot_is_incomplete() -> void:
	eq(ErrorClassifier.classify([T("nai"), null, T("diavatirio", "nom")], _target()), {"kind": ErrorClassifier.INCOMPLETE, "slot": 1}, "null slot")
	eq(ErrorClassifier.classify([T("nai")], _target())["kind"], ErrorClassifier.INCOMPLETE, "short")


func test_wrong_lemma_is_semantic() -> void:
	eq(ErrorClassifier.classify([T("nai"), T("echo", "1s"), T("eisitirio", "nom")], _target()), {"kind": ErrorClassifier.SEMANTIC, "slot": 2}, "ticket for passport")


func test_wrong_form_is_morphological() -> void:
	eq(ErrorClassifier.classify([T("nai"), T("echo", "2s"), T("diavatirio", "nom")], _target()), {"kind": ErrorClassifier.MORPHOLOGICAL, "slot": 1}, "-εις for self")


func test_same_lemmas_wrong_order_is_syntactic() -> void:
	eq(ErrorClassifier.classify([T("diavatirio", "nom"), T("echo", "1s"), T("nai")], _target()), {"kind": ErrorClassifier.SYNTACTIC, "slot": 0}, "word salad")


func test_priority_semantic_over_morphological() -> void:
	eq(ErrorClassifier.classify([T("nai"), T("echo", "2s"), T("eisitirio", "nom")], _target()), {"kind": ErrorClassifier.SEMANTIC, "slot": 2}, "semantic wins")


func test_priority_syntactic_over_morphological() -> void:
	eq(ErrorClassifier.classify([T("echo", "2s"), T("nai"), T("diavatirio", "nom")], _target())["kind"], ErrorClassifier.SYNTACTIC, "syntactic wins")


func test_sentence_model_slots() -> void:
	var s := SentenceModel.new(_target())
	eq(s.is_full(), false, "starts empty")
	eq(s.place_next(T("nai")), 0, "first slot")
	s.place(2, T("diavatirio", "nom"))
	eq(s.place_next(T("echo", "1s")), 1, "fills the gap")
	eq(s.place_next(T("ochi")), -1, "full")
	eq(s.is_full(), true, "full")
	eq(s.evaluate()["kind"], ErrorClassifier.OK, "evaluates")
	s.clear(1)
	eq(s.evaluate(), {"kind": ErrorClassifier.INCOMPLETE, "slot": 1}, "cleared slot")
	s.clear_all()
	eq(s.slots, [null, null, null], "all cleared")
