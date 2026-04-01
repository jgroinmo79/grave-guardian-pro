import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BENTON_MO = "37.0978,-89.5625"; // lat,lng

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
        keyword: "cemetery church",
        location: BENTON_MO,
        radius: "250000", // 250km radius
        key: apiKey,
      });

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
      );
      const data = await res.json();

      // Strict filter: only return results matching cemetery/church keywords
      const allowedKeywords = [
        "cemetery", "church", "memorial", "funeral", "burial",
        "graveyard", "mausoleum", "mortuary", "chapel", "parish",
        "tabernacle", "temple", "synagogue", "mosque",
      ];
      const filtered = (data.predictions || []).filter((p: any) => {
        const desc = p.description.toLowerCase();
        return allowedKeywords.some((kw) => desc.includes(kw));
      });

      return new Response(JSON.stringify({
        predictions: filtered.map((p: any) => ({
          place_id: p.place_id,
          description: p.description,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get distance from Benton, MO to a place
    if (action === "distance") {
      const placeId = url.searchParams.get("place_id");
      if (!placeId) {
        return new Response(JSON.stringify({ error: "place_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        origins: BENTON_MO,
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

    // Get place details (lat/lng) from place_id
    if (action === "place_details") {
      const placeId = url.searchParams.get("place_id");
      if (!placeId) {
        return new Response(JSON.stringify({ error: "place_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try Place Details first
      const params = new URLSearchParams({
        place_id: placeId,
        fields: "geometry,formatted_address",
        key: apiKey,
      });

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?${params}`
      );
      const detailData = await res.json();
      const loc = detailData.result?.geometry?.location;

      if (loc) {
        return new Response(JSON.stringify({ lat: loc.lat, lng: loc.lng }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback: use Geocoding API with the place_id
      const geoParams = new URLSearchParams({
        place_id: placeId,
        key: apiKey,
      });
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${geoParams}`
      );
      const geoData = await geoRes.json();
      const geoLoc = geoData.results?.[0]?.geometry?.location;

      if (geoLoc) {
        return new Response(JSON.stringify({ lat: geoLoc.lat, lng: geoLoc.lng }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Could not get location" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reverse geocode: lat/lng → formatted address
    if (action === "reverse_geocode") {
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");
      if (!lat || !lng) {
        return new Response(JSON.stringify({ error: "lat and lng required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key: apiKey,
      });

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`
      );
      const data = await res.json();
      const result = data.results?.[0];

      if (!result) {
        return new Response(JSON.stringify({ error: "No address found", formatted_address: "" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        formatted_address: result.formatted_address,
        place_id: result.place_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Distance from lat/lng coordinates (no place_id needed)
    if (action === "distance_latlng") {
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");
      if (!lat || !lng) {
        return new Response(JSON.stringify({ error: "lat and lng required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        origins: BENTON_MO,
        destinations: `${lat},${lng}`,
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

      const miles = Math.round(element.distance.value / 1609.34);

      return new Response(JSON.stringify({
        miles,
        distance_text: element.distance.text,
        duration_text: element.duration.text,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
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
