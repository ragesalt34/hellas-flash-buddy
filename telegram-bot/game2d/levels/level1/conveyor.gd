extends LevelScene
## Ταινία — crates labelled with bare nouns; drag each onto the belt of its class (Ο / Η / ΤΟ).
## The ending → class mapping is learned inductively: a wrong belt bounces the crate back, a right one
## makes the worker say the noun *with* its article.

const SPAWN := Vector2(560, 720)

var worker: Actor
var belts: Array = []
var queue: Array = []
var crate: Crate
var sorted_count := 0
var goal := 6
var rope: RopeGate


func build() -> void:
	backdrop.style = "warehouse"
	left_exit = "pier"
	right_exit = "customs"
	walk_rect = Rect2(60, 860, 1800, 150)
	var genders := ["m", "f", "n"]
	for i in 3:
		var b := Belt.new()
		b.gender = genders[i]
		b.position = Vector2(960 + i * 300, 760)
		back_layer(b)
		belts.append(b)
	var table := back_layer(Node2D.new())
	table.position = SPAWN
	table.add_child(Shape.make(Ink.pts([-130, 0, 130, 0, 130, 30, -130, 30]), Palette.WOOD))
	worker = Actor.new()
	worker.coat = Color("#6B8E5A")
	worker.hat = "cap"
	worker.position = Vector2(330, 900)
	ysort.add_child(worker)
	rope = RopeGate.new()
	rope.position = Vector2(1800, 920)
	ysort.add_child(rope)
	goal = int(GameState.level["conveyor"]["goal"])
	if GameState.has_flag("conveyor_done"):
		rope.set_open(true, false)
		return
	gate_x = 1720.0
	add_puzzle("conveyor")
	active_puzzle = "conveyor"
	queue = CrateQueue.build(GameState.level["conveyor"]["words"], GameState.stats, goal)
	_spawn_next()


func _spawn_next() -> void:
	if queue.is_empty():
		crate = null
		return
	var w: String = queue.pop_front()
	GameState.see(w)
	crate = Crate.new()
	crate.word_id = w
	crate.home = SPAWN
	crate.position = SPAWN + Vector2(-420, 0)
	add_child(crate)
	crate.dropped.connect(_on_crate_dropped)
	crate.slide_in()
	if hints.has("conveyor"):
		apply_hint("conveyor", hints["conveyor"].level)


func belt_at(pos: Vector2) -> Belt:
	for b in belts:
		if b.drop_rect().has_point(pos):
			return b
	return null


func belt_for(word_id: String) -> Belt:
	for b in belts:
		if b.gender == GameState.lex.gender(word_id):
			return b
	return null


func _on_crate_dropped(c: Crate, at: Vector2) -> void:
	var b := belt_at(at)
	if b == null:
		c.return_home()
	else:
		sort_crate(c, b)


func sort_crate(c: Crate, b: Belt) -> bool:
	var ok: bool = GameState.lex.gender(c.word_id) == b.gender
	GameState.stats.record(c.word_id, ok)
	SignalBus.crate_sorted.emit(c.word_id, ok)
	if not ok:
		wrong_attempt()
		worker.shake_head()
		worker.say(GameState.line("worker_no"), 2.5)
		c.return_home(true)
		return false
	_on_activity()
	sorted_count += 1
	worker.say([[c.word_id, "nom"], "."], 3.0)
	c.ride_away(b.global_position + Vector2(0, -60))
	b.flash()
	for x in belts:
		x.set_pulse(false)
	if sorted_count >= goal:
		crate = null
		_finish()
	else:
		_spawn_next()
	return true


func _finish() -> void:
	GameState.set_flag("conveyor_done")
	open_gate()
	rope.set_open(true)
	solve_puzzle("conveyor")
	worker.nod()
	worker.say(GameState.line("worker_yes"), 3.0)


func apply_hint(id: String, level: int) -> void:
	if id != "conveyor" or crate == null:
		return
	for b in belts:
		b.set_pulse(false)
	crate.show_frame_hint(false)
	if level == 0:
		return
	var target := belt_for(crate.word_id)
	worker.point_at(target.global_position + Vector2(0, -300))
	if level >= 2:
		target.set_pulse(true)
	if level >= 3:
		crate.show_frame_hint(true)


func debug_setup(case_name: String) -> void:
	if case_name == "hint":
		hints["conveyor"].tick(91.0)
