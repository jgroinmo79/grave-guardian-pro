import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntakeFormData, getTravelFee } from "@/lib/pricing";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const zone = getTravelFee(data.estimatedMiles);
  const [query, setQuery] = useState(data.cemeteryName);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [distLoading, setDistLoading] = useState(false);
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

    // Get distance
    setDistLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `https://${projectId}.supabase.co/functions/v1/google-maps?action=distance&place_id=${encodeURIComponent(prediction.place_id)}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
      });
      const json = await res.json();
      if (json.miles !== undefined) {
        update({ estimatedMiles: json.miles });
      }
    } catch (err) {
      console.error("Distance error:", err);
    } finally {
      setDistLoading(false);
    }
  }, [update]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-primary mb-3">
          <MapPin className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Step 1</span>
        </div>
        <h2 className="text-3xl font-display font-bold mb-2">Cemetery Location</h2>
        <p className="text-muted-foreground">Help us locate the monument</p>
      </div>

      <div className="max-w-md mx-auto space-y-5">
        {/* Autocomplete Cemetery Search */}
        <div className="space-y-2" ref={wrapperRef}>
          <Label htmlFor="cemetery" className="text-sm font-medium">Cemetery Name</Label>
          <div className="relative">
            <Input
              id="cemetery"
              placeholder="Start typing a cemetery name..."
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
          <p className="text-xs text-muted-foreground">Powered by Google Maps</p>
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="miles">Estimated Distance from Cape Girardeau (miles)</Label>
          <div className="relative">
            <Input
              id="miles"
              type="number"
              min={0}
              placeholder="Auto-calculated or enter manually"
              value={data.estimatedMiles || ''}
              onChange={(e) => update({ estimatedMiles: Number(e.target.value) })}
              className="bg-secondary border-border"
            />
            {distLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {distLoading ? 'Calculating distance...' : 'Auto-calculated when you select a cemetery above'}
          </p>
        </div>

        {data.estimatedMiles > 0 && (
          <div className="rounded-lg bg-secondary/50 border border-border p-4 flex items-center gap-3">
            <Navigation className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-medium">{zone.label}</p>
              <p className="text-sm text-muted-foreground">
                Travel fee: {zone.fee === 0 ? (
                  <span className="text-primary font-semibold">Free!</span>
                ) : (
                  <span className="text-accent font-semibold">${zone.fee}</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CemeteryStep;
