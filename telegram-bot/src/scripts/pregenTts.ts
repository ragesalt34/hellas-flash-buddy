/**
 * One-off / re-runnable: pre-generate Greek pronunciation audio for every quiz
 * question and vocabulary word, caching mp3s in the `tts-audio` bucket so the
 * Mini App never waits on synthesis. Safe to re-run — already-cached items are
 * served from storage (the service checks the cache first), so reruns are cheap.
 *
 * Run:  cd telegram-bot && npx tsx src/scripts/pregenTts.ts
 * Requires GOOGLE_TTS_API_KEY + SUPABASE_* in .env.
 */
import 'dotenv/config';
import { supabase } from '../supabase';
import { VOCABULARY } from '../data/vocabulary';
import { getOrSynthesizeGreekSpeech } from '../services/ttsService';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let ok = 0;
  let fail = 0;

  // --- Questions (Greek text, keyed q_<id> — shared by Quiz + Flashcards) ---
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question, question_el');
  if (error) throw error;

  const qs = (questions ?? []) as { id: string; question: string; question_el: string | null }[];
  console.log(`Questions: ${qs.length}`);
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    const text = q.question_el?.trim() || q.question;
    if (!text) continue;
    try {
      await getOrSynthesizeGreekSpeech(text, `q_${q.id}`);
      ok++;
    } catch (e) {
      fail++;
      console.error(`  q_${q.id} FAIL:`, e instanceof Error ? e.message : e);
    }
    if ((i + 1) % 20 === 0) console.log(`  ...questions ${i + 1}/${qs.length}`);
    await sleep(120);
  }

  // --- Vocabulary words (keyed vocab_<id>) ---
  console.log(`Vocabulary: ${VOCABULARY.length}`);
  for (let i = 0; i < VOCABULARY.length; i++) {
    const v = VOCABULARY[i];
    try {
      await getOrSynthesizeGreekSpeech(v.word, `vocab_${v.id}`);
      ok++;
    } catch (e) {
      fail++;
      console.error(`  vocab_${v.id} FAIL:`, e instanceof Error ? e.message : e);
    }
    if ((i + 1) % 20 === 0) console.log(`  ...vocab ${i + 1}/${VOCABULARY.length}`);
    await sleep(120);
  }

  console.log(`\nDone. cached/ok: ${ok}, failed: ${fail}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('pregenTts fatal:', e);
    process.exit(1);
  });
