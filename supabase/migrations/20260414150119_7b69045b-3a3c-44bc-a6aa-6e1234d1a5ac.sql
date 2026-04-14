-- Drop the existing public SELECT policy that exposes all columns
DROP POLICY IF EXISTS "Anyone can view active arrangements" ON public.flower_arrangements;

-- Create a secure view that excludes wholesale_price for public consumption
CREATE OR REPLACE VIEW public.flower_arrangements_public AS
SELECT id, name, description, retail_price, image_url, image_url_2, image_url_3, image_url_4, image_url_5, arrangement_type, occasion_tags, is_active, created_at, updated_at
FROM public.flower_arrangements
WHERE is_active = true;

-- Grant access to the view
GRANT SELECT ON public.flower_arrangements_public TO anon;
GRANT SELECT ON public.flower_arrangements_public TO authenticated;

-- Re-create the policy scoped to authenticated users only (admins already have full access via their ALL policy)
-- Non-admin authenticated users can view active arrangements but wholesale_price is still accessible via direct table query
-- To fully prevent this, revoke direct SELECT from anon on the table
REVOKE SELECT ON public.flower_arrangements FROM anon;

-- For authenticated non-admin users, we need a policy that still works but we can't hide columns via RLS alone
-- The admin ALL policy covers admin reads; add back a customer read policy
CREATE POLICY "Authenticated users can view active arrangements"
ON public.flower_arrangements
FOR SELECT
TO authenticated
USING (is_active = true);