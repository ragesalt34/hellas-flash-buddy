import { supabase } from '../supabase';

const TTS_BUCKET = 'tts-audio';
const SAFE_KEY = /^[A-Za-z0-9_-]{1,128}$/;

// Pinned Greek voice: Chirp3-HD (Google's newest, most natural). Overridable via env.
const VOICE = process.env.GOOGLE_TTS_VOICE || 'el-GR-Chirp3-HD-Algenib';

/** Returns a signed URL for cached/synthesized Greek speech audio. Reuses the
 * `tts-audio` bucket already provisioned for the web app's ElevenLabs TTS,
 * with a `gtts_` filename prefix so the two providers' caches never collide. */
export async function getOrSynthesizeGreekSpeech(
  text: string,
  cacheKey: string
): Promise<string> {
  if (!SAFE_KEY.test(cacheKey)) throw new Error('invalid cache key');

  const fileName = `gtts_${cacheKey}.mp3`;

  const { data: existing } = await supabase.storage
    .from(TTS_BUCKET)
    .list('', { search: fileName });

  if (existing && existing.length > 0) {
    const { data: signed, error } = await supabase.storage
      .from(TTS_BUCKET)
      .createSignedUrl(fileName, 3600);
    if (!error && signed?.signedUrl) return signed.signedUrl;
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY not configured');

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: text.slice(0, 500) },
        voice: { languageCode: 'el-GR', name: VOICE },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Google TTS synthesize failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { audioContent: string };
  const audioBuffer = Buffer.from(json.audioContent, 'base64');

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
