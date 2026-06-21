import { useEffect, useState } from 'react';
import { api, MeResponse } from '../api';
import { haptic } from '../telegram';
import { Loading } from '../ui';
import type { View } from '../App';

export function Home({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch((e) => setErr(e?.message ?? String(e)));
  }, []);

  if (err)
    return (
      <div className="empty fade-in">
        <div className="e">😕</div>
        <p>
          Σφάλμα σύνδεσης.
          <br />
          <span className="muted">{err}</span>
        </p>
      </div>
    );
  if (!me) return <Loading />;

  const acc =
    me.stats.total_questions > 0
      ? Math.round((me.stats.total_correct / me.stats.total_questions) * 100)
      : 0;

  const nav = (v: View) => {
    haptic();
    onNavigate(v);
  };

  return (
    <div className="fade-in">
      <div className="hero">
        <h1>Γεια σου, {me.user.name}! 👋</h1>
        <p className="sub">Έτοιμος για λίγη εξάσκηση;</p>
        <div className="hero-chips">
          {me.streak >= 2 && (
            <span className="chip">
              🔥 {me.streak} {me.streak === 1 ? 'μέρα' : 'μέρες'}
            </span>
          )}
          <span className="chip">🎯 {acc}%</span>
          <span className="chip">📝 {me.stats.total_sessions} κουίζ</span>
          <span className="chip">
            ⭐ {me.vocab.mastered}/{me.vocab.total}
          </span>
        </div>
      </div>

      <div className="section-label">Μάθηση</div>
      <div className="tiles stagger">
        <button
          className="tile feature"
          style={{ animationDelay: '40ms' }}
          onClick={() => nav('quiz')}
        >
          <span className="tile-ic">📝</span>
          <span className="grow">
            <span className="tile-t" style={{ display: 'block' }}>
              Κουίζ
            </span>
            <span className="tile-d">10 ερωτήσεις ανά θέμα</span>
          </span>
          <span className="arrow">→</span>
        </button>

        <button className="tile" style={{ animationDelay: '90ms' }} onClick={() => nav('flashcards')}>
          <span className="tile-ic">🎴</span>
          <span className="tile-t">Κάρτες</span>
          <span className="tile-d">Επανάληψη με SRS</span>
        </button>
        <button className="tile" style={{ animationDelay: '130ms' }} onClick={() => nav('vocab')}>
          <span className="tile-ic">📚</span>
          <span className="tile-t">Λεξιλόγιο</span>
          <span className="tile-d">150 λέξεις</span>
        </button>

        <button
          className="tile span2"
          style={{ animationDelay: '180ms', flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 'auto' }}
          onClick={() => nav('stats')}
        >
          <span className="tile-ic">📊</span>
          <span className="grow">
            <span className="tile-t" style={{ display: 'block' }}>
              Στατιστικά
            </span>
            <span className="tile-d">Η πρόοδός σου & ιστορικό</span>
          </span>
          <span className="arrow" style={{ color: 'var(--tg-hint)' }}>
            →
          </span>
        </button>
      </div>
    </div>
  );
}
