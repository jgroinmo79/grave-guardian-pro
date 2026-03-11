import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendOrderConfirmationEmail(
  order: Record<string, unknown>,
  monument: Record<string, unknown>,
  customerEmail: string,
  customerName: string
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[stripe-webhook] RESEND_API_KEY not configured, skipping email");
    return;
  }

  const formatType = (t: string) =>
    t?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const orderId = (order.id as string).slice(0, 8);
  const totalPrice = Number(order.total_price).toFixed(2);
  const basePrice = Number(order.base_price).toFixed(2);
  const travelFee = Number(order.travel_fee).toFixed(2);
  const addOnsTotal = Number(order.add_ons_total ?? 0).toFixed(2);
  const bundlePrice = Number(order.bundle_price ?? 0).toFixed(2);
  const isVeteran = order.is_veteran as boolean;
  const offer = order.offer as string;
  const cemeteryName = monument.cemetery_name as string;
  const monumentType = formatType(monument.monument_type as string);
  const material = formatType(monument.material as string);
  const section = monument.section as string | null;
  const lotNumber = monument.lot_number as string | null;

  const locationLine = section
    ? `Section ${section}${lotNumber ? `, Lot ${lotNumber}` : ""}`
    : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 48px; height: 48px; background: #16a34a; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <span style="color: white; font-size: 24px;">✓</span>
        </div>
        <h1 style="margin: 0; font-size: 24px; color: #111;">Order Confirmed</h1>
        <p style="color: #666; margin-top: 8px;">Thank you for your order, ${customerName || "there"}!</p>
      </div>

      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #999; font-family: monospace;">Order #${orderId}</p>
        <p style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #111;">${cemeteryName}</p>
        ${locationLine ? `<p style="margin: 0 0 4px; font-size: 13px; color: #666;">${locationLine}</p>` : ""}
        <p style="margin: 0; font-size: 13px; color: #666;">${monumentType} · ${material} · Offer ${offer}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Base Price (Offer ${offer})</td>
          <td style="padding: 8px 0; text-align: right; color: #111;">$${basePrice}</td>
        </tr>
        ${Number(travelFee) > 0 ? `<tr><td style="padding: 8px 0; color: #666;">Travel Fee</td><td style="padding: 8px 0; text-align: right; color: #111;">$${travelFee}</td></tr>` : ""}
        ${Number(addOnsTotal) > 0 ? `<tr><td style="padding: 8px 0; color: #666;">Add-Ons</td><td style="padding: 8px 0; text-align: right; color: #111;">$${addOnsTotal}</td></tr>` : ""}
        ${Number(bundlePrice) > 0 ? `<tr><td style="padding: 8px 0; color: #666;">Bundle</td><td style="padding: 8px 0; text-align: right; color: #111;">$${bundlePrice}</td></tr>` : ""}
        ${isVeteran ? `<tr><td style="padding: 8px 0; color: #16a34a;">Veteran Discount (10%)</td><td style="padding: 8px 0; text-align: right; color: #16a34a;">Applied</td></tr>` : ""}
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="padding: 12px 0 0; font-weight: 700; font-size: 16px; color: #111;">Total Paid</td>
          <td style="padding: 12px 0 0; text-align: right; font-weight: 700; font-size: 16px; color: #111;">$${totalPrice}</td>
        </tr>
      </table>

      <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #166534;">
          Joshua will be in touch within 24 hours to confirm your service date.
        </p>
      </div>

      <p style="font-size: 12px; color: #999; text-align: center;">
        If you have any questions, simply reply to this email.
      </p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "orders@resend.dev",
        to: [customerEmail],
        subject: `Order Confirmed — #${orderId}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[stripe-webhook] Resend API error:", res.status, err);
    } else {
      console.log(`[stripe-webhook] Confirmation email sent to ${customerEmail}`);
    }
  } catch (err) {
    console.error("[stripe-webhook] Failed to send email:", err);
  }
}

const ADMIN_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "josh@resend.dev";

async function sendAdminNotificationEmail(
  order: Record<string, unknown>,
  monument: Record<string, unknown>,
  customerEmail: string,
  customerName: string
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return;

  const formatType = (t: string) =>
    t?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const orderId = (order.id as string).slice(0, 8);
  const totalPrice = Number(order.total_price).toFixed(2);
  const cemeteryName = monument.cemetery_name as string;
  const monumentType = formatType(monument.monument_type as string);
  const material = formatType(monument.material as string);
  const offer = order.offer as string;
  const isVeteran = order.is_veteran as boolean;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; padding: 40px 24px;">
      <h1 style="margin: 0 0 8px; font-size: 20px; color: #111;">🔔 New Order Received</h1>
      <p style="color: #666; margin: 0 0 24px; font-size: 14px;">Order #${orderId} — $${totalPrice}</p>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
        <tr><td style="padding: 6px 0; color: #666; width: 140px;">Customer</td><td style="padding: 6px 0; color: #111; font-weight: 500;">${customerName} (${customerEmail})</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Cemetery</td><td style="padding: 6px 0; color: #111;">${cemeteryName}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Monument</td><td style="padding: 6px 0; color: #111;">${monumentType} · ${material}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Offer</td><td style="padding: 6px 0; color: #111;">Offer ${offer}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Veteran</td><td style="padding: 6px 0; color: #111;">${isVeteran ? "Yes (10% discount)" : "No"}</td></tr>
        <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 10px 0 0; color: #111; font-weight: 700;">Total</td><td style="padding: 10px 0 0; color: #111; font-weight: 700;">$${totalPrice}</td></tr>
      </table>

      <p style="font-size: 13px; color: #666;">Please reach out to the customer within 24 hours to schedule their service.</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "orders@resend.dev",
        to: [ADMIN_EMAIL],
        subject: `🔔 New Order #${orderId} — $${totalPrice} — ${customerName}`,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[stripe-webhook] Admin email error:", res.status, err);
    } else {
      console.log(`[stripe-webhook] Admin notification sent to ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error("[stripe-webhook] Failed to send admin email:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] Signature verification failed:", message);
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  console.log(`[stripe-webhook] Received event: ${event.type}`);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

    if (!orderId) {
      console.error("[stripe-webhook] No order_id in session metadata");
      return new Response("No order_id in metadata", { status: 400 });
    }

    console.log(`[stripe-webhook] Confirming order ${orderId}, payment_intent: ${paymentIntentId}`);

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        status: "confirmed",
        stripe_payment_intent_id: paymentIntentId || session.id,
        stripe_payment_status: session.payment_status,
      })
      .eq("id", orderId);

    if (error) {
      console.error("[stripe-webhook] Failed to update order:", error);
      return new Response("Failed to update order", { status: 500 });
    }

    console.log(`[stripe-webhook] Order ${orderId} confirmed successfully`);

    // Fetch full order + monument + customer profile for email & invoice
    const { data: orderData } = await supabaseAdmin
      .from("orders")
      .select(`
        id, offer, status, total_price, base_price, travel_fee,
        add_ons_total, bundle_price, is_veteran, user_id, monument_id,
        monuments (cemetery_name, monument_type, material, section, lot_number)
      `)
      .eq("id", orderId)
      .single();

    if (orderData) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", orderData.user_id)
        .single();

      const customerEmail = profile?.email || session.customer_email || session.customer_details?.email;

      // --- Auto-generate invoice for admin approval ---
      try {
        const invoiceNumber = `GD-${Date.now().toString(36).toUpperCase()}`;
        const lineItems = [];
        
        lineItems.push({
          description: `${(orderData.monuments as any)?.monument_type?.replace(/_/g, ' ')} — Offer ${orderData.offer}`,
          amount: Number(orderData.base_price),
        });

        if (Number(orderData.travel_fee) > 0) {
          lineItems.push({ description: "Travel Fee", amount: Number(orderData.travel_fee) });
        }
        if (Number(orderData.add_ons_total) > 0) {
          lineItems.push({ description: "Add-Ons", amount: Number(orderData.add_ons_total) });
        }
        if (Number(orderData.bundle_price) > 0) {
          lineItems.push({ description: "Seasonal Bundle", amount: Number(orderData.bundle_price) });
        }

        const { error: invErr } = await supabaseAdmin.from("invoices").insert({
          user_id: orderData.user_id,
          order_id: orderData.id,
          monument_id: orderData.monument_id,
          invoice_number: invoiceNumber,
          subtotal: Number(orderData.total_price),
          travel_fee: Number(orderData.travel_fee),
          total: Number(orderData.total_price),
          line_items: lineItems,
          status: "draft", // Admin reviews and sends
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          stripe_payment_intent_id: paymentIntentId || session.id,
        });

        if (invErr) {
          console.error("[stripe-webhook] Failed to create invoice:", invErr);
        } else {
          console.log(`[stripe-webhook] Invoice ${invoiceNumber} created for order ${orderId}`);
        }
      } catch (invError) {
        console.error("[stripe-webhook] Invoice creation error:", invError);
      }

      // Send emails
      if (customerEmail) {
        await sendOrderConfirmationEmail(
          orderData as unknown as Record<string, unknown>,
          (orderData.monuments ?? {}) as Record<string, unknown>,
          customerEmail,
          profile?.full_name || ""
        );
      } else {
        console.warn("[stripe-webhook] No customer email found, skipping confirmation email");
      }

      // Send admin notification
      await sendAdminNotificationEmail(
        orderData as unknown as Record<string, unknown>,
        (orderData.monuments ?? {}) as Record<string, unknown>,
        customerEmail || "unknown",
        profile?.full_name || "Unknown Customer"
      );
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
