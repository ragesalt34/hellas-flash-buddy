class_name Fonts
extends RefCounted
## GFS Didot (Greek subset) for in-world Greek; falls back to Godot's default font for
## punctuation, Latin and Cyrillic.

static var _greek: Font
static var _greek_bold: Font


static func greek() -> Font:
	if _greek == null:
		var f: FontFile = load("res://assets/fonts/gfs-didot-greek-400-normal.woff2")
		f.fallbacks = [ThemeDB.fallback_font]
		_greek = f
	return _greek


static func greek_bold() -> Font:
	if _greek_bold == null:
		var v := FontVariation.new()
		v.base_font = greek()
		v.variation_embolden = 0.9
		_greek_bold = v
	return _greek_bold
