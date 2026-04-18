// FFC Image Import — scrapes flowersforcemeteries.com catalog, matches
// flower_arrangements rows by ffc_code, downloads images, re-hosts them
// to the flower-images Supabase Storage bucket, and updates image_url.
//
// IMPORTANT: Images are NEVER hotlinked. Every match is downloaded server-
// side, re-encoded to JPEG, and uploaded to our own bucket.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMParser, type Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FFC_BASE = "https://flowersforcemeteries.com";
const FFC_CATALOG = `${FFC_BASE}/catalog`;
const REQUEST_DELAY_MS = 2000;
const MAX_PAGES = 100;
const MAX_IMAGE_EDGE = 1200;
const JPEG_QUALITY = 82; // imagescript uses 0-100

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

function parseCatalogPage(html: string): {
  products: CatalogProduct[];
  pageLinks: string[];
} {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return { products: [], pageLinks: [] };

  const products: CatalogProduct[] = [];
  const seen = new Set<string>();

  // Heuristic: every product card has an <img> from DigitalOcean spaces and a
  // nearby <a href="/product/..."> with the product name.
  const imgs = doc.querySelectorAll("img");
  imgs.forEach((node) => {
    const img = node as Element;
    const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
    if (!src.includes("digitaloceanspaces.com")) return;

    // Walk up to find the enclosing anchor
    let cursor: Element | null = img;
    let anchor: Element | null = null;
    for (let i = 0; i < 6 && cursor; i++) {
      if (cursor.tagName?.toLowerCase() === "a") {
        anchor = cursor;
        break;
      }
      cursor = cursor.parentElement;
    }

    // If the img isn't inside an anchor, search siblings for one
    if (!anchor) {
      const parent = img.parentElement;
      if (parent) {
        const a = parent.querySelector("a[href*='/product/']");
        if (a) anchor = a as Element;
      }
    }

    const href = anchor?.getAttribute("href") || "";
    const alt = img.getAttribute("alt") || "";
    const title = anchor?.getAttribute("title") || anchor?.textContent || "";

    const codeText = `${alt} ${title} ${href}`;
    const rawCode = extractFfcCodeFromText(codeText);
    if (!rawCode) return;

    const normalized = normalizeFfcCode(rawCode);
    if (seen.has(normalized)) return;
    seen.add(normalized);

    products.push({
      ffcCode: normalized,
      rawCode,
      imageUrl: src.startsWith("//") ? `https:${src}` : src,
      productUrl: href.startsWith("http")
        ? href
        : `${FFC_BASE}${href.startsWith("/") ? "" : "/"}${href}`,
    });
  });

  // Discover pagination links (page=N or /catalog/page/N)
  const pageLinks = new Set<string>();
  doc.querySelectorAll("a").forEach((node) => {
    const a = node as Element;
    const href = a.getAttribute("href") || "";
    if (!href) return;
    if (
      /[?&]page=\d+/.test(href) ||
      /\/catalog\/page\/\d+/.test(href) ||
      /\/catalog\?.*\d+/.test(href)
    ) {
      const abs = href.startsWith("http")
        ? href
        : `${FFC_BASE}${href.startsWith("/") ? "" : "/"}${href}`;
      pageLinks.add(abs);
    }
  });

  return { products, pageLinks: Array.from(pageLinks) };
}

async function crawlCatalog(): Promise<Map<string, CatalogProduct>> {
  const all = new Map<string, CatalogProduct>();
  const visited = new Set<string>();
  const queue: string[] = [FFC_CATALOG];
  let pagesCrawled = 0;

  while (queue.length > 0 && pagesCrawled < MAX_PAGES) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const html = await fetchFfcPage(url);
      const { products, pageLinks } = parseCatalogPage(html);
      pagesCrawled++;

      let newCount = 0;
      for (const p of products) {
        if (!all.has(p.ffcCode)) {
          all.set(p.ffcCode, p);
          newCount++;
        }
      }
      console.log(
        `[crawl] ${url} -> ${products.length} products (${newCount} new), ${pageLinks.length} page links`,
      );

      for (const link of pageLinks) {
        if (!visited.has(link) && !queue.includes(link)) queue.push(link);
      }
    } catch (e) {
      console.warn(`[crawl] failed ${url}:`, e);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`[crawl] done. ${pagesCrawled} pages, ${all.size} products`);
  return all;
}

async function downloadAndConvert(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GraveDetailBot/1.0; +https://gravedetail.net)",
    },
  });
  if (!res.ok) throw new Error(`image fetch ${url} -> HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());

  let img = await decode(buf);
  // decode() may return GIF (animated) — narrow to Image
  if (!(img instanceof Image)) {
    // Frame-based; cast first frame
    img = (img as unknown as { frames: Image[] }).frames?.[0] ?? img as Image;
  }
  const image = img as Image;

  // Resize so longest edge <= MAX_IMAGE_EDGE, preserving aspect ratio
  const longest = Math.max(image.width, image.height);
  if (longest > MAX_IMAGE_EDGE) {
    const scale = MAX_IMAGE_EDGE / longest;
    image.resize(
      Math.max(1, Math.round(image.width * scale)),
      Math.max(1, Math.round(image.height * scale)),
    );
  }

  return await image.encodeJPEG(JPEG_QUALITY);
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
        // Download + convert
        const jpeg = await downloadAndConvert(product.imageUrl);
        await sleep(REQUEST_DELAY_MS); // rate-limit FFC image hits too

        // Upload to bucket. Use gd_code if present, else fall back to row id.
        const fileName = `${row.gd_code || row.id}_1.jpg`;
        const { error: upErr } = await admin.storage
          .from("flower-images")
          .upload(fileName, jpeg, {
            contentType: "image/jpeg",
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
