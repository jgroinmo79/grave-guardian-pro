import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONUMENT_PRICES: Record<string, { offerA: number; offerB: number; label: string }> = {
  single_marker: { label: "Single Marker", offerA: 175, offerB: 225 },
  double_marker: { label: "Double Marker", offerA: 200, offerB: 250 },
  single_slant: { label: "Single Slant", offerA: 210, offerB: 260 },
  single_upright: { label: "Single Upright", offerA: 225, offerB: 275 },
  double_slant: { label: "Double Slant", offerA: 260, offerB: 310 },
  double_upright: { label: "Double Upright", offerA: 300, offerB: 350 },
  grave_ledger: { label: "Grave Ledger", offerA: 325, offerB: 375 },
};

const TRAVEL_ZONES = [
  { maxMiles: 25, fee: 0 },
  { maxMiles: 50, fee: 35 },
  { maxMiles: 75, fee: 70 },
  { maxMiles: 100, fee: 105 },
  { maxMiles: 125, fee: 140 },
  { maxMiles: 150, fee: 210 },
];

const ADD_ONS: Record<string, { label: string; price: number }> = {
  damage_report: { label: "Damage Documentation Report", price: 65 },
  inscription_repainting: { label: "Inscription Repainting", price: 75 },
  weeding: { label: "Weeding & Plot Edging", price: 75 },
  flag_placement: { label: "Flag Placement", price: 35 },
};

const BUNDLES: Record<string, { label: string; price: number }> = {
  memorial_day: { label: "Memorial Day Bundle", price: 325 },
  remembrance_trio: { label: "Remembrance Trio", price: 450 },
  memorial_year: { label: "Memorial Year Bundle", price: 650 },
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
      monumentType,
      selectedOffer,
      estimatedMiles,
      addOns = [],
      selectedBundle,
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
    } = body;

    const email = userEmail || customerEmail || shopperEmail;
    if (!email) throw new Error("Email is required for checkout");

    const monument = MONUMENT_PRICES[monumentType];
    if (!monument) throw new Error("Invalid monument type");

    const offer = selectedOffer === "B" ? "B" : "A";
    const basePrice = offer === "B" ? monument.offerB : monument.offerA;
    const travelFee = getTravelFee(estimatedMiles || 0);

    let addOnTotal = 0;
    for (const addonId of addOns) {
      const addon = ADD_ONS[addonId];
      if (addon) addOnTotal += addon.price;
    }

    const bundlePrice = selectedBundle && BUNDLES[selectedBundle] ? BUNDLES[selectedBundle].price : 0;

    let subtotal = basePrice + travelFee + addOnTotal + bundlePrice;
    if (isVeteran) subtotal = Math.round(subtotal * 0.9);

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
        bundle_id: selectedBundle || null,
        bundle_price: bundlePrice,
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
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("[create-checkout] Order insert error:", orderError);
      throw new Error("Failed to save order data");
    }

    // --- Build Stripe line items ---
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `${monument.label} — Offer ${offer}` },
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

    if (selectedBundle && BUNDLES[selectedBundle]) {
      const bundle = BUNDLES[selectedBundle];
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: bundle.label },
          unit_amount: bundle.price * 100,
        },
        quantity: 1,
      });
    }

    if (isVeteran) {
      for (const item of lineItems) {
        if (item.price_data) {
          item.price_data.unit_amount = Math.round((item.price_data.unit_amount ?? 0) * 0.9);
        }
      }
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Veteran Discount (10% applied)" },
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
