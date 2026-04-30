import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

type CategoryInfo = {
  key: string;
  display: string;
  prefix: string;
};

function detectCategory(ffcCode: string): CategoryInfo {
  const code = ffcCode.toUpperCase();
  const hasSD = /SD/.test(code);
  const has2MD = /2MD/.test(code);
  const has2LG = /2LG/.test(code);
  const hasLG = /LG/.test(code);
  const hasMD = /MD/.test(code);

  if (hasSD && (has2MD || has2LG)) {
    return { key: "saddle_two_bouquets", display: "Saddles with Two Bouquets", prefix: "GD-S2B" };
  }
  if (hasSD && hasLG && !has2LG) {
    return { key: "saddle_large", display: "Saddles with Large Bouquets", prefix: "GD-SLG" };
  }
  if (hasSD && hasMD && !has2MD) {
    return { key: "saddle_medium", display: "Saddles with Medium Bouquets", prefix: "GD-SMD" };
  }
  if (hasSD) {
    return { key: "saddle", display: "Saddles", prefix: "GD-SD" };
  }
  if (hasLG && !hasSD) {
    return { key: "bouquet_large", display: "Large Bouquets", prefix: "GD-LG" };
  }
  if (hasMD && !hasSD) {
    return { key: "bouquet_medium", display: "Medium Bouquets", prefix: "GD-MD" };
  }
  return { key: "other", display: "Other", prefix: "GD-OT" };
}

function parseProduct(html: string) {
  const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, "").trim() : null;

  const ffcMatch = html.match(/Item\s*#\s*([A-Z0-9_]+)/i);
  const ffcCode = ffcMatch ? ffcMatch[1].toUpperCase() : null;

  // Description: first <p> with >80 chars, no "Item #" or "measurements"
  let description: string | null = null;
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (
      text.length > 80 &&
      !/Item\s*#/i.test(text) &&
      !/measurements are approximate/i.test(text)
    ) {
      description = text;
      break;
    }
  }

  // Price: look for $ near "price"
  let price: number | null = null;
  const priceCtxMatch = html.match(/price[\s\S]{0,300}?\$([\d.]+)/i);
  if (priceCtxMatch) {
    const p = parseFloat(priceCtxMatch[1]);
    if (!isNaN(p)) price = p;
  }
  if (price === null) {
    const anyPrice = html.match(/\$([\d]+\.\d{2})/);
    if (anyPrice) price = parseFloat(anyPrice[1]);
  }

  // Images: before "you may also like"
  const cutoff = html.toLowerCase().indexOf("you may also like");
  const region = cutoff > -1 ? html.slice(0, cutoff) : html;
  const imgRegex = /https?:\/\/flowers\.nyc3\.digitaloceanspaces\.com\/optimized\/preview[^\s"'<>)]+/gi;
  const images = Array.from(new Set(region.match(imgRegex) || [])).slice(0, 3);

  return { name, ffcCode, description, price, images };
}

async function getNextGdCode(
  supabase: ReturnType<typeof createClient>,
  prefix: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("flower_arrangements")
    .select("gd_code")
    .ilike("gd_code", `${prefix}-%`);
  if (error) throw error;
  let max = 0;
  for (const row of data || []) {
    const code = (row as { gd_code: string | null }).gd_code;
    if (!code) continue;
    const m = code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const offset: number = Number(body.offset ?? 0);
    const limit: number = Number(body.limit ?? 15);
    const productUrls: string[] = Array.isArray(body.productUrls) ? body.productUrls : [];

    if (productUrls.length === 0) {
      return json({ error: "productUrls required" }, 400);
    }

    const batch = productUrls.slice(offset, offset + limit);
    let saved = 0;
    let skipped = 0;
    const savedNames: string[] = [];
    const failed: { url: string; reason: string }[] = [];

    for (const url of batch) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GraveDetailBot/1.0)" },
        });
        if (!res.ok) {
          failed.push({ url, reason: `HTTP ${res.status}` });
          continue;
        }
        const html = await res.text();
        const { name, ffcCode, description, price, images } = parseProduct(html);

        if (!ffcCode) {
          failed.push({ url, reason: "No FFC code found" });
          continue;
        }
        if (!name) {
          failed.push({ url, reason: "No name found" });
          continue;
        }
        if (images.length === 0) {
          failed.push({ url, reason: "No images found" });
          continue;
        }

        // Skip duplicates
        const { data: existing } = await supabase
          .from("flower_arrangements")
          .select("id")
          .eq("ffc_code", ffcCode)
          .maybeSingle();
        if (existing) {
          skipped++;
          continue;
        }

        const cat = detectCategory(ffcCode);
        const gdCode = await getNextGdCode(supabase, cat.prefix);

        // Download first image
        const imgRes = await fetch(images[0]);
        if (!imgRes.ok) {
          failed.push({ url, reason: `Image fetch ${imgRes.status}` });
          continue;
        }
        const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
        const objectPath = `${gdCode}_raw.jpg`;
        const { error: upErr } = await supabase.storage
          .from("flower-images")
          .upload(objectPath, imgBytes, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (upErr) {
          failed.push({ url, reason: `Upload: ${upErr.message}` });
          continue;
        }
        const { data: pub } = supabase.storage.from("flower-images").getPublicUrl(objectPath);
        const imageUrl = pub.publicUrl;

        const { error: insErr } = await supabase.from("flower_arrangements").insert({
          gd_code: gdCode,
          ffc_code: ffcCode,
          name,
          description,
          arrangement_type: cat.key,
          retail_price: price ?? 0,
          image_url: imageUrl,
          is_active: true,
        });
        if (insErr) {
          failed.push({ url, reason: `Insert: ${insErr.message}` });
          continue;
        }

        saved++;
        savedNames.push(name);
      } catch (e) {
        failed.push({ url, reason: (e as Error).message });
      }
    }

    const nextOffset = offset + batch.length;
    const done = nextOffset >= productUrls.length;

    return json({
      processed: batch.length,
      saved,
      skipped,
      savedNames,
      failed,
      nextOffset,
      done,
      total: productUrls.length,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
