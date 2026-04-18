// FFC Scrape Batch — processes a chunk of product URLs from an existing
// scrape run. Each invocation handles ~100 product pages, parses code +
// image URL, upserts into ffc_catalog_cache, and advances next_index.
// The admin UI calls this repeatedly until status === 'ready'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BATCH_SIZE = 100;
const PRODUCT_CONCURRENCY = 15;

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

function normalizeFfcCode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
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

function parseProductPage(html: string): {
  rawCode: string;
  imageUrl: string;
} | null {
  const codeMatch = html.match(/Item\s*#\s*([A-Z0-9_]+)/i);
  if (!codeMatch) return null;
  const rawCode = codeMatch[1];

  const allImgs = Array.from(
    html.matchAll(
      /https:\/\/flowers\.nyc3\.digitaloceanspaces\.com\/[^"'\s)]+/g,
    ),
  ).map((m) => m[0]);
  if (allImgs.length === 0) return null;

  const preferred =
    allImgs.find((u) => u.includes("/optimized/storage/media/")) ||
    allImgs.find((u) => /\/(optimized\/)?preview\//.test(u)) ||
    allImgs[0];

  return { rawCode, imageUrl: preferred };
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

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { runId } = (await req.json()) as { runId?: string };
    if (!runId) {
      return new Response(JSON.stringify({ error: "Missing runId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: run, error: runErr } = await admin
      .from("ffc_scrape_runs")
      .select("*")
      .eq("id", runId)
      .single();
    if (runErr || !run) throw runErr ?? new Error("Run not found");

    const urls: string[] = run.product_urls ?? [];
    const start = run.next_index ?? 0;
    const end = Math.min(start + BATCH_SIZE, urls.length);
    const slice = urls.slice(start, end);

    let scrapedDelta = 0;
    let indexedDelta = 0;
    const cacheRows: Array<{
      ffc_code: string;
      raw_code: string;
      image_url: string;
      product_url: string;
    }> = [];

    await mapPool(slice, PRODUCT_CONCURRENCY, async (purl) => {
      try {
        const html = await fetchFfcPage(purl);
        scrapedDelta++;
        const parsed = parseProductPage(html);
        if (!parsed) return;
        const norm = normalizeFfcCode(parsed.rawCode);
        if (!norm) return;
        cacheRows.push({
          ffc_code: norm,
          raw_code: parsed.rawCode,
          image_url: parsed.imageUrl,
          product_url: purl,
        });
      } catch (e) {
        console.warn(`[batch] product failed ${purl}:`, e);
      }
    });

    if (cacheRows.length > 0) {
      const { error: upErr, count } = await admin
        .from("ffc_catalog_cache")
        .upsert(cacheRows, { onConflict: "ffc_code", count: "exact" });
      if (upErr) throw upErr;
      indexedDelta = count ?? cacheRows.length;
    }

    const newNext = end;
    const isDone = newNext >= urls.length;
    const newStatus = isDone ? "ready" : "scraping";

    const { error: updErr } = await admin
      .from("ffc_scrape_runs")
      .update({
        next_index: newNext,
        scraped_count: (run.scraped_count ?? 0) + scrapedDelta,
        indexed_count: (run.indexed_count ?? 0) + indexedDelta,
        status: newStatus,
      })
      .eq("id", runId);
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({
        runId,
        processed: slice.length,
        nextIndex: newNext,
        totalUrls: urls.length,
        scrapedTotal: (run.scraped_count ?? 0) + scrapedDelta,
        indexedTotal: (run.indexed_count ?? 0) + indexedDelta,
        status: newStatus,
        done: isDone,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error("[ffc-scrape-batch] fatal:", reason);
    return new Response(JSON.stringify({ error: reason }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
