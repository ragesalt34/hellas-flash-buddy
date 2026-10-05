class_name TestCase
extends RefCounted
## Minimal assertion base used by tests/run_tests.gd. Failures are recorded, not thrown,
## so one test reports every broken expectation at once.

var failures: Array[String] = []
var tree: SceneTree


func check(cond: bool, msg: String) -> void:
	if not cond:
		failures.append(msg)


func eq(actual: Variant, expected: Variant, msg: String = "") -> void:
	if typeof(actual) != typeof(expected) or actual != expected:
		failures.append("%s: expected %s (%s), got %s (%s)" % [
			msg, var_to_str(expected), type_string(typeof(expected)),
			var_to_str(actual), type_string(typeof(actual))])
