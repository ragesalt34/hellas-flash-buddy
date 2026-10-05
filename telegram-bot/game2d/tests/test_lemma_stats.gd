extends TestCase


func test_record_counts() -> void:
	var s := LemmaStats.new()
	s.record("a", true)
	s.record("a", false)
	s.record("a", false)
	eq(s.data["a"], {"seen": 3, "correct": 1, "wrong": 2}, "counters")


func test_weakest_first_orders_by_mistakes_then_id() -> void:
	var s := LemmaStats.new()
	s.record("good", true)
	s.record("bad", false)
	eq(s.weakest_first(["good", "new", "bad"]), ["bad", "new", "good"], "wrong > unseen > correct")
	eq(s.weakest_first(["y", "x"]), ["x", "y"], "ties by id")


func test_load_dict_converts_json_floats() -> void:
	var s := LemmaStats.new()
	s.load_dict({"a": {"seen": 2.0, "correct": 1.0, "wrong": 1.0}})
	eq(s.data["a"]["seen"], 2, "int after load")


func test_crate_queue_cycles_without_repeats() -> void:
	var s := LemmaStats.new()
	s.record("b", false)
	var q := CrateQueue.build(["a", "b", "c"], s, 7)
	eq(q.size(), 7, "length")
	eq(q[0], "b", "weakest first")
	for i in range(1, q.size()):
		check(q[i] != q[i - 1], "no immediate repeat at %d" % i)
	eq(CrateQueue.build([], s, 3), [], "empty input")
