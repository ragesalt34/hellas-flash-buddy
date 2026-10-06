import { useState } from 'react';
import { BarChart3, BadgeCheck, TrendingUp, Sprout, House, ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import { api, type ReadinessResponse } from '../api';
import type { View } from '../App';
import { Empty, Loading, ProgressBar, useCached } from '../ui';
import { countWord, useLanguage } from '../i18n';
import { haptic } from '../telegram';
import { MeanderBand } from '../components/greekArt';
import { SectionLabel } from '../components/SectionLabel';
import { Medallion, OliveCalendar, ParthenonProgress, type MedalKind } from '../components/statsArt';
import { StudyIcon, TopicIcon } from '../components/StudyIcon';
import { OilLamp, Ostraka, Papyrus } from '../components/homeArt';

const VERDICT_ICON: Record<ReadinessResponse['verdict'], LucideIcon> = {
  early: Sprout,
  almost: TrendingUp,
  ready: BadgeCheck,
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
const tone = (p: number) => (p >= 85 ? 'h3' : p >= 60 ? 'h2' : p > 0 ? 'h1' : 'h0');

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

function Label({ k }: { k: string }) {
  return (
    <SectionLabel k={k} className="rd-label">
      <MeanderBand className="rd-label-rule" height={8} />
    </SectionLabel>
  );
}

function Criterion({
  medal,
  title,
  tag,
  value,
  total,
  sub,
  aid,
}: {
  medal: MedalKind;
  title: string;
  tag: string;
  value: number;
  total: number;
  sub: string;
  aid?: boolean;
}) {
  return (
    <div className={`bar-row rd-crit${aid ? ' is-aid' : ''}`}>
      <Medallion kind={medal} />
      <span className="pureplay-criterion-icon pureplay-desktop"><StudyIcon name={medal === 'greek' ? 'speech' : medal === 'words' ? 'vocab' : medal === 'memory' ? 'memory' : 'russian'} /></span>
      <div className="rd-crit-body">
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
    </div>
  );
}

/** One olive per question of a quiz: ripe when answered right. */
function ScoreOlives({ score, total }: { score: number; total: number }) {
  const n = Math.min(total, 10);
  return (
    <span className="rd-olive-dots" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={i < score ? 'on' : ''} />
      ))}
    </span>
  );
}

export function Stats({ onHome, onNavigate }: { onHome: () => void; onNavigate: (v: View) => void }) {
  const { t, language } = useLanguage();
  const { data, err } = useCached(`readiness:${language}`, api.readiness);
  // Accuracy and test count used to sit on Home; the desktop Home no longer shows them.
  // Same cached /me response Home already loads, so no new request.
  const { data: me } = useCached(`me:${language}`, api.me);
  const [allHistory, setAllHistory] = useState(false);

  if (err && !data) return <Empty icon={BarChart3} text={t('stats.error')} onHome={onHome} />;
  if (!data) return <Loading />;

  const label = (topic: string) => data.topicLabels[topic] ?? topic;
  const VIcon = VERDICT_ICON[data.verdict];
  const active = new Set(data.activity.days);
  const grid = lastDays(35);
  const activeDays = grid.filter((d) => active.has(d)).length;
  const history = allHistory ? data.history : data.history.slice(0, 5);
  const locale = language === 'ru' ? 'ru-RU' : 'el-GR';
  const streak = data.activity.streak;

  return (
    <div className="fade-in rd-screen">
      <Label k="rd.title" />
      <div className={`card rd-verdict v-${data.verdict}`}>
        <figure className="rd-temple-wrap">
          <ParthenonProgress
            topics={data.topics.map((tp) => ({
              topic: tp.topic,
              label: label(tp.topic),
              pct: tp.total > 0 ? tp.greek.known / tp.total : 0,
            }))}
          />
          <figcaption>{t('rd.templeHint')}</figcaption>
        </figure>
        <div className="rd-verdict-body">
          <div className="rd-score">
            <b>{data.score}%</b> <span>{t('rd.scoreLabel')}</span>
          </div>
          <div className="rd-verdict-title">
            <VIcon size={22} strokeWidth={2.4} /> {t(`rd.verdict.${data.verdict}`)}
          </div>
          <p className="rd-verdict-hint">{t(`rd.verdictHint.${data.verdict}`)}</p>
          {data.plan?.date && (data.plan.phase === 'learn' || data.plan.phase === 'final') && (
            <p className={`rd-plan-line${data.plan.pace === 'behind' ? ' is-behind' : ''}`}>
              {t(data.plan.pace === 'behind' ? 'plan.offTrack' : 'plan.onTrack').replace(
                '{date}',
                new Date(`${data.plan.date}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long' })
              )}
            </p>
          )}
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

      <div className="card pureplay-blockers pureplay-desktop">
        <h2>{t('rd.blockers')}</h2>
        {data.blockers.length ? data.blockers.map((b) => (
          <div className="pureplay-blocker-row" key={b.kind + (b.topic ?? '')}>
            {b.kind === 'words' ? <StudyIcon name="vocab" /> : <TopicIcon topic={b.topic ?? ''} />}
            <span>{b.kind === 'words' ? t('rd.blocker.words') : label(b.topic ?? '')}</span>
            <small>{b.known}/{b.total}</small>
          </div>
        )) : <p>{t('rd.verdictHint.ready')}</p>}
        <button className="btn btn-block" onClick={() => { haptic(); onNavigate('flashcards'); }}>{t('rd.repeatCards')}<ChevronRight size={19} /></button>
      </div>

      <Label k="rd.criteria" />
      <div className="card rd-criteria">
        <h2 className="pureplay-panel-title pureplay-desktop">{t('rd.criteria')}</h2>
        <Criterion
          medal="greek"
          title={t('rd.crit.greek')}
          tag={t('rd.decides')}
          value={data.greek.known}
          total={data.greek.total}
          sub={`${t('rd.unchecked')}: ${data.greek.total - data.greek.checked}`}
        />
        <Criterion
          medal="words"
          title={t('rd.crit.words')}
          tag={t('rd.decides')}
          value={data.words.learned}
          total={data.words.total}
          sub={`${t('stats.reviewed')}: ${data.words.seen}/${data.words.total}`}
        />
        <Criterion
          medal="memory"
          title={t('rd.crit.memory')}
          tag={t('rd.extra')}
          value={data.memory.strong}
          total={data.memory.total}
          sub={t('rd.memoryHint')}
          aid
        />
        <Criterion
          medal="russian"
          title={t('rd.crit.russian')}
          tag={t('rd.aid')}
          value={data.russian.known}
          total={data.russian.total}
          sub={`${t('rd.unchecked')}: ${data.russian.total - data.russian.checked}`}
          aid
        />
      </div>

      <Label k="rd.byTopic" />
      <div className="card rd-topics">
        <h2 className="pureplay-panel-title pureplay-desktop">{t('rd.byTopic')}</h2>
        {data.topics.map((tp) => {
          const g = pct(tp.greek.known, tp.total);
          return (
            <div className="rd-topic" key={tp.topic}>
              <TopicIcon topic={tp.topic} className="rd-emblem" />
              <div className="rd-topic-main">
                <div className="rd-topic-head">
                  <b>{label(tp.topic)}</b>
                  <span className="muted">
                    {tp.total} {countWord(tp.total, 'question', language)}
                  </span>
                  <span className={`rd-topic-pct ${tone(g)}`}>
                    <span className="rd-topic-percent">{g}% <small>{t('rd.onGreek')}</small></span>
                    <span className="pureplay-desktop">{tp.greek.known}/{tp.total}</span>
                  </span>
                </div>
                <span className="tp-bar">
                  <i className={tone(g)} style={{ width: `${g}%` }} />
                </span>
                <div className="rd-sub">
                  {t('rd.onRussian')} {pct(tp.russian.known, tp.total)}% · {t('rd.inMemory')}{' '}
                  {pct(tp.memory, tp.total)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Label k="rd.activity" />
      <div className="card rd-activity">
        <div className="rd-activity-main">
        <h2 className="pureplay-panel-title pureplay-desktop">{t('rd.activity')}</h2>
        <div className="rd-act-top">
          <span className="rd-streak">
            <OilLamp className="rd-act-ic c-lamp" />
            <b>{streak}</b> {countWord(streak, 'day', language)} {t('rd.inRow')}
          </span>
          {me && (
            <>
              <span className="rd-home-metric">
                <b>{me.stats.total_questions > 0 ? Math.round((me.stats.total_correct / me.stats.total_questions) * 100) : 0}%</b> {t('home.accuracy')}
              </span>
              <span className="rd-home-metric">
                <b>{me.stats.total_sessions}</b> {t('home.sessions')}
              </span>
            </>
          )}
          <button
            className="rd-due-chip"
            onClick={() => {
              haptic();
              onNavigate('flashcards');
            }}
          >
            <Ostraka className="rd-act-ic" />
            <b>{data.due.cards}</b> {countWord(data.due.cards, 'card', language)} {t('rd.toReview')}
            <ChevronRight size={16} strokeWidth={2.4} />
          </button>
          <button
            className="rd-due-chip"
            onClick={() => {
              haptic();
              onNavigate('vocab');
            }}
          >
            <Papyrus className="rd-act-ic" />
            <b>{data.due.words}</b> {countWord(data.due.words, 'word', language)} {t('rd.toReview')}
            <ChevronRight size={16} strokeWidth={2.4} />
          </button>
        </div>

        <OliveCalendar days={grid} active={active} today={grid[grid.length - 1]} />
        <div className="pureplay-calendar pureplay-desktop" aria-label={t('rd.activityHint')}>
          {grid.map((day) => <span key={day} className={`${active.has(day) ? 'is-active' : ''}${day === grid[grid.length - 1] ? ' is-today' : ''}`} title={day} />)}
        </div>
        <div className="rd-sub">
          <span className="rd-legacy-calendar-hint">{t('rd.oliveHint')} · </span>{activeDays} {countWord(activeDays, 'day', language)} {t('rd.daysActive')}
        </div>
        </div>

        {data.history.length > 0 && (
          <div className="rd-history">
            <MeanderBand className="rd-act-rule" height={8} />
            <div className="rd-sublabel">{t('rd.recent')}</div>
            {history.map((s, i) => {
              const date = new Date(s.completed_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
              return (
                <div className={`rd-test${s.lang === 'el' ? ' is-el' : ''}`} key={i}>
                  <TopicIcon topic={s.topic} className="rd-emblem" />
                  <div className="rd-test-main">
                    <div className="rd-test-title">
                      {label(s.topic)}
                      {s.lang && <span className={`rd-lang l-${s.lang}`}>{s.lang.toUpperCase()}</span>}
                    </div>
                    <div className="rd-sub">
                      {date}
                      {s.lang === 'el' && ` · ${t('rd.counts')}`}
                    </div>
                  </div>
                  <div className="rd-test-score">
                    <ScoreOlives score={s.score} total={s.total} />
                    <span>
                      {s.score} {t('rd.of')} {s.total}
                    </span>
                  </div>
                </div>
              );
            })}
            {!allHistory && data.history.length > 5 && (
              <button className="rd-more" onClick={() => setAllHistory(true)}>
                <ChevronDown size={16} strokeWidth={2.4} /> {t('rd.showMore')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="spacer" />
      <button className="btn btn-block secondary" onClick={onHome}>
        <House size={18} strokeWidth={2.4} /> {t('nav.menu')}
      </button>
    </div>
  );
}
