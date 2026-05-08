-- Step 1: Delete the 3 active subscriptions on plans being removed
DELETE FROM public.subscriptions
WHERE plan IN ('tribute','remembrance','devotion','eternal');

-- Step 2: Drop the 4 deprecated values from care_plan enum by recreating it
ALTER TYPE public.care_plan RENAME TO care_plan_old;

CREATE TYPE public.care_plan AS ENUM ('guardian','keeper','sentinel','legacy');

ALTER TABLE public.subscriptions
  ALTER COLUMN plan TYPE public.care_plan
  USING plan::text::public.care_plan;

DROP TYPE public.care_plan_old;