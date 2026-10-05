extends Node
## Boot: continue at the saved scene (or the level start).


func _ready() -> void:
	GameState.goto_scene.call_deferred(GameState.scene_id, GameState.entry_side)
