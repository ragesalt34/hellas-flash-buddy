import { useState } from 'react';
import {
  BarChart3,
  BadgeCheck,
  TrendingUp,
  Sprout,
  Flame,
  House,
  Layers,
  BookA,
  Target,
  ChevronDown,
  Trophy,
  ThumbsUp,
  Meh,
  type LucideIcon,
} from 'lucide-react';
import { api, type ReadinessResponse } from '../api';
import type { View } from '../App';
import { Empty, Loading, ProgressBar, Ring, useCached } from '../ui';
import { useLanguage } from '../i18n';
import { haptic } from '../telegram';

const VERDICT_ICON: Record<ReadinessResponse['verdict'], LucideIcon> = {
  early: Sprout,
  almost: TrendingUp,
  ready: BadgeCheck,
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
const heat = (p: number) => (p >= 85 ? 'h3' : p >= 60 ? 'h2' : p > 0 ? 'h1' : 'h0');

function localDayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** The last `n` calendar days on this device, oldest first, ending today. */
function lastDays(n: number): string[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    return localDayKey(d);
  });
}

function resultIcon(p: number): LucideIcon {
  if (p >= 80) return Trophy;
  if (p >= 60) return ThumbsUp;
  return Meh;
}

function Criterion({
  title,
  tag,
  value,
  total,
  sub,
  aid,
}: {
  title: string;
  tag: string;
  value: number;
  total: number;
  sub: string;
  aid?: boolean;
}) {
  return (
    <div className={`bar-row rd-crit${aid ? ' is-aid' : ''}`}>
      <div className="lab">
        <span>
          {title} <span className="rd-tag">{tag}</span>
        </span>
        <span className="pc">
          {value}/{total} · {pct(value, total)}%
        </span>
      </div>
      <ProgressBar value={value} total={total} />
      <div className="rd-sub">{sub}</div>
    </div>
  );
}

export function Stats({
  onHome,
  onNavigate,
  onTrain,
}: {
  onHome: () => void;
  onNavigate: (v: View) => void;
  onTrain: (topic: string) => void;
}) {
  const { t, language } = useLanguage();
  const { data, err } = useCached(`readiness:${language}`, api.readiness);
  const [allHistory, setAllHistory] = useState(false);

  if (err && !data) return <Empty icon={BarChart3} text={t('stats.error')} onHome={onHome} />;
  if (!data) return <Loading />;

  const label = (topic: string) => data.topicLabels[topic] ?? topic;
  const VIcon = VERDICT_ICON[data.verdict];
  const weakest = [...data.topics].sort((a, b) => pct(a.greek.known, a.total) - pct(b.greek.known, b.total))[0];
  const active = new Set(data.activity.days);
  const grid = lastDays(35);
  const history = allHistory ? data.history : data.history.slice(0, 5);
  const locale = language === 'ru' ? 'ru-RU' : 'el-GR';

  return (
    <div className="fade-in rd-screen">
      <div className="section-label">{t('rd.title')}</div>
      <div className={`card rd-verdict v-${data.verdict}`}>
        <Ring pct={data.score} size={112} stroke={11}>
          <div className="ring-pct" style={{ fontSize: 24 }}>
            {data.score}%
          </div>
        </Ring>
        <div className="rd-verdict-body">
          <div className="rd-verdict-title">
            <VIcon size={22} strokeWidth={2.4} /> {t(`rd.verdict.${data.verdict}`)}
          </div>
          <p className="rd-verdict-hint">{t(`rd.verdictHint.${data.verdict}`)}</p>
          {data.blockers.length > 0 && (
            <div className="rd-blockers">
              <span className="rd-blockers-label">{t('rd.blockers')}:</span>
              {data.blockers.map((b) => (
                <span className="rd-chip" key={b.kind + (b.topic ?? '')}>
                  {b.kind === 'words' ? t('rd.blocker.words') : label(b.topic ?? '')} · {b.known}/{b.total}
                </span>
              ))}
            </div>
          )}
          <div className="rd-note">{t('rd.greekOnly')}</div>
        </div>
      </div>

      <div className="section-label">{t('rd.criteria')}</div>
      <div className="card rd-criteria">
        <Criterion
          title={t('rd.crit.greek')}
          tag={t('rd.decides')}
          value={data.greek.known}
          total={data.greek.total}
          sub={`${t('rd.unchecked')}: ${data.greek.total - data.greek.checked}`}
        />
        <Criterion
          title={t('rd.crit.words')}
          tag={t('rd.decides')}
          value={data.words.learned}
          total={data.words.total}
          sub={`${t('stats.reviewed')}: ${data.words.seen}/${data.words.total}`}
        />
        <Criterion
          title={t('rd.crit.memory')}
          tag={t('rd.extra')}
          value={data.memory.strong}
          total={data.memory.total}
          sub={t('rd.memoryHint')}
          aid
        />
        <Criterion
          title={t('rd.crit.russian')}
          tag={t('rd.aid')}
          value={data.russian.known}
          total={data.russian.total}
          sub={`${t('rd.unchecked')}: ${data.russian.total - data.russian.checked}`}
          aid
        />
      </div>

      <div className="section-label">{t('rd.byTopic')}</div>
      <div className="card rd-topics">
        <div className="rd-trow rd-thead">
          <span />
          <span>{t('rd.col.greek')}</span>
          <span>{t('rd.col.russian')}</span>
          <span>{t('rd.col.memory')}</span>
        </div>
        {data.topics.map((tp) => {
          const g = pct(tp.greek.known, tp.total);
          const r = pct(tp.russian.known, tp.total);
          const m = pct(tp.memory, tp.total);
          const isWeak = weakest?.topic === tp.topic && g < 85;
          return (
            <div className={`rd-trow${isWeak ? ' is-weak' : ''}`} key={tp.topic}>
              <span className="rd-tname">
                {label(tp.topic)} <small>{tp.total}</small>
              </span>
              <span className={`rd-cell ${heat(g)}`}>{g}%</span>
              <span className={`rd-cell ${heat(r)} is-aid`}>{r}%</span>
              <span className={`rd-cell ${heat(m)}`}>{m}%</span>
              {isWeak && (
                <button
                  className="btn rd-train"
                  onClick={() => {
                    haptic();
                    onTrain(tp.topic);
                  }}
                >
                  <Target size={17} strokeWidth={2.4} /> {t('rd.train')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="section-label">{t('rd.today')}</div>
      <div className="card rd-today">
        {data.due.cards + data.due.words === 0 && <div className="rd-sub">{t('rd.nothingDue')}</div>}
        <button
          className="rd-due"
          onClick={() => {
            haptic();
            onNavigate('flashcards');
          }}
        >
          <Layers size={20} strokeWidth={2.2} />
          <span className="grow">{t('rd.dueCards')}</span>
          <b>{data.due.cards}</b>
        </button>
        <button
          className="rd-due"
          onClick={() => {
            haptic();
            onNavigate('vocab');
          }}
        >
          <BookA size={20} strokeWidth={2.2} />
          <span className="grow">{t('rd.dueWords')}</span>
          <b>{data.due.words}</b>
        </button>
      </div>

      <div className="section-label">{t('rd.regularity')}</div>
      <div className="card rd-activity">
        <div className="rd-activity-head">
          <span className="rd-streak">
            <Flame size={16} strokeWidth={2.6} /> {t('stats.streak')}: <b>{data.activity.streak}</b>
          </span>
          <span className="muted">
            {grid.filter((d) => active.has(d)).length} {t('rd.daysActive')}
          </span>
        </div>
        <div className="rd-grid">
          {grid.map((d) => (
            <i key={d} className={active.has(d) ? 'on' : ''} title={d} />
          ))}
        </div>
      </div>

      {data.history.length > 0 && (
        <>
          <div className="section-label">{t('stats.history')}</div>
          <div className="card">
            {history.map((s, i) => {
              const p = pct(s.score, s.total);
              const Icon = resultIcon(p);
              const date = new Date(s.completed_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
              return (
                <div className="history-item" key={i}>
                  <span className="ic">
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  <div className="grow">
                    <div className="sc">
                      {s.score}/{s.total}{' '}
                      <span className="muted" style={{ fontWeight: 600 }}>
                        · {label(s.topic)}
                      </span>
                    </div>
                    <div className="dt">{date}</div>
                  </div>
                  <span className="muted">{p}%</span>
                </div>
              );
            })}
            {!allHistory && data.history.length > 5 && (
              <button className="rd-more" onClick={() => setAllHistory(true)}>
                <ChevronDown size={16} strokeWidth={2.4} /> {t('rd.showMore')}
              </button>
            )}
          </div>
        </>
      )}

      <div className="spacer" />
      <button className="btn btn-block secondary" onClick={onHome}>
        <House size={18} strokeWidth={2.4} /> {t('nav.menu')}
      </button>
    </div>
  );
}
