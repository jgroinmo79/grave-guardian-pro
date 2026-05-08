-- 1. addons catalog
CREATE TABLE public.addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  base_price numeric NOT NULL DEFAULT 0,
  is_tiered boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_addons_updated_at BEFORE UPDATE ON public.addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. addon_tiers
CREATE TABLE public.addon_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id uuid NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  tier_code text NOT NULL,
  tier_label text NOT NULL,
  min_value numeric,
  max_value numeric,
  unit text NOT NULL DEFAULT 'letters',
  price numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_addon_tiers_addon ON public.addon_tiers(addon_id);
CREATE UNIQUE INDEX uq_addon_tiers_code ON public.addon_tiers(addon_id, tier_code);

-- 3. visit_addons
CREATE TABLE public.visit_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.scheduled_visits(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES public.addons(id),
  tier_id uuid REFERENCES public.addon_tiers(id),
  selected_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_visit_addons_visit ON public.visit_addons(visit_id);
CREATE INDEX idx_visit_addons_addon ON public.visit_addons(addon_id);

-- 4. RLS
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active addons" ON public.addons
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins full access addons" ON public.addons
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Anyone reads tiers of active addons" ON public.addon_tiers
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.addons a WHERE a.id = addon_tiers.addon_id AND a.active = true));
CREATE POLICY "Admins full access addon_tiers" ON public.addon_tiers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Users view own visit_addons" ON public.visit_addons
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scheduled_visits sv WHERE sv.id = visit_addons.visit_id AND sv.user_id = auth.uid()));
CREATE POLICY "Users insert own visit_addons" ON public.visit_addons
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.scheduled_visits sv WHERE sv.id = visit_addons.visit_id AND sv.user_id = auth.uid()));
CREATE POLICY "Admins full access visit_addons" ON public.visit_addons
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 5. Seeds
INSERT INTO public.addons (code, label, description, base_price, is_tiered, config, sort_order) VALUES
  ('GD-ADD-FLOWER', 'Flower Placement', 'Add a fresh flower arrangement to this visit, placed at the monument.', 50, false,
    '{"allow_per_visit": true}'::jsonb, 10),
  ('GD-ADD-HOLIDAYLOCK', 'Holiday Date Lock', 'Guarantee placement on or before a specific holiday. Locks the schedule window so the visit lands inside it.', 35, false,
    '{"lead_window_days": 30, "completion_buffer_days": 5, "holidays": ["Memorial Day","Mother''s Day","Father''s Day","Christmas"]}'::jsonb, 20),
  ('GD-ADD-LITHIO', 'Lithichrome Letter Restoration', 'Re-paint faded lettering with archival Lithichrome. Priced by total letter count on the monument.', 0, true,
    '{}'::jsonb, 30);

INSERT INTO public.addon_tiers (addon_id, tier_code, tier_label, min_value, max_value, unit, price, sort_order)
SELECT id, 'small', 'Small (under 25 letters)', 0, 24, 'letters', 75, 10 FROM public.addons WHERE code = 'GD-ADD-LITHIO'
UNION ALL
SELECT id, 'medium', 'Medium (25–60 letters)', 25, 60, 'letters', 100, 20 FROM public.addons WHERE code = 'GD-ADD-LITHIO'
UNION ALL
SELECT id, 'large', 'Large (60+ letters)', 61, NULL, 'letters', 125, 30 FROM public.addons WHERE code = 'GD-ADD-LITHIO';