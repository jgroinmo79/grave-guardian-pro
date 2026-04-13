import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntakeFormData } from "@/lib/pricing";
import { MapPin, Loader2 } from "lucide-react";
import CemeteryMap from "@/components/booking/CemeteryMap";

interface Prediction {
  place_id: string;
  description: string;
}

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const CemeteryStep = ({ data, update }: Props) => {
  const [query, setQuery] = useState(data.cemeteryName);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [reverseAddress, setReverseAddress] = useState("");
  const [reverseLoading, setReverseLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 350);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch autocomplete predictions
  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setPredictions([]);
      return;
    }

    const fetchPredictions = async () => {
      setLoading(true);
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const url = `https://${projectId}.supabase.co/functions/v1/google-maps?action=autocomplete&input=${encodeURIComponent(debouncedQuery)}`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
        });
        const json = await res.json();
        setPredictions(json.predictions || []);
        setIsOpen((json.predictions || []).length > 0);
      } catch (err) {
        console.error("Autocomplete error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [debouncedQuery]);

  const selectPlace = useCallback(async (prediction: Prediction) => {
    setQuery(prediction.description);
    update({ cemeteryName: prediction.description });
    setIsOpen(false);
    setPredictions([]);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      // Fetch place details for lat/lng
      const detailsUrl = `https://${projectId}.supabase.co/functions/v1/google-maps?action=place_details&place_id=${encodeURIComponent(prediction.place_id)}&description=${encodeURIComponent(prediction.description)}`;
      const detailsRes = await fetch(detailsUrl, {
        headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
      });
      const detailsJson = await detailsRes.json();
      const lat = typeof detailsJson.lat === "number" ? detailsJson.lat : null;
      const lng = typeof detailsJson.lng === "number" ? detailsJson.lng : null;

      if (lat !== null && lng !== null) {
        update({ cemeteryLat: lat, cemeteryLng: lng });

        const distUrl = `https://${projectId}.supabase.co/functions/v1/google-maps?action=distance_latlng&lat=${lat}&lng=${lng}`;
        const distRes = await fetch(distUrl, {
          headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
        });
        const distJson = await distRes.json();
        if (typeof distJson.miles === "number") {
          update({ estimatedMiles: distJson.miles });
        }
        return;
      }

      const distUrl = `https://${projectId}.supabase.co/functions/v1/google-maps?action=distance&place_id=${encodeURIComponent(prediction.place_id)}&description=${encodeURIComponent(prediction.description)}`;
      const distRes = await fetch(distUrl, {
        headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
      });
      const distJson = await distRes.json();
      if (typeof distJson.miles === "number") {
        update({ estimatedMiles: distJson.miles });
      }
    } catch (err) {
      console.error("Place details/distance error:", err);
    }
  }, [update]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    update({ cemeteryLat: lat, cemeteryLng: lng });

    // Reverse geocode to get address
    setReverseLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const geocodeUrl = `https://${projectId}.supabase.co/functions/v1/google-maps?action=reverse_geocode&lat=${lat}&lng=${lng}`;
      const res = await fetch(geocodeUrl, {
        headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
      });
      const json = await res.json();
      const address = json.formatted_address || "";
      setReverseAddress(address);
      update({ cemeteryName: address });

      // Also get distance from coordinates
      const distUrl = `https://${projectId}.supabase.co/functions/v1/google-maps?action=distance_latlng&lat=${lat}&lng=${lng}`;
      const distRes = await fetch(distUrl, {
        headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
      });
      const distJson = await distRes.json();
      if (distJson.miles !== undefined) {
        update({ estimatedMiles: distJson.miles });
      }
    } catch (err) {
      console.error("Reverse geocode error:", err);
    } finally {
      setReverseLoading(false);
    }
  }, [update]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-primary mb-3">
          <MapPin className="w-5 h-5" />
          
        </div>
        <h2 className="text-3xl font-display font-bold mb-2">Cemetery Location</h2>
        <p className="text-muted-foreground">Search for the cemetery where the monument is located</p>
      </div>

      <div className="max-w-md mx-auto space-y-5">
        {/* Autocomplete Cemetery Search */}
        <div className="space-y-2" ref={wrapperRef}>
          <Label htmlFor="cemetery" className="text-sm font-medium">Cemetery Name</Label>
          <div className="relative">
            <Input
              id="cemetery"
              placeholder="Start typing a cemetery or church name..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                update({ cemeteryName: e.target.value });
              }}
              className="bg-secondary border-border"
              autoComplete="off"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Dropdown */}
          {isOpen && predictions.length > 0 && (
            <div className="rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-50 relative">
              {predictions.map((p) => (
                <button
                  key={p.place_id}
                  type="button"
                  onClick={() => selectPlace(p)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-accent/10 transition-colors border-b border-border last:border-0"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{p.description}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggle map link */}
        {!showMap && (
          <button
            type="button"
            onClick={() => setShowMap(true)}
            className="text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Can't find your cemetery? Drop a pin on the map.
          </button>
        )}

        {/* Map + reverse geocoded address */}
        {showMap && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-sm text-muted-foreground">Tap or click the map to drop a pin at the cemetery location.</p>
            <div className="rounded-lg overflow-hidden border border-border">
              <CemeteryMap
                lat={data.cemeteryLat ?? null}
                lng={data.cemeteryLng ?? null}
                onMapClick={handleMapClick}
                satellite
              />
            </div>
            {/* Reverse geocoded address */}
            {(reverseAddress || reverseLoading) && (
              <div className="space-y-1">
                <Label className="text-sm font-medium">Pin Location Address</Label>
                <div className="relative">
                  <Input
                    readOnly
                    value={reverseAddress}
                    placeholder="Drop a pin to get the address..."
                    className="bg-muted border-border text-muted-foreground cursor-default"
                  />
                  {reverseLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="section">Section</Label>
            <Input
              id="section"
              placeholder="e.g. A"
              value={data.section}
              onChange={(e) => update({ section: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lot">Lot Number</Label>
            <Input
              id="lot"
              placeholder="e.g. 142"
              value={data.lotNumber}
              onChange={(e) => update({ lotNumber: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CemeteryStep;
