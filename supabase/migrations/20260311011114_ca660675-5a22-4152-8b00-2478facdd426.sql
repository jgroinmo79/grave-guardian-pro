
-- Invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  subscription_id uuid REFERENCES public.subscriptions(id),
  monument_id uuid REFERENCES public.monuments(id),
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  travel_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  due_date date,
  paid_at timestamp with time zone,
  stripe_payment_link text,
  stripe_payment_intent_id text,
  notes text,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access invoices" ON public.invoices FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT TO public USING (auth.uid() = user_id);

-- Auto-increment invoice number sequence
CREATE SEQUENCE public.invoice_number_seq START 1001;

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
