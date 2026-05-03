-- Remove public/anon access to flower_arrangements (commercially sensitive: wholesale_price, ffc_code, gd_code).
-- Anonymous users do not need to read or write this table; the booking flow runs under authenticated users.
DROP POLICY IF EXISTS "Public can read flower_arrangements" ON public.flower_arrangements;
DROP POLICY IF EXISTS "Public can insert flower_arrangements" ON public.flower_arrangements;
DROP POLICY IF EXISTS "Public can update flower_arrangements" ON public.flower_arrangements;

-- Drop the broad authenticated SELECT that exposes wholesale_price to every signed-in user.
DROP POLICY IF EXISTS "Authenticated users can view active arrangements" ON public.flower_arrangements;

-- Customer-facing reads go through the safe view (no wholesale_price / ffc_code / gd_code).
-- Switch view to run with the owner's privileges so customers can read it without a base-table policy.
ALTER VIEW public.flower_arrangements_public SET (security_invoker = off);
GRANT SELECT ON public.flower_arrangements_public TO anon, authenticated;

-- Admins retain full access via the existing "Admins full access flower_arrangements" ALL policy.
