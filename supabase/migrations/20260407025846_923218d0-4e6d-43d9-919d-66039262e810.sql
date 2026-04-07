
CREATE TABLE public.memorial_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deceased_first_name TEXT NOT NULL,
  deceased_last_name TEXT NOT NULL,
  cemetery_name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  gps_accuracy_meters NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.memorial_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access memorial_locations"
ON public.memorial_locations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_memorial_locations_updated_at
BEFORE UPDATE ON public.memorial_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
