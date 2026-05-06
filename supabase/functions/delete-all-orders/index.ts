import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Admin access required");

    const { confirmation } = await req.json();
    if (confirmation !== "DELETE ALL") throw new Error("Invalid confirmation phrase");

    const counts: Record<string, number> = {};
    const NIL = "00000000-0000-0000-0000-000000000000";

    // Delete storage files in monument-photos bucket
    let removedFiles = 0;
    const listAndDelete = async (prefix = "") => {
      const { data: items } = await supabaseAdmin.storage.from("monument-photos").list(prefix, { limit: 1000 });
      if (!items?.length) return;
      const files: string[] = [];
      for (const item of items) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id === null) {
          await listAndDelete(path);
        } else {
          files.push(path);
        }
      }
      if (files.length) {
        const { data: removed } = await supabaseAdmin.storage.from("monument-photos").remove(files);
        removedFiles += removed?.length ?? 0;
      }
    };
    try { await listAndDelete(); } catch (e) { console.warn("storage cleanup error", e); }
    counts.storage_files = removedFiles;

    // Delete order-related tables (children first)
    const tables = [
      "photo_records",
      "service_logs",
      "damage_reports",
      "invoices",
      "subscriptions",
      "support_tickets",
      "consent_logs",
      "abandoned_leads",
      "orders",
      "monuments",
    ];
    for (const table of tables) {
      const { count, error } = await supabaseAdmin.from(table).delete({ count: "exact" }).neq("id", NIL);
      if (error) {
        console.error(`[DELETE-ALL] ${table}:`, error.message);
        throw new Error(`Failed deleting ${table}: ${error.message}`);
      }
      counts[table] = count ?? 0;
    }

    console.log(`[DELETE-ALL] Admin ${userData.user.email} wiped orders`, counts);

    return new Response(JSON.stringify({ success: true, counts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[DELETE-ALL] Error: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
