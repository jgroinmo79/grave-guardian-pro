
-- Create flower_arrangements table
CREATE TABLE public.flower_arrangements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  arrangement_type TEXT,
  occasion_tags TEXT[] DEFAULT '{}',
  retail_price NUMERIC NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flower_arrangements ENABLE ROW LEVEL SECURITY;

-- Public read for active only
CREATE POLICY "Anyone can view active arrangements"
ON public.flower_arrangements
FOR SELECT
USING (is_active = true);

-- Admin write
CREATE POLICY "Admins full access flower_arrangements"
ON public.flower_arrangements
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-update timestamp
CREATE TRIGGER update_flower_arrangements_updated_at
BEFORE UPDATE ON public.flower_arrangements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create flower-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('flower-images', 'flower-images', true);

-- Public read for flower images
CREATE POLICY "Flower images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'flower-images');

-- Admin upload
CREATE POLICY "Admins can upload flower images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'flower-images' AND public.has_role(auth.uid(), 'admin'));

-- Admin update
CREATE POLICY "Admins can update flower images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'flower-images' AND public.has_role(auth.uid(), 'admin'));

-- Admin delete
CREATE POLICY "Admins can delete flower images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'flower-images' AND public.has_role(auth.uid(), 'admin'));
