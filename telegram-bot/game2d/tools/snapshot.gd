extends SceneTree
## Renders scenes off-screen at 1920×1080 into res://tools/out/<name>[_case].png.
## Usage: ./snap.sh gallery pier pier:notebook   (names: "gallery" or a level1.json scene key)
## A scene may implement debug_setup(case: String) to stage a state before the capture.
## Uses its own save file so the player's progress is never touched.


func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://tools/out"))
	# .gdignore keeps Godot from importing the PNGs as project resources.
	FileAccess.open("res://tools/out/.gdignore", FileAccess.WRITE).close()
	var gs := root.get_node("GameState")
	gs.save_path = "user://snapshot_save.json"
	for arg in OS.get_cmdline_user_args():
		var name := arg.get_slice(":", 0)
		var case_name := arg.get_slice(":", 1) if arg.contains(":") else ""
		var path: String = "res://tools/gallery.tscn" if name == "gallery" else gs.level["scenes"][name]
		gs.new_game()
		paused = false
		var vp := SubViewport.new()
		vp.size = Vector2i(1920, 1080)
		vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
		root.add_child(vp)
		var scene: Node = load(path).instantiate()
		vp.add_child(scene)
		await process_frame
		if scene.has_method("debug_setup"):
			await scene.debug_setup(case_name)
		for i in 40:
			await process_frame
		await RenderingServer.frame_post_draw
		var out := "res://tools/out/%s.png" % arg.replace(":", "_")
		vp.get_texture().get_image().save_png(ProjectSettings.globalize_path(out))
		print("snapshot ", ProjectSettings.globalize_path(out))
		vp.queue_free()
		await process_frame
	if FileAccess.file_exists(gs.save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(gs.save_path))
	quit(0)
