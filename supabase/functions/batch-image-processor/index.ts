// Batch Image Processor — server-side multi-image fetch for flower arrangements.
// For each arrangement with image_url set, fetches the FFC product page,
// extracts up to 5 studio images (skipping outdoor/cemetery shots via top-third
// hue sampling), uploads raw bytes to flower-images bucket as
// {gd_code}_1..5.jpg with upsert, and updates image_url..image_url_5.
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeFfcCode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function buildFfcUrl(ffcCode: string, productUrl?: string | null): string {
  if (productUrl) return productUrl;
  // Fallback: FFC product pages live under /product/<code>
  return `https://flowersforcemeteries.com/product/${ffcCode.toLowerCase()}`;
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

function extractStudioImages(html: string): string[] {
  const matches = Array.from(
    html.matchAll(
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

// Sample the top third of an image and decide if it looks like an outdoor /
// cemetery shot (lots of green/blue / sky/grass) versus a studio shot
// (largely neutral or product-coloured against a clean backdrop).
function isStudioImage(
  bytes: Uint8Array,
  contentType: string,
): boolean {
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
      // Unknown format (e.g. webp) — assume studio rather than skip
      return true;
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

        // Greenish (grass / foliage): G dominant
        const isGreen = g > 70 && g > r + 15 && g > b + 10;
        // Blueish (sky): B dominant and bright
        const isSky = b > 110 && b > r + 10 && b > g - 10 && r < 200;

        if (isGreen || isSky) outdoorPixels++;
      }
    }

    if (total === 0) return true;
    const ratio = outdoorPixels / total;
    // If more than 25% of the top third looks like sky/grass, treat as outdoor.
    return ratio < 0.25;
  } catch (_e) {
    return true;
  }
}

interface ArrangementRow {
  id: string;
  gd_code: string | null;
  ffc_code: string | null;
  image_url: string | null;
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

  // Stream NDJSON progress back to the client
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
          .select("id, gd_code, ffc_code, image_url")
          .not("image_url", "is", null);
        if (error) throw error;

        const list = (rows ?? []) as ArrangementRow[];
        send({ type: "start", total: list.length });

        // Optional: pull cached product URLs for these ffc_codes
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

          try {
            if (!norm) {
              skipped++;
              send({
                type: "progress",
                processed,
                total: list.length,
                gd_code: row.gd_code,
                status: "skipped",
                reason: "no ffc_code",
              });
              continue;
            }

            const productUrl = buildFfcUrl(norm, cacheMap.get(norm));
            const html = await fetchHtml(productUrl);
            const candidates = extractStudioImages(html);

            if (candidates.length === 0) {
              skipped++;
              send({
                type: "progress",
                processed,
                total: list.length,
                gd_code: row.gd_code,
                status: "skipped",
                reason: "no images on page",
              });
              await sleep(SLEEP_MS);
              continue;
            }

            const slotUrls: (string | null)[] = [null, null, null, null, null];
            let slot = 0;

            for (const url of candidates) {
              if (slot >= MAX_SLOTS) break;
              try {
                const { bytes, contentType } = await downloadBytes(url);
                if (!isStudioImage(bytes, contentType)) continue;

                const fileName = `${gd}_${slot + 1}.jpg`;
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
                slotUrls[slot] = pub.publicUrl;
                slot++;
              } catch (e) {
                console.warn(`[batch] download/upload failed ${url}:`, e);
              }
            }

            if (slot === 0) {
              skipped++;
              send({
                type: "progress",
                processed,
                total: list.length,
                gd_code: row.gd_code,
                status: "skipped",
                reason: "no studio images detected",
              });
              await sleep(SLEEP_MS);
              continue;
            }

            const updatePayload: Record<string, string | null> = {
              image_url: slotUrls[0],
              image_url_2: slotUrls[1],
              image_url_3: slotUrls[2],
              image_url_4: slotUrls[3],
              image_url_5: slotUrls[4],
            };
            const { error: updErr } = await admin
              .from("flower_arrangements")
              .update(updatePayload)
              .eq("id", row.id);
            if (updErr) throw updErr;

            updated++;
            send({
              type: "progress",
              processed,
              total: list.length,
              gd_code: row.gd_code,
              status: "updated",
              slots_filled: slot,
            });
          } catch (e) {
            const reason = e instanceof Error ? e.message : String(e);
            console.warn(`[batch] arrangement ${gd} failed:`, reason);
            failed.push({ id: row.id, gd_code: row.gd_code, reason });
            send({
              type: "progress",
              processed,
              total: list.length,
              gd_code: row.gd_code,
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
        console.error("[batch-image-processor] fatal:", reason);
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
