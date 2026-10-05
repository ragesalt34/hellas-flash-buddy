class_name ArtLibrary
extends RefCounted
## Optional painted art: PNGs in assets/art/ produced by tools/import_art.py from AI-generated images.
## Every visual falls back to its code-drawn version when its image is missing, so the game always runs.
## data/art_layout.json holds where things are in the painted backgrounds (click areas, belt positions):
## {"pier": {"ploio": [x, y, w, h], ...}, "conveyor": {"belt_m": [x, y], ...}}.

const DIR := "res://assets/art/"
const LAYOUT := "res://data/art_layout.json"
const ANCHORS := "res://assets/art/anchors.json"

static var _layout: Dictionary = {}
static var _anchors: Dictionary = {}
static var _loaded := false


static func has(name: String) -> bool:
	return ResourceLoader.exists(DIR + name + ".png")


static func tex(name: String) -> Texture2D:
	return load(DIR + name + ".png") if has(name) else null


## Click area of `key` in the painted background of `scene`, or `fallback`.
static func rect(scene: String, key: String, fallback: Rect2) -> Rect2:
	var v = _lookup(scene, key)
	return Rect2(v[0], v[1], v[2], v[3]) if v is Array and v.size() == 4 else fallback


static func point(scene: String, key: String, fallback: Vector2) -> Vector2:
	var v = _lookup(scene, key)
	return Vector2(v[0], v[1]) if v is Array and v.size() >= 2 else fallback


## x of the feet inside a character pose image (pointing arms make the image off-centre).
static func anchor_x(name: String, fallback: float) -> float:
	_load()
	return float(_anchors.get(name, fallback))


static func _lookup(scene: String, key: String) -> Variant:
	_load()
	return _layout.get(scene, {}).get(key)


static func _load() -> void:
	if _loaded:
		return
	_loaded = true
	for pair in [[LAYOUT, "_layout"], [ANCHORS, "_anchors"]]:
		if FileAccess.file_exists(pair[0]):
			var d = JSON.parse_string(FileAccess.get_file_as_string(pair[0]))
			if d is Dictionary:
				if pair[1] == "_layout":
					_layout = d
				else:
					_anchors = d
