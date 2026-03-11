-- Allow clients to see photos on their own monuments that are flagged client_visible
-- This is a PERMISSIVE policy so it works alongside existing restrictive ones
CREATE POLICY "Users can view client_visible photos on own monuments"
ON public.photo_records
FOR SELECT
TO authenticated
USING (
  client_visible = true
  AND monument_id IN (
    SELECT id FROM public.monuments WHERE user_id = auth.uid()
  )
);
