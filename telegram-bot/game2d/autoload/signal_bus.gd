extends Node
## Global signals. Emitters and listeners never reference each other directly.

@warning_ignore_start("unused_signal")
signal word_seen(word_id: String)
signal card_assigned(word_id: String, picto_id: String)
signal page_checked(page_id: String, result: String)
signal entity_clicked(entity: Node)
signal crate_sorted(word_id: String, ok: bool)
signal sentence_submitted(puzzle_id: String, result: Dictionary)
signal item_given(item_id: String, ok: bool)
signal hint_level_changed(puzzle_id: String, level: int)
signal puzzle_solved(puzzle_id: String)
signal notebook_opened
signal notebook_closed
@warning_ignore_restore("unused_signal")
