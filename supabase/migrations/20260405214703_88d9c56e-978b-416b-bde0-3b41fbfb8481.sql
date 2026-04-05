
CREATE TABLE public.email_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public signup form)
CREATE POLICY "Anyone can insert email signups"
ON public.email_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can view all signups
CREATE POLICY "Admins can view email signups"
ON public.email_signups
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete signups
CREATE POLICY "Admins can delete email signups"
ON public.email_signups
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
