import { useState } from 'react';
import { Flame, Target, ClipboardCheck, BookOpen, AudioLines, Brain, Languages, RotateCcw } from 'lucide-react';
import type { MeResponse, ReadinessResponse } from '../api';
import type { View } from '../App';
import { countWord, useLanguage } from '../i18n';
import { OliveCalendar } from '../components/statsArt';
import { TopicIcon } from '../components/StudyIcon';
import { PaperParthenon } from '../components/PaperParthenon';

const percentage = (value: number, total: number) => total > 0 ? Math.round(value / total * 100) : 0;
const ART: Record<string, string> = { history: 'helmet', culture: 'masks', laws: 'book', geography: 'map' };

function Meter({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className="pe-meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe}><i style={{ width: `${safe}%` }} /></div>;
}

export function StatsEditorial({ data, me, onNavigate, onCheckGreek, onHome }: {
  data: ReadinessResponse; me?: MeResponse;
  onNavigate: (view: View) => void; onCheckGreek: () => void; onHome: () => void;
}) {
  const { t, language } = useLanguage();
  const [allHistory, setAllHistory] = useState(false);
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
    { key: 'greek', icon: AudioLines, title: t('rd.crit.greek'), value: data.greek.known, total: data.greek.total, detail: `${t('rd.unchecked')}: ${data.greek.total - data.greek.checked}`, aid: false },
    { key: 'words', icon: BookOpen, title: t('nav.vocab'), value: data.words.learned, total: data.words.total, detail: `${t('stats.reviewed')}: ${data.words.seen}/${data.words.total} · ${t('rd.wordsTarget')}`, aid: false },
    { key: 'memory', icon: Brain, title: t('rd.crit.memory'), value: data.memory.strong, total: data.memory.total, detail: t('rd.memoryHint'), aid: true },
    { key: 'russian', icon: Languages, title: t('rd.crit.russian'), value: data.russian.known, total: data.russian.total, detail: `${t('rd.unchecked')}: ${data.russian.total - data.russian.checked}`, aid: true },
  ];
  return (
    <div className="rd-screen pe-screen">
      <header className="pe-heading"><div><h1>{t('nav.stats')}</h1><p>{t('rd.editorial.subtitle')}</p></div><p className="pe-heading-note">{t('rd.greekOnly')}</p></header>
      <section className="pe-hero pe-paper" aria-labelledby="pe-readiness">
        <figure className="pe-construction">
          <PaperParthenon topics={data.topics.map((topic) => ({ topic: topic.topic, label: label(topic.topic), pct: topic.total > 0 ? topic.greek.known / topic.total : 0 }))} />
          <div className="pe-column-labels">
            {data.topics.map((topic) => <div className={`pe-tone-${topic.topic}`} key={topic.topic}><span /><b>{percentage(topic.greek.known, topic.total)}%</b><strong>{label(topic.topic)}</strong></div>)}
          </div>
          <figcaption>{t('rd.templeHint')}</figcaption>
        </figure>
        <div className={`pe-readiness pe-verdict-${data.verdict}`}>
          <h2 id="pe-readiness">{t('rd.title')}</h2>
          <div className="pe-readiness-score">{data.score}<span>%</span></div>
          <Meter value={data.score} label={t('rd.scoreLabel')} />
          <h3>{t(`rd.verdict.${data.verdict}`)}</h3>
          <p>{t(`rd.verdictHint.${data.verdict}`)}</p>
          <p className="pe-score-note">{t('rd.scoreHint')}</p>
          <div className="pe-goal"><Target size={25} /><span>{t('rd.questionsTarget')}<br />{t('rd.wordsTarget')}</span></div>
          {data.plan?.date && (data.plan.phase === 'learn' || data.plan.phase === 'final') && <p className="pe-plan">{t(data.plan.pace === 'behind' ? 'plan.offTrack' : 'plan.onTrack').replace('{date}', new Date(`${data.plan.date}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long' }))}</p>}
        </div>
      </section>
      <section className="pe-topics" aria-label={t('rd.byTopic')}>
        {data.topics.map((topic) => <article key={topic.topic} className={`pe-topic pe-tone-${topic.topic}`}>
          <img src={`${import.meta.env.BASE_URL}assets/topics/${topic.topic}/${ART[topic.topic] ?? 'band'}.webp`} alt="" width="80" height="90" />
          <div className="pe-topic-copy"><h2>{label(topic.topic)}</h2><b className="pe-topic-value">{percentage(topic.greek.known, topic.total)}%</b><Meter value={percentage(topic.greek.known, topic.total)} label={`${label(topic.topic)} · ${t('rd.onGreek')}`} /><p>{topic.greek.known}/{topic.total} · {t('rd.onGreek')}</p><p className="pe-topic-secondary">{t('rd.onRussian')} {percentage(topic.russian.known, topic.total)}% · {t('rd.inMemory')} {percentage(topic.memory, topic.total)}%</p></div>
        </article>)}
      </section>
      <section className="pe-criteria" aria-label={t('rd.criteria')}>
        {criteria.map(({ key, icon: Icon, title, value, total, detail, aid }) => <div className={`pe-criterion ${aid ? 'is-aid' : ''}`} key={key}>
          <Icon size={25} strokeWidth={1.8} /><div><h2>{title}</h2><span className="pe-criterion-tag">{t(key === 'memory' ? 'rd.extra' : aid ? 'rd.aid' : 'rd.decides')}</span><b>{value}/{total} · {percentage(value, total)}%</b><Meter value={percentage(value, total)} label={title} /><p>{detail}</p></div>
        </div>)}
      </section>
      <div className="pe-lower">
        <section className="pe-calendar pe-paper" aria-labelledby="pe-calendar-title">
          <h2 id="pe-calendar-title">{t('rd.editorial.calendar')}</h2>
          <p className="pe-calendar-summary">{activeDays} {countWord(activeDays, 'day', language)} {t('rd.daysActive')}</p>
          <div className="pe-legend"><span><i className="is-on" />{t('rd.editorial.studied')}</span><span><i />{t('rd.editorial.rest')}</span></div>
          <div className="pe-weeks">
            {weeks.map((week) => <div className="pe-week" key={week[0]}><span className="pe-week-range">{formatDay(week[0])}<br />— {formatDay(week[6])}</span><div role="img" aria-label={week.map((day) => `${formatDay(day)}: ${t(active.has(day) ? 'rd.editorial.studied' : 'rd.editorial.rest')}`).join('; ')}><OliveCalendar days={week} active={active} today={days[34]} /></div></div>)}
          </div>
          <p className="pe-calendar-hint">{t('rd.oliveHint')}</p>
        </section>
        <div className="pe-sidebar">
          <section className="pe-next pe-paper" aria-labelledby="pe-next-title">
            <h2 id="pe-next-title">{t('rd.editorial.next')}</h2>
            {data.blockers.length > 0 ? <ul className="pe-blockers">{data.blockers.map((blocker) => <li key={blocker.kind + (blocker.topic ?? '')}>{blocker.kind === 'words' ? <BookOpen size={25} /> : <TopicIcon topic={blocker.topic ?? ''} />}<div><b>{blocker.kind === 'words' ? t('rd.blocker.words') : label(blocker.topic ?? '')}</b><span>{blocker.known}/{blocker.total} · {percentage(blocker.known, blocker.total)}%</span></div></li>)}</ul> : <p>{t('rd.verdictHint.ready')}</p>}
            <p className="pe-next-hint">{t('rd.nextHint')}</p>
            <div className="pe-actions">
              {(needsQuestions || !needsWords) && <button className="pe-button" onClick={onCheckGreek}>{t('rd.checkGreek')}</button>}
              {needsWords && <button className={`pe-button${needsQuestions ? ' is-secondary' : ''}`} onClick={() => onNavigate('vocab')}>{t('rd.studyWords')}</button>}
            </div>
            <div className="pe-due"><button onClick={() => onNavigate('flashcards')}><RotateCcw size={21} /><span><b>{data.due.cards} {countWord(data.due.cards, 'card', language)}</b><small>{t('rd.toReview')}</small></span></button><button onClick={() => onNavigate('vocab')}><BookOpen size={21} /><span><b>{data.due.words} {countWord(data.due.words, 'word', language)}</b><small>{t('rd.toReview')}</small></span></button></div>
          </section>
          <section className="pe-statistics" aria-label={t('rd.activity')}>
            <div><Flame size={25} /><b>{data.activity.streak} {countWord(data.activity.streak, 'day', language)}</b><span>{t('rd.inRow')}</span></div>
            <div><Target size={25} /><b>{accuracy === null ? '—' : `${accuracy}%`}</b><span>{t('home.accuracy')}</span></div>
            <div><ClipboardCheck size={25} /><b>{me?.stats.total_sessions ?? '—'}</b><span>{t('home.sessions')}</span></div>
          </section>

        </div>
      </div>
      <section className="pe-history" aria-labelledby="pe-history-title">
        <h2 id="pe-history-title">{t('rd.recent')}</h2>
        {history.length === 0 && <p>{t('rd.historyEmpty')}</p>}
        {history.map((session, index) => <div className="pe-test" key={`${session.completed_at}-${index}`}><TopicIcon topic={session.topic} /><div><b>{label(session.topic)}</b><span>{new Date(session.completed_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}{session.lang === 'el' ? ` · ${t('rd.counts')}` : ''}</span></div><span className={`pe-lang is-${session.lang}`}>{session.lang?.toUpperCase() ?? '—'}</span><strong>{session.score}/{session.total}</strong></div>)}
        {!allHistory && data.history.length > 5 && <button className="pe-more" onClick={() => setAllHistory(true)}>{t('rd.showMore')}</button>}
      </section>
      <button className="pe-home" onClick={onHome}>{t('nav.menu')}</button>
    </div>
  );
}
