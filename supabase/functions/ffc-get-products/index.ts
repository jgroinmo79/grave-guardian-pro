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

const CATEGORY_URLS = [
  "https://flowersforcemeteries.com/catalog?categories[]=2",
  "https://flowersforcemeteries.com/catalog?categories[]=17",
  "https://flowersforcemeteries.com/catalog?categories[]=19",
  "https://flowersforcemeteries.com/catalog?categories[]=20",
  "https://flowersforcemeteries.com/catalog?categories[]=22",
  "https://flowersforcemeteries.com/catalog?categories[]=249",
  "https://flowersforcemeteries.com/catalog?categories[]=377",
  "https://flowersforcemeteries.com/catalog?categories[]=382",
];

const UA = "Mozilla/5.0 (compatible; GraveDetailBot/1.0)";

function extractProductIds(html: string): string[] {
  const matches = html.match(/\/product\/\d+/g) || [];
  return matches.map((m) => `https://flowersforcemeteries.com${m}`);
}

function extractMaxPage(html: string): number {
  const pageMatches = html.match(/[?&]page=(\d+)/g) || [];
  let max = 1;
  for (const m of pageMatches) {
    const n = parseInt(m.replace(/[?&]page=/, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return max;
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
    const all = new Set<string>();
    const errors: { url: string; reason: string }[] = [];

    for (const baseUrl of CATEGORY_URLS) {
      try {
        // Fetch first page
        const firstRes = await fetch(baseUrl, { headers: { "User-Agent": UA } });
        if (!firstRes.ok) {
          errors.push({ url: baseUrl, reason: `HTTP ${firstRes.status}` });
          continue;
        }
        const firstHtml = await firstRes.text();
        extractProductIds(firstHtml).forEach((u) => all.add(u));

        const maxPage = extractMaxPage(firstHtml);
        await sleep(300);

        // Walk subsequent pages, follow until no new products
        let page = 2;
        let lastSize = all.size;
        while (page <= Math.max(maxPage, 50)) {
          const pageUrl = buildPageUrl(baseUrl, page);
          const res = await fetch(pageUrl, { headers: { "User-Agent": UA } });
          if (!res.ok) break;
          const html = await res.text();
          const ids = extractProductIds(html);
          if (ids.length === 0) break;
          ids.forEach((u) => all.add(u));
          // If no new URLs were added, stop
          if (all.size === lastSize) break;
          lastSize = all.size;
          page++;
          await sleep(300);
        }
      } catch (e) {
        errors.push({ url: baseUrl, reason: (e as Error).message });
      }
    }

    const urls = Array.from(all);
    return json({ urls, total: urls.length, errors });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
