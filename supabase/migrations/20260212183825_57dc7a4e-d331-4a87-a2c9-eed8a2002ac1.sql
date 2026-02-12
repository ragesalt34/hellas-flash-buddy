
-- Create storage bucket for TTS audio cache
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-audio', 'tts-audio', true);

-- Allow public read access
CREATE POLICY "Public read access for tts-audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'tts-audio');

-- Allow service role to upload (edge functions use service role)
CREATE POLICY "Service role can upload tts-audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tts-audio');

CREATE POLICY "Service role can update tts-audio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tts-audio');
