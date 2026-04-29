// Batch Fetch FFC Images — server-side multi-image scraper.
// Processes a BATCH of arrangements (default 20) starting at ?offset=N.
// Caller loops with increasing offsets until processed >= total.
//
// Hard limits enforced:
//  - 10s timeout per fetch (AbortController)
//  - 25s overall function runtime guard (Edge Function 30s hard limit)
//  - 200ms delay between arrangements
//  - Non-200 product page → skip immediately, no retry

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decode as decodeJpeg } from "https://esm.sh/jpeg-js@0.4.4";
import { decode as decodePng } from "https://esm.sh/fast-png@6.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SLEEP_MS = 200;
const MAX_SLOTS = 5;
const OUTDOOR_THRESHOLD = 0.30;
const FETCH_TIMEOUT_MS = 10000;
const FUNCTION_TIMEOUT_MS = 25000;
const DEFAULT_BATCH_SIZE = 20;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeFfcCode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GraveDetailBot/1.0; +https://gravedetail.net)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return await res.text();
}

function extractMainProductImages(html: string): string[] {
  let scoped = html;
  const cutPatterns = [
    /<[^>]+class="[^"]*(?:you[-_ ]?may[-_ ]?also|related[-_ ]?products?|upsell|cross[-_ ]?sell)[^"]*"[\s\S]*$/i,
    /<section[^>]*id="[^"]*(?:related|upsell)[^"]*"[\s\S]*$/i,
  ];
  for (const re of cutPatterns) scoped = scoped.replace(re, "");
  scoped = scoped.replace(
    /<[^>]+class="[^"]*(?:swatch|variant[-_ ]?thumb|color[-_ ]?option)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
    "",
  );
  const matches = Array.from(
    scoped.matchAll(
      /https:\/\/flowers\.nyc3\.digitaloceanspaces\.com\/[^"'\s)]+\.(?:jpe?g|png|webp)/gi,
    ),
  ).map((m) => m[0]);
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
  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GraveDetailBot/1.0; +https://gravedetail.net)",
    },
  });
  if (res.status !== 200) throw new Error(`HTTP ${res.status} fetching image`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const contentType =
    res.headers.get("content-type")?.split(";")[0].trim() || "image/jpeg";
  return { bytes, contentType };
}

function isStudioImage(bytes: Uint8Array, contentType: string): boolean {
  try {
    let width = 0, height = 0;
    let data: Uint8Array | Uint8ClampedArray | null = null;
    let channels = 4;
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      const img = decodeJpeg(bytes, { useTArray: true });
      width = img.width; height = img.height; data = img.data; channels = 4;
    } else if (contentType.includes("png")) {
      const img = decodePng(bytes);
      width = img.width; height = img.height; data = img.data as Uint8Array;
      channels = img.channels ?? 4;
    } else {
      return true;
    }
    if (!data || width === 0 || height === 0) return true;
    const topRows = Math.max(1, Math.floor(height / 3));
    const stepX = Math.max(1, Math.floor(width / 60));
    const stepY = Math.max(1, Math.floor(topRows / 30));
    let outdoorPixels = 0, total = 0;
    for (let y = 0; y < topRows; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
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
  name: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

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

  // Parse offset + batchSize from query OR body
  const reqUrl = new URL(req.url);
  let offset = parseInt(reqUrl.searchParams.get("offset") || "0", 10);
  let batchSize = parseInt(
    reqUrl.searchParams.get("batchSize") || String(DEFAULT_BATCH_SIZE),
    10,
  );
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body === "object") {
      if (typeof body.offset === "number") offset = body.offset;
      if (typeof body.batchSize === "number") batchSize = body.batchSize;
    }
  } catch (_e) { /* ignore */ }
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  if (!Number.isFinite(batchSize) || batchSize <= 0) batchSize = DEFAULT_BATCH_SIZE;

  const admin = createClient(supabaseUrl, serviceKey);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));

      let processed = 0;
      let updated = 0;
      let skipped = 0;
      let timedOut = false;
      const failed: { id: string; gd_code: string | null; reason: string }[] = [];

      try {
        // Get total count for caller's loop
        const { count: totalCount } = await admin
          .from("flower_arrangements")
          .select("id", { count: "exact", head: true })
          .not("ffc_code", "is", null);

        const total = totalCount ?? 0;

        const { data: rows, error } = await admin
          .from("flower_arrangements")
          .select("id, gd_code, ffc_code, name")
          .not("ffc_code", "is", null)
          .order("id", { ascending: true })
          .range(offset, offset + batchSize - 1);
        if (error) throw error;

        const list = (rows ?? []) as ArrangementRow[];
        send({ type: "start", total, batchSize: list.length, offset });

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
          if (Date.now() - startTime > FUNCTION_TIMEOUT_MS) {
            console.warn("[batch-fetch] runtime guard hit, exiting batch early");
            timedOut = true;
            break;
          }

          processed++;
          const gd = row.gd_code || row.id;
          const norm = normalizeFfcCode(row.ffc_code);

          send({
            type: "progress",
            processed,
            total: list.length,
            offset,
            gd_code: row.gd_code,
            name: row.name,
            status: "fetching",
          });

          try {
            const productUrl = cacheMap.get(norm);
            if (!productUrl) {
              skipped++;
              send({
                type: "progress", processed, total: list.length, offset,
                gd_code: row.gd_code, name: row.name, status: "skipped",
                reason: "no cached product URL — run FFC scrape first",
              });
              await sleep(SLEEP_MS);
              continue;
            }

            let html: string;
            try {
              html = await fetchHtml(productUrl);
            } catch (fetchErr) {
              const reason = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
              failed.push({ id: row.id, gd_code: row.gd_code, reason });
              send({
                type: "progress", processed, total: list.length, offset,
                gd_code: row.gd_code, name: row.name, status: "failed", reason,
              });
              await sleep(SLEEP_MS);
              continue;
            }

            const candidates = extractMainProductImages(html);
            if (candidates.length === 0) {
              skipped++;
              send({
                type: "progress", processed, total: list.length, offset,
                gd_code: row.gd_code, name: row.name, status: "skipped",
                reason: "no images on page",
              });
              await sleep(SLEEP_MS);
              continue;
            }

            const manifest: string[] = [];
            let slot = 1;

            for (const url of candidates) {
              if (slot > MAX_SLOTS) break;
              if (Date.now() - startTime > FUNCTION_TIMEOUT_MS) break;
              try {
                const { bytes, contentType } = await downloadBytes(url);
                if (!isStudioImage(bytes, contentType)) continue;
                const fileName = `${gd}_${slot}_raw.jpg`;
                const { error: upErr } = await admin.storage
                  .from("flower-images")
                  .upload(fileName, bytes, { contentType, upsert: true });
                if (upErr) throw upErr;
                const { data: pub } = admin.storage
                  .from("flower-images").getPublicUrl(fileName);
                manifest.push(pub.publicUrl);
                slot++;
              } catch (e) {
                console.warn(`[batch-fetch] download/upload failed ${url}:`, e);
              }
            }

            if (manifest.length === 0) {
              skipped++;
              send({
                type: "progress", processed, total: list.length, offset,
                gd_code: row.gd_code, name: row.name, status: "skipped",
                reason: "no studio images detected",
              });
              await sleep(SLEEP_MS);
              continue;
            }

            const manifestName = `${gd}_manifest.json`;
            const manifestBody = new TextEncoder().encode(
              JSON.stringify({
                gd_code: row.gd_code,
                ffc_code: row.ffc_code,
                product_url: productUrl,
                fetched_at: new Date().toISOString(),
                raw_images: manifest,
              }, null, 2),
            );
            const { error: manErr } = await admin.storage
              .from("flower-images")
              .upload(manifestName, manifestBody, {
                contentType: "application/json", upsert: true,
              });
            if (manErr) throw manErr;

            updated++;
            send({
              type: "progress", processed, total: list.length, offset,
              gd_code: row.gd_code, name: row.name, status: "saved",
              slots_filled: manifest.length,
            });
          } catch (e) {
            const reason = e instanceof Error ? e.message : String(e);
            console.warn(`[batch-fetch] arrangement ${gd} failed:`, reason);
            failed.push({ id: row.id, gd_code: row.gd_code, reason });
            send({
              type: "progress", processed, total: list.length, offset,
              gd_code: row.gd_code, name: row.name, status: "failed", reason,
            });
          }

          await sleep(SLEEP_MS);
        }

        const nextOffset = offset + processed;
        send({
          type: "done",
          totalAll: total,
          offset,
          batchSize: list.length,
          processed,
          updated,
          skipped,
          failed,
          timedOut,
          nextOffset,
          hasMore: nextOffset < total,
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
