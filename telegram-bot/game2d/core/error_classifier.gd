class_name ErrorClassifier
extends RefCounted
## Diagnoses a built sentence against the target (pedagogy spec "Анализ и классификация ошибок").
## Tokens are {"w": word_id, "f": form}; empty slots are null.
## Priority: syntactic (right words, wrong order/roles) > semantic (wrong word) > morphological (wrong form).

const OK := "ok"
const INCOMPLETE := "incomplete"
const SEMANTIC := "semantic"
const MORPHOLOGICAL := "morphological"
const SYNTACTIC := "syntactic"


static func classify(built: Array, target: Array) -> Dictionary:
	if built.size() != target.size():
		return {"kind": INCOMPLETE, "slot": mini(built.size(), target.size())}
	for i in built.size():
		if built[i] == null:
			return {"kind": INCOMPLETE, "slot": i}
	var lb: Array = built.map(func(t): return t["w"])
	var lt: Array = target.map(func(t): return t["w"])
	if lb != lt:
		var sb := lb.duplicate()
		var st := lt.duplicate()
		sb.sort()
		st.sort()
		var kind := SYNTACTIC if sb == st else SEMANTIC
		return {"kind": kind, "slot": _first_diff(lb, lt)}
	for i in built.size():
		if built[i]["f"] != target[i]["f"]:
			return {"kind": MORPHOLOGICAL, "slot": i}
	return {"kind": OK, "slot": -1}


static func _first_diff(a: Array, b: Array) -> int:
	for i in a.size():
		if a[i] != b[i]:
			return i
	return -1
