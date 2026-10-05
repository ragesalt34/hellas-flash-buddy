class_name Palette
extends RefCounted
## Colours of the Piraeus look (carried over from the 3D version) + gender classes (pedagogy spec).

const PAPER := Color("#FBF7F0")
const SHADE := Color("#FAC2B8")
const INK := Color("#80294D")
const HAZE_DEEP := Color("#A0206E")
const HAZE_LIGHT := Color("#D8609C")
const SEA := Color("#7FB9C4")
const SEA_DEEP := Color("#4F8FA3")
const STONE := Color("#EADFCF")
const WOOD := Color("#C39467")
const GOLD := Color("#D9A13B")    # class ο: amber, vertical
const AZURE := Color("#3B8FD9")   # class η: azure, round
const TERRA := Color("#C8643B")   # class το: terracotta, square
const OK := Color("#4E9A5B")
const BAD := Color("#C8402F")


static func gender_color(g: String) -> Color:
	match g:
		"m":
			return GOLD
		"f":
			return AZURE
		"n":
			return TERRA
	return INK
