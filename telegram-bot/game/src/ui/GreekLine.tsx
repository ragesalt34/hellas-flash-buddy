import { lemma, lemmaOf, tokenize, type LemmaId } from '../content/lexicon';
import type { JournalState } from '../story/journal';

/** A Greek line whose words are clickable; deciphered words show their meaning, others the player's note. */
export function GreekLine({
  text,
  journal,
  onWord,
  highlight,
}: {
  text: string;
  journal: JournalState;
  onWord: (id: LemmaId) => void;
  /** The word a review request is about. */
  highlight?: LemmaId;
}) {
  return (
    <span className="greek">
      {text.split(/(\s+)/).map((part, i) => {
        const [word] = tokenize(part);
        const id = word ? lemmaOf(word) : null;
        if (!id) return <span key={i}>{part}</span>;
        const gloss = journal.deciphered.includes(id) ? lemma(id).ru : journal.notes[id];
        return (
          <span
            key={i}
            className={id === highlight ? 'word target' : 'word'}
            onClick={(e) => {
              e.stopPropagation();
              onWord(id);
            }}
          >
            {part}
            {gloss && <small>{gloss}</small>}
          </span>
        );
      })}
    </span>
  );
}
