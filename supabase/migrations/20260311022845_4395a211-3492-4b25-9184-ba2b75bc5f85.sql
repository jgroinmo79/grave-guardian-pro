
-- Add lat/lng to monuments for map pinning
ALTER TABLE public.monuments ADD COLUMN IF NOT EXISTS cemetery_lat numeric DEFAULT NULL;
ALTER TABLE public.monuments ADD COLUMN IF NOT EXISTS cemetery_lng numeric DEFAULT NULL;

-- Add deceased person info and shopper info to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deceased_name text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shopper_name text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shopper_phone text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shopper_email text DEFAULT NULL;
