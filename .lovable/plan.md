# Security Hardening Plan

Address all four findings from the security scan.

## 1. Transactional email endpoint — admin-only (error)

**File:** `supabase/functions/send-transactional-email/index.ts`

Add an in-function auth check at the top of the handler (after CORS preflight):
- Require `Authorization: Bearer <jwt>` header.
- Use `supabase.auth.getClaims(token)` to verify the JWT.
- Look up the caller in `user_roles` and reject with 403 unless they have role `admin`.
- Allow service-role calls (from other edge functions like the stripe-webhook) to pass through by detecting `auth.role === 'service_role'` in the claims.

This blocks anonymous visitors from triggering outbound mail while preserving server-side senders. Redeploy the function after the edit.

## 2. Orders UPDATE RLS — remove direct user writes (error)

Codebase audit: no client-side code updates `orders` as a non-admin (all `.update()` calls are in `src/pages/admin/*`). The user-facing `PaymentSuccess` and `Portal` only read.

**Migration:**
- `DROP POLICY "Users can update own orders" ON public.orders;`
- Admins keep full access via the existing `Admins full access orders` policy.
- Stripe webhook already uses the service role and bypasses RLS.

If we later need users to edit notes/scheduled_date themselves, we'll add a narrow RPC.

## 3. Abandoned leads — harden UPDATE policy (warn)

**Migration:** replace the existing UPDATE policy with one that:
- Requires the request's `x-session-id` header to match `session_id`.
- Requires `session_id` to be a valid UUID (`session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`).
- Blocks UPDATEs once `converted = true` (no overwriting completed leads).
- `WITH CHECK` prevents flipping `session_id` to another value.

Also ensure the frontend generates session IDs as `crypto.randomUUID()` (already the convention).

## 4. Flower wholesale columns — split into admin-only table (warn)

The current setup relies on column GRANTs that can silently break. Move sensitive fields off the public table.

**Migration:**
- Create `public.flower_arrangement_internal` with `arrangement_id uuid PK references flower_arrangements(id) on delete cascade`, plus `wholesale_price`, `ffc_code`, `gd_code`.
- Backfill from existing columns.
- `DROP COLUMN wholesale_price, ffc_code, gd_code` from `flower_arrangements`.
- Enable RLS on the new table with admin-only ALL policy (no anon/authenticated SELECT).
- Update any admin UI that references those columns to read/write via the new table (likely `src/pages/admin/FlowerCatalog.tsx` and `src/pages/admin/FfcScraper.tsx`).

After approval I'll run the migrations, edit the edge function and admin pages, then redeploy.
