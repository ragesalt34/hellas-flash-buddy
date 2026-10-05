extends SceneTree
## Headless test runner: godot --headless --path . -s res://tests/run_tests.gd -- [prefix ...]
## Loads every tests/test_*.gd (optionally filtered by file-name prefix) and calls each test_*
## method on a fresh instance. Exit code 1 when anything failed.

const SAVE_FOR_TESTS := "user://test_run_save.json"


func _initialize() -> void:
	var gs := root.get_node_or_null("GameState")
	if gs:
		gs.save_path = SAVE_FOR_TESTS
	var filters := OS.get_cmdline_user_args()
	var files: Array[String] = []
	for f in DirAccess.open("res://tests").get_files():
		if not (f.begins_with("test_") and f.ends_with(".gd")):
			continue
		if filters.is_empty() or Array(filters).any(func(p): return f.begins_with(p)):
			files.append(f)
	files.sort()
	var total := 0
	var failed := 0
	for f in files:
		var script: GDScript = load("res://tests/" + f)
		if script == null or not script.can_instantiate():
			failed += 1
			print("  FAIL %s (does not compile)" % f)
			continue
		for m in script.get_script_method_list():
			var name: String = m["name"]
			if not name.begins_with("test_"):
				continue
			total += 1
			var t = script.new()
			t.tree = self
			t.call(name)
			if t.failures.is_empty():
				print("  ok   %s::%s" % [f, name])
			else:
				failed += 1
				print("  FAIL %s::%s" % [f, name])
				for msg in t.failures:
					print("       " + msg)
	if FileAccess.file_exists(SAVE_FOR_TESTS):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_FOR_TESTS))
	print("%d tests, %d failed" % [total, failed])
	quit(1 if failed > 0 else 0)
