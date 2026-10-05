extends TestCase


func test_arm_rotation_directions() -> void:
	check(is_equal_approx(Actor.arm_rotation(Vector2.ZERO, Vector2(0, 10)), 0.0), "down = rest")
	check(is_equal_approx(Actor.arm_rotation(Vector2.ZERO, Vector2(10, 0)), -PI / 2.0), "right")
	check(is_equal_approx(Actor.arm_rotation(Vector2.ZERO, Vector2(-10, 0)), PI / 2.0), "left")


func test_interactive_text_renders_line() -> void:
	var gs := tree.root.get_node("GameState")
	var t := InteractiveText.new()
	t.set_line(gs.line("sailor_intro"))
	eq(t.text, LineFormat.bbcode(gs.line("sailor_intro"), gs.lex), "bbcode")
	t.free()


func test_actor_say_marks_words_seen() -> void:
	var gs := tree.root.get_node("GameState")
	gs.new_game()
	var a := Actor.new()
	tree.root.add_child(a)
	a.say(gs.line("sailor_intro"))
	eq(gs.notebook.is_seen("naftis"), true, "naftis seen")
	eq(gs.notebook.is_seen("eimai"), true, "eimai seen")
	a.free()


func test_bind_held_card_assigns_object_picto() -> void:
	var gs := tree.root.get_node("GameState")
	var cm := tree.root.get_node("CursorManager")
	gs.new_game()
	gs.see("faros")
	cm.hold("faros")
	gs.bind_held_card("varka")
	eq(gs.notebook.assignment("faros"), "boat", "hypothesis = object picto")
	eq(cm.is_holding(), false, "cursor released")
	gs.bind_held_card("ploio")
	eq(gs.notebook.assignment("faros"), "boat", "nothing held → no change")


func test_sign_board_sees_its_word() -> void:
	var gs := tree.root.get_node("GameState")
	gs.new_game()
	var s := SignBoard.new().setup([["limani", "nom"]])
	tree.root.add_child(s)
	eq(gs.notebook.is_seen("limani"), true, "sign word seen")
	eq(s.hit.word_id, "limani", "sign interactable")
	s.free()
