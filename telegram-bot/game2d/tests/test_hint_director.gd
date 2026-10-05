extends TestCase

var got: Array = []


func _h() -> HintDirector:
	got = []
	var h := HintDirector.new()
	h.level_changed.connect(_on_level)
	return h


func _on_level(l: int) -> void:
	got.append(l)


func test_idle_thresholds() -> void:
	var h := _h()
	h.tick(29.9)
	eq(h.level, 0, "under 30 s")
	h.tick(0.2)
	eq(h.level, 1, "30 s kinetic")
	h.tick(30.0)
	eq(h.level, 2, "60 s audiovisual")
	h.tick(30.0)
	eq(h.level, 3, "90 s graphic")
	eq(got, [1, 2, 3], "each level emitted once")


func test_wrong_attempt_thresholds() -> void:
	var h := _h()
	h.on_wrong()
	eq(h.level, 0, "1 wrong")
	h.on_wrong()
	eq(h.level, 1, "2 wrong")
	h.on_wrong()
	h.on_wrong()
	eq(h.level, 2, "4 wrong")
	for i in 10:
		h.on_wrong()
	eq(h.level, 2, "mistakes alone never reach level 3")


func test_input_resets_idle_but_level_stays() -> void:
	var h := _h()
	h.tick(45.0)
	h.on_input()
	eq(h.idle, 0.0, "idle reset")
	eq(h.level, 1, "level does not drop")
	h.tick(20.0)
	eq(h.level, 1, "needs a full new idle period")


func test_solve_resets_and_stops() -> void:
	var h := _h()
	h.tick(61.0)
	h.solve()
	eq(h.level, 0, "back to 0")
	eq(got, [2, 0], "solve emits 0")
	h.tick(500.0)
	h.on_wrong()
	eq(h.level, 0, "inactive after solve")
	h.restart()
	h.tick(31.0)
	eq(h.level, 1, "restart re-arms")
