import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Replicate server-side pricing to prevent client-side tampering
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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Auth - optional for this service (guest checkout supported)
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
    } = body;

    // Use authenticated email or provided email
    const email = userEmail || customerEmail;
    if (!email) throw new Error("Email is required for checkout");

    // Validate monument type
    const monument = MONUMENT_PRICES[monumentType];
    if (!monument) throw new Error("Invalid monument type");

    const offer = selectedOffer === "B" ? "B" : "A";
    const basePrice = offer === "B" ? monument.offerB : monument.offerA;
    const travelFee = getTravelFee(estimatedMiles || 0);

    // Build line items
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

    // Add-ons
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

    // Bundle
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

    // Apply veteran discount by reducing each line item by 10%
    if (isVeteran) {
      for (const item of lineItems) {
        if (item.price_data) {
          item.price_data.unit_amount = Math.round((item.price_data.unit_amount ?? 0) * 0.9);
        }
      }
      // Add a $0 line showing the discount was applied
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Veteran Discount (10% applied)" },
          unit_amount: 0,
        },
        quantity: 1,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
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
        monument_type: monumentType,
        offer,
        estimated_miles: String(estimatedMiles || 0),
        is_veteran: String(isVeteran),
        user_id: userId || "",
      },
    });

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
