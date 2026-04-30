ALTER TABLE flower_arrangements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read flower_arrangements" ON flower_arrangements;
DROP POLICY IF EXISTS "Public can insert flower_arrangements" ON flower_arrangements;
DROP POLICY IF EXISTS "Public can update flower_arrangements" ON flower_arrangements;

CREATE POLICY "Public can read flower_arrangements"
ON flower_arrangements FOR SELECT USING (true);

CREATE POLICY "Public can insert flower_arrangements"
ON flower_arrangements FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update flower_arrangements"
ON flower_arrangements FOR UPDATE USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('flower-images', 'flower-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public uploads to flower-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from flower-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to flower-images" ON storage.objects;

CREATE POLICY "Allow public uploads to flower-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'flower-images');

CREATE POLICY "Allow public reads from flower-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'flower-images');

CREATE POLICY "Allow public updates to flower-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'flower-images');