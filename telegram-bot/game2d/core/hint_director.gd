class_name HintDirector
extends RefCounted
## Non-verbal scaffolding level for one puzzle (pedagogy spec, "Иерархия невербального скаффолдинга"):
## 0 autonomous; 1 kinetic (30 s idle / 2 wrong); 2 audiovisual (60 s / 4 wrong); 3 graphic (90 s idle).
## The level only rises until the puzzle is solved. tick() is driven by a pausable node, so time
## spent in the (pausing) notebook never escalates hints.

signal level_changed(level: int)

const IDLE_THRESHOLDS := [30.0, 60.0, 90.0]
const WRONG_THRESHOLDS := [2, 4]

var level := 0
var idle := 0.0
var wrong := 0
var active := true


func tick(delta: float) -> void:
	if not active:
		return
	idle += delta
	_update()


func on_input() -> void:
	idle = 0.0


func on_wrong() -> void:
	if not active:
		return
	wrong += 1
	idle = 0.0
	_update()


func solve() -> void:
	active = false
	idle = 0.0
	wrong = 0
	if level != 0:
		level = 0
		level_changed.emit(0)


func restart() -> void:
	active = true
	idle = 0.0
	wrong = 0
	level = 0


func computed_level() -> int:
	var by_idle := 0
	for i in IDLE_THRESHOLDS.size():
		if idle >= IDLE_THRESHOLDS[i]:
			by_idle = i + 1
	var by_wrong := 0
	for i in WRONG_THRESHOLDS.size():
		if wrong >= WRONG_THRESHOLDS[i]:
			by_wrong = i + 1
	return maxi(by_idle, by_wrong)


func _update() -> void:
	var c := computed_level()
	if c > level:
		level = c
		level_changed.emit(level)
