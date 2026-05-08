CREATE TABLE public.scheduled_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('order','subscription')),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  visit_date date NOT NULL,
  visit_number int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','canceled','rescheduled')),
  completed_at timestamptz,
  tech_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visit_source_match CHECK (
    (source='order' AND order_id IS NOT NULL AND subscription_id IS NULL) OR
    (source='subscription' AND subscription_id IS NOT NULL AND order_id IS NULL)
  )
);

CREATE INDEX idx_sv_user ON public.scheduled_visits(user_id);
CREATE INDEX idx_sv_visit_date ON public.scheduled_visits(visit_date);
CREATE INDEX idx_sv_order ON public.scheduled_visits(order_id);
CREATE INDEX idx_sv_subscription ON public.scheduled_visits(subscription_id);
CREATE UNIQUE INDEX uq_sv_order ON public.scheduled_visits(order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX uq_sv_sub_visit ON public.scheduled_visits(subscription_id, visit_number) WHERE subscription_id IS NOT NULL;

ALTER TABLE public.scheduled_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access scheduled_visits" ON public.scheduled_visits
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Users view own scheduled_visits" ON public.scheduled_visits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_sv_updated_at BEFORE UPDATE ON public.scheduled_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.subscription_plan_visit_count(_plan text)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _plan
    WHEN 'keeper' THEN 2
    WHEN 'sentinel' THEN 3
    WHEN 'legacy' THEN 4
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_subscription_visits(_sub_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sub record;
  _count int;
  _interval int;
  _i int;
  _vdate date;
  _today date := CURRENT_DATE;
BEGIN
  SELECT * INTO _sub FROM public.subscriptions WHERE id = _sub_id;
  IF NOT FOUND THEN RETURN; END IF;

  _count := public.subscription_plan_visit_count(_sub.plan);

  DELETE FROM public.scheduled_visits
   WHERE subscription_id = _sub_id
     AND status = 'scheduled'
     AND visit_date >= _today;

  IF _count = 0 OR _sub.status::text <> 'active' THEN
    RETURN;
  END IF;

  _interval := GREATEST(ROUND(365.0 / _count)::int, 1);

  FOR _i IN 0.._count-1 LOOP
    _vdate := _sub.start_date + (_interval * _i);
    IF NOT EXISTS (
      SELECT 1 FROM public.scheduled_visits
       WHERE subscription_id = _sub_id AND visit_number = _i + 1
    ) THEN
      INSERT INTO public.scheduled_visits (user_id, source, subscription_id, visit_date, visit_number, status, completed_at)
      VALUES (
        _sub.user_id, 'subscription', _sub_id, _vdate, _i + 1,
        CASE WHEN _vdate < _today THEN 'completed' ELSE 'scheduled' END,
        CASE WHEN _vdate < _today THEN now() ELSE NULL END
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_subscription_visits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.regenerate_subscription_visits(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_subscriptions_sync_visits
  AFTER INSERT OR UPDATE OF plan, start_date, status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_visits();

CREATE OR REPLACE FUNCTION public.sync_order_visit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _new_status text;
BEGIN
  IF NEW.scheduled_date IS NULL THEN
    DELETE FROM public.scheduled_visits WHERE order_id = NEW.id;
    RETURN NEW;
  END IF;

  _new_status := CASE
    WHEN NEW.status::text = 'completed' THEN 'completed'
    WHEN NEW.status::text = 'cancelled' THEN 'canceled'
    ELSE 'scheduled'
  END;

  INSERT INTO public.scheduled_visits (user_id, source, order_id, visit_date, visit_number, status, completed_at)
  VALUES (
    NEW.user_id, 'order', NEW.id, NEW.scheduled_date, 1, _new_status,
    CASE WHEN _new_status = 'completed' THEN now() ELSE NULL END
  )
  ON CONFLICT (order_id) WHERE order_id IS NOT NULL DO UPDATE SET
    visit_date = EXCLUDED.visit_date,
    status = EXCLUDED.status,
    completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN COALESCE(public.scheduled_visits.completed_at, now()) ELSE NULL END,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_sync_visit
  AFTER INSERT OR UPDATE OF scheduled_date, status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_visit();

INSERT INTO public.scheduled_visits (user_id, source, order_id, visit_date, visit_number, status, completed_at)
SELECT
  user_id, 'order', id, scheduled_date, 1,
  CASE
    WHEN status::text = 'completed' THEN 'completed'
    WHEN status::text = 'cancelled' THEN 'canceled'
    ELSE 'scheduled'
  END,
  CASE WHEN status::text = 'completed' THEN updated_at ELSE NULL END
FROM public.orders
WHERE scheduled_date IS NOT NULL
ON CONFLICT (order_id) WHERE order_id IS NOT NULL DO NOTHING;

DO $$
DECLARE _s record;
BEGIN
  FOR _s IN SELECT id FROM public.subscriptions WHERE status::text = 'active' LOOP
    PERFORM public.regenerate_subscription_visits(_s.id);
  END LOOP;
END $$;