import crypto from 'crypto';
import { supabase } from '../supabase';

const TTS_BUCKET = 'tts-audio';
const SAFE_KEY = /^[A-Za-z0-9_-]{1,128}$/;

// --- Provider selection ---
// ElevenLabs is preferred (most natural voice); Google Cloud TTS is a fallback
// if only its key is configured.
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVEN_VOICE = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // default: "Rachel"
// Model is chosen per text length: the expressive default (e.g. eleven_v3)
// sounds rich on sentences/questions but returns EMPTY audio for very short
// inputs, so short words/options fall back to a robust model that handles them.
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2'; // long text
const ELEVEN_MODEL_SHORT = process.env.ELEVENLABS_MODEL_ID_SHORT || 'eleven_flash_v2_5'; // short text
const ELEVEN_SHORT_MAXLEN = Number(process.env.ELEVENLABS_SHORT_MAXLEN ?? 24);
const modelForText = (text: string): string =>
  text.trim().length <= ELEVEN_SHORT_MAXLEN ? ELEVEN_MODEL_SHORT : ELEVEN_MODEL;
// Higher stability = steadier delivery with fewer expressive artifacts (e.g. the
// audible in-breath multilingual_v2 sometimes adds at the end of a phrase).
// Tunable so it can be dialed in without a code change.
const ELEVEN_STABILITY = Number(process.env.ELEVENLABS_STABILITY ?? 0.7);
// Words were read back noticeably faster than a learner can follow along.
// 1.0 is normal pace; ElevenLabs accepts 0.7–1.2. 0.85 is ~15% slower.
const ELEVEN_SPEED = Number(process.env.ELEVENLABS_SPEED ?? 0.85);
const GOOGLE_KEY = process.env.GOOGLE_TTS_API_KEY;
const GOOGLE_VOICE = process.env.GOOGLE_TTS_VOICE || 'el-GR-Chirp3-HD-Algenib';
// Google's own equivalent, scaled the same ~15% off its prior 0.95 pace.
const GOOGLE_SPEAKING_RATE = Number(process.env.GOOGLE_TTS_SPEAKING_RATE ?? 0.81);

type Provider = 'el' | 'gtts';
const provider: Provider | null = ELEVEN_KEY ? 'el' : GOOGLE_KEY ? 'gtts' : null;

// Short fingerprint of the current voice/model/settings. Baked into the cache
// filename so changing any of them auto-regenerates (old files just orphan)
// instead of serving stale audio with the previous voice/tuning.
const hash8 = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const ELEVEN_BASE = `el:${ELEVEN_VOICE}:${ELEVEN_MODEL}:${ELEVEN_MODEL_SHORT}:${ELEVEN_SHORT_MAXLEN}:${ELEVEN_STABILITY}`;
const variant =
  provider === 'el'
    ? hash8(`${ELEVEN_BASE}:${ELEVEN_SPEED}`)
    : hash8(`gtts:${GOOGLE_VOICE}:${GOOGLE_SPEAKING_RATE}`);

async function synthesizeElevenLabs(text: string): Promise<Buffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY as string,
        'Content-Type': 'application/json',
        accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelForText(text),
        // Tuned for clear language-learning pronunciation (stable, natural, and
        // slow enough to follow along with).
        voice_settings: {
          stability: ELEVEN_STABILITY,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
          speed: ELEVEN_SPEED,
        },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs synthesize failed: ${res.status} ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function synthesizeGoogle(text: string): Promise<Buffer> {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'el-GR', name: GOOGLE_VOICE },
        audioConfig: { audioEncoding: 'MP3', speakingRate: GOOGLE_SPEAKING_RATE },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Google TTS synthesize failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { audioContent: string };
  return Buffer.from(json.audioContent, 'base64');
}

/** FNV-1a → base36 — server-side content hash for cache filenames. */
function fnvKey(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

async function fileExists(fileName: string): Promise<boolean> {
  const { data } = await supabase.storage.from(TTS_BUCKET).list('', { search: fileName });
  return !!data && data.some((f) => f.name === fileName);
}

let variantsCache: { at: number; list: string[] } | null = null;

/** Variant hashes present in the bucket, most-populated first; refreshed hourly. */
async function cachedVariants(): Promise<string[]> {
  if (variantsCache && Date.now() - variantsCache.at < 60 * 60 * 1000) return variantsCache.list;
  const counts = new Map<string, number>();
  const re = new RegExp(`^${provider}_([0-9a-f]{8})_s_`);
  for (let offset = 0; ; offset += 1000) {
    const { data } = await supabase.storage.from(TTS_BUCKET).list('', { limit: 1000, offset });
    for (const f of data ?? []) {
      const m = re.exec(f.name);
      if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    }
    if (!data || data.length < 1000) break;
  }
  const list = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  variantsCache = { at: Date.now(), list };
  return list;
}

async function signUrl(fileName: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(TTS_BUCKET).createSignedUrl(fileName, 3600);
  return !error && data?.signedUrl ? data.signedUrl : null;
}

/** Returns a signed URL for cached/synthesized Greek speech audio.
 *
 * The cache filename is CONTENT-ADDRESSED (derived server-side from the text),
 * so the same text always maps to the same file no matter what cacheKey the
 * client sends — a caller cycling made-up cacheKeys can't force paid
 * re-synthesis of the same clip. The client-provided key is only used to find
 * clips cached under the older naming scheme. */
export async function getOrSynthesizeGreekSpeech(
  text: string,
  legacyCacheKey?: string
): Promise<string> {
  if (!provider) throw new Error('no TTS provider configured (set ELEVENLABS_API_KEY or GOOGLE_TTS_API_KEY)');

  const trimmed = text.trim();
  const fileName = `${provider}_${variant}_s_${fnvKey(trimmed)}.mp3`;

  if (await fileExists(fileName)) {
    const url = await signUrl(fileName);
    if (url) return url;
  }

  // Older clips (pre content-addressing) were stored under the client key —
  // serve them so the pre-generated library keeps working at zero cost.
  if (legacyCacheKey && SAFE_KEY.test(legacyCacheKey)) {
    const legacyName = `${provider}_${variant}_${legacyCacheKey}.mp3`;
    if (await fileExists(legacyName)) {
      const url = await signUrl(legacyName);
      if (url) return url;
    }
  }

  let audioBuffer: Buffer;
  try {
    audioBuffer =
      provider === 'el'
        ? await synthesizeElevenLabs(trimmed.slice(0, 800))
        : await synthesizeGoogle(trimmed.slice(0, 500));
  } catch (err) {
    // Any earlier voice/settings variant of the same text beats silence when the
    // provider is down or the key is rejected. Deployments have run with
    // different settings, so the clip may exist under any of several variants.
    for (const v of await cachedVariants()) {
      if (v === variant) continue;
      const oldName = `${provider}_${v}_s_${fnvKey(trimmed)}.mp3`;
      if (!(await fileExists(oldName))) continue;
      const url = await signUrl(oldName);
      if (url) {
        console.warn('tts: synthesis failed, serving', oldName, '-', err instanceof Error ? err.message.slice(0, 120) : err);
        return url;
      }
    }
    throw err;
  }

  // Never cache empty/degenerate audio — e.g. eleven_v3 returns an empty body
  // for very short inputs. Caching a 0-byte file would make that clip silent
  // forever; throw instead so it isn't stored and can be retried.
  if (audioBuffer.byteLength < 256) {
    throw new Error(
      `empty audio from ${provider} (${audioBuffer.byteLength} bytes) — the model may not support this text length`
    );
  }

  const { error: uploadError } = await supabase.storage
    .from(TTS_BUCKET)
    .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await supabase.storage
    .from(TTS_BUCKET)
    .createSignedUrl(fileName, 3600);
  if (signError || !signed?.signedUrl) throw signError ?? new Error('failed to sign url');

  return signed.signedUrl;
}
