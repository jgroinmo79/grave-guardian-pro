ALTER TABLE public.flower_arrangements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read flower_arrangements" ON public.flower_arrangements;
DROP POLICY IF EXISTS "Public can insert flower_arrangements" ON public.flower_arrangements;
DROP POLICY IF EXISTS "Public can update flower_arrangements" ON public.flower_arrangements;

CREATE POLICY "Public can read flower_arrangements"
ON public.flower_arrangements FOR SELECT USING (true);

CREATE POLICY "Public can insert flower_arrangements"
ON public.flower_arrangements FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update flower_arrangements"
ON public.flower_arrangements FOR UPDATE USING (true);