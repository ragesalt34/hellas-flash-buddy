extends TestCase

var lex := Lexicon.from_file("res://data/lexicon.json")
var question := [["eimai", "1s"], " ", ["fylakas", "nom"], ". ", ["echo", "2s"], " ", ["diavatirio", "nom"], ";"]


func test_plain_capitalises_sentence_starts() -> void:
	eq(LineFormat.plain(question, lex), "Είμαι ο φύλακας. Έχεις το διαβατήριο;", "guard question")
	eq(LineFormat.plain([["nai", ""], ", ", ["echo", "1s"], " ", ["diavatirio", "nom"], "."], lex),
		"Ναι, έχω το διαβατήριο.", "answer, comma keeps lowercase")
	eq(LineFormat.plain([["faros", "nom"], "."], lex), "Ο φάρος.", "article capitalised")
	eq(LineFormat.plain([["ochi", ""]], lex, false), "όχι", "capitalize off")


func test_word_ids_unique_in_order() -> void:
	eq(LineFormat.word_ids(question), ["eimai", "fylakas", "echo", "diavatirio"] as Array[String], "ids")


func test_bbcode_links_each_part() -> void:
	var b := LineFormat.bbcode([["faros", "nom"]], lex)
	check(b.contains("[url=w|faros|article|nom]"), "article meta: " + b)
	check(b.contains("[url=w|faros|stem|nom]φάρ[/url]"), "stem meta: " + b)
	check(b.contains("[url=w|faros|ending|nom]"), "ending meta: " + b)
	check(b.contains(LineFormat.ARTICLE_COLORS["m"]), "gender colour")
	check(b.contains("Ο[/color]"), "capitalised article")


func test_bbcode_verb_ending_and_emphasis() -> void:
	var b := LineFormat.bbcode([["echo", "2s", "emph"]], lex, false)
	check(b.contains("[url=w|echo|stem|2s]έχ[/url]"), "verb stem: " + b)
	check(b.contains(LineFormat.VERB_ENDING_COLOR), "verb ending colour")
	check(b.contains("[wave"), "emphasis wave")


func test_bbcode_caps_for_signs() -> void:
	var b := LineFormat.bbcode([["limani", "nom"]], lex, true, true)
	check(b.contains("ΛΙΜΑΝ[/url]"), "caps stem without tonos: " + b)
	check(b.contains("ΤΟ[/color]"), "caps article")
