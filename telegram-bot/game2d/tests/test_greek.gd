extends TestCase


func test_caps_strips_tonos() -> void:
	eq(Greek.caps("λιμάνι"), "ΛΙΜΑΝΙ", "tonos on alpha")
	eq(Greek.caps("έξοδος"), "ΕΞΟΔΟΣ", "tonos + final sigma")
	eq(Greek.caps("διαβατήριο"), "ΔΙΑΒΑΤΗΡΙΟ", "tonos on eta")
	eq(Greek.caps("το λιμάνι"), "ΤΟ ΛΙΜΑΝΙ", "two words")


func test_capitalize_first_keeps_tonos() -> void:
	eq(Greek.capitalize_first("όχι"), "Όχι", "accented first letter")
	eq(Greek.capitalize_first("ναι"), "Ναι", "plain")
	eq(Greek.capitalize_first(""), "", "empty")
