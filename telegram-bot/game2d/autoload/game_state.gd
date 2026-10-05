extends Node
## Session state and persistence: lexicon, level data, notebook, inventory, flags, word stats.

const LEXICON_PATH := "res://data/lexicon.json"
const LEVEL_PATH := "res://data/level1.json"

var lex: Lexicon
var level: Dictionary
var notebook: NotebookModel
var stats := LemmaStats.new()
var inventory: Array[String] = []
var flags: Dictionary = {}
var sketches: Dictionary = {}    # word_id -> true; hint level 3 sketches (not saved)
var scene_id := "pier"
var entry_side := "left"
var save_path := "user://save.json"


## Loaded in _init (not _ready): scripts run with `-s` (tests, snapshots) execute before autoload
## _ready, but after autoload construction.
func _init() -> void:
	lex = Lexicon.from_file(LEXICON_PATH)
	level = JSON.parse_string(FileAccess.get_file_as_string(LEVEL_PATH))
	_register_inputs()
	new_game()
	load_game()


func new_game() -> void:
	notebook = NotebookModel.new(lex, level["pages"])
	stats = LemmaStats.new()
	inventory.assign(level.get("start_inventory", []))
	flags = {}
	sketches = {}
	scene_id = level.get("start_scene", "pier")
	entry_side = "left"


func load_game() -> bool:
	var d := SaveCodec.read(save_path)
	if d.is_empty():
		return false
	new_game()
	notebook.load_dict(d.get("notebook", {}))
	stats.load_dict(d.get("stats", {}))
	inventory.assign(d.get("inventory", inventory))
	flags = d.get("flags", {})
	var sid: String = d.get("scene", scene_id)
	if level["scenes"].has(sid):
		scene_id = sid
	return true


func save_game() -> void:
	SaveCodec.write(save_path, {
		"scene": scene_id,
		"notebook": notebook.to_dict(),
		"stats": stats.to_dict(),
		"inventory": inventory,
		"flags": flags,
	})


func wipe_save() -> void:
	if FileAccess.file_exists(save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))
	new_game()


func see(word_id: String) -> void:
	if notebook.see(word_id):
		SignalBus.word_seen.emit(word_id)


## Every word of a line goes into the notebook (dual coding: heard + shown → card).
func see_line(l: Array) -> void:
	for w in LineFormat.word_ids(l):
		see(w)


func line(key: String) -> Array:
	return level["lines"][key]


func set_flag(flag: String) -> void:
	flags[flag] = true


func has_flag(flag: String) -> bool:
	return flags.get(flag, false)


func goto_scene(id: String, side: String = "left") -> void:
	scene_id = id
	entry_side = side
	save_game()
	get_tree().paused = false
	get_tree().change_scene_to_file(level["scenes"][id])


func _register_inputs() -> void:
	if InputMap.has_action("toggle_notebook"):
		return
	InputMap.add_action("toggle_notebook")
	for key in [KEY_TAB, KEY_N]:
		var ev := InputEventKey.new()
		ev.physical_keycode = key
		InputMap.action_add_event("toggle_notebook", ev)
