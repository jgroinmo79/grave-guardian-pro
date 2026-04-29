-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('flower-images', 'flower-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated INSERT/UPDATE on flower_arrangements
CREATE POLICY "Authenticated can insert flower_arrangements"
ON public.flower_arrangements
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update flower_arrangements"
ON public.flower_arrangements
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Storage object policies for flower-images bucket
CREATE POLICY "Public read flower-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'flower-images');

CREATE POLICY "Authenticated upload flower-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'flower-images');

CREATE POLICY "Authenticated update flower-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'flower-images');

CREATE POLICY "Authenticated delete flower-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'flower-images');