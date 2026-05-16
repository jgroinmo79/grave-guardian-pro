
-- 1. Orders: remove customer UPDATE access
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

-- 2. Abandoned leads: replace UPDATE policy with stricter version
DROP POLICY IF EXISTS "Anyone can update own abandoned lead by session" ON public.abandoned_leads;

CREATE POLICY "Anyone can update own abandoned lead by session"
ON public.abandoned_leads
FOR UPDATE
TO anon, authenticated
USING (
  session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND session_id = COALESCE(((current_setting('request.headers', true))::json ->> 'x-session-id'), '')
  AND converted = false
)
WITH CHECK (
  session_id = COALESCE(((current_setting('request.headers', true))::json ->> 'x-session-id'), '')
  AND converted = false
);

-- 3. Flower arrangements: drop public SELECT; customers must use the safe view
DROP POLICY IF EXISTS "Anyone can read active arrangements" ON public.flower_arrangements;
