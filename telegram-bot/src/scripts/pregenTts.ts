/**
 * One-off / re-runnable: pre-generate Greek pronunciation audio for the whole
 * app — questions, every answer option, flashcard answers and vocabulary words
 * — caching mp3s in the `tts-audio` bucket so the app never waits on synthesis.
 * Safe to re-run: already-cached items are served from storage (the service
 * checks the cache first), so reruns cost nothing at the TTS provider.
 *
 * Cache keys MUST match the frontend (webapp/src/speech.ts + screens):
 *   q_<id>        question   (Quiz + Flashcards)
 *   t_<hash>      answer option text
 *   a_<hash>      flashcard answer text
 *   vocab_<id>    vocabulary word
 *
 * Run:  cd telegram-bot && npx tsx src/scripts/pregenTts.ts            (everything)
 *       cd telegram-bot && npx tsx src/scripts/pregenTts.ts --essentials  (questions + vocab only)
 * Requires ELEVENLABS_API_KEY (+ optional ELEVENLABS_VOICE_ID) + SUPABASE_* in .env.
 * NOTE: ElevenLabs bills per character — the summary below prints the total so
 * you can check it against your plan's monthly quota before it runs. Answer
 * options/answers are the bulk; --essentials skips them (they still synthesize
 * on first play and cache from then on).
 */
import 'dotenv/config';
import { supabase } from '../supabase';
import { VOCABULARY } from '../data/vocabulary';
import { getOrSynthesizeGreekSpeech } from '../services/ttsService';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Must stay identical to webapp/src/speech.ts `textKey` (FNV-1a → base36). */
function textKey(text: string, prefix = 't'): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${prefix}_${(h >>> 0).toString(36)}`;
}

interface Row {
  id: string;
  question_ru: string | null;
  question_el: string | null;
  correct_answer_el: string | null;
  wrong_answers_el: string[] | null;
}

async function main() {
  const { data, error } = await supabase
    .from('questions')
    .select('id, question_ru, question_el, correct_answer_el, wrong_answers_el');
  if (error) throw error;
  const rows = (data ?? []) as Row[];

  // Build a de-duplicated list of {text, cacheKey} across the whole app.
  const jobs = new Map<string, string>(); // cacheKey -> text (dedupes shared text)
  const add = (text: string | null | undefined, key: string) => {
    const t = text?.trim();
    if (t) jobs.set(key, t);
  };

  const essentials = process.argv.includes('--essentials');
  for (const r of rows) {
    add(r.question_el || r.question_ru, `q_${r.id}`);
    if (!essentials) {
      add(r.correct_answer_el, textKey(r.correct_answer_el ?? '', 'a')); // flashcard answer
      for (const opt of [r.correct_answer_el, ...(r.wrong_answers_el ?? [])]) {
        if (opt?.trim()) add(opt, textKey(opt)); // quiz option
      }
    }
  }
  for (const v of VOCABULARY) add(v.word, `vocab_${v.id}`);
  if (essentials) console.log('Mode: --essentials (questions + vocab only)\n');

  const total = jobs.size;
  const chars = [...jobs.values()].reduce((n, t) => n + t.length, 0);
  console.log(`Pre-generating ${total} unique clips (~${chars} characters at the TTS provider).`);
  console.log('Cached items are skipped for free; only new ones consume quota.\n');

  let ok = 0;
  let fail = 0;
  let i = 0;
  for (const [key, text] of jobs) {
    i++;
    try {
      await getOrSynthesizeGreekSpeech(text, key);
      ok++;
    } catch (e) {
      fail++;
      console.error(`  ${key} FAIL:`, e instanceof Error ? e.message : e);
    }
    if (i % 25 === 0) console.log(`  ...${i}/${total}`);
    await sleep(120);
  }

  console.log(`\nDone. ok: ${ok}, failed: ${fail}, total: ${total}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('pregenTts fatal:', e);
    process.exit(1);
  });
