// FFC Scrape Start — discovers all product URLs from sitemap + supplemental
// category pages, creates a new ffc_scrape_runs row, and returns the run id.
// This is fast (just URL discovery, no per-product scraping), so it fits
// well within the edge function timeout.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FFC_BASE = "https://flowersforcemeteries.com";
const FFC_SITEMAP = `${FFC_BASE}/sitemap.xml`;
const SUPPLEMENTAL_CATEGORY_IDS = [2, 19, 20, 17];
const MAX_CATEGORY_PAGES = 30;
const CATEGORY_CONCURRENCY = 8;

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = await fn(items[i], i);
      } catch (e) {
        results[i] = e as R;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchFfcPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GraveDetailBot/1.0; +https://gravedetail.net)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`FFC fetch ${url} -> HTTP ${res.status}`);
  return await res.text();
}

async function fetchCategoryUrlsFromSitemap(): Promise<string[]> {
  const xml = await fetchFfcPage(FFC_SITEMAP);
  const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) =>
    m[1].trim(),
  );
  const catalogUrls = locs.filter((u) => /\/catalog(\?|$)/.test(u));
  return Array.from(new Set(catalogUrls));
}

function extractProductUrlsFromCategory(html: string): string[] {
  const matches = html.match(/\/product\/\d+/g) || [];
  return Array.from(new Set(matches)).map((p) => `${FFC_BASE}${p}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } =
      await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Discover URLs from sitemap categories
    const productUrls = new Set<string>();
    const categoryUrls = await fetchCategoryUrlsFromSitemap();
    await mapPool(categoryUrls, CATEGORY_CONCURRENCY, async (url) => {
      try {
        const html = await fetchFfcPage(url);
        for (const p of extractProductUrlsFromCategory(html)) {
          productUrls.add(p);
        }
      } catch (e) {
        console.warn(`[start] sitemap cat failed ${url}:`, e);
      }
    });

    // 2. Walk supplemental category pages (paginated)
    await mapPool(SUPPLEMENTAL_CATEGORY_IDS, SUPPLEMENTAL_CATEGORY_IDS.length, async (catId) => {
      for (let page = 1; page <= MAX_CATEGORY_PAGES; page++) {
        const url = `${FFC_BASE}/catalog?categories%5B%5D=${catId}&page=${page}`;
        try {
          const html = await fetchFfcPage(url);
          const found = extractProductUrlsFromCategory(html);
          if (found.length === 0) break;
          for (const p of found) productUrls.add(p);
        } catch (e) {
          console.warn(`[start] supp cat=${catId} page=${page} failed:`, e);
          break;
        }
      }
    });

    const urlList = Array.from(productUrls);
    console.log(`[start] discovered ${urlList.length} product URLs`);

    // 3. Create scrape run row
    const { data: runRow, error: insErr } = await admin
      .from("ffc_scrape_runs")
      .insert({
        status: "scraping",
        product_urls: urlList,
        next_index: 0,
        scraped_count: 0,
        indexed_count: 0,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({
        runId: runRow.id,
        totalUrls: urlList.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error("[ffc-scrape-start] fatal:", reason);
    return new Response(JSON.stringify({ error: reason }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
