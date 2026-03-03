
-- 1. Create enum types
CREATE TYPE public.monument_type AS ENUM (
  'single_marker', 'double_marker', 'single_slant', 
  'single_upright', 'double_slant', 'double_upright', 'grave_ledger'
);

CREATE TYPE public.material_type AS ENUM ('granite', 'marble', 'bronze', 'mixed');

CREATE TYPE public.offer_type AS ENUM ('A', 'B');

CREATE TYPE public.care_plan AS ENUM ('guardian', 'keeper', 'sentinel', 'legacy');

CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TYPE public.subscription_status AS ENUM ('active', 'paused', 'cancelled', 'expired');

CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

-- 2. User roles table (CRITICAL: roles must NOT be on profiles table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Monuments table
CREATE TABLE public.monuments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cemetery_name TEXT NOT NULL,
  section TEXT,
  lot_number TEXT,
  estimated_miles NUMERIC DEFAULT 0,
  monument_type public.monument_type NOT NULL,
  material public.material_type NOT NULL,
  approximate_height TEXT,
  known_damage BOOLEAN DEFAULT false,
  condition_moss_algae BOOLEAN DEFAULT false,
  condition_not_cleaned BOOLEAN DEFAULT false,
  condition_faded_inscription BOOLEAN DEFAULT false,
  condition_chipping BOOLEAN DEFAULT false,
  condition_leaning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.monuments ENABLE ROW LEVEL SECURITY;

-- 6. Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monument_id UUID NOT NULL REFERENCES public.monuments(id) ON DELETE CASCADE,
  offer public.offer_type NOT NULL,
  base_price NUMERIC NOT NULL,
  travel_fee NUMERIC NOT NULL DEFAULT 0,
  add_ons JSONB DEFAULT '[]'::jsonb,
  add_ons_total NUMERIC DEFAULT 0,
  bundle_id TEXT,
  bundle_price NUMERIC DEFAULT 0,
  total_price NUMERIC NOT NULL,
  is_veteran BOOLEAN DEFAULT false,
  consent_biological BOOLEAN DEFAULT false,
  consent_authorize BOOLEAN DEFAULT false,
  consent_photos BOOLEAN DEFAULT false,
  status public.order_status NOT NULL DEFAULT 'pending',
  scheduled_date DATE,
  notes TEXT,
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 7. Subscriptions table (Care Packages)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monument_id UUID NOT NULL REFERENCES public.monuments(id) ON DELETE CASCADE,
  plan public.care_plan NOT NULL,
  price NUMERIC NOT NULL,
  period TEXT NOT NULL DEFAULT 'year',
  status public.subscription_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  important_dates TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 8. Photo records table
CREATE TABLE public.photo_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  monument_id UUID NOT NULL REFERENCES public.monuments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  taken_at TIMESTAMPTZ DEFAULT now(),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.photo_records ENABLE ROW LEVEL SECURITY;

-- 9. Damage reports table
CREATE TABLE public.damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  monument_id UUID NOT NULL REFERENCES public.monuments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;

-- 10. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monuments_updated_at BEFORE UPDATE ON public.monuments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Auto-create profile + customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. RLS Policies

-- user_roles: users can read their own roles, admins can read all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins full access profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- monuments
CREATE POLICY "Users can view own monuments" ON public.monuments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monuments" ON public.monuments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own monuments" ON public.monuments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins full access monuments" ON public.monuments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- orders
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins full access orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins full access subscriptions" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- photo_records
CREATE POLICY "Users can view own photos" ON public.photo_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins full access photos" ON public.photo_records FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- damage_reports
CREATE POLICY "Users can view own reports" ON public.damage_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins full access reports" ON public.damage_reports FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 13. Indexes for performance
CREATE INDEX idx_monuments_user_id ON public.monuments(user_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_monument_id ON public.orders(monument_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_photo_records_order_id ON public.photo_records(order_id);
CREATE INDEX idx_damage_reports_order_id ON public.damage_reports(order_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
