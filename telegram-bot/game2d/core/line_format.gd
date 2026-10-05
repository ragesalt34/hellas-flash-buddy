class_name LineFormat
extends RefCounted
## Renders a line — literal Strings mixed with word tokens [id, form] / [id, form, "emph"] — to plain
## text or to BBCode for InteractiveText. In BBCode every word part is a meta link
## "w|<id>|<part>|<form>" so hovering the stem can show the player's hypothesis and hovering the
## ending can show the class (noun) or person (verb) glyph. Article and ending carry the gender colour.

const ARTICLE_COLORS := {"m": "#A8731A", "f": "#2A6FB5", "n": "#A84E2A"}
const VERB_ENDING_COLOR := "#A0206E"
const _SENTENCE_END := [".", "!", ";", "?"]


static func word_ids(line: Array) -> Array[String]:
	var out: Array[String] = []
	for t in line:
		if t is Array and not out.has(str(t[0])):
			out.append(str(t[0]))
	return out


static func plain(line: Array, lex: Lexicon, capitalize: bool = true) -> String:
	return _render(line, lex, capitalize, false, false)


static func bbcode(line: Array, lex: Lexicon, capitalize: bool = true, caps: bool = false) -> String:
	return _render(line, lex, capitalize, caps, true)


static func _render(line: Array, lex: Lexicon, capitalize: bool, caps: bool, rich: bool) -> String:
	var s := ""
	var cap_next := capitalize
	for t in line:
		if t is String:
			s += Greek.caps(t) if caps else t
			var st: String = t.strip_edges()
			if st != "":
				cap_next = capitalize and st.right(1) in _SENTENCE_END
		else:
			s += _word(t, lex, cap_next, caps, rich)
			cap_next = false
	return s


static func _word(t: Array, lex: Lexicon, cap: bool, caps: bool, rich: bool) -> String:
	var id: String = t[0]
	var form: String = t[1] if t.size() > 1 else ""
	var emph: bool = t.size() > 2 and t[2] == "emph"
	var p := lex.parts(id, form)
	var art: String = p["article"]
	var stem: String = p["stem"]
	var ending: String = p["ending"]
	if caps:
		art = Greek.caps(art)
		stem = Greek.caps(stem)
		ending = Greek.caps(ending)
	elif cap:
		if art != "":
			art = Greek.capitalize_first(art)
		else:
			stem = Greek.capitalize_first(stem)
	if not rich:
		return (art + " " if art != "" else "") + stem + ending
	var g := lex.gender(id)
	var out := ""
	if art != "":
		out += "[url=w|%s|article|%s][b][color=%s]%s[/color][/b][/url] " % [id, form, ARTICLE_COLORS[g], art]
	out += "[url=w|%s|stem|%s]%s[/url]" % [id, form, stem]
	if ending != "":
		var e := "[color=%s]%s[/color]" % [ARTICLE_COLORS.get(g, VERB_ENDING_COLOR), ending]
		if emph:
			e = "[wave amp=40 freq=6][b]%s[/b][/wave]" % e
		out += "[url=w|%s|ending|%s]%s[/url]" % [id, form, e]
	return out
