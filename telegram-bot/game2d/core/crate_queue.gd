class_name CrateQueue
extends RefCounted
## Order of nouns on the conveyor: weakest first, cycling, never the same word twice in a row.


static func build(ids: Array, stats: LemmaStats, count: int) -> Array:
	var order := stats.weakest_first(ids)
	var out: Array = []
	if order.is_empty():
		return out
	var i := 0
	while out.size() < count:
		var w = order[i % order.size()]
		i += 1
		if not out.is_empty() and out[-1] == w and order.size() > 1:
			continue
		out.append(w)
	return out
