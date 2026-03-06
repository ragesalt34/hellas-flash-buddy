
-- Fix overly-permissive tts-audio storage policies
-- Drop the policies that allow any authenticated user to write
DROP POLICY IF EXISTS "Service role can upload tts-audio" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update tts-audio" ON storage.objects;
-- Service role bypasses RLS entirely, so no explicit INSERT/UPDATE policy is needed.
-- Authenticated users should not be able to write to this bucket directly.
