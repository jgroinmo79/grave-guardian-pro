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

const TRAVEL_ZONES = [
  { maxMiles: 25, fee: 0 },
  { maxMiles: 50, fee: 40 },
  { maxMiles: 75, fee: 70 },
  { maxMiles: 100, fee: 100 },
  { maxMiles: 150, fee: 150 },
];

const ADD_ONS: Record<string, { label: string; price: number }> = {
  damage_report: { label: "Damage Documentation Report", price: 65 },
  inscription_repainting: { label: "Inscription Repainting", price: 75 },
  weeding: { label: "Weeding & Plot Edging", price: 75 },
  flag_placement: { label: "Flag Placement", price: 35 },
};

const MAINTENANCE_PLAN_PRICES: Record<string, Record<string, number>> = {
  single_marker: { keeper: 180, sentinel: 260, legacy: 340 },
  double_marker: { keeper: 230, sentinel: 330, legacy: 430 },
  single_slant: { keeper: 230, sentinel: 330, legacy: 430 },
  single_upright: { keeper: 270, sentinel: 390, legacy: 510 },
  double_slant: { keeper: 320, sentinel: 460, legacy: 600 },
  double_upright: { keeper: 360, sentinel: 520, legacy: 680 },
  grave_ledger: { keeper: 450, sentinel: 650, legacy: 850 },
};

const MAINTENANCE_PLANS: Record<string, string> = {
  keeper: 'The Keeper (2 Visits/yr)',
  sentinel: 'The Sentinel (3 Visits/yr)',
  legacy: 'The Legacy (4 Visits/yr)',
};

const FLOWER_PLAN_PRICES: Record<string, Record<string, number>> = {
  single_marker: { tribute: 200, remembrance: 355, devotion: 510, eternal: 665 },
  double_marker: { tribute: 225, remembrance: 400, devotion: 575, eternal: 750 },
  single_slant: { tribute: 225, remembrance: 400, devotion: 575, eternal: 750 },
  single_upright: { tribute: 250, remembrance: 445, devotion: 640, eternal: 835 },
  double_slant: { tribute: 275, remembrance: 490, devotion: 705, eternal: 920 },
  double_upright: { tribute: 300, remembrance: 535, devotion: 770, eternal: 1005 },
  grave_ledger: { tribute: 350, remembrance: 625, devotion: 900, eternal: 1175 },
};

const FLOWER_PLANS_LABELS: Record<string, string> = {
  tribute: 'The Tribute (1C + 1F/yr)',
  remembrance: 'The Remembrance (2C + 2F/yr)',
  devotion: 'The Devotion (3C + 3F/yr)',
  eternal: 'The Eternal (4C + 4F/yr)',
};

const FLOWER_ONLY_PLANS: Record<string, { label: string; price: number }> = {
  flower_1: { label: '1 Flower Placement/yr', price: 100 },
  flower_2: { label: '2 Flower Placements/yr', price: 175 },
  flower_3: { label: '3 Flower Placements/yr', price: 250 },
  flower_4: { label: '4 Flower Placements/yr', price: 325 },
};

const VETERAN_TYPE_MAP: Record<string, string> = {
  va_upright: "single_upright",
  va_flat: "flat_marker",
  va_niche: "flat_marker",
};

function getTravelFee(miles: number): number {
  const zone = TRAVEL_ZONES.find((z) => miles <= z.maxMiles);
  return zone?.fee ?? TRAVEL_ZONES[TRAVEL_ZONES.length - 1].fee;
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
    } = body;

    const email = userEmail || customerEmail || shopperEmail;
    if (!email) throw new Error("Email is required for checkout");

    // Resolve monument type: veteran types map to base types
    const monumentType = VETERAN_TYPE_MAP[veteranMonumentType] || rawMonumentType;
    const monument = MONUMENT_PRICES[monumentType];
    if (!monument) throw new Error("Invalid monument type");

    const offer = selectedOffer || "A";
    const basePrice = isVeteran ? Math.round(monument.price * 0.9) : monument.price;
    const travelFee = getTravelFee(estimatedMiles || 0);

    let addOnTotal = 0;
    for (const addonId of addOns) {
      const addon = ADD_ONS[addonId];
      if (addon) addOnTotal += addon.price;
    }

    // Resolve plan price
    let planPrice = 0;
    let planLabel = '';
    if (selectedMaintenancePlan && MAINTENANCE_PLAN_PRICES[monumentType]?.[selectedMaintenancePlan]) {
      planPrice = MAINTENANCE_PLAN_PRICES[monumentType][selectedMaintenancePlan];
      planLabel = MAINTENANCE_PLANS[selectedMaintenancePlan] || selectedMaintenancePlan;
    } else if (selectedFlowerPlan && FLOWER_PLAN_PRICES[monumentType]?.[selectedFlowerPlan]) {
      planPrice = FLOWER_PLAN_PRICES[monumentType][selectedFlowerPlan];
      planLabel = FLOWER_PLANS_LABELS[selectedFlowerPlan] || selectedFlowerPlan;
    } else if (selectedFlowerOnly && FLOWER_ONLY_PLANS[selectedFlowerOnly]) {
      planPrice = FLOWER_ONLY_PLANS[selectedFlowerOnly].price;
      planLabel = FLOWER_ONLY_PLANS[selectedFlowerOnly].label;
    }

    const subtotal = basePrice + travelFee + addOnTotal + planPrice;

    const effectiveUserId = userId;
    if (!effectiveUserId) {
      throw new Error("Please sign in to complete your order");
    }

    // 1. Create monument record with lat/lng
    const { data: monumentRecord, error: monumentError } = await supabaseAdmin
      .from("monuments")
      .insert({
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
      })
      .select("id")
      .single();

    if (monumentError) {
      console.error("[create-checkout] Monument insert error:", monumentError);
      throw new Error("Failed to save monument data");
    }

    // 2. Create pending order with person info
    const { data: orderRecord, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: effectiveUserId,
        monument_id: monumentRecord.id,
        offer: offer as "A" | "B",
        base_price: basePrice,
        travel_fee: travelFee,
        add_ons: addOns,
        add_ons_total: addOnTotal,
        bundle_id: selectedMaintenancePlan || selectedFlowerPlan || selectedFlowerOnly || null,
        bundle_price: planPrice,
        total_price: subtotal,
        is_veteran: isVeteran || false,
        consent_biological: consentBiological || false,
        consent_authorize: consentAuthorize || false,
        consent_photos: consentPhotos || false,
        status: "pending",
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
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("[create-checkout] Order insert error:", orderError);
      throw new Error("Failed to save order data");
    }

    // 3. Create subscription if annual plan selected
    if (selectedMaintenancePlan || selectedFlowerPlan) {
      const importantDatesStr = (selectedHolidays as string[]).map((h: string) => {
        const custom = (holidayCustomDates as Record<string, string>)[h];
        return custom ? `${h}|${custom}` : h;
      }).join(",");

      const { error: subError } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id: effectiveUserId,
          monument_id: monumentRecord.id,
          plan: selectedMaintenancePlan || selectedFlowerPlan,
          price: planPrice,
          period: "annual",
          status: "active",
          important_dates: importantDatesStr || null,
          start_date: new Date().toISOString().split("T")[0],
        });
      if (subError) {
        console.error("[create-checkout] Subscription insert error:", subError);
      }
    }

    // 4. Save client-uploaded photos as photo_records
    if (photos && photos.length > 0) {
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
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `${monument.label} — Cleaning` },
          unit_amount: basePrice * 100,
        },
        quantity: 1,
      },
    ];

    if (travelFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Travel Fee" },
          unit_amount: travelFee * 100,
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

    if (isVeteran) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Veteran Discount (10% off cleaning)" },
          unit_amount: 0,
        },
        quantity: 1,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: lineItems,
      mode: "payment",
      automatic_tax: { enabled: true },
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
