// Batch Fetch FFC Images — server-side multi-image scraper.
// For each flower_arrangements row with ffc_code, scrapes the FFC product
// page, extracts main product images from flowers.nyc3.digitaloceanspaces.com
// (filtering out outdoor/cemetery shots via top-third hue sampling), uploads
// raw bytes to flower-images bucket as {gd_code}_{slot}_raw.jpg, and writes
// a {gd_code}_manifest.json file listing the public URLs in order.
//
// Streams NDJSON progress lines back to the caller.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decode as decodeJpeg } from "https://esm.sh/jpeg-js@0.4.4";
import { decode as decodePng } from "https://esm.sh/fast-png@6.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SLEEP_MS = 500;
const MAX_SLOTS = 5;
const OUTDOOR_THRESHOLD = 0.30;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeFfcCode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GraveDetailBot/1.0; +https://gravedetail.net)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return await res.text();
}

// Restrict extraction to the main product gallery section. Strip out
// "You May Also Like" / related-product blocks and color-swatch thumbnails
// before harvesting URLs.
function extractMainProductImages(html: string): string[] {
  let scoped = html;

  // Drop "you may also like" / related products sections (common patterns)
  const cutPatterns = [
    /<[^>]+class="[^"]*(?:you[-_ ]?may[-_ ]?also|related[-_ ]?products?|upsell|cross[-_ ]?sell)[^"]*"[\s\S]*$/i,
    /<section[^>]*id="[^"]*(?:related|upsell)[^"]*"[\s\S]*$/i,
  ];
  for (const re of cutPatterns) {
    scoped = scoped.replace(re, "");
  }

  // Drop color-swatch / variant thumbnail blocks
  scoped = scoped.replace(
    /<[^>]+class="[^"]*(?:swatch|variant[-_ ]?thumb|color[-_ ]?option)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
    "",
  );

  const matches = Array.from(
    scoped.matchAll(
      /https:\/\/flowers\.nyc3\.digitaloceanspaces\.com\/[^"'\s)]+\.(?:jpe?g|png|webp)/gi,
    ),
  ).map((m) => m[0]);

  // Dedupe preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const u of matches) {
    if (!seen.has(u)) {
      seen.add(u);
      unique.push(u);
    }
  }
  return unique;
}

async function downloadBytes(
  url: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GraveDetailBot/1.0; +https://gravedetail.net)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching image`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const contentType =
    res.headers.get("content-type")?.split(";")[0].trim() || "image/jpeg";
  return { bytes, contentType };
}

// Sample top third — return true if studio (keep), false if outdoor (skip).
function isStudioImage(bytes: Uint8Array, contentType: string): boolean {
  try {
    let width = 0;
    let height = 0;
    let data: Uint8Array | Uint8ClampedArray | null = null;
    let channels = 4;

    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      const img = decodeJpeg(bytes, { useTArray: true });
      width = img.width;
      height = img.height;
      data = img.data;
      channels = 4;
    } else if (contentType.includes("png")) {
      const img = decodePng(bytes);
      width = img.width;
      height = img.height;
      data = img.data as Uint8Array;
      channels = img.channels ?? 4;
    } else {
      return true; // unknown format (e.g. webp) — keep
    }
    if (!data || width === 0 || height === 0) return true;

    const topRows = Math.max(1, Math.floor(height / 3));
    const stepX = Math.max(1, Math.floor(width / 60));
    const stepY = Math.max(1, Math.floor(topRows / 30));

    let outdoorPixels = 0;
    let total = 0;

    for (let y = 0; y < topRows; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const idx = (y * width + x) * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (r === undefined || g === undefined || b === undefined) continue;
        total++;

        const isGreen = g > 70 && g > r + 15 && g > b + 10;
        const isSky = b > 110 && b > r + 10 && b > g - 10 && r < 200;

        if (isGreen || isSky) outdoorPixels++;
      }
    }

    if (total === 0) return true;
    return outdoorPixels / total < OUTDOOR_THRESHOLD;
  } catch (_e) {
    return true;
  }
}

interface ArrangementRow {
  id: string;
  gd_code: string | null;
  ffc_code: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: admin only
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

  const admin = createClient(supabaseUrl, serviceKey);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));

      let processed = 0;
      let updated = 0;
      let skipped = 0;
      const failed: { id: string; gd_code: string | null; reason: string }[] =
        [];

      try {
        const { data: rows, error } = await admin
          .from("flower_arrangements")
          .select("id, gd_code, ffc_code, name")
          .not("ffc_code", "is", null);
        if (error) throw error;

        const list = (rows ?? []) as (ArrangementRow & { name: string })[];
        send({ type: "start", total: list.length });

        // Pull cached product URLs from ffc-scrape run output
        const codes = Array.from(
          new Set(list.map((r) => normalizeFfcCode(r.ffc_code)).filter(Boolean)),
        );
        const cacheMap = new Map<string, string>();
        if (codes.length > 0) {
          const { data: cacheRows } = await admin
            .from("ffc_catalog_cache")
            .select("ffc_code, product_url")
            .in("ffc_code", codes);
          for (const c of cacheRows ?? []) {
            if (c.product_url) cacheMap.set(c.ffc_code, c.product_url);
          }
        }

        for (const row of list) {
          processed++;
          const gd = row.gd_code || row.id;
          const norm = normalizeFfcCode(row.ffc_code);

          send({
            type: "progress",
            processed,
            total: list.length,
            gd_code: row.gd_code,
            name: row.name,
            status: "fetching",
          });

          try {
            const productUrl = cacheMap.get(norm);
            if (!productUrl) {
              skipped++;
              send({
                type: "progress",
                processed,
                total: list.length,
                gd_code: row.gd_code,
                name: row.name,
                status: "skipped",
                reason: "no cached product URL — run FFC scrape first",
              });
              await sleep(SLEEP_MS);
              continue;
            }

            const html = await fetchHtml(productUrl);
            const candidates = extractMainProductImages(html);

            if (candidates.length === 0) {
              skipped++;
              send({
                type: "progress",
                processed,
                total: list.length,
                gd_code: row.gd_code,
                name: row.name,
                status: "skipped",
                reason: "no images on page",
              });
              await sleep(SLEEP_MS);
              continue;
            }

            const manifest: string[] = [];
            let slot = 1;

            for (const url of candidates) {
              if (slot > MAX_SLOTS) break;
              try {
                const { bytes, contentType } = await downloadBytes(url);
                if (!isStudioImage(bytes, contentType)) continue;

                const fileName = `${gd}_${slot}_raw.jpg`;
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
                manifest.push(pub.publicUrl);
                slot++;
              } catch (e) {
                console.warn(`[batch-fetch] download/upload failed ${url}:`, e);
              }
            }

            if (manifest.length === 0) {
              skipped++;
              send({
                type: "progress",
                processed,
                total: list.length,
                gd_code: row.gd_code,
                name: row.name,
                status: "skipped",
                reason: "no studio images detected",
              });
              await sleep(SLEEP_MS);
              continue;
            }

            // Write manifest JSON to storage
            const manifestName = `${gd}_manifest.json`;
            const manifestBody = new TextEncoder().encode(
              JSON.stringify(
                {
                  gd_code: row.gd_code,
                  ffc_code: row.ffc_code,
                  product_url: productUrl,
                  fetched_at: new Date().toISOString(),
                  raw_images: manifest,
                },
                null,
                2,
              ),
            );
            const { error: manErr } = await admin.storage
              .from("flower-images")
              .upload(manifestName, manifestBody, {
                contentType: "application/json",
                upsert: true,
              });
            if (manErr) throw manErr;

            updated++;
            send({
              type: "progress",
              processed,
              total: list.length,
              gd_code: row.gd_code,
              name: row.name,
              status: "saved",
              slots_filled: manifest.length,
            });
          } catch (e) {
            const reason = e instanceof Error ? e.message : String(e);
            console.warn(`[batch-fetch] arrangement ${gd} failed:`, reason);
            failed.push({ id: row.id, gd_code: row.gd_code, reason });
            send({
              type: "progress",
              processed,
              total: list.length,
              gd_code: row.gd_code,
              name: row.name,
              status: "failed",
              reason,
            });
          }

          await sleep(SLEEP_MS);
        }

        send({
          type: "done",
          total: list.length,
          processed,
          updated,
          skipped,
          failed,
        });
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        console.error("[batch-fetch-ffc-images] fatal:", reason);
        send({ type: "error", error: reason });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
});
