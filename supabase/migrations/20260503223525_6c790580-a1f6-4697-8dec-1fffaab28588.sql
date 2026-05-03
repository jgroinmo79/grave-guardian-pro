-- Move view back to invoker mode (clears the SECURITY DEFINER VIEW lint).
ALTER VIEW public.flower_arrangements_public SET (security_invoker = on);

-- Allow public/auth read on base rows, but column-level permissions hide sensitive fields.
CREATE POLICY "Anyone can read active arrangements"
  ON public.flower_arrangements
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Revoke broad column access then re-grant only safe columns to non-admin roles.
REVOKE SELECT ON public.flower_arrangements FROM anon, authenticated;
GRANT SELECT (
  id, name, description, retail_price,
  image_url, image_url_2, image_url_3, image_url_4, image_url_5,
  arrangement_type, occasion_tags, is_active, created_at, updated_at
) ON public.flower_arrangements TO anon, authenticated;
