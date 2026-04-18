// FFC Image Import — scrapes flowersforcemeteries.com catalog, matches
// flower_arrangements rows by ffc_code, downloads images, re-hosts them
// to the flower-images Supabase Storage bucket, and updates image_url.
//
// IMPORTANT: Images are NEVER hotlinked. Every match is downloaded server-
// side, re-encoded to JPEG, and uploaded to our own bucket.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FFC_BASE = "https://flowersforcemeteries.com";
const FFC_SITEMAP = `${FFC_BASE}/sitemap.xml`;
const PRODUCT_DELAY_MS = 500;
const CATEGORY_DELAY_MS = 750;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeFfcCode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Extract the trailing alphanumeric+underscore code from a product name or URL.
// Examples:
//   "Spring Bouquet 1MD2979_1VA2850" -> "1MD2979_1VA2850"
//   "/product/2345-1MD2979_1VA2850"  -> "1MD2979_1VA2850"
function extractFfcCodeFromText(text: string): string | null {
  if (!text) return null;
  // Match codes like 1MD2979 or 1MD2979_1VA2850 (digit + letters + digits, with optional _ joins)
  const matches = text.match(/\d+[A-Z]+\d+(?:_\d+[A-Z]+\d+)*/gi);
  if (!matches || matches.length === 0) return null;
  // Take the longest match (most specific)
  return matches.sort((a, b) => b.length - a.length)[0];
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

interface CatalogProduct {
  ffcCode: string; // normalized
  rawCode: string;
  imageUrl: string;
  productUrl: string;
}

// Pull all category catalog URLs from the sitemap.
async function fetchCategoryUrlsFromSitemap(): Promise<string[]> {
  const xml = await fetchFfcPage(FFC_SITEMAP);
  const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) =>
    m[1].trim(),
  );
  // Keep only catalog URLs (the bare /catalog and any /catalog?categories[]=N)
  const catalogUrls = locs.filter((u) => /\/catalog(\?|$)/.test(u));
  return Array.from(new Set(catalogUrls));
}

// Extract /product/{id} URLs from a category listing page.
function extractProductUrlsFromCategory(html: string): string[] {
  const matches = html.match(/\/product\/\d+/g) || [];
  return Array.from(new Set(matches)).map((p) => `${FFC_BASE}${p}`);
}

// Parse a single product page for the FFC item code and main image URL.
function parseProductPage(html: string): {
  rawCode: string;
  imageUrl: string;
} | null {
  // "Item # BR1550" — letters+digits, may include underscores
  const codeMatch = html.match(/Item\s*#\s*([A-Z0-9_]+)/i);
  if (!codeMatch) return null;
  const rawCode = codeMatch[1];

  // Prefer the optimized/storage/media/* image (the canonical product photo).
  // Fall back to the first DigitalOcean image referenced as data-fancybox.
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

async function buildCatalogFromSitemap(): Promise<{
  products: Map<string, CatalogProduct>;
  productUrlsScraped: number;
}> {
  const products = new Map<string, CatalogProduct>();

  // 1. Discover category URLs via sitemap
  const categoryUrls = await fetchCategoryUrlsFromSitemap();
  console.log(`[sitemap] ${categoryUrls.length} catalog URLs`);

  // 2. Walk every category page to collect product URLs
  const productUrls = new Set<string>();
  for (const url of categoryUrls) {
    try {
      const html = await fetchFfcPage(url);
      const found = extractProductUrlsFromCategory(html);
      for (const p of found) productUrls.add(p);
      console.log(
        `[category] ${url} -> ${found.length} products (total unique ${productUrls.size})`,
      );
    } catch (e) {
      console.warn(`[category] failed ${url}:`, e);
    }
    await sleep(CATEGORY_DELAY_MS);
  }

  // 3. Visit each product page, extract code + image
  let scraped = 0;
  for (const purl of productUrls) {
    try {
      const html = await fetchFfcPage(purl);
      const parsed = parseProductPage(html);
      scraped++;
      if (!parsed) {
        console.warn(`[product] ${purl} -> no code/image`);
      } else {
        const normalized = normalizeFfcCode(parsed.rawCode);
        if (!products.has(normalized)) {
          products.set(normalized, {
            ffcCode: normalized,
            rawCode: parsed.rawCode,
            imageUrl: parsed.imageUrl,
            productUrl: purl,
          });
        }
      }
    } catch (e) {
      console.warn(`[product] failed ${purl}:`, e);
    }
    if (scraped % 25 === 0) {
      console.log(
        `[progress] scraped ${scraped}/${productUrls.size}, products mapped ${products.size}`,
      );
    }
    await sleep(PRODUCT_DELAY_MS);
  }

  console.log(
    `[sitemap-crawl] done. ${productUrls.size} product URLs, ${scraped} scraped, ${products.size} indexed`,
  );
  return { products, productUrlsScraped: scraped };
}

async function downloadImage(
  url: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GraveDetailBot/1.0; +https://gravedetail.net)",
    },
  });
  if (!res.ok) throw new Error(`image fetch ${url} -> HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const contentType =
    res.headers.get("content-type")?.split(";")[0].trim() || "image/webp";
  return { bytes, contentType };
}

interface ImportReport {
  totalInCatalog: number;
  rowsChecked: number;
  matched: number;
  notFound: { gd_code: string | null; ffc_code: string }[];
  failed: { gd_code: string | null; ffc_code: string; reason: string }[];
  durationMs: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    // ---- Auth: must be authenticated admin ----
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
    const userId = userData.user.id;

    // Admin role check via has_role()
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role for storage + writing image_url
    const admin = createClient(supabaseUrl, serviceKey);

    // ---- 1. Crawl FFC catalog ----
    const catalog = await crawlCatalog();

    // ---- 2. Load rows that need an image ----
    const { data: rows, error: rowsErr } = await admin
      .from("flower_arrangements")
      .select("id, gd_code, ffc_code")
      .not("ffc_code", "is", null)
      .is("image_url", null);

    if (rowsErr) throw rowsErr;

    const report: ImportReport = {
      totalInCatalog: catalog.size,
      rowsChecked: rows?.length ?? 0,
      matched: 0,
      notFound: [],
      failed: [],
      durationMs: 0,
    };

    for (const row of rows ?? []) {
      const norm = normalizeFfcCode(row.ffc_code);
      const product = catalog.get(norm);

      if (!product) {
        report.notFound.push({
          gd_code: row.gd_code,
          ffc_code: row.ffc_code,
        });
        continue;
      }

      try {
        // Download original (FFC images are already optimized WebP)
        const { bytes, contentType } = await downloadImage(product.imageUrl);
        await sleep(REQUEST_DELAY_MS); // rate-limit FFC image hits too

        // Upload to bucket. Use gd_code if present, else fall back to row id.
        const ext = contentType === "image/webp" ? "webp" : "jpg";
        const fileName = `${row.gd_code || row.id}_1.${ext}`;
        const { error: upErr } = await admin.storage
          .from("flower-images")
          .upload(fileName, bytes, {
            contentType,
            upsert: true,
          });
        if (upErr) throw upErr;

        const { data: pub } = admin.storage
          .from("flower-images")
          .getPublicUrl(fileName);

        const { error: updErr } = await admin
          .from("flower_arrangements")
          .update({ image_url: pub.publicUrl })
          .eq("id", row.id);
        if (updErr) throw updErr;

        report.matched++;
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        console.warn(`[import] failed for ${row.gd_code}:`, reason);
        report.failed.push({
          gd_code: row.gd_code,
          ffc_code: row.ffc_code,
          reason,
        });
      }
    }

    report.durationMs = Date.now() - startedAt;

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error("[ffc-image-import] fatal:", reason);
    return new Response(
      JSON.stringify({ error: reason, durationMs: Date.now() - startedAt }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
