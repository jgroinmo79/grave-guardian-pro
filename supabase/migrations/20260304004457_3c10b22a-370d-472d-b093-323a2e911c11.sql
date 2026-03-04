
-- Create storage bucket for monument intake photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('monument-photos', 'monument-photos', true);

-- Anyone can view photos (public bucket)
CREATE POLICY "Public read access for monument photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'monument-photos');

-- Anyone can upload photos (guest intake flow, no auth required)
CREATE POLICY "Anyone can upload monument photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'monument-photos');
