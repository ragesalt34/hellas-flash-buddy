extends TestCase


func test_ink_points() -> void:
	eq(Ink.pts([1, 2, 3, 4]), PackedVector2Array([Vector2(1, 2), Vector2(3, 4)]), "pairs")
	eq(Ink.circle_pts(Vector2.ZERO, 10.0, 4).size(), 4, "circle point count")


func test_every_lexicon_picto_is_drawable() -> void:
	var lex := Lexicon.from_file("res://data/lexicon.json")
	for id in lex.ids():
		check(lex.picto(id) in Picto.ALL, "picto drawn for " + id)


func test_greek_font_loads_with_fallback() -> void:
	var f := Fonts.greek()
	check(f != null, "font loaded")
	check(f.fallbacks.size() > 0, "fallback for punctuation/latin")
