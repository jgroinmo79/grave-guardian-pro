CREATE TABLE public.consent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  terms_version TEXT,
  ip_address TEXT,
  consent_text TEXT
);

ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access consent_logs"
ON public.consent_logs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own consent_logs"
ON public.consent_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent_logs"
ON public.consent_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);