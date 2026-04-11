-- Drop the overly permissive UPDATE policy
DROP POLICY "Anyone can update abandoned leads by session" ON public.abandoned_leads;

-- Create a scoped UPDATE policy: only the original session can update its own lead
CREATE POLICY "Anyone can update own abandoned lead by session"
ON public.abandoned_leads
FOR UPDATE
TO anon, authenticated
USING (session_id = coalesce(current_setting('request.headers', true)::json->>'x-session-id', ''))
WITH CHECK (session_id = coalesce(current_setting('request.headers', true)::json->>'x-session-id', ''));