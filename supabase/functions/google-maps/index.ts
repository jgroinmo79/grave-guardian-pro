import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BENTON_MO = "37.0978,-89.5625";

type LatLng = {
  lat: number;
  lng: number;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getJson = async (url: string) => {
  const res = await fetch(url);
  return await res.json();
};

const getLocationFromPlaceDetails = async (placeId: string, apiKey: string): Promise<LatLng | null> => {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "geometry,formatted_address",
    key: apiKey,
  });

  const data = await getJson(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  );
  const loc = data.result?.geometry?.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
};

const getLocationFromGeocodePlaceId = async (placeId: string, apiKey: string): Promise<LatLng | null> => {
  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
  });

  const data = await getJson(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`
  );
  const loc = data.results?.[0]?.geometry?.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
};

const getLocationFromFindPlace = async (description: string, apiKey: string): Promise<LatLng | null> => {
  const params = new URLSearchParams({
    input: description,
    inputtype: "textquery",
    fields: "geometry,formatted_address,name,place_id",
    locationbias: `circle:250000@${BENTON_MO}`,
    key: apiKey,
  });

  const data = await getJson(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`
  );
  const loc = data.candidates?.[0]?.geometry?.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
};

const getLocationFromGeocodeAddress = async (description: string, apiKey: string): Promise<LatLng | null> => {
  const params = new URLSearchParams({
    address: description,
    key: apiKey,
  });

  const data = await getJson(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`
  );
  const loc = data.results?.[0]?.geometry?.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
};

const resolveLocation = async (
  apiKey: string,
  placeId?: string | null,
  description?: string | null
): Promise<LatLng | null> => {
  if (placeId) {
    const detailsLoc = await getLocationFromPlaceDetails(placeId, apiKey);
    if (detailsLoc) return detailsLoc;

    const geocodePlaceLoc = await getLocationFromGeocodePlaceId(placeId, apiKey);
    if (geocodePlaceLoc) return geocodePlaceLoc;
  }

  if (description) {
    const findPlaceLoc = await getLocationFromFindPlace(description, apiKey);
    if (findPlaceLoc) return findPlaceLoc;

    const geocodeAddressLoc = await getLocationFromGeocodeAddress(description, apiKey);
    if (geocodeAddressLoc) return geocodeAddressLoc;
  }

  return null;
};

const getDistanceFromCoordinates = async (apiKey: string, lat: string | number, lng: string | number) => {
  const params = new URLSearchParams({
    origins: BENTON_MO,
    destinations: `${lat},${lng}`,
    units: "imperial",
    key: apiKey,
  });

  const data = await getJson(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
  );
  return data.rows?.[0]?.elements?.[0] ?? null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "API key not configured" }, 500);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (action === "autocomplete") {
      const input = url.searchParams.get("input");
      if (!input) {
        return jsonResponse({ predictions: [] });
      }

      const params = new URLSearchParams({
        input,
        types: "establishment",
        keyword: "cemetery church",
        location: BENTON_MO,
        radius: "250000",
        key: apiKey,
      });

      const data = await getJson(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
      );

      const allowedKeywords = [
        "cemetery",
        "church",
        "memorial",
        "funeral",
        "burial",
        "graveyard",
        "mausoleum",
        "mortuary",
        "chapel",
        "parish",
        "tabernacle",
        "temple",
        "synagogue",
        "mosque",
      ];

      const filtered = (data.predictions || []).filter((p: any) => {
        const desc = p.description.toLowerCase();
        return allowedKeywords.some((kw) => desc.includes(kw));
      });

      return jsonResponse({
        predictions: filtered.map((p: any) => ({
          place_id: p.place_id,
          description: p.description,
        })),
      });
    }

    if (action === "distance") {
      const placeId = url.searchParams.get("place_id");
      const description = url.searchParams.get("description");

      if (!placeId && !description) {
        return jsonResponse({ error: "place_id or description required" }, 400);
      }

      const location = await resolveLocation(apiKey, placeId, description);
      if (!location) {
        return jsonResponse({
          error: "Could not calculate distance",
          raw: { status: "NOT_FOUND" },
          resolved: false,
        });
      }

      const element = await getDistanceFromCoordinates(apiKey, location.lat, location.lng);
      if (element?.status !== "OK") {
        return jsonResponse({
          error: "Could not calculate distance",
          raw: element ?? { status: "NOT_FOUND" },
          resolved: false,
        });
      }

      const miles = Math.round(element.distance.value / 1609.34);
      return jsonResponse({
        miles,
        distance_text: element.distance.text,
        duration_text: element.duration.text,
        resolved: true,
      });
    }

    if (action === "place_details") {
      const placeId = url.searchParams.get("place_id");
      const description = url.searchParams.get("description");

      if (!placeId && !description) {
        return jsonResponse({ error: "place_id or description required" }, 400);
      }

      const location = await resolveLocation(apiKey, placeId, description);
      if (!location) {
        return jsonResponse({ error: "Could not get location", resolved: false });
      }

      return jsonResponse({ lat: location.lat, lng: location.lng, resolved: true });
    }

    if (action === "reverse_geocode") {
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");
      if (!lat || !lng) {
        return jsonResponse({ error: "lat and lng required" }, 400);
      }

      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key: apiKey,
      });

      const data = await getJson(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`
      );
      const result = data.results?.[0];

      if (!result) {
        return jsonResponse({ error: "No address found", formatted_address: "" });
      }

      return jsonResponse({
        formatted_address: result.formatted_address,
        place_id: result.place_id,
      });
    }

    if (action === "distance_latlng") {
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");
      if (!lat || !lng) {
        return jsonResponse({ error: "lat and lng required" }, 400);
      }

      const element = await getDistanceFromCoordinates(apiKey, lat, lng);
      if (element?.status !== "OK") {
        return jsonResponse({
          error: "Could not calculate distance",
          raw: element ?? { status: "NOT_FOUND" },
        });
      }

      const miles = Math.round(element.distance.value / 1609.34);
      return jsonResponse({
        miles,
        distance_text: element.distance.text,
        duration_text: element.duration.text,
      });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});