extends TestCase


func _scene() -> Node:
	tree.root.get_node("GameState").new_game()
	var s: Node = load("res://levels/level1/conveyor.tscn").instantiate()
	tree.root.add_child(s)
	return s


func test_wrong_belt_bounces_and_counts() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	check(s.crate != null, "a crate is waiting")
	var w: String = s.crate.word_id
	eq(gs.notebook.is_seen(w), true, "crate word seen")
	var wrong: Belt = null
	for b in s.belts:
		if b.gender != gs.lex.gender(w):
			wrong = b
	eq(s.sort_crate(s.crate, wrong), false, "rejected")
	eq(s.sorted_count, 0, "not counted")
	eq(s.hints["conveyor"].wrong, 1, "wrong attempt")
	eq(gs.stats.data[w]["wrong"], 1, "stats")
	s.free()


func test_goal_opens_gate() -> void:
	var gs := tree.root.get_node("GameState")
	var s := _scene()
	for i in s.goal:
		var c: Crate = s.crate
		eq(s.sort_crate(c, s.belt_for(c.word_id)), true, "sort %d" % i)
	eq(s.sorted_count, s.goal, "count")
	eq(gs.has_flag("conveyor_done"), true, "flag")
	eq(s.gate_x, INF, "gate open")
	eq(s.crate, null, "no more crates")
	s.free()


func test_belt_at_uses_drop_rects() -> void:
	var s := _scene()
	var b: Belt = s.belts[1]
	eq(s.belt_at(b.drop_rect().get_center()), b, "inside")
	eq(s.belt_at(Vector2(10, 10)), null, "outside")
	s.free()


func test_crate_label_has_no_class_colour() -> void:
	var s := _scene()
	check(not s.crate.label.text.contains("[color"), "crate label must not reveal the class: " + s.crate.label.text)
	s.free()
