import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch service log by share_token
    const { data: log, error: logErr } = await supabase
      .from("service_logs")
      .select("*")
      .eq("share_token", token)
      .single();

    if (logErr || !log) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch monument details (no private data)
    const { data: monument } = await supabase
      .from("monuments")
      .select("cemetery_name, monument_type, material, section, lot_number")
      .eq("id", log.monument_id)
      .single();

    // Fetch only client-visible photos for this monument + order
    let photosQuery = supabase
      .from("photo_records")
      .select("id, photo_url, description, taken_at, created_at")
      .eq("monument_id", log.monument_id)
      .eq("client_visible", true)
      .order("created_at", { ascending: false });

    if (log.order_id) {
      photosQuery = photosQuery.eq("order_id", log.order_id);
    }

    const { data: photos } = await photosQuery;

    // Return sanitized data — NO private_notes, NO user_id
    return new Response(
      JSON.stringify({
        report: {
          service_date: log.service_date,
          services_performed: log.services_performed,
          public_notes: log.public_notes,
          time_spent_minutes: log.time_spent_minutes,
        },
        monument: monument ?? null,
        photos: photos ?? [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
