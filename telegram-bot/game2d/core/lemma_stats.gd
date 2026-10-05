class_name LemmaStats
extends RefCounted
## Per-word practice counters. Drives recirculation: weaker words come back first.

var data: Dictionary = {}   # word_id -> {"seen": int, "correct": int, "wrong": int}


func record(word_id: String, correct: bool) -> void:
	var s: Dictionary = data.get(word_id, {"seen": 0, "correct": 0, "wrong": 0})
	s["seen"] += 1
	if correct:
		s["correct"] += 1
	else:
		s["wrong"] += 1
	data[word_id] = s


## Higher = weaker. An unseen word ranks like a word with one mistake on a fresh start.
func score(word_id: String) -> float:
	if not data.has(word_id):
		return 1.0
	var s: Dictionary = data[word_id]
	return float(s["wrong"]) * 2.0 - float(s["correct"]) + 1.0 / (1.0 + float(s["seen"]))


func weakest_first(ids: Array) -> Array:
	var out := ids.duplicate()
	out.sort_custom(_weaker)
	return out


func _weaker(a: Variant, b: Variant) -> bool:
	var sa := score(str(a))
	var sb := score(str(b))
	if not is_equal_approx(sa, sb):
		return sa > sb
	return str(a) < str(b)


func to_dict() -> Dictionary:
	return data.duplicate(true)


func load_dict(d: Dictionary) -> void:
	data = {}
	for k in d:
		var s: Dictionary = d[k]
		data[str(k)] = {
			"seen": int(s.get("seen", 0)),
			"correct": int(s.get("correct", 0)),
			"wrong": int(s.get("wrong", 0)),
		}
