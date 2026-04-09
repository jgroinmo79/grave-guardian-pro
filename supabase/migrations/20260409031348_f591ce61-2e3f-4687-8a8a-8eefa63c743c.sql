
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_gift boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_recipient_name text,
  ADD COLUMN IF NOT EXISTS gift_recipient_email text,
  ADD COLUMN IF NOT EXISTS gift_recipient_phone text,
  ADD COLUMN IF NOT EXISTS gift_message text;
