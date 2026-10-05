extends SceneTree
## Plays Level 1 start to end with real input events pushed into the viewport (GUI, unhandled input,
## physics picking, drag-and-drop take the same paths as a human player).
## Usage: godot --headless --path . -s res://tools/autoplay.gd   → prints AUTOPLAY OK, exit 0.
## The scenario lives in autoplay_runner.gd: a -s script is compiled before autoloads exist, so it
## must not reference game classes itself.


func _initialize() -> void:
	await process_frame
	root.add_child(load("res://tools/autoplay_runner.gd").new())
