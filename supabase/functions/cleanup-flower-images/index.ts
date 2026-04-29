import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let deleted = 0;
  // List & delete in pages
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.storage
      .from("flower-images")
      .list("", { limit: 1000 });
    if (error) return new Response(JSON.stringify({ error: error.message, deleted }), { status: 500 });
    if (!data || data.length === 0) break;
    const paths = data.map((f) => f.name);
    const { error: delErr } = await supabase.storage.from("flower-images").remove(paths);
    if (delErr) return new Response(JSON.stringify({ error: delErr.message, deleted }), { status: 500 });
    deleted += paths.length;
    if (data.length < 1000) break;
  }

  // Delete the bucket
  const { error: bucketErr } = await supabase.storage.deleteBucket("flower-images");
  return new Response(
    JSON.stringify({ deleted, bucketDeleted: !bucketErr, bucketError: bucketErr?.message ?? null }),
    { headers: { "Content-Type": "application/json" } },
  );
});
