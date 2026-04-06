
-- 1. Drop the broken share_token RLS policy (edge function handles token matching)
DROP POLICY IF EXISTS "Public can view by share_token" ON service_logs;

-- 2. Fix storage: drop unauthenticated upload, add authenticated-only policy
DROP POLICY IF EXISTS "Anyone can upload monument photos" ON storage.objects;

CREATE POLICY "Authenticated users can upload monument photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'monument-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Remove direct user INSERT on subscriptions (created server-side only)
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
