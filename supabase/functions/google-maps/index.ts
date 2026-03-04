import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CAPE_GIRARDEAU = "37.3059,-89.5181"; // lat,lng

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // Autocomplete for cemetery search
    if (action === "autocomplete") {
      const input = url.searchParams.get("input");
      if (!input) {
        return new Response(JSON.stringify({ predictions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        input,
        types: "establishment",
        keyword: "cemetery",
        location: CAPE_GIRARDEAU,
        radius: "250000", // 250km radius
        key: apiKey,
      });

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
      );
      const data = await res.json();

      return new Response(JSON.stringify({
        predictions: (data.predictions || []).map((p: any) => ({
          place_id: p.place_id,
          description: p.description,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get distance from Cape Girardeau to a place
    if (action === "distance") {
      const placeId = url.searchParams.get("place_id");
      if (!placeId) {
        return new Response(JSON.stringify({ error: "place_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        origins: CAPE_GIRARDEAU,
        destinations: `place_id:${placeId}`,
        units: "imperial",
        key: apiKey,
      });

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
      );
      const data = await res.json();

      const element = data.rows?.[0]?.elements?.[0];
      if (element?.status !== "OK") {
        return new Response(JSON.stringify({ error: "Could not calculate distance", raw: element }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Convert meters to miles
      const miles = Math.round(element.distance.value / 1609.34);

      return new Response(JSON.stringify({
        miles,
        distance_text: element.distance.text,
        duration_text: element.duration.text,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'autocomplete' or 'distance'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
