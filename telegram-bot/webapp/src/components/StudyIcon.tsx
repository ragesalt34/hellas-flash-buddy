import { AudioLines, BookOpen, ChartNoAxesColumnIncreasing, ClipboardCheck, GraduationCap, House, Layers, NotebookPen, Target, Flame, Landmark, Theater, ScrollText, MapPin, Globe, Brain, Languages } from 'lucide-react';
import { Aspis, ColumnChart, CycladicHome, LaurelSprig, OilLamp, Ostraka, Owl, Papyrus, WaxTablet } from './homeArt';
import { SoundLyre } from './landingArt';
import { TopicEmblem } from './statsArt';

const ICONS = {
  home: [CycladicHome, House],
  quiz: [WaxTablet, ClipboardCheck],
  flashcards: [Ostraka, Layers],
  vocab: [Papyrus, BookOpen],
  stats: [ColumnChart, ChartNoAxesColumnIncreasing],
  homework: [Owl, NotebookPen],
  accuracy: [Aspis, Target],
  streak: [OilLamp, Flame],
  words: [LaurelSprig, GraduationCap],
  speech: [SoundLyre, AudioLines],
  memory: [Owl, Brain],
  russian: [Papyrus, Languages],
} as const;

/** Both themes share meaning and accessibility, while retaining their glyphs. */
export function StudyIcon({ name, className = '' }: { name: keyof typeof ICONS; className?: string }) {
  const [Legacy, Pureplay] = ICONS[name];
  return (
    <span className={`study-icon ${className}`} aria-hidden="true">
      <Legacy className="study-icon-legacy" />
      <Pureplay className="study-icon-pureplay" strokeWidth={1.8} />
    </span>
  );
}

const TOPIC_ICONS = { history: Landmark, culture: Theater, laws: ScrollText, geography: MapPin };
export function TopicIcon({ topic, className = '' }: { topic: string; className?: string }) {
  const Icon = TOPIC_ICONS[topic as keyof typeof TOPIC_ICONS] ?? Globe;
  return <span className={`study-icon ${className}`} aria-hidden="true"><TopicEmblem topic={topic} className="study-icon-legacy" /><Icon className="study-icon-pureplay" strokeWidth={1.8} /></span>;
}
