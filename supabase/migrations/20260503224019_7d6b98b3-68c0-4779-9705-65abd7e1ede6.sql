-- Drop public write policies on flower-images bucket; admin-scoped policies already exist.
DROP POLICY IF EXISTS "Allow public uploads to flower-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to flower-images" ON storage.objects;

-- Revoke EXECUTE from anon/authenticated on SECURITY DEFINER internals only used by the service role.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
