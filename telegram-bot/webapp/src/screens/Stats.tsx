import { BarChart3, Flame, Star, BookOpen, House, Trophy, ThumbsUp, Meh, type LucideIcon } from 'lucide-react';
import { api } from '../api';
import { Empty, Loading, ProgressBar, Ring, useCached } from '../ui';

export function Stats({ onHome }: { onHome: () => void }) {
  const { data, err } = useCached('stats', api.stats);
  const { data: history } = useCached('history', api.history);

  if (err && !data)
    return <Empty icon={BarChart3} text="Σφάλμα σύνδεσης. Δοκίμασε ξανά." onHome={onHome} />;
  if (!data) return <Loading />;

  const { stats, streak, vocab, topicLabels } = data;
  if (stats.total_sessions === 0)
    return <Empty icon={BarChart3} text="Δεν έχεις κάνει ακόμα κουίζ. Ξεκίνα τώρα!" onHome={onHome} />;

  const acc =
    stats.total_questions > 0
      ? Math.round((stats.total_correct / stats.total_questions) * 100)
      : 0;

  const topics = Object.entries(stats.by_topic).sort((a, b) => b[1].total - a[1].total);

  function resultIcon(pct: number): LucideIcon {
    if (pct >= 80) return Trophy;
    if (pct >= 60) return ThumbsUp;
    return Meh;
  }

  return (
    <div className="fade-in">
      <div className="section-label">Σύνοψη</div>
      <div className="card stat-hero">
        <Ring pct={acc} size={108} stroke={11}>
          <div className="ring-pct" style={{ fontSize: 24 }}>
            {acc}%
          </div>
          <div className="ring-sub">επιτυχία</div>
        </Ring>
        <div className="stat-hero-side">
          <div className="mini">
            <span className="k">Κουίζ</span>
            <span className="v">{stats.total_sessions}</span>
          </div>
          <div className="mini">
            <span className="k">Σερί</span>
            <span className="v" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Flame size={16} strokeWidth={2.6} /> {streak}
            </span>
          </div>
        </div>
      </div>

      <div className="section-label">Ανά θέμα</div>
      <div className="card">
        {topics.map(([topic, d]) => {
          const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
          return (
            <div className="bar-row" key={topic}>
              <div className="lab">
                <span>{topicLabels[topic] ?? topic}</span>
                <span className="pc">
                  {d.correct}/{d.total} · {pct}%
                </span>
              </div>
              <ProgressBar value={d.correct} total={d.total} />
            </div>
          );
        })}
      </div>

      <div className="section-label">Λεξιλόγιο</div>
      <div className="card">
        <div className="bar-row">
          <div className="lab">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Star size={15} strokeWidth={2.4} /> Κατακτημένες λέξεις
            </span>
            <span className="pc">
              {vocab.mastered}/{vocab.total}
            </span>
          </div>
          <ProgressBar value={vocab.mastered} total={vocab.total} />
        </div>
        <div
          className="muted"
          style={{ fontSize: 13, marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <BookOpen size={14} strokeWidth={2.4} /> Επαναλήφθηκαν: {vocab.seen}/{vocab.total}
        </div>
      </div>

      {history && history.sessions.length > 0 && (
        <>
          <div className="section-label">Ιστορικό</div>
          <div className="card">
            {history.sessions.map((s, i) => {
              const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
              const Icon = resultIcon(pct);
              const date = new Date(s.completed_at).toLocaleDateString('el-GR', {
                day: '2-digit',
                month: 'short',
              });
              return (
                <div className="history-item" key={i}>
                  <span className="ic">
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  <div className="grow">
                    <div className="sc">
                      {s.score}/{s.total}{' '}
                      <span className="muted" style={{ fontWeight: 600 }}>
                        · {history.topicLabels[s.topic] ?? s.topic}
                      </span>
                    </div>
                    <div className="dt">{date}</div>
                  </div>
                  <span className="muted">{pct}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="spacer" />
      <button className="btn btn-block secondary" onClick={onHome}>
        <House size={18} strokeWidth={2.4} /> Μενού
      </button>
    </div>
  );
}
