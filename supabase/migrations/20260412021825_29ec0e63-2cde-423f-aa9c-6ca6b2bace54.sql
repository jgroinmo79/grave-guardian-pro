ALTER TABLE public.flower_arrangements
  ADD COLUMN gd_code text UNIQUE,
  ADD COLUMN ffc_code text,
  ADD COLUMN wholesale_price numeric;