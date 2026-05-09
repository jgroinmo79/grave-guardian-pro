import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONUMENT_PRICES: Record<string, { price: number; label: string }> = {
  single_marker: { label: "Single Marker", price: 125 },
  double_marker: { label: "Double Marker", price: 150 },
  single_slant: { label: "Single Slant", price: 150 },
  single_upright: { label: "Single Upright", price: 175 },
  double_slant: { label: "Double Slant", price: 200 },
  double_upright: { label: "Double Upright", price: 225 },
  grave_ledger: { label: "Grave Ledger", price: 275 },
};

// Fallback zones if DB read fails. Live config in public.travel_zones.
const FALLBACK_TRAVEL_ZONES = [
  { maxMiles: 25, fee: 0 },
  { maxMiles: 75, fee: 65 },
  { maxMiles: 150, fee: 150 },
];
const FALLBACK_FREE_TRAVEL = { enabled: true, minMiles: 25, maxMiles: 75 };

const ADD_ONS: Record<string, { label: string; price: number }> = {
  damage_report: { label: "Damage Documentation Report", price: 65 },
  holiday_date_lock: { label: "Holiday Date Lock", price: 35 },
  inscription_repainting: { label: "Inscription Repainting", price: 75 },
  weeding: { label: "Weeding & Plot Edging", price: 75 },
  flag_placement: { label: "Flag Placement", price: 35 },
};

const MAINTENANCE_PLAN_PRICES: Record<string, Record<string, number>> = {
  single_marker: { keeper: 229, sentinel: 325, legacy: 399 },
  single_slant: { keeper: 315, sentinel: 445, legacy: 555 },
  double_marker: { keeper: 329, sentinel: 469, legacy: 585 },
  single_upright: { keeper: 379, sentinel: 539, legacy: 689 },
  double_slant: { keeper: 469, sentinel: 669, legacy: 849 },
  double_upright: { keeper: 529, sentinel: 759, legacy: 969 },
  grave_ledger: { keeper: 745, sentinel: 1079, legacy: 1389 },
};

const MAINTENANCE_PLANS: Record<string, string> = {
  keeper: '2 Cleanings / Year',
  sentinel: '3 Cleanings / Year',
  legacy: '4 Cleanings / Year',
};

const FLOWER_ONLY_PLANS: Record<string, { label: string; price: number }> = {
  flower_1: { label: '1 Flower Placement/yr', price: 125 },
  flower_2: { label: '2 Flower Placements/yr', price: 200 },
  flower_3: { label: '3 Flower Placements/yr', price: 275 },
  flower_4: { label: '4 Flower Placements/yr', price: 350 },
};

const VETERAN_TYPE_MAP: Record<string, string> = {
  va_upright: "single_upright",
  va_flat: "single_marker",
  va_niche: "single_marker",
};

async function getTravelFee(
  supabaseAdmin: ReturnType<typeof createClient>,
  miles: number,
  hasAnnualPlan = false,
): Promise<number> {
  let zones: { maxMiles: number; fee: number }[] = FALLBACK_TRAVEL_ZONES;
  let rule = FALLBACK_FREE_TRAVEL;
  try {
    const [zonesRes, settingsRes] = await Promise.all([
      supabaseAdmin.from("travel_zones").select("max_miles, fee").order("sort_order", { ascending: true }),
      supabaseAdmin.from("pricing_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (zonesRes.data && zonesRes.data.length > 0) {
      zones = zonesRes.data.map((z: any) => ({ maxMiles: Number(z.max_miles), fee: Number(z.fee) }));
    }
    if (settingsRes.data) {
      rule = {
        enabled: !!settingsRes.data.annual_plan_free_travel_enabled,
        minMiles: Number(settingsRes.data.annual_plan_free_travel_min_miles),
        maxMiles: Number(settingsRes.data.annual_plan_free_travel_max_miles),
      };
    }
  } catch (e) {
    console.warn("[create-checkout] zones/settings load failed, using fallback", e);
  }

  if (hasAnnualPlan && rule.enabled && miles > rule.minMiles && miles <= rule.maxMiles) return 0;
  const sorted = [...zones].sort((a, b) => a.maxMiles - b.maxMiles);
  const zone = sorted.find((z) => miles <= z.maxMiles);
  return zone?.fee ?? sorted[sorted.length - 1].fee;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    let userEmail: string | undefined;
    let userId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userEmail = data.user.email;
        userId = data.user.id;
      }
    }

    const body = await req.json();
    const {
      monumentType: rawMonumentType,
      selectedOffer,
      estimatedMiles,
      addOns = [],
      selectedMaintenancePlan,
      selectedFlowerPlan,
      selectedFlowerOnly,
      isVeteran,
      customerEmail,
      cemeteryName,
      cemeteryLat,
      cemeteryLng,
      section,
      lotNumber,
      material,
      approximateHeight,
      knownDamage,
      conditions,
      deceasedName,
      shopperName,
      shopperPhone,
      shopperEmail,
      consentBiological,
      consentAuthorize,
      consentPhotos,
      photos = [],
      preferredDate,
      selectedHolidays = [],
      holidayCustomDates = {},
      // Gift fields
      isGift = false,
      giftRecipientName,
      giftRecipientEmail,
      giftRecipientPhone,
      giftMessage,
      // Veteran fields
      veteranMonumentType,
      // Per-visit flower add-ons (intent === 'monument' flow)
      cleaningFlowerAddons: rawCleaningFlowerAddons = [],
    } = body;

    const email = userEmail || customerEmail || shopperEmail;
    if (!email) throw new Error("Email is required for checkout");

    // Resolve monument type: veteran types map to base types
    const monumentType = VETERAN_TYPE_MAP[veteranMonumentType] || rawMonumentType;
    const monument = MONUMENT_PRICES[monumentType];
    if (!monument) throw new Error("Invalid monument type");

    // DB enum offer_type only accepts "A" | "B" — coerce any other intent values
    const offer: "A" | "B" = selectedOffer === "B" ? "B" : "A";
    // Annual plans (maintenance or flower plan) are all-inclusive — the plan
    // price replaces the standalone cleaning line item entirely. Match the
    // in-app review screen logic in CheckoutStep.tsx.
    const hasAnnualPlan = !!selectedMaintenancePlan || !!selectedFlowerPlan;
    const showCleaningLine = !hasAnnualPlan;
    // Veteran 10% discount applies to ALL services. Do not use Stripe coupons
    // here because this account uses a restricted key without coupon-write
    // permissions; the discount is applied inline to each Stripe line item.
    const basePrice = showCleaningLine ? monument.price : 0;
    const travelFee = await getTravelFee(supabaseAdmin, estimatedMiles || 0, !!selectedMaintenancePlan);

    let addOnTotal = 0;
    for (const addonId of addOns) {
      const addon = ADD_ONS[addonId];
      if (addon) addOnTotal += addon.price;
    }

    // Resolve plan price
    let planPrice = 0;
    let planLabel = '';
    if (selectedMaintenancePlan) {
      planPrice = MAINTENANCE_PLAN_PRICES[monumentType]?.[selectedMaintenancePlan] ?? 0;
      planLabel = MAINTENANCE_PLANS[selectedMaintenancePlan] || selectedMaintenancePlan;
      if (planPrice <= 0) {
        throw new Error(
          `Plan price lookup failed for monumentType="${monumentType}" plan="${selectedMaintenancePlan}". Refusing to checkout at $0.`
        );
      }
    } else if (selectedFlowerOnly && FLOWER_ONLY_PLANS[selectedFlowerOnly]) {
      planPrice = FLOWER_ONLY_PLANS[selectedFlowerOnly].price;
      planLabel = FLOWER_ONLY_PLANS[selectedFlowerOnly].label;
    }

    // ---- Cleaning flower add-ons (GD-ADD-FLOWER) ----
    // Allowed only for the cleaning flow (one-time or annual maintenance).
    // Standalone flower-only and the legacy "flower plan" path don't accept
    // these per-visit add-ons.
    const FLOWER_ADDON_PRICE = 50;
    const PLAN_VISIT_COUNT: Record<string, number> = {
      keeper: 2,
      sentinel: 3,
      legacy: 4,
    };
    const allowedAddonVisits = selectedFlowerOnly || selectedFlowerPlan
      ? 0
      : selectedMaintenancePlan
        ? (PLAN_VISIT_COUNT[selectedMaintenancePlan] ?? 0)
        : 1;
    const seenVisits = new Set<number>();
    const cleaningFlowerAddons: { visitNumber: number; arrangementId: string }[] = [];
    if (Array.isArray(rawCleaningFlowerAddons)) {
      for (const entry of rawCleaningFlowerAddons) {
        const vn = Number(entry?.visitNumber);
        const aid = String(entry?.arrangementId ?? "").trim();
        if (!aid) continue;
        if (!Number.isInteger(vn) || vn < 1 || vn > allowedAddonVisits) continue;
        if (seenVisits.has(vn)) continue;
        seenVisits.add(vn);
        cleaningFlowerAddons.push({ visitNumber: vn, arrangementId: aid });
      }
    }
    const cleaningFlowerAddonTotal = cleaningFlowerAddons.length * FLOWER_ADDON_PRICE;

    const grossSubtotal = basePrice + travelFee + addOnTotal + planPrice + cleaningFlowerAddonTotal;
    const subtotal = isVeteran ? Math.round(grossSubtotal * 0.9) : grossSubtotal;

    const effectiveUserId = userId;
    if (!effectiveUserId) {
      throw new Error("Please sign in to complete your order");
    }

    const bundleId = selectedMaintenancePlan || selectedFlowerPlan || selectedFlowerOnly || null;

    // --- Dedup: reuse a recent pending order for the same user/plan/total ---
    // Prevents duplicate booking records when checkout is invoked multiple times
    // (e.g. user clicks pay twice, navigates back, or retries).
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: existingOrders } = await supabaseAdmin
      .from("orders")
      .select("id, monument_id, stripe_payment_status")
      .eq("user_id", effectiveUserId)
      .eq("status", "pending")
      .eq("offer", offer)
      .eq("total_price", subtotal)
      .gte("created_at", thirtyMinAgo)
      .order("created_at", { ascending: false })
      .limit(5);

    const reusable = (existingOrders || []).find(
      (o) => !o.stripe_payment_status || o.stripe_payment_status !== "paid"
    );

    const monumentPayload = {
      user_id: effectiveUserId,
      cemetery_name: cemeteryName || "Unknown",
      section: section || null,
      lot_number: lotNumber || null,
      monument_type: monumentType,
      material: material || "granite",
      approximate_height: approximateHeight || null,
      estimated_miles: estimatedMiles || 0,
      known_damage: knownDamage || false,
      condition_moss_algae: conditions?.mossAlgae || false,
      condition_not_cleaned: conditions?.notCleanedRecently || false,
      condition_faded_inscription: conditions?.fadedInscription || false,
      condition_chipping: conditions?.chipping || false,
      condition_leaning: conditions?.leaning || false,
      cemetery_lat: cemeteryLat || null,
      cemetery_lng: cemeteryLng || null,
    };

    const orderPayload = {
      user_id: effectiveUserId,
      offer: offer as "A" | "B",
      base_price: basePrice,
      travel_fee: travelFee,
      add_ons: addOns,
      add_ons_total: addOnTotal,
      bundle_id: bundleId,
      bundle_price: planPrice,
      total_price: subtotal,
      is_veteran: isVeteran || false,
      consent_biological: consentBiological || false,
      consent_authorize: consentAuthorize || false,
      consent_photos: consentPhotos || false,
      status: "pending" as const,
      deceased_name: deceasedName || null,
      shopper_name: shopperName || null,
      shopper_phone: shopperPhone || null,
      shopper_email: shopperEmail || email || null,
      scheduled_date: preferredDate || null,
      is_gift: isGift || false,
      gift_recipient_name: isGift ? (giftRecipientName || null) : null,
      gift_recipient_email: isGift ? (giftRecipientEmail || null) : null,
      gift_recipient_phone: isGift ? (giftRecipientPhone || null) : null,
      gift_message: isGift ? (giftMessage || null) : null,
    };

    let monumentId: string;
    let orderId: string;

    if (reusable) {
      // Update existing monument + order in place — single record per booking
      orderId = reusable.id;
      monumentId = reusable.monument_id;

      const { error: monUpdateErr } = await supabaseAdmin
        .from("monuments")
        .update(monumentPayload)
        .eq("id", monumentId);
      if (monUpdateErr) console.error("[create-checkout] Monument reuse update error:", monUpdateErr);

      const { error: orderUpdateErr } = await supabaseAdmin
        .from("orders")
        .update(orderPayload)
        .eq("id", orderId);
      if (orderUpdateErr) {
        console.error("[create-checkout] Order reuse update error:", orderUpdateErr);
        throw new Error("Failed to update existing order");
      }
      console.log(`[create-checkout] Reused pending order ${orderId} (dedup)`);
    } else {
      const { data: monumentRecord, error: monumentError } = await supabaseAdmin
        .from("monuments")
        .insert(monumentPayload)
        .select("id")
        .single();

      if (monumentError) {
        console.error("[create-checkout] Monument insert error:", monumentError);
        throw new Error("Failed to save monument data");
      }
      monumentId = monumentRecord.id;

      // Single pending order per booking — visits/services live in bundle_id + add_ons fields
      const { data: orderRecord, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({ ...orderPayload, monument_id: monumentId })
        .select("id")
        .single();

      if (orderError) {
        console.error("[create-checkout] Order insert error:", orderError);
        throw new Error("Failed to save order data");
      }
      orderId = orderRecord.id;
    }

    const monumentRecord = { id: monumentId };
    const orderRecord = { id: orderId };

    // 3. Create subscription if annual plan selected — single record per booking
    let subscriptionId: string | null = null;
    if (selectedMaintenancePlan || selectedFlowerPlan) {
      const importantDatesStr = (selectedHolidays as string[]).map((h: string) => {
        const custom = (holidayCustomDates as Record<string, string>)[h];
        return custom ? `${h}|${custom}` : h;
      }).join(",");

      const subPayload = {
        user_id: effectiveUserId,
        monument_id: monumentRecord.id,
        plan: selectedMaintenancePlan || selectedFlowerPlan,
        price: planPrice,
        period: "annual",
        status: "active" as const,
        important_dates: importantDatesStr || null,
        start_date: new Date().toISOString().split("T")[0],
      };

      // Check for existing subscription for this monument + plan to avoid duplicates
      const { data: existingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("monument_id", monumentRecord.id)
        .eq("plan", subPayload.plan)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (existingSub) {
        subscriptionId = (existingSub as any).id;
        const { error: subUpdateErr } = await supabaseAdmin
          .from("subscriptions")
          .update(subPayload)
          .eq("id", subscriptionId);
        if (subUpdateErr) console.error("[create-checkout] Subscription update error:", subUpdateErr);
      } else {
        const { data: newSub, error: subError } = await supabaseAdmin
          .from("subscriptions")
          .insert(subPayload)
          .select("id")
          .single();
        if (subError) console.error("[create-checkout] Subscription insert error:", subError);
        else subscriptionId = (newSub as any).id;
      }
    }

    // 3b. Persist visit-level flower add-ons.
    // scheduled_visits rows are auto-created by DB triggers when an order or
    // subscription is inserted/updated. Look them up and attach GD-ADD-FLOWER
    // visit_addons rows. Re-checkouts replace existing flower add-ons for the
    // same visits so the customer's latest selection wins.
    if (cleaningFlowerAddons.length > 0) {
      const { data: addonRow, error: addonErr } = await supabaseAdmin
        .from("addons")
        .select("id, base_price")
        .eq("code", "GD-ADD-FLOWER")
        .maybeSingle();

      if (addonErr || !addonRow) {
        console.error("[create-checkout] GD-ADD-FLOWER lookup failed", addonErr);
      } else {
        // Resolve the scheduled_visits rows we need to attach to.
        let visitsQuery = supabaseAdmin
          .from("scheduled_visits")
          .select("id, visit_number, order_id, subscription_id");
        if (subscriptionId) {
          visitsQuery = visitsQuery.eq("subscription_id", subscriptionId);
        } else {
          visitsQuery = visitsQuery.eq("order_id", orderRecord.id);
        }
        const { data: visits, error: visitsErr } = await visitsQuery;
        if (visitsErr) {
          console.error("[create-checkout] scheduled_visits lookup failed", visitsErr);
        } else if (visits && visits.length > 0) {
          const byNumber = new Map<number, string>();
          for (const v of visits as any[]) {
            byNumber.set(Number(v.visit_number), v.id as string);
          }
          const visitIds = Array.from(byNumber.values());

          // Wipe existing flower add-ons for these visits, then re-insert.
          const { error: delErr } = await supabaseAdmin
            .from("visit_addons")
            .delete()
            .in("visit_id", visitIds)
            .eq("addon_id", (addonRow as any).id);
          if (delErr) console.error("[create-checkout] visit_addons cleanup failed", delErr);

          const rowsToInsert = cleaningFlowerAddons
            .map((a) => {
              const visitId = byNumber.get(a.visitNumber);
              if (!visitId) return null;
              return {
                visit_id: visitId,
                addon_id: (addonRow as any).id,
                applied_price: FLOWER_ADDON_PRICE,
                selected_options: { arrangement_id: a.arrangementId },
              };
            })
            .filter(Boolean) as any[];

          if (rowsToInsert.length > 0) {
            const { error: insErr } = await supabaseAdmin
              .from("visit_addons")
              .insert(rowsToInsert);
            if (insErr) console.error("[create-checkout] visit_addons insert failed", insErr);
          }
        }
      }
    }


    // 4. Save client-uploaded photos as photo_records (skip if reusing — already saved)
    if (photos && photos.length > 0 && !reusable) {
      const photoRows = photos.map((url: string) => ({
        monument_id: monumentRecord.id,
        order_id: orderRecord.id,
        user_id: effectiveUserId,
        photo_url: url,
        description: "Client upload — intake",
        taken_at: new Date().toISOString(),
      }));
      const { error: photoError } = await supabaseAdmin
        .from("photo_records")
        .insert(photoRows);
      if (photoError) {
        console.error("[create-checkout] Photo insert error:", photoError);
      }
    }

    // --- Build Stripe line items ---
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (showCleaningLine) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: `${monument.label} — Cleaning` },
          unit_amount: basePrice * 100,
        },
        quantity: 1,
      });
    }

    // Use exact (un-rounded) round-trip miles in the Stripe line item names so
    // the customer can see precisely what distance the fee was calculated from.
    const exactMiles = Number(estimatedMiles || 0);
    const milesLabel = `${exactMiles} mi round trip`;
    const isAnnualWaiver =
      !!selectedMaintenancePlan && exactMiles > 25 && exactMiles <= 75;

    if (travelFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: `Travel Fee (${milesLabel})` },
          unit_amount: travelFee * 100,
        },
        quantity: 1,
      });
    } else {
      // Always show a $0 travel line so the receipt is explicit about distance.
      const name = isAnnualWaiver
        ? `Travel Fee — Waived with Annual Plan (${milesLabel})`
        : `Travel Fee — Included (${milesLabel})`;
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name },
          unit_amount: 0,
        },
        quantity: 1,
      });
    }

    for (const addonId of addOns) {
      const addon = ADD_ONS[addonId];
      if (addon && addon.price > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: addon.label },
            unit_amount: addon.price * 100,
          },
          quantity: 1,
        });
      }
    }

    if (planPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: planLabel },
          unit_amount: planPrice * 100,
        },
        quantity: 1,
      });
    }

    // Per-visit flower placement add-ons ($50 each, GD-ADD-FLOWER).
    for (const a of cleaningFlowerAddons) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: `Flower Placement — Visit ${a.visitNumber}` },
          unit_amount: FLOWER_ADDON_PRICE * 100,
        },
        quantity: 1,
      });
    }

    // Veteran 10% discount: applied inline by reducing each line item's
    // unit_amount by 10%. This avoids needing the `rak_coupon_write` Stripe
    // permission (restricted keys may not have coupon access). We also relabel
    // each line item so the discount is transparent on the receipt, and
    // reconcile any rounding drift on the last non-zero line.
    if (isVeteran) {
      const targetTotalCents = subtotal * 100;
      let runningCents = 0;
      let lastDiscountedIdx = -1;
      for (let i = 0; i < lineItems.length; i++) {
        const li = lineItems[i];
        const unit = li.price_data?.unit_amount ?? 0;
        if (unit > 0) {
          const discounted = Math.round(unit * 0.9);
          li.price_data!.unit_amount = discounted;
          li.price_data!.product_data!.name =
            `${li.price_data!.product_data!.name} (Veteran 10% off)`;
          lastDiscountedIdx = i;
        }
        runningCents += (li.price_data?.unit_amount ?? 0) * (li.quantity ?? 1);
      }
      const drift = targetTotalCents - runningCents;
      if (drift !== 0 && lastDiscountedIdx >= 0) {
        const li = lineItems[lastDiscountedIdx];
        li.price_data!.unit_amount =
          (li.price_data!.unit_amount ?? 0) + drift / (li.quantity ?? 1);
      }
    }

    // --- Server-side total assertion ---
    const lineItemsTotalCents = lineItems.reduce(
      (sum, li) => sum + (li.price_data?.unit_amount ?? 0) * (li.quantity ?? 1),
      0,
    );
    const expectedTotalCents = subtotal * 100;
    if (lineItemsTotalCents !== expectedTotalCents) {
...
    const origin = req.headers.get("origin") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-canceled`,
      metadata: {
        order_id: orderRecord.id,
        monument_id: monumentRecord.id,
        user_id: effectiveUserId,
      },
    });

    await supabaseAdmin
      .from("orders")
      .update({ stripe_payment_intent_id: session.id })
      .eq("id", orderRecord.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[create-checkout] ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
