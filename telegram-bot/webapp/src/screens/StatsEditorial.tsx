import { useState } from 'react';
import type { MeResponse, ReadinessResponse } from '../api';
import type { View } from '../App';
import { countWord, useLanguage } from '../i18n';
import { OliveCalendar } from '../components/statsArt';
import { BASE_TOP, PaperParthenon, SHAFT_CENTERS, SHAFT_TOP, TEMPLE_H } from '../components/PaperParthenon';
import './statsTemple.css';

const percentage = (value: number, total: number) => total > 0 ? Math.round(value / total * 100) : 0;
const ART: Record<string, string> = { history: 'helmet', culture: 'masks', laws: 'book', geography: 'map' };
type ProgressArtworkKind = 'greek' | 'words' | 'memory' | 'russian' | 'precision' | 'repeat' | 'streak' | 'quiz';

function ProgressArtwork({ kind }: { kind: ProgressArtworkKind }) {
  return <img className="pe-art-icon" src={`${import.meta.env.BASE_URL}assets/progress-artwork-v1/${kind}.webp`} width="48" height="48" alt="" aria-hidden="true" />;
}

function TopicArtwork({ topic }: { topic: string }) {
  return ART[topic]
    ? <img className="pe-art-icon" src={`${import.meta.env.BASE_URL}assets/topics/${topic}/${ART[topic]}.webp`} width="48" height="48" alt="" aria-hidden="true" />
    : <ProgressArtwork kind="quiz" />;
}

function Meter({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className="pe-meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe}><i style={{ width: `${safe}%` }} /></div>;
}

/** Questions still to answer right in Greek before a topic's column counts as built (85%). */
const toBuild = (known: number, total: number) => Math.max(0, Math.ceil(total * 0.85) - known);

export function StatsEditorial({ data, me, onNavigate, onCheckGreek, onTopicQuiz, onHome }: {
  data: ReadinessResponse; me?: MeResponse;
  onNavigate: (view: View) => void; onCheckGreek: () => void; onTopicQuiz: (topic: string) => void; onHome: () => void;
}) {
  const { t, language } = useLanguage();
  const [allHistory, setAllHistory] = useState(false);
  // The temple is the topic picker: the column under the pointer (preview) or the one chosen by click or
  // keyboard (selected) is highlighted and described below it. Starts on the weakest topic.
  const templeTopics = data.topics.slice(0, 4);
  const weakest = templeTopics.reduce((best, topic, index) =>
    (topic.total ? topic.greek.known / topic.total : 0) < (templeTopics[best]?.total ? templeTopics[best].greek.known / templeTopics[best].total : 1) ? index : best, 0);
  const [selected, setSelected] = useState(weakest);
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? selected;
  const pick = (index: number) => { setSelected(index); setPreview(null); };
  const onColumnKey = (event: React.KeyboardEvent, index: number) => {
    const n = templeTopics.length;
    const go = event.key === 'ArrowRight' ? (index + 1) % n : event.key === 'ArrowLeft' ? (index - 1 + n) % n : -1;
    if (go < 0) return;
    event.preventDefault();
    pick(go);
    (event.currentTarget.parentElement?.children[go] as HTMLElement | undefined)?.focus();
  };
  const locale = language === 'ru' ? 'ru-RU' : 'el-GR';
  const label = (topic: string) => data.topicLabels[topic] ?? topic;
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const days = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(today); date.setDate(today.getDate() - (34 - index));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const active = new Set(data.activity.days);
  const activeDays = days.filter((day) => active.has(day)).length;
  const weeks = Array.from({ length: 5 }, (_, index) => days.slice(index * 7, index * 7 + 7));
  const formatDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const needsWords = data.blockers.some((blocker) => blocker.kind === 'words');
  const needsQuestions = data.blockers.some((blocker) => blocker.kind === 'topic');
  const history = allHistory ? data.history : data.history.slice(0, 5);
  const accuracy = me ? percentage(me.stats.total_correct, me.stats.total_questions) : null;
  const criteria = [
    { key: 'greek', art: 'greek' as const, title: t('rd.crit.greek'), value: data.greek.known, total: data.greek.total, detail: `${t('rd.unchecked')}: ${data.greek.total - data.greek.checked}`, aid: false },
    { key: 'words', art: 'words' as const, title: t('nav.vocab'), value: data.words.learned, total: data.words.total, detail: `${t('stats.reviewed')}: ${data.words.seen}/${data.words.total} · ${t('rd.wordsTarget')}`, aid: false },
    { key: 'memory', art: 'memory' as const, title: t('rd.crit.memory'), value: data.memory.strong, total: data.memory.total, detail: t('rd.memoryHint'), aid: true },
    { key: 'russian', art: 'russian' as const, title: t('rd.crit.russian'), value: data.russian.known, total: data.russian.total, detail: `${t('rd.unchecked')}: ${data.russian.total - data.russian.checked}`, aid: true },
  ];
  return (
    <div className="rd-screen pe-screen">
      <header className="pe-heading"><div><h1>{t('nav.stats')}</h1><p>{t('rd.editorial.subtitle')}</p></div><p className="pe-heading-note">{t('rd.greekOnly')}</p></header>
      <section className="pe-hero pe-paper" aria-labelledby="pe-readiness">
        <figure className="pe-construction">
          <div className="pe-temple-stage" onMouseLeave={() => setPreview(null)}>
            <PaperParthenon active={shown} topics={templeTopics.map((topic) => ({ topic: topic.topic, label: label(topic.topic), pct: topic.total > 0 ? topic.greek.known / topic.total : 0 }))} />
            {/* pointer targets over the four columns (keyboard uses the labels below) */}
            {templeTopics.map((topic, index) => (
              <button key={topic.topic} type="button" tabIndex={-1} aria-hidden="true"
                className={`pe-col-hit pe-tone-${topic.topic}${index === shown ? ' is-active' : ''}`}
                style={{ left: `${(SHAFT_CENTERS[index] - 105) / 10}%`, width: '21%', top: `${(SHAFT_TOP - 20) / TEMPLE_H * 100}%`, height: `${(BASE_TOP - SHAFT_TOP + 40) / TEMPLE_H * 100}%` }}
                onMouseEnter={() => setPreview(index)} onClick={() => pick(index)}>
                <span className="pe-col-chip">{percentage(topic.greek.known, topic.total)}%</span>
              </button>
            ))}
          </div>
          <div className="pe-column-labels" role="group" aria-label={t('rd.byTopic')}>
            {templeTopics.map((topic, index) => (
              <button key={topic.topic} type="button" aria-pressed={index === selected}
                className={`pe-tone-${topic.topic}${index === shown ? ' is-active' : ''}`}
                onMouseEnter={() => setPreview(index)} onMouseLeave={() => setPreview(null)}
                onFocus={() => setSelected(index)} onClick={() => pick(index)} onKeyDown={(event) => onColumnKey(event, index)}>
                <span /><strong>{label(topic.topic)}</strong><em>{percentage(topic.greek.known, topic.total)}%</em>
              </button>
            ))}
          </div>
          {templeTopics[shown] && (() => {
            const topic = templeTopics[shown];
            const value = percentage(topic.greek.known, topic.total);
            const left = toBuild(topic.greek.known, topic.total);
            return (
              <div className={`pe-col-card pe-tone-${topic.topic}`} aria-live="polite">
                <img src={`${import.meta.env.BASE_URL}assets/topics/${topic.topic}/${ART[topic.topic] ?? 'band'}.webp`} alt="" width="56" height="62" />
                <div className="pe-col-card-copy">
                  <div className="pe-col-card-head"><b>{label(topic.topic)}</b><span>{value}%</span></div>
                  <Meter value={value} label={`${label(topic.topic)} · ${t('rd.onGreek')}`} />
                  <p>{left > 0 ? t('rd.temple.toGo').replace('{n}', String(left)).replace('{q}', countWord(left, 'question', language)) : t('rd.temple.built')}</p>
                  <p className="pe-col-card-meta">{topic.greek.known}/{topic.total} {t('rd.onGreek')} · {t('rd.onRussian')} {percentage(topic.russian.known, topic.total)}% · {t('rd.inMemory')} {percentage(topic.memory, topic.total)}%</p>
                </div>
                <button type="button" className="pe-col-train" onClick={() => onTopicQuiz(topic.topic)}>{t('rd.temple.train')}</button>
              </div>
            );
          })()}
          <figcaption>{t('rd.templeHint')}</figcaption>
        </figure>
        <div className={`pe-readiness pe-verdict-${data.verdict}`}>
          <h2 id="pe-readiness">{t('rd.title')}</h2>
          <div className="pe-readiness-score">{data.score}<span>%</span></div>
          <Meter value={data.score} label={t('rd.scoreLabel')} />
          <h3>{t(`rd.verdict.${data.verdict}`)}</h3>
          <p>{t(`rd.verdictHint.${data.verdict}`)}</p>
          <p className="pe-score-note">{t('rd.scoreHint')}</p>
          <div className="pe-goal"><ProgressArtwork kind="precision" /><span>{t('rd.questionsTarget')}<br />{t('rd.wordsTarget')}</span></div>
          {data.plan?.date && (data.plan.phase === 'learn' || data.plan.phase === 'final') && <p className="pe-plan">{t(data.plan.pace === 'behind' ? 'plan.offTrack' : 'plan.onTrack').replace('{date}', new Date(`${data.plan.date}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long' }))}</p>}
            <div className="pe-actions">
              {(needsQuestions || !needsWords) && <button className="pe-button" onClick={onCheckGreek}>{t('rd.checkGreek')}</button>}
              {needsWords && <button className={`pe-button${needsQuestions ? ' is-secondary' : ''}`} onClick={() => onNavigate('vocab')}>{t('rd.studyWords')}</button>}
            </div>
        </div>
      </section>
      {/* 1. what to do now, and the rhythm so far */}
      <div className="pe-focus">
        <section className="pe-next pe-paper" aria-labelledby="pe-next-title">
          <h2 id="pe-next-title">{t('rd.editorial.next')}</h2>
          {data.blockers.length > 0 ? <ul className="pe-blockers">{data.blockers.map((blocker) => <li key={blocker.kind + (blocker.topic ?? '')}>{blocker.kind === 'words' ? <ProgressArtwork kind="words" /> : <TopicArtwork topic={blocker.topic ?? ''} />}<div><b>{blocker.kind === 'words' ? t('rd.blocker.words') : label(blocker.topic ?? '')}</b><span>{blocker.known}/{blocker.total} · {percentage(blocker.known, blocker.total)}%</span><Meter value={percentage(blocker.known, blocker.total)} label={blocker.kind === 'words' ? t('rd.blocker.words') : label(blocker.topic ?? '')} /></div></li>)}</ul> : <p>{t('rd.verdictHint.ready')}</p>}
          <p className="pe-next-hint">{t('rd.nextHint')}</p>
          <div className="pe-due"><button onClick={() => onNavigate('flashcards')}><ProgressArtwork kind="repeat" /><span><b>{data.due.cards} {countWord(data.due.cards, 'card', language)}</b><small>{t('rd.toReview')}</small></span></button><button onClick={() => onNavigate('vocab')}><ProgressArtwork kind="words" /><span><b>{data.due.words} {countWord(data.due.words, 'word', language)}</b><small>{t('rd.toReview')}</small></span></button></div>
        </section>
        <section className="pe-statistics pe-card" aria-labelledby="pe-rhythm-title">
          <h2 id="pe-rhythm-title">{t('rd.editorial.rhythm')}</h2>
          <div><ProgressArtwork kind="streak" /><b>{data.activity.streak}</b><span>{countWord(data.activity.streak, 'day', language)} {t('rd.inRow')}</span></div>
          <div><ProgressArtwork kind="precision" /><b>{accuracy === null ? '—' : `${accuracy}%`}</b><span>{t('home.accuracy')}</span></div>
          <div><ProgressArtwork kind="quiz" /><b>{me?.stats.total_sessions ?? '—'}</b><span>{t('home.sessions')}</span></div>
          <div><ProgressArtwork kind="memory" /><b>{activeDays}</b><span>{countWord(activeDays, 'day', language)} {t('rd.daysActive')}</span></div>
        </section>
      </div>

      {/* 2. what readiness is made of: two that decide it, two that help learning */}
      <section className="pe-criteria-block pe-card" aria-labelledby="pe-criteria-title">
        <h2 id="pe-criteria-title">{t('rd.editorial.criteriaTitle')}</h2>
        <div className="pe-criteria-groups">
          {[{ key: 'decide', items: criteria.filter((c) => !c.aid) }, { key: 'help', items: criteria.filter((c) => c.aid) }].map((group) => (
            <div className={`pe-criteria-group is-${group.key}`} key={group.key}>
              <h3>{t(`rd.editorial.${group.key}`)}</h3>
              {group.items.map(({ key, art, title, value, total, detail }) => (
                <div className="pe-criterion" key={key}>
                  <ProgressArtwork kind={art} />
                  <div>
                    <div className="pe-criterion-head"><h4>{title}</h4><b>{percentage(value, total)}%</b></div>
                    <Meter value={percentage(value, total)} label={title} />
                    <p><span>{value}/{total}</span> · {detail}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 3. the record: activity calendar and recent tests */}
      <div className="pe-record">
        <section className="pe-calendar pe-paper" aria-labelledby="pe-calendar-title">
          <h2 id="pe-calendar-title">{t('rd.editorial.calendar')}</h2>
          <p className="pe-calendar-summary">{activeDays} {countWord(activeDays, 'day', language)} {t('rd.daysActive')}</p>
          <div className="pe-legend"><span><i className="is-on" />{t('rd.editorial.studied')}</span><span><i />{t('rd.editorial.rest')}</span></div>
          <div className="pe-weeks">
            {weeks.map((week) => <div className="pe-week" key={week[0]}><span className="pe-week-range">{formatDay(week[0])}<br />— {formatDay(week[6])}</span><div role="img" aria-label={week.map((day) => `${formatDay(day)}: ${t(active.has(day) ? 'rd.editorial.studied' : 'rd.editorial.rest')}`).join('; ')}><OliveCalendar days={week} active={active} today={days[34]} /></div></div>)}
          </div>
          <p className="pe-calendar-hint">{t('rd.oliveHint')}</p>
        </section>
        <section className="pe-history pe-card" aria-labelledby="pe-history-title">
          <h2 id="pe-history-title">{t('rd.recent')}</h2>
          {history.length === 0 && <p>{t('rd.historyEmpty')}</p>}
          {history.map((session, index) => <div className="pe-test" key={`${session.completed_at}-${index}`}><TopicArtwork topic={session.topic} /><div><b>{label(session.topic)}</b><span>{new Date(session.completed_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}{session.lang === 'el' ? ` · ${t('rd.counts')}` : ''}</span></div><span className={`pe-lang is-${session.lang}`}>{session.lang?.toUpperCase() ?? '—'}</span><strong>{session.score}/{session.total}</strong></div>)}
          {!allHistory && data.history.length > 5 && <button className="pe-more" onClick={() => setAllHistory(true)}>{t('rd.showMore')}</button>}
        </section>
      </div>
      <button className="pe-home" onClick={onHome}>{t('nav.menu')}</button>
    </div>
  );
}
