-- Page views tracking table
CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  referrer text,
  screen_width integer,
  user_agent text,
  session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert page views"
  ON public.page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view page views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX idx_page_views_url ON public.page_views (url);

-- Abandoned leads tracking table
CREATE TABLE public.abandoned_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  email text,
  name text,
  phone text,
  step_reached text NOT NULL DEFAULT 'cemetery',
  step_index integer NOT NULL DEFAULT 0,
  form_data jsonb DEFAULT '{}'::jsonb,
  converted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.abandoned_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert abandoned leads"
  ON public.abandoned_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update abandoned leads by session"
  ON public.abandoned_leads FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view abandoned leads"
  ON public.abandoned_leads FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete abandoned leads"
  ON public.abandoned_leads FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_abandoned_leads_session ON public.abandoned_leads (session_id);
CREATE INDEX idx_abandoned_leads_created ON public.abandoned_leads (created_at DESC);
CREATE INDEX idx_abandoned_leads_converted ON public.abandoned_leads (converted);

-- Add trigger for updated_at
CREATE TRIGGER update_abandoned_leads_updated_at
  BEFORE UPDATE ON public.abandoned_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();