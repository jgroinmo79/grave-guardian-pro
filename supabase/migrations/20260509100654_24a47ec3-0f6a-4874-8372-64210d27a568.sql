CREATE OR REPLACE FUNCTION public.regenerate_subscription_visits(_sub_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  _count := public.subscription_plan_visit_count(_sub.plan::text);

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
$function$;