extends TestCase

const P := "user://test_codec.json"


func _cleanup() -> void:
	for p in [P, P + ".bak"]:
		if FileAccess.file_exists(p):
			DirAccess.remove_absolute(ProjectSettings.globalize_path(p))


func test_roundtrip() -> void:
	_cleanup()
	var state := {"scene": "pier", "flags": {"pier_open": true}, "inventory": ["diavatirio"]}
	eq(SaveCodec.write(P, state), true, "write")
	eq(SaveCodec.read(P), state, "read back without version key")
	_cleanup()


func test_missing_file_is_empty() -> void:
	_cleanup()
	eq(SaveCodec.read(P), {}, "missing")


func test_corrupt_file_moves_to_bak() -> void:
	_cleanup()
	var f := FileAccess.open(P, FileAccess.WRITE)
	f.store_string("{not json")
	f.close()
	eq(SaveCodec.read(P), {}, "corrupt → empty")
	eq(FileAccess.file_exists(P + ".bak"), true, "backup kept")
	eq(FileAccess.file_exists(P), false, "bad file removed")
	_cleanup()


func test_foreign_version_rejected() -> void:
	eq(SaveCodec.decode('{"version": 99, "scene": "pier"}'), {}, "future version")
	eq(SaveCodec.decode('[1, 2]'), {}, "not an object")
