class_name Lexicon
extends RefCounted
## Read-only word data (data/lexicon.json). Ids are ASCII keys ("faros").
## Forms: noun "" / "nom" (with article) or "bare"; verb "1s" "2s" "3s"; particle "".

var _words: Dictionary = {}


static func from_dict(d: Dictionary) -> Lexicon:
	var lex := Lexicon.new()
	lex._words = d
	return lex


static func from_file(path: String) -> Lexicon:
	var d = JSON.parse_string(FileAccess.get_file_as_string(path))
	assert(d is Dictionary, "bad lexicon json: " + path)
	return from_dict(d)


func has(id: String) -> bool:
	return _words.has(id)


func ids() -> Array[String]:
	var out: Array[String] = []
	for k in _words:
		out.append(k)
	out.sort()
	return out


func pos(id: String) -> String:
	return _words[id].get("pos", "")


func gender(id: String) -> String:
	return _words[id].get("gender", "")


func picto(id: String) -> String:
	return _words[id].get("picto", "")


func word_by_picto(picto_id: String) -> String:
	for k in _words:
		if _words[k].get("picto", "") == picto_id:
			return k
	return ""


func parts(id: String, form: String = "") -> Dictionary:
	var w: Dictionary = _words[id]
	match w.get("pos", ""):
		"noun":
			var art: String = "" if form == "bare" else w["article"]
			return {"article": art, "stem": w["stem"], "ending": w["ending"]}
		"verb":
			var f := form if form != "" else "1s"
			return {"article": "", "stem": w["stem"], "ending": w["endings"][f]}
		_:
			return {"article": "", "stem": w["stem"], "ending": w.get("ending", "")}


func surface(id: String, form: String = "") -> String:
	var p := parts(id, form)
	var word: String = p["stem"] + p["ending"]
	return word if p["article"] == "" else p["article"] + " " + word
