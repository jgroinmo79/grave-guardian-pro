INSERT INTO public.subscriptions (user_id, monument_id, plan, price, period, status, start_date)
SELECT user_id, monument_id, 'sentinel'::care_plan, bundle_price, 'annual', 'active'::subscription_status, COALESCE(scheduled_date, CURRENT_DATE)
FROM public.orders
WHERE id = 'e008a0c7-4ef0-4cb1-8d49-fbba6d6b94cd'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.monument_id = orders.monument_id AND s.plan = 'sentinel'::care_plan AND s.status = 'active'::subscription_status
  );