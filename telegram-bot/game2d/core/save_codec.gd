class_name SaveCodec
extends RefCounted
## Versioned JSON save. A corrupt or foreign file is moved aside to <path>.bak and treated as no save,
## so a broken file never blocks starting the game.

const VERSION := 1


static func encode(state: Dictionary) -> String:
	var d := state.duplicate(true)
	d["version"] = VERSION
	return JSON.stringify(d, "\t")


static func decode(text: String) -> Dictionary:
	var d = JSON.parse_string(text)
	if not (d is Dictionary) or int(d.get("version", -1)) != VERSION:
		return {}
	d.erase("version")
	return d


static func write(path: String, state: Dictionary) -> bool:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		push_warning("save failed: %s" % error_string(FileAccess.get_open_error()))
		return false
	f.store_string(encode(state))
	f.close()
	return true


static func read(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var d := decode(FileAccess.get_file_as_string(path))
	if d.is_empty():
		var abs_path := ProjectSettings.globalize_path(path)
		DirAccess.copy_absolute(abs_path, abs_path + ".bak")
		DirAccess.remove_absolute(abs_path)
	return d
