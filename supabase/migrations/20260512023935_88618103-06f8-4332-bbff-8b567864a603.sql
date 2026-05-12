CREATE TABLE public.launch_signups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.launch_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert launch signups"
ON public.launch_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view launch signups"
ON public.launch_signups
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete launch signups"
ON public.launch_signups
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));