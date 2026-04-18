-- Cache table for FFC catalog scrapes so the import can be resumable
CREATE TABLE public.ffc_catalog_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ffc_code TEXT NOT NULL UNIQUE,
  raw_code TEXT NOT NULL,
  image_url TEXT NOT NULL,
  product_url TEXT NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ffc_catalog_cache_ffc_code ON public.ffc_catalog_cache(ffc_code);

ALTER TABLE public.ffc_catalog_cache ENABLE ROW LEVEL SECURITY;

-- Only admins can read or manage the cache; service role bypasses RLS
CREATE POLICY "Admins full access ffc_catalog_cache"
ON public.ffc_catalog_cache
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Track scrape session progress so the admin UI can show batched scraping
CREATE TABLE public.ffc_scrape_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | scraping | ready | failed
  product_urls TEXT[] NOT NULL DEFAULT '{}',
  next_index INTEGER NOT NULL DEFAULT 0,
  scraped_count INTEGER NOT NULL DEFAULT 0,
  indexed_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ffc_scrape_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access ffc_scrape_runs"
ON public.ffc_scrape_runs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ffc_scrape_runs_updated_at
BEFORE UPDATE ON public.ffc_scrape_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();