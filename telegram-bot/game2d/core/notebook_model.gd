class_name NotebookModel
extends RefCounted
## The player's deciphering notebook: words seen, the pictogram hypothesis for each,
## solved pages. A page is checked all-or-nothing (Chants rule): no hint which card is wrong.

const INCOMPLETE := "incomplete"
const WRONG := "wrong"
const SOLVED := "solved"

var pages: Dictionary = {}          # page_id -> Array of word ids, in display order
var seen: Array[String] = []        # discovery order
var assigned: Dictionary = {}       # word_id -> picto_id
var solved_pages: Array[String] = []
var _lex: Lexicon


func _init(lex: Lexicon, page_defs: Dictionary) -> void:
	_lex = lex
	pages = page_defs


## True when the word is new to the notebook. Unknown ids are ignored.
func see(word_id: String) -> bool:
	if not _lex.has(word_id) or seen.has(word_id):
		return false
	seen.append(word_id)
	return true


func is_seen(word_id: String) -> bool:
	return seen.has(word_id)


func assign(word_id: String, picto_id: String) -> void:
	if not is_seen(word_id) or is_locked(word_id):
		return
	if picto_id == "":
		assigned.erase(word_id)
	else:
		assigned[word_id] = picto_id


func assignment(word_id: String) -> String:
	return assigned.get(word_id, "")


func page_of(word_id: String) -> String:
	for p in pages:
		if word_id in pages[p]:
			return p
	return ""


func is_locked(word_id: String) -> bool:
	return solved_pages.has(page_of(word_id))


func page_ready(page_id: String) -> bool:
	for w in pages[page_id]:
		if not is_seen(w) or assignment(w) == "":
			return false
	return true


func check_page(page_id: String) -> String:
	if solved_pages.has(page_id):
		return SOLVED
	if not page_ready(page_id):
		return INCOMPLETE
	for w in pages[page_id]:
		if assignment(w) != _lex.picto(w):
			return WRONG
	solved_pages.append(page_id)
	return SOLVED


func is_page_solved(page_id: String) -> bool:
	return solved_pages.has(page_id)


## Pages with at least one seen word, in definition order.
func visible_pages() -> Array[String]:
	var out: Array[String] = []
	for p in pages:
		for w in pages[p]:
			if is_seen(w):
				out.append(p)
				break
	return out


## Pictograms the player can choose from: those of every seen word, sorted (order reveals nothing).
func palette() -> Array[String]:
	var out: Array[String] = []
	for w in seen:
		var p := _lex.picto(w)
		if p != "" and not out.has(p):
			out.append(p)
	out.sort()
	return out


func known_count() -> int:
	var n := 0
	for p in solved_pages:
		n += pages[p].size()
	return n


func to_dict() -> Dictionary:
	return {"seen": seen.duplicate(), "assigned": assigned.duplicate(), "solved": solved_pages.duplicate()}


func load_dict(d: Dictionary) -> void:
	seen.clear()
	for w in d.get("seen", []):
		if _lex.has(str(w)) and not seen.has(str(w)):
			seen.append(str(w))
	assigned = {}
	var a: Dictionary = d.get("assigned", {})
	for w in a:
		if is_seen(str(w)):
			assigned[str(w)] = str(a[w])
	solved_pages.clear()
	for p in d.get("solved", []):
		if pages.has(str(p)):
			solved_pages.append(str(p))
