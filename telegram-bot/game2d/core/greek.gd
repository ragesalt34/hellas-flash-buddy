class_name Greek
extends RefCounted
## Greek text helpers.

const _TONOS := {"Ά": "Α", "Έ": "Ε", "Ή": "Η", "Ί": "Ι", "Ό": "Ο", "Ύ": "Υ", "Ώ": "Ω", "ΐ": "Ϊ", "ΰ": "Ϋ"}


## All-caps for signage: Greek drops the tonos on capitals (ΛΙΜΑΝΙ, not ΛΙΜΆΝΙ).
static func caps(s: String) -> String:
	var out := s.to_upper()
	for k in _TONOS:
		out = out.replace(k, _TONOS[k])
	return out


## Sentence-start capital; keeps the tonos (όχι → Όχι).
static func capitalize_first(s: String) -> String:
	if s.is_empty():
		return s
	return s.substr(0, 1).to_upper() + s.substr(1)
