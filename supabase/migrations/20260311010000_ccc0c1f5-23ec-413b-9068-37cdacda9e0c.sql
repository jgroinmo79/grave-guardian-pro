
-- Service logs table for per-grave service history
CREATE TABLE public.service_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monument_id UUID NOT NULL REFERENCES public.monuments(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  services_performed TEXT[] NOT NULL DEFAULT '{}',
  public_notes TEXT,
  private_notes TEXT,
  time_spent_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access service_logs"
ON public.service_logs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Customers can view own service logs (only public notes)
CREATE POLICY "Users can view own service_logs"
ON public.service_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_service_logs_updated_at
  BEFORE UPDATE ON public.service_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Also allow users to insert their own photo records (missing policy)
CREATE POLICY "Users can insert own photos"
ON public.photo_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
