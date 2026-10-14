import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Check,
  X,
  RotateCcw,
  LayoutGrid,
  House,
  Volume2,
  ArrowLeft,
} from '../components/HellasIcons';
import { SlideArrow } from '../components/SlideArrow';
import { api, QuizQuestion, persistWrite } from '../api';
import { MiniTemple } from '../components/statsArt';
import { StudyIcon, TopicIcon } from '../components/StudyIcon';
import { TopicDecor } from '../components/TopicDecor';
import { SectionLabel } from '../components/SectionLabel';
import { RewardSides, RewardWreath } from '../components/RewardArt';
import { haptic, notify } from '../telegram';
import { speakGreek, prefetchGreek, textKey, hasGreek } from '../speech';
import { playCorrect, playWrong, playComplete, playTap } from '../sound';
import { CountUp, Loading, ProgressBar, Ring, useCached } from '../ui';
import { countWord, useLanguage, t as translate, type Language } from '../i18n';
import { Greek } from '../components/greek';

/* Round-theme ornaments for the topic picker: one classical element per
   screen edge, faint and pastel, so the centre stays a clean menu. Decorative
   only — aria-hidden, and .hs-deco is hidden by the square theme. */
const LETTERS = ['Α', 'Β', 'Γ', 'Δ'];

const tone = (p: number) => (p >= 85 ? 'h3' : p >= 60 ? 'h2' : p > 0 ? 'h1' : 'h0');

const TOPICS: { id: string; key: string; span?: boolean }[] = [
  { id: 'mixed', key: 'topic.mixed', span: true },
  { id: 'history', key: 'topic.history' },
  { id: 'culture', key: 'topic.culture' },
  { id: 'laws', key: 'topic.laws' },
  { id: 'geography', key: 'topic.geography' },
];

interface AnswerRec {
  question_id: string;
  chosen: string;
  correct: boolean;
  correct_answer: string;
}

type Phase = 'topic' | 'loading' | 'play' | 'result';

export function Quiz({ onHome }: { onHome: () => void }) {
  const { t: uiText, language } = useLanguage();
  const [sessionLanguage, setSessionLanguage] = useState<Language>(language);
  // Same report the readiness screen shows, so each tile can say how far along that topic is.
  const { data: readiness } = useCached(`readiness:${language}`, api.readiness);
  const [phase, setPhase] = useState<Phase>('topic');
  const t = phase === 'play' || phase === 'result' ? (key: string) => translate(key, sessionLanguage) : uiText;
  const [topic, setTopic] = useState('mixed');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerRec[]>([]);
  // One-shot guard for submitting the finished session. A ref, not state: it has
  // to settle synchronously within the same frame, and it must be declared with
  // the other hooks — the phase branches below return early.
  const submitted = useRef(false);
  const [score, setScore] = useState(0);
  const [startError, setStartError] = useState<'load' | 'empty' | null>(null);
  const chosenRef = useRef<string | null>(null);
  const startingRef = useRef(false);

  // Warm the current question + its options so tapping 🔊 is instant.
  useEffect(() => {
    if (phase !== 'play') return;
    const q = questions[idx];
    if (!q) return;
    prefetchGreek(q.question, `q_${q.id}`);
    q.options.forEach((opt) => prefetchGreek(opt, textKey(opt)));
  }, [phase, idx, questions]);

  async function start(topicId: string) {
    if (startingRef.current) return;
    startingRef.current = true;
    haptic();
    setSessionLanguage(language);
    setStartError(null);
    setTopic(topicId);
    setPhase('loading');
    try {
      const r = await api.quiz(topicId, 10);
      setQuestions(r.questions);
      setIdx(0);
      setChosen(null);
      chosenRef.current = null;
      // A new session may be submitted again (retry / other topic used to stall
      // on the last question: the guard was still set from the previous one).
      submitted.current = false;
      setAnswers([]);
      setScore(0);
      if (!r.questions.length) setStartError('empty');
      setPhase(r.questions.length ? 'play' : 'topic');
    } catch {
      setStartError('load');
      setPhase('topic');
    } finally {
      startingRef.current = false;
    }
  }

  function choose(opt: string) {
    if (chosenRef.current !== null) return;
    chosenRef.current = opt;
    const q = questions[idx];
    const correct = opt === q.correct_answer;
    setChosen(opt);
    if (correct) {
      setScore((s) => s + 1);
      notify('success');
      playCorrect();
    } else {
      notify('error');
      playWrong();
    }
    setAnswers((a) => [
      ...a,
      { question_id: q.id, chosen: opt, correct, correct_answer: q.correct_answer },
    ]);
  }

  function next() {
    if (chosenRef.current === null) return;
    chosenRef.current = null;
    haptic();
    if (idx + 1 >= questions.length) {
      // Two taps landing in the same frame would both see the old `idx` and
      // submit the session twice: two rows in the history, the score counted
      // twice, and every question's SRS level advanced twice. A ref settles it
      // synchronously, unlike state, which only updates on the next render.
      if (submitted.current) return;
      submitted.current = true;
      persistWrite(
        () =>
          api.quizComplete({
            topic,
            score,
            answers,
            questions: questions.map((x) => ({ id: x.id })),
          }),
        'quiz session'
      );
      playComplete();
      setPhase('result');
    } else {
      playTap();
      setIdx((i) => i + 1);
      setChosen(null);
    }
  }

  // ---- Topic selection ----
  if (phase === 'topic') {
    // The weakest topic in Greek, flagged only once there is something to compare.
    const tops = readiness?.topics ?? [];
    const pctOf = (tp: (typeof tops)[number]) => (tp.total > 0 ? tp.greek.known / tp.total : 0);
    const weakTopic =
      tops.some((tp) => tp.greek.checked > 0)
        ? [...tops].sort((a, b) => pctOf(a) - pctOf(b)).find((tp) => pctOf(tp) < 0.85)?.topic
        : undefined;
    return (
      <div className="fade-in tp-screen">
        <TopicDecor />
        <button className="pureplay-back pureplay-desktop" onClick={onHome}><ArrowLeft size={18} />{t('nav.backHome')}</button>
        <SectionLabel k="quiz.chooseTopic">
          <Greek name="olive-branch-small" className="tp-label-olive" />
        </SectionLabel>
        <p className="pureplay-topic-sub pureplay-desktop">{t('quiz.pureplay.sub')}</p>
        {startError && (
          <div className="card quiz-load-error" role="alert">
            <p>{t(startError === 'load' ? 'quiz.loadError' : 'quiz.noQuestions')}</p>
            {startError === 'load' && (
              <button className="btn secondary" onClick={() => start(topic)}>
                <RotateCcw size={18} /> {t('common.retry')}
              </button>
            )}
          </div>
        )}
        <div className="tiles stagger">
          {TOPICS.map((topicDef, i) => {
            if (topicDef.span)
              return (
                <button
                  key={topicDef.id}
                  className="tile feature warm t-mixed"
                  style={{ animationDelay: `${40 + i * 45}ms` }}
                  onClick={() => start(topicDef.id)}
                >
                  <img className="pureplay-topic-art pureplay-desktop" src={`${import.meta.env.BASE_URL}assets/pureplay/mixed-collage.webp`} alt="" aria-hidden="true" />
                  <span className="tile-ic tp-mini">
                    <MiniTemple />
                  </span>
                  <span className="grow">
                    <span className="tile-t" style={{ display: 'block' }}>
                      {t(topicDef.key)}
                    </span>
                    <span className="tile-d">{t('topic.mixed.desc')}</span>
                  </span>
                  <span className="arrow">
                    <span className="pureplay-desktop">{t('home.pureplay.start')}</span>
                    <SlideArrow size={22} strokeWidth={2.6} />
                  </span>
                </button>
              );
            const report = readiness?.topics.find((tp) => tp.topic === topicDef.id);
            const known = report && report.total > 0 ? Math.round((report.greek.known / report.total) * 100) : 0;
            const isWeak = weakTopic === topicDef.id;
            return (
              <button
                key={topicDef.id}
                className={`tile tp-tile t-${topicDef.id}${isWeak ? ' is-weak' : ''}`}
                style={{ animationDelay: `${40 + i * 45}ms` }}
                onClick={() => start(topicDef.id)}
              >
                <img className="pureplay-topic-art pureplay-desktop" src={`${import.meta.env.BASE_URL}assets/pureplay/${topicDef.id}-collage.webp`} alt="" aria-hidden="true" />
                <TopicIcon topic={topicDef.id} className="tp-emblem" />
                <span className="tp-body">
                  {isWeak && <span className="tp-weak">{t('tp.weak')}</span>}
                  <span className="tile-t">{t(topicDef.key)}</span>
                  {report && (
                    <>
                      <span className="tp-meta">
                        {report.total} {countWord(report.total, 'question', language)} ·{' '}
                        {t('tp.known').replace('{n}', `${known}%`)}
                      </span>
                      <span className="tp-bar">
                        <i className={tone(known)} style={{ width: `${known}%` }} />
                      </span>
                    </>
                  )}
                </span>
                <span className="pureplay-topic-arrow pureplay-desktop" aria-hidden="true"><SlideArrow size={24} /></span>
              </button>
            );
          })}
        </div>
        <p className="pureplay-topic-note pureplay-desktop">{t('quiz.pureplay.hint')}</p>
      </div>
    );
  }

  if (phase === 'loading') return <Loading />;

  // ---- Result ----
  if (phase === 'result') {
    const total = questions.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const ttlKey =
      pct >= 80 ? 'quiz.result.great' : pct >= 60 ? 'quiz.result.good' : pct >= 40 ? 'quiz.result.keepGoing' : 'quiz.result.tryHarder';
    return (
      <div className="fade-in center-col quiz-result-screen">
        <div className="result">
          <RewardSides />
          <div className="ring-wreath">
            <RewardWreath />
            <Ring pct={pct} size={150} stroke={13}>
              <div className="ring-pct"><CountUp value={pct} />%</div>
              <div className="ring-sub">{score}/{total}</div>
            </Ring>
          </div>
          <div className="ttl">{t(ttlKey)}</div>
          <div className="line" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Check size={15} strokeWidth={3} /> {score} {t('common.correct')}
            </span>
            ·
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <X size={15} strokeWidth={3} /> {total - score} {t('common.wrong')}
            </span>
          </div>
        </div>
        <button className="btn btn-block" onClick={() => start(topic)}>
          <RotateCcw size={18} strokeWidth={2.4} /> {t('common.retry')}
        </button>
        <button className="btn btn-block secondary" onClick={() => setPhase('topic')}>
          <LayoutGrid size={18} strokeWidth={2.4} /> {t('quiz.otherTopic')}
        </button>
        <button className="btn btn-block secondary" onClick={onHome}>
          <House size={18} strokeWidth={2.4} /> {t('nav.menu')}
        </button>
      </div>
    );
  }

  // ---- Playing ----
  const q = questions[idx];
  const answered = chosen !== null;
  const correct = chosen === q.correct_answer;
  const questionTopic = q.topic ?? topic;
  const art = questionTopic === 'history'
    ? 'quiz-paper-v1/archive-collage.png'
    : 'pureplay/paper-art-' + (['culture', 'laws', 'geography'].includes(questionTopic) ? questionTopic : 'mixed') + '.webp';
  return (
    <div className="fade-in qz-play qz-paper-screen">
      <div className="qz-paper-heading">
        <h1><StudyIcon name="quiz" />{t('nav.quiz')}</h1>
        <div className="qz-paper-progress">
          <ProgressBar value={idx + (answered ? 1 : 0)} total={questions.length} />
          <span className="counter">{idx + 1} / {questions.length}</span>
        </div>
      </div>
      {language !== sessionLanguage && <p className="qz-language-note" role="status">{uiText('quiz.sessionLanguage')}</p>}
      <Fragment key={idx}>
        <div className="qz-paper-card swap-in">
          <span className={'qz-paper-topic ft-' + questionTopic}>{t('topic.' + questionTopic)}</span>
          <div className="qz-paper-intro">
            <div className="speak-row">
              <h2 className="qtext">{q.question}</h2>
              {hasGreek(q.question) && <button className="speak-btn" aria-label={t('common.pronounce')}
                onClick={() => { haptic(); speakGreek(q.question, 'q_' + q.id); }}>
                <Volume2 size={18} />
              </button>}
            </div>
            <img className="qz-paper-art" src={import.meta.env.BASE_URL + 'assets/' + art} alt="" aria-hidden="true" />
          </div>
          <div className="options" aria-label={t('quiz.paper.choose')}>
            {q.options.map((opt, i) => {
              const isCorrect = answered && opt === q.correct_answer;
              const isWrong = answered && opt === chosen && !isCorrect;
              return <div key={i} className={'option' + (isCorrect ? ' correct' : isWrong ? ' wrong' : '')}>
                <button className="qz-answer-hit" disabled={answered} onClick={() => choose(opt)}>
                  <span className="lt">{LETTERS[i] ?? i + 1}</span>
                  <span className="qz-answer-copy">{opt}</span>
                  {isCorrect && <span className="qz-answer-status"><Check size={18} />{t('quiz.paper.correct')}</span>}
                  {isWrong && <span className="qz-answer-status is-wrong"><X size={18} />{t('quiz.paper.chosen')}</span>}
                </button>
                {hasGreek(opt) && <button className="opt-speak" aria-label={t('common.pronounce')}
                  onClick={() => { haptic(); speakGreek(opt, textKey(opt)); }}><Volume2 size={16} /></button>}
              </div>;
            })}
          </div>
          {answered && <div className="qz-paper-feedback" role="status">
            <div className="qz-paper-explanation">
              <strong>{t(correct ? 'quiz.paper.success' : 'quiz.paper.error')}</strong>
              {q.explanation && <p>{q.explanation}</p>}
            </div>
            <button className="qz-paper-next" onClick={next}>
              {t(idx + 1 >= questions.length ? 'quiz.result' : 'quiz.paper.next')}
            </button>
          </div>}
        </div>
      </Fragment>
    </div>
  );
}
