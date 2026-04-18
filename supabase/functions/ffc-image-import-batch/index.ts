// FFC Image Import Batch — for each call, takes up to N flower_arrangements
// rows missing image_url, looks them up in ffc_catalog_cache, downloads the
// image, uploads to Supabase Storage, updates image_url. Returns per-batch
// progress + cumulative not-found / failed lists tracked by the caller.
//
// The admin UI calls this repeatedly until processed === 0.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BATCH_SIZE = 20;
const IMPORT_CONCURRENCY = 6;

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

interface BatchResult {
  processed: number;
  matched: number;
  notFound: { gd_code: string | null; ffc_code: string }[];
  failed: { gd_code: string | null; ffc_code: string; reason: string }[];
  remaining: number;
  done: boolean;
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

    const body = (await req.json().catch(() => ({}))) as {
      skipFfcCodes?: string[];
    };
    const skipCodes = new Set((body.skipFfcCodes ?? []).map(normalizeFfcCode));

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch a batch of rows that still need an image. We over-fetch a
    // little so we can skip already-known-not-found codes from the caller
    // without making the batch effectively empty.
    const FETCH_LIMIT = BATCH_SIZE + skipCodes.size + 10;
    const { data: rows, error: rowsErr } = await admin
      .from("flower_arrangements")
      .select("id, gd_code, ffc_code")
      .not("ffc_code", "is", null)
      .is("image_url", null)
      .limit(FETCH_LIMIT);
    if (rowsErr) throw rowsErr;

    const eligible = (rows ?? []).filter(
      (r) => !skipCodes.has(normalizeFfcCode(r.ffc_code)),
    );
    const slice = eligible.slice(0, BATCH_SIZE);

    const result: BatchResult = {
      processed: slice.length,
      matched: 0,
      notFound: [],
      failed: [],
      remaining: 0,
      done: false,
    };

    if (slice.length === 0) {
      // Count remaining rows that still need an image and aren't in skip set
      result.remaining = eligible.length;
      result.done = true;
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up cache rows for all FFC codes in this batch (single query)
    const codes = Array.from(
      new Set(slice.map((r) => normalizeFfcCode(r.ffc_code))),
    ).filter(Boolean);
    const { data: cacheRows, error: cacheErr } = await admin
      .from("ffc_catalog_cache")
      .select("ffc_code, image_url")
      .in("ffc_code", codes);
    if (cacheErr) throw cacheErr;

    const cacheMap = new Map<string, string>();
    for (const c of cacheRows ?? []) {
      cacheMap.set(c.ffc_code, c.image_url);
    }

    await mapPool(slice, IMPORT_CONCURRENCY, async (row) => {
      const norm = normalizeFfcCode(row.ffc_code);
      const imageUrl = cacheMap.get(norm);

      if (!imageUrl) {
        result.notFound.push({
          gd_code: row.gd_code,
          ffc_code: row.ffc_code,
        });
        return;
      }

      try {
        const { bytes, contentType } = await downloadImage(imageUrl);
        const ext = contentType === "image/webp" ? "webp" : "jpg";
        const fileName = `${row.gd_code || row.id}_1.${ext}`;
        const { error: upErr } = await admin.storage
          .from("flower-images")
          .upload(fileName, bytes, { contentType, upsert: true });
        if (upErr) throw upErr;

        const { data: pub } = admin.storage
          .from("flower-images")
          .getPublicUrl(fileName);

        const { error: updErr } = await admin
          .from("flower_arrangements")
          .update({ image_url: pub.publicUrl })
          .eq("id", row.id);
        if (updErr) throw updErr;

        result.matched++;
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        console.warn(`[import-batch] failed for ${row.gd_code}:`, reason);
        result.failed.push({
          gd_code: row.gd_code,
          ffc_code: row.ffc_code,
          reason,
        });
      }
    });

    // Estimate remaining: anything left in eligible after this slice
    result.remaining = Math.max(0, eligible.length - slice.length);
    result.done = false;

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error("[ffc-image-import-batch] fatal:", reason);
    return new Response(JSON.stringify({ error: reason }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
