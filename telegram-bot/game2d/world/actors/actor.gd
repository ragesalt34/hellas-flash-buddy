class_name Actor
extends Node2D
## Flat procedural figure (feet at the origin) with ink outlines. Limbs are separate Shape nodes,
## so every gesture (point, hand-to-chest, nod, shake, scratch, reach) is a tween of a rotation.
## Gestures are the non-verbal channel of the pedagogy: person endings, yes/no, scaffolding.

signal arrived

const SHOULDER_Y := -160.0
const HEAD_Y := -196.0

@export var coat := Color("#3F7F95")
@export var trousers := Color("#4A3A48")
@export var skin := Color("#E8B89A")
@export_enum("none", "cap", "peaked", "beret") var hat := "none"
@export var speed := 420.0

var body: Node2D
var head: Node2D
var arm_l: Node2D
var arm_r: Node2D
var walking := false
var _target := Vector2.ZERO
var _t := 0.0
var _gesture: Tween
var _bubble: DialogueBubble


func _ready() -> void:
	body = Node2D.new()
	add_child(body)
	body.add_child(Shape.make(Ink.pts([-22, 0, -4, 0, -4, -84, -22, -84]), trousers))
	body.add_child(Shape.make(Ink.pts([4, 0, 22, 0, 22, -84, 4, -84]), trousers))
	body.add_child(Shape.make(Ink.pts([-36, -80, 36, -80, 30, -172, -30, -172]), coat))
	arm_l = _arm(Vector2(-34, SHOULDER_Y))
	arm_r = _arm(Vector2(34, SHOULDER_Y))
	head = Node2D.new()
	head.position = Vector2(0, HEAD_Y)
	body.add_child(head)
	head.add_child(Shape.make(Ink.circle_pts(Vector2.ZERO, 25), skin))
	head.add_child(Shape.make(Ink.circle_pts(Vector2(-9, -2), 3, 10), Palette.INK, 0.0))
	head.add_child(Shape.make(Ink.circle_pts(Vector2(9, -2), 3, 10), Palette.INK, 0.0))
	_add_hat()


func _arm(shoulder: Vector2) -> Node2D:
	var a := Node2D.new()
	a.position = shoulder
	body.add_child(a)
	a.add_child(Shape.make(Ink.pts([-9, -4, 9, -4, 8, 74, -8, 74]), coat))
	a.add_child(Shape.make(Ink.circle_pts(Vector2(0, 80), 10), skin))
	return a


func _add_hat() -> void:
	match hat:
		"cap":
			head.add_child(Shape.make(Ink.pts([-26, -8, 26, -8, 22, -30, 0, -36, -22, -30]), Palette.PAPER))
		"peaked":
			head.add_child(Shape.make(Ink.pts([-24, -14, 24, -14, 28, -36, -28, -36]), Color("#2E3A5C")))
			head.add_child(Shape.make(Ink.pts([-30, -14, 34, -14, 34, -7, -30, -7]), Color("#1F2740")))
		"beret":
			head.add_child(Shape.make(Ink.pts([-30, -12, 28, -16, 20, -32, -8, -36, -26, -28]), Palette.HAZE_DEEP))


## Rotation that makes a downward-hanging arm at `shoulder` point at `target` (both global).
static func arm_rotation(shoulder: Vector2, target: Vector2) -> float:
	return (target - shoulder).angle() - PI / 2.0


func walk_to(pos: Vector2) -> void:
	_target = pos
	walking = true


func _process(delta: float) -> void:
	if not walking:
		return
	var d := _target - position
	var step := speed * delta
	if d.length() <= step:
		position = _target
		walking = false
		body.position.y = 0.0
		arrived.emit()
	else:
		position += d.normalized() * step
		_t += delta
		body.position.y = -absf(sin(_t * 12.0)) * 6.0


func say(line: Array, seconds: float = 4.5) -> void:
	GameState.see_line(line)
	if _bubble == null:
		_bubble = DialogueBubble.new()
		_bubble.position = Vector2(0, -250)
		add_child(_bubble)
	_bubble.show_line(line, seconds)


func point_at(world_pos: Vector2, hold: float = 1.4) -> void:
	var arm := arm_r if world_pos.x >= global_position.x else arm_l
	var r := arm_rotation(arm.global_position, world_pos)
	var t := _play()
	t.tween_property(arm, "rotation", r, 0.25)
	t.tween_interval(hold)
	t.tween_property(arm, "rotation", 0.0, 0.3)


func hand_to_chest(hold: float = 1.2) -> void:
	var r := arm_rotation(arm_r.global_position, global_position + Vector2(-10, -126))
	var t := _play()
	t.tween_property(arm_r, "rotation", r, 0.25)
	t.tween_interval(hold)
	t.tween_property(arm_r, "rotation", 0.0, 0.3)


func shake_head() -> void:
	var t := _play()
	for i in 3:
		t.tween_property(head, "rotation", 0.28, 0.08)
		t.tween_property(head, "rotation", -0.28, 0.08)
	t.tween_property(head, "rotation", 0.0, 0.08)


func nod() -> void:
	var t := _play()
	for i in 2:
		t.tween_property(head, "position:y", HEAD_Y + 10.0, 0.12)
		t.tween_property(head, "position:y", HEAD_Y, 0.12)


func scratch_head() -> void:
	var r := arm_rotation(arm_r.global_position, global_position + Vector2(18, HEAD_Y - 28))
	var t := _play()
	t.tween_property(arm_r, "rotation", r, 0.25)
	for i in 3:
		t.tween_property(arm_r, "rotation", r + 0.18, 0.1)
		t.tween_property(arm_r, "rotation", r, 0.1)
	t.tween_property(head, "rotation", 0.15, 0.2)
	t.tween_interval(0.4)
	t.tween_property(arm_r, "rotation", 0.0, 0.3)
	t.tween_property(head, "rotation", 0.0, 0.2)


func reach_toward(world_pos: Vector2, hold: float = 2.0) -> void:
	var t := _play()
	t.set_parallel(true)
	t.tween_property(arm_l, "rotation", arm_rotation(arm_l.global_position, world_pos), 0.3)
	t.tween_property(arm_r, "rotation", arm_rotation(arm_r.global_position, world_pos), 0.3)
	t.chain().tween_interval(hold)
	t.chain().tween_property(arm_l, "rotation", 0.0, 0.3)
	t.tween_property(arm_r, "rotation", 0.0, 0.3)


func laugh() -> void:
	var t := _play()
	for i in 4:
		t.tween_property(body, "position:y", -10.0, 0.08)
		t.tween_property(body, "position:y", 0.0, 0.08)
	t.tween_property(head, "rotation", -0.2, 0.15)
	t.tween_interval(0.4)
	t.tween_property(head, "rotation", 0.0, 0.2)


func _play() -> Tween:
	if _gesture and _gesture.is_valid():
		_gesture.kill()
	arm_l.rotation = 0.0
	arm_r.rotation = 0.0
	head.rotation = 0.0
	head.position.y = HEAD_Y
	_gesture = create_tween()
	return _gesture
