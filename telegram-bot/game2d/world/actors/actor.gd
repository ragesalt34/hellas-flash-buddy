class_name Actor
extends Node2D
## Robed figure in the Chants-of-Sennaar manner (feet at the origin): long tunic with folds and a
## trimmed hem, mantle over the shoulders, wide sleeves, a pale mask-face with eye slits and a headwear
## that tells the role. Limbs are separate nodes, so every gesture (point, hand-to-chest, nod, shake,
## scratch, reach) is a tween of a rotation; idle breathing and walking sway run in _process.
## Gestures are the non-verbal channel of the pedagogy: person endings, yes/no, scaffolding.

signal arrived

const SHOULDER_Y := -168.0
const HEAD_Y := -204.0
const MASK := Color("#F4E7D8")

@export var coat := Color("#3F7F95")                ## tunic
@export var trousers := Color("#4A3A48")            ## trim: belt, hem band, mantle edge
@export var skin := Color("#E8B89A")                ## hands
@export_enum("none", "cap", "peaked", "beret") var hat := "none"   ## cap = sailor, peaked = guard, beret = traveller's hood
@export var speed := 420.0

var body: Node2D
var robe: Node2D
var head: Node2D
var arm_l: Node2D
var arm_r: Node2D
var walking := false
var _target := Vector2.ZERO
var _t := 0.0
var _walk_t := 0.0
var _gesture: Tween
var _bubble: DialogueBubble


func _ready() -> void:
	scale = Vector2(1.15, 1.15)
	_t = randf() * 10.0
	body = Node2D.new()
	add_child(body)
	var dark := coat.darkened(0.25)
	for fx in [-13.0, 13.0]:
		body.add_child(Shape.make(Ink.circle_pts(Vector2(fx, -5), 9, 14), Palette.INK.darkened(0.3), 0.0))
	robe = Node2D.new()
	robe.position = Vector2(0, -100)
	body.add_child(robe)
	robe.add_child(Shape.make(Ink.pts([-24, -78, 24, -78, 34, 30, 44, 94, -44, 94, -34, 30]), coat))
	robe.add_child(Shape.make(Ink.pts([-43, 80, 43, 80, 44, 94, -44, 94]), trousers, 2.0))
	robe.add_child(_line([-8, -50, -16, 78], dark))
	robe.add_child(_line([10, -40, 18, 78], dark))
	robe.add_child(_line([0, 10, 1, 78], dark))
	body.add_child(Shape.make(Ink.pts([-27, -112, 27, -112, 28, -100, -28, -100]), trousers, 2.0))
	body.add_child(Shape.make(Ink.pts([-7, -186, 7, -186, 7, -174, -7, -174]), MASK, 2.0))
	body.add_child(Shape.make(Ink.pts([-32, -178, 32, -178, 40, -152, 0, -136, -40, -152]), coat.lightened(0.12)))
	body.add_child(_line([-40, -152, 0, -136, 40, -152], trousers, 4.0))
	arm_l = _arm(Vector2(-30, SHOULDER_Y))
	arm_r = _arm(Vector2(30, SHOULDER_Y))
	head = Node2D.new()
	head.position = Vector2(0, HEAD_Y)
	body.add_child(head)
	_add_hat_back()
	head.add_child(Shape.make(_ellipse(Vector2.ZERO, 19, 24), MASK))
	head.add_child(_line([-10, -2, -4, -1], Palette.INK, 2.5))
	head.add_child(_line([4, -1, 10, -2], Palette.INK, 2.5))
	head.add_child(_line([0, 1, -1, 10], Color(Palette.INK, 0.45), 2.0))
	_add_hat_front()


func _arm(shoulder: Vector2) -> Node2D:
	var a := Node2D.new()
	a.position = shoulder
	body.add_child(a)
	a.add_child(Shape.make(Ink.pts([-9, -6, 9, -6, 14, 66, -14, 66]), coat.darkened(0.08)))
	a.add_child(Shape.make(Ink.pts([-14, 60, 14, 60, 14, 66, -14, 66]), trousers, 2.0))
	a.add_child(Shape.make(Ink.circle_pts(Vector2(0, 74), 8, 14), skin))
	return a


func _add_hat_back() -> void:
	if hat == "beret":   # traveller's hood, drawn behind the mask
		head.add_child(Shape.make(Ink.pts([-27, 26, -29, -10, -18, -30, 4, -36, 26, -24, 34, -4, 30, 26]), coat.darkened(0.1)))


func _add_hat_front() -> void:
	match hat:
		"cap":
			head.add_child(Shape.make(Ink.pts([-21, -10, 21, -10, 19, -26, 8, -34, -8, -34, -19, -26]), Palette.PAPER))
			head.add_child(Shape.make(Ink.pts([-22, -14, 22, -14, 22, -8, -22, -8]), Color("#2F5D8A"), 2.0))
			head.add_child(Shape.make(Ink.circle_pts(Vector2(0, -36), 5, 10), Color("#C8402F"), 2.0))
		"peaked":
			head.add_child(Shape.make(Ink.pts([-20, -12, 20, -12, 24, -38, -24, -38]), Color("#2E3A5C")))
			head.add_child(Shape.make(Ink.pts([-24, -12, 30, -12, 30, -5, -24, -5]), Color("#1F2740"), 2.0))
			head.add_child(Shape.make(Ink.circle_pts(Vector2(0, -26), 5, 10), Palette.GOLD, 2.0))
		"beret":
			head.add_child(_line([-25, 14, -20, -18, 0, -27, 20, -18, 25, 14], coat.darkened(0.3), 3.0))


func _line(flat: Array, c: Color, w: float = 2.0) -> Line2D:
	var l := Line2D.new()
	l.points = Ink.pts(flat)
	l.default_color = c
	l.width = w
	l.antialiased = true
	l.joint_mode = Line2D.LINE_JOINT_ROUND
	l.begin_cap_mode = Line2D.LINE_CAP_ROUND
	l.end_cap_mode = Line2D.LINE_CAP_ROUND
	return l


static func _ellipse(c: Vector2, rx: float, ry: float, n: int = 24) -> PackedVector2Array:
	var p := PackedVector2Array()
	for i in n:
		var a := TAU * i / n
		p.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	return p


## Rotation that makes a downward-hanging arm at `shoulder` point at `target` (both global).
static func arm_rotation(shoulder: Vector2, target: Vector2) -> float:
	return (target - shoulder).angle() - PI / 2.0


func walk_to(pos: Vector2) -> void:
	_target = pos
	walking = true


func _draw() -> void:
	draw_set_transform(Vector2(0, -2), 0.0, Vector2(1.0, 0.26))
	draw_circle(Vector2.ZERO, 46.0, Color(Palette.INK, 0.16))
	draw_set_transform(Vector2.ZERO)


func _process(delta: float) -> void:
	_t += delta
	if walking:
		var d := _target - position
		var step := speed * delta
		if d.length() <= step:
			position = _target
			walking = false
			arrived.emit()
		else:
			position += d.normalized() * step
			_walk_t += delta
	if walking:
		body.position.y = -absf(sin(_walk_t * 11.0)) * 5.0
		body.scale.y = 1.0
		robe.skew = sin(_walk_t * 11.0) * 0.08
		body.rotation = sin(_walk_t * 5.5) * 0.02
	else:
		body.position.y = 0.0
		body.scale.y = 1.0 + sin(_t * 1.7) * 0.012
		robe.skew = sin(_t * 0.9) * 0.015
		body.rotation = 0.0


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
	var r := arm_rotation(arm_r.global_position, global_position + Vector2(-6, -140))
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
		t.tween_property(head, "position:y", HEAD_Y - 8.0, 0.08)
		t.tween_property(head, "position:y", HEAD_Y, 0.08)
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
