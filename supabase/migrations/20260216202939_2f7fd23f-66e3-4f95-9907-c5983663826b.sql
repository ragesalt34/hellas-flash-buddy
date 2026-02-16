-- Make tts-audio bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'tts-audio';

-- Drop public read policy
DROP POLICY IF EXISTS "Public read access for tts-audio" ON storage.objects;

-- Allow authenticated users to read tts-audio files
CREATE POLICY "Authenticated users can read tts-audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'tts-audio' AND auth.uid() IS NOT NULL);

-- Keep service role upload capability (already works via service role key)
