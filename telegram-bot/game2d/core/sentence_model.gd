class_name SentenceModel
extends RefCounted
## Slot state of the phrase builder for one target sentence.

var target: Array
var slots: Array


func _init(target_tokens: Array) -> void:
	target = target_tokens
	slots = []
	slots.resize(target.size())


func place(slot: int, token: Dictionary) -> void:
	slots[slot] = token


## Fills the first empty slot; returns its index, or -1 when every slot is taken.
func place_next(token: Dictionary) -> int:
	for i in slots.size():
		if slots[i] == null:
			slots[i] = token
			return i
	return -1


func clear(slot: int) -> void:
	slots[slot] = null


func clear_all() -> void:
	for i in slots.size():
		slots[i] = null


func is_full() -> bool:
	return not slots.has(null)


func evaluate() -> Dictionary:
	return ErrorClassifier.classify(slots, target)
