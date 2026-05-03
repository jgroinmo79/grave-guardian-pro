const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UA = "Mozilla/5.0 (compatible; GraveDetailBot/1.0)";
const ALLOWED_ORIGIN = "https://flowersforcemeteries.com/";

async function requireAdmin(req: Request): Promise<Response | null> {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: u, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !u.user) return json({ error: "Unauthorized" }, 401);
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return json({ error: "Admin access required" }, 403);
  return null;
}

function extractProductIds(html: string): string[] {
  const matches = html.match(/\/product\/\d+/g) || [];
  return matches.map((m) => `https://flowersforcemeteries.com${m}`);
}

function buildPageUrl(baseUrl: string, page: number): string {
  if (page <= 1) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}page=${page}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const categoryUrl: string | undefined = body.categoryUrl;
    const maxPages: number = Number(body.maxPages ?? 25);

    if (!categoryUrl) {
      return json({ error: "categoryUrl required" }, 400);
    }

    const all = new Set<string>();
    let page = 1;
    let lastSize = -1;

    while (page <= maxPages) {
      const pageUrl = buildPageUrl(categoryUrl, page);
      const res = await fetch(pageUrl, { headers: { "User-Agent": UA } });
      if (!res.ok) break;
      const html = await res.text();
      const ids = extractProductIds(html);
      if (ids.length === 0) break;
      ids.forEach((u) => all.add(u));
      if (all.size === lastSize) break; // no new
      lastSize = all.size;
      page++;
      await sleep(200);
    }

    const urls = Array.from(all);
    return json({ urls, total: urls.length, pagesScanned: page - 1 });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
