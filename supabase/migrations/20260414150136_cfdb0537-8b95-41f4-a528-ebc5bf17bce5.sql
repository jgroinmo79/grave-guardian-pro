-- Recreate the view with SECURITY INVOKER (default, explicit for clarity)
DROP VIEW IF EXISTS public.flower_arrangements_public;

CREATE VIEW public.flower_arrangements_public 
WITH (security_invoker = true) AS
SELECT id, name, description, retail_price, image_url, image_url_2, image_url_3, image_url_4, image_url_5, arrangement_type, occasion_tags, is_active, created_at, updated_at
FROM public.flower_arrangements
WHERE is_active = true;

-- Re-grant access
GRANT SELECT ON public.flower_arrangements_public TO anon;
GRANT SELECT ON public.flower_arrangements_public TO authenticated;