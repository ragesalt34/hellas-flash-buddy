const ART = {
  home: 'header-paper-v1/home',
  quiz: 'progress-artwork-v1/quiz',
  flashcards: 'header-paper-v1/flashcards',
  vocab: 'progress-artwork-v1/words',
  stats: 'header-paper-v1/stats',
  homework: 'header-paper-v1/homework',
  accuracy: 'progress-artwork-v1/precision',
  streak: 'progress-artwork-v1/streak',
  words: 'progress-artwork-v1/words',
  speech: 'progress-artwork-v1/greek',
  memory: 'progress-artwork-v1/memory',
  russian: 'progress-artwork-v1/russian',
} as const;

/** Original project artwork; the adjacent live text carries the meaning. */
export function StudyIcon({ name, className = '' }: { name: keyof typeof ART; className?: string }) {
  return <span className={`study-icon ${className}`} aria-hidden="true">
    <img className="study-icon-art" src={`${import.meta.env.BASE_URL}assets/${ART[name]}.webp`} width="48" height="48" alt="" />
  </span>;
}

const TOPIC_ART: Record<string, string> = {
  history: 'topics/history/helmet',
  culture: 'topics/culture/masks',
  laws: 'topics/laws/book',
  geography: 'topics/geography/map',
};
export function TopicIcon({ topic, className = '' }: { topic: string; className?: string }) {
  return <span className={`study-icon ${className}`} aria-hidden="true">
    <img className="study-icon-art" src={`${import.meta.env.BASE_URL}assets/${TOPIC_ART[topic] ?? 'progress-artwork-v1/quiz'}.webp`} width="48" height="48" alt="" />
  </span>;
}
