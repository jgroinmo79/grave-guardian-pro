INSERT INTO storage.buckets (id, name, public)
VALUES ('flower-images', 'flower-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Allow public uploads to flower-images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'flower-images');

CREATE POLICY "Allow public reads from flower-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'flower-images');

CREATE POLICY "Allow public updates to flower-images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'flower-images');