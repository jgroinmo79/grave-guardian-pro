
-- 1. Add DELETE and UPDATE policies for monument-photos storage
CREATE POLICY "Users can update own monument photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'monument-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'monument-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own monument photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'monument-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Fix privilege escalation: restrict INSERT on user_roles to admins only
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Restrict UPDATE on user_roles to admins only
CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Restrict DELETE on user_roles to admins only  
CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Drop the overly permissive ALL policy for admins (replaced by specific policies above)
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
