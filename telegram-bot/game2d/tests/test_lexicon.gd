extends TestCase

var lex := Lexicon.from_file("res://data/lexicon.json")


func test_budget_is_sixteen_units() -> void:
	eq(lex.ids().size(), 16, "level 1 budget")


func test_noun_surfaces() -> void:
	eq(lex.surface("faros"), "ο φάρος", "nom default")
	eq(lex.surface("faros", "nom"), "ο φάρος", "nom explicit")
	eq(lex.surface("faros", "bare"), "φάρος", "bare")
	eq(lex.surface("kouti"), "το κουτί", "neuter")
	eq(lex.surface("exodos"), "η έξοδος", "feminine in -ος")


func test_verb_and_particle_surfaces() -> void:
	eq(lex.surface("echo"), "έχω", "default 1s")
	eq(lex.surface("echo", "2s"), "έχεις", "2s")
	eq(lex.surface("eimai", "3s"), "είναι", "3s irregular")
	eq(lex.surface("ochi"), "όχι", "particle")


func test_parts_split_stem_and_ending() -> void:
	eq(lex.parts("naftis"), {"article": "ο", "stem": "ναύτ", "ending": "ης"}, "noun parts")
	eq(lex.parts("echo", "2s"), {"article": "", "stem": "έχ", "ending": "εις"}, "verb parts")


func test_article_matches_gender() -> void:
	var want := {"m": "ο", "f": "η", "n": "το"}
	for id in lex.ids():
		if lex.pos(id) == "noun":
			eq(lex.parts(id)["article"], want[lex.gender(id)], id)


func test_pictos_are_unique_and_reversible() -> void:
	var seen := {}
	for id in lex.ids():
		var p := lex.picto(id)
		check(not seen.has(p), "duplicate picto " + p)
		seen[p] = true
		eq(lex.word_by_picto(p), id, "reverse " + p)
	eq(lex.word_by_picto("nope"), "", "unknown picto")
