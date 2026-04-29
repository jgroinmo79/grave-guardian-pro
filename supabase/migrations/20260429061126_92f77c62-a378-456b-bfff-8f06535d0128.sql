DROP POLICY IF EXISTS "Authenticated can insert flower_arrangements" ON public.flower_arrangements;
DROP POLICY IF EXISTS "Authenticated can update flower_arrangements" ON public.flower_arrangements;

DROP POLICY IF EXISTS "Authenticated upload flower-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update flower-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete flower-images" ON storage.objects;

CREATE POLICY "Admins upload flower-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'flower-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update flower-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'flower-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete flower-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'flower-images' AND public.has_role(auth.uid(), 'admin'));