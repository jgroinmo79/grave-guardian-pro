-- Travel zones table (replaces hardcoded TRAVEL_ZONES constant)
CREATE TABLE public.travel_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_number int NOT NULL,
  label text NOT NULL,
  max_miles numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  fee_label text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_zones ENABLE ROW LEVEL SECURITY;

-- Anyone can read (booking flow needs this, including unauthenticated visitors browsing /services)
CREATE POLICY "Anyone can read travel zones"
  ON public.travel_zones FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins write
CREATE POLICY "Admins manage travel zones"
  ON public.travel_zones FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER travel_zones_updated_at
  BEFORE UPDATE ON public.travel_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with current 3-zone structure
INSERT INTO public.travel_zones (zone_number, label, max_miles, fee, fee_label, sort_order) VALUES
  (1, 'Zone 1 (0–25 mi)',    25,  0,   'Included', 1),
  (2, 'Zone 2 (25–75 mi)',   75,  65,  '$65',      2),
  (3, 'Zone 3 (75–150 mi)',  150, 150, '$150',     3);

-- Single-row pricing settings table for the annual-plan free-travel rule (and future toggles)
CREATE TABLE public.pricing_settings (
  id int PRIMARY KEY DEFAULT 1,
  annual_plan_free_travel_enabled boolean NOT NULL DEFAULT true,
  annual_plan_free_travel_min_miles numeric NOT NULL DEFAULT 25,
  annual_plan_free_travel_max_miles numeric NOT NULL DEFAULT 75,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pricing settings"
  ON public.pricing_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage pricing settings"
  ON public.pricing_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER pricing_settings_updated_at
  BEFORE UPDATE ON public.pricing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pricing_settings (id) VALUES (1);