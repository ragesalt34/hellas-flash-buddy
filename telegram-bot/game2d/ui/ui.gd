class_name Ui
extends RefCounted
## Shared look for code-built UI: paper panels, ink borders, ink text, class-coloured word cards.


static func panel_style(radius: int = 0, border: int = 4, bg: Color = Palette.PAPER) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = Palette.INK
	sb.set_border_width_all(border)
	sb.set_corner_radius_all(radius)
	sb.set_content_margin_all(14)
	sb.anti_aliasing = true
	return sb


static func label(text: String, px: int = 24) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", px)
	l.add_theme_color_override("font_color", Palette.INK)
	return l


static func greek_label(text: String, px: int = 32) -> Label:
	var l := label(text, px)
	l.add_theme_font_override("font", Fonts.greek())
	return l


static func style_button(b: Button, text: String, px: int = 24) -> Button:
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_size_override("font_size", px)
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color", "font_hover_pressed_color"]:
		b.add_theme_color_override(c, Palette.INK)
	b.add_theme_color_override("font_disabled_color", Color(Palette.INK, 0.35))
	b.add_theme_stylebox_override("normal", panel_style(12, 3))
	b.add_theme_stylebox_override("hover", panel_style(12, 3, Palette.SHADE.lerp(Palette.PAPER, 0.5)))
	b.add_theme_stylebox_override("pressed", panel_style(12, 3, Palette.SHADE))
	b.add_theme_stylebox_override("hover_pressed", panel_style(12, 3, Palette.SHADE))
	b.add_theme_stylebox_override("disabled", panel_style(12, 2, Palette.PAPER.darkened(0.04)))
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	return b


static func button(text: String, px: int = 24) -> Button:
	return style_button(Button.new(), text, px)


static func icon_button(picto_id: String, side: float = 96.0) -> Button:
	var b := button("", 20)
	b.custom_minimum_size = Vector2(side, side)
	var p := Picto.new()
	p.picto_id = picto_id
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.set_anchors_preset(Control.PRESET_FULL_RECT)
	p.offset_left = 10
	p.offset_top = 10
	p.offset_right = -10
	p.offset_bottom = -10
	b.add_child(p)
	return b


## Word card frame by class (pedagogy §4.1): ο tall side bars, η round, το square; verbs/particles plain ink.
static func card_style(gender: String, selected: bool, locked: bool) -> StyleBoxFlat:
	var bg := Palette.PAPER
	if locked:
		bg = Palette.GOLD.lerp(Palette.PAPER, 0.72)
	elif selected:
		bg = Palette.SHADE
	var sb := panel_style(0, 4, bg)
	sb.border_color = Palette.gender_color(gender)
	match gender:
		"m":
			sb.border_width_left = 12
			sb.border_width_right = 12
			sb.border_width_top = 3
			sb.border_width_bottom = 3
		"f":
			sb.set_corner_radius_all(36)
			sb.set_border_width_all(6)
		"n":
			sb.set_border_width_all(7)
		_:
			sb.border_color = Palette.INK
			sb.set_corner_radius_all(12)
			sb.set_border_width_all(3)
	return sb
