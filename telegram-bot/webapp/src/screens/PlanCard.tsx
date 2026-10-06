import { useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { ProgressBar } from '../ui';
import { api, type StudyPlan } from '../api';
import type { View } from '../App';
import { countWord, useLanguage } from '../i18n';
import { haptic, notify } from '../telegram';
import { Hourglass, Ostraka, Papyrus } from '../components/homeArt';

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' read as a local calendar date (not UTC midnight). */
function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Plan to the interview" on the home screen: set the date, then see today's share. */
export function PlanCard({
  plan,
  isGuest,
  onNavigate,
  onSaved,
}: {
  plan: StudyPlan;
  isGuest: boolean;
  onNavigate: (v: View) => void;
  onSaved: () => void;
}) {
  const { t, language } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(plan.date ?? '');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const locale = language === 'ru' ? 'ru-RU' : 'el-GR';
  const fmt = (key: string) => fromKey(key).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  const today = new Date();
  const min = localKey(today);
  const max = localKey(new Date(today.getFullYear() + 3, today.getMonth(), today.getDate()));

  async function save(date: string | null) {
    if (busy) return;
    haptic();
    setBusy(true);
    setFailed(false);
    try {
      await api.setInterviewDate(date);
      notify('success');
      setEditing(false);
      onSaved();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  // The calendar picture has a blank sheet; the real date (if there is one) is live text on it.
  const calDate = plan.date ? fromKey(plan.date) : null;
  const head = (
    <div className="pc-head">
      <Hourglass className="pc-ic" />
      <span className="editorial-only pc-cal" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}assets/pureplay/home-side-plan/plan-calendar.webp`} width={104} height={81} alt="" draggable={false} />
        {calDate && (
          <>
            <b>{calDate.getDate()}</b>
            <i>{calDate.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}</i>
          </>
        )}
      </span>
      <span className="pc-title">{t('plan.title')}</span>
    </div>
  );

  if (isGuest)
    return (
      <div className="card plan-card pc-guest">
        {head}
        <p className="pc-text"><span className="pc-legacy-copy">{t('plan.guest')}</span><span className="editorial-only">{t('plan.editorial.guest')}</span></p>
        <button
          className="btn pc-btn"
          onClick={() => {
            haptic();
            // Same as the "sign in" chip: without a token the app reopens on the welcome page.
            window.location.reload();
          }}
        >
          {t('auth.loginChip')} <ArrowRight size={18} strokeWidth={2.4} />
        </button>
      </div>
    );

  const editor = (
    <form
      className="pc-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (value) void save(value);
      }}
    >
      <label className="pc-field">
        <span>{t('plan.dateLabel')}</span>
        <input className="input" type="date" min={min} max={max} value={value} onChange={(e) => setValue(e.target.value)} required />
      </label>
      <div className="pc-actions">
        <button className="btn pc-btn" type="submit" disabled={busy || !value}>
          {busy ? <Loader2 size={18} strokeWidth={2.6} className="spin" /> : t('plan.save')}
        </button>
        {plan.date && (
          <button type="button" className="pc-link" disabled={busy} onClick={() => void save(null)}>
            {t('plan.clear')}
          </button>
        )}
        {plan.date && editing && (
          <button type="button" className="pc-link" onClick={() => setEditing(false)}>
            {t('plan.cancel')}
          </button>
        )}
      </div>
      {failed && <p className="pc-error">{t('common.error')}</p>}
    </form>
  );

  if (!plan.date || plan.phase === 'past' || editing)
    return (
      <div className="card plan-card">
        {head}
        <p className="pc-text">{t(plan.phase === 'past' && !editing ? 'plan.past' : 'plan.intro')}</p>
        {editor}
      </div>
    );

  const days = plan.daysLeft ?? 0;
  // Today's share: what is done and what is left, so the card only counts down.
  const td = plan.today;
  const doneToday = td ? td.reviews.done + td.newQuestions.done + td.newWords.done : 0;
  const leftToday = plan.newQuestions + plan.newWords + plan.reviews.cards + plan.reviews.words;
  const complete = td ? td.complete : leftToday === 0;
  const parts = [
    plan.newQuestions > 0 && `${plan.newQuestions} ${countWord(plan.newQuestions, 'newQuestion', language)}`,
    plan.newWords > 0 && `${plan.newWords} ${countWord(plan.newWords, 'newWord', language)}`,
    plan.reviews.cards + plan.reviews.words > 0 &&
      `${plan.reviews.cards + plan.reviews.words} ${countWord(plan.reviews.cards + plan.reviews.words, 'review', language)}`,
  ].filter(Boolean) as string[];

  return (
    <div className={`card plan-card pace-${plan.pace}`}>
      {head}
      <div className="pc-main">
        <div className="pc-days">
          <b>{days}</b>
          <span>
            {countWord(days, 'day', language)} · {t('plan.until')} {fmt(plan.date)}
          </span>
        </div>
        <div className={`pc-today${complete ? ' is-done' : ''}`}>
          <span>{complete ? t('plan.today') : t('plan.todayLeft')}</span>
          <b>{complete ? <Check size={22} strokeWidth={3} /> : <>≈ {plan.minutes} {t('plan.min')}</>}</b>
        </div>
      </div>
      {complete ? (
        <div className="pc-parts pc-complete">
          <b>{t('plan.complete')}</b> {t('plan.completeHint')}
        </div>
      ) : (
        parts.length > 0 && <div className="pc-parts">{parts.join(' · ')}</div>
      )}
      {td && doneToday + leftToday > 0 && (
        <div className="pc-progress">
          <ProgressBar value={doneToday} total={doneToday + leftToday} />
          <span>{t('plan.doneOf').replace('{done}', String(doneToday)).replace('{total}', String(doneToday + leftToday))}</span>
        </div>
      )}
      <p className="pc-pace">
        <i aria-hidden="true" /> {t(`plan.pace.${plan.pace}`)}
      </p>
      {plan.phase === 'learn' && plan.finishNewBy && plan.unseen.questions + plan.unseen.words > 0 && (
        <p className="pc-note">{t('plan.finishBy').replace('{date}', fmt(plan.finishNewBy))}</p>
      )}
      <div className="pc-actions">
        <button className="btn pc-btn" onClick={() => { haptic(); onNavigate('flashcards'); }}>
          <Ostraka className="pc-btn-ic" /> {t('nav.flashcards')}
          <ArrowRight className="editorial-only pc-btn-go" size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <button className="btn secondary pc-btn" onClick={() => { haptic(); onNavigate('vocab'); }}>
          <Papyrus className="pc-btn-ic" /> {t('nav.vocab')}
          <ArrowRight className="editorial-only pc-btn-go" size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="pc-link"
          onClick={() => {
            setValue(plan.date ?? '');
            setEditing(true);
          }}
        >
          {t('plan.change')}
        </button>
      </div>
    </div>
  );
}
