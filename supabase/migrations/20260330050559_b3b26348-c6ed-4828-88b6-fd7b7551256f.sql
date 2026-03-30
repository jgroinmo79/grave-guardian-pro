
CREATE TABLE public.gallery_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view gallery photos (public page)
CREATE POLICY "Gallery photos are publicly viewable"
ON public.gallery_photos FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert gallery photos"
ON public.gallery_photos FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update gallery photos"
ON public.gallery_photos FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete gallery photos"
ON public.gallery_photos FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
