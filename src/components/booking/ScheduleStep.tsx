import { useState, useEffect, useRef, useCallback } from "react";
import { BookingFormData } from "@/lib/booking-data";
import { format } from "date-fns";
import { CalendarIcon, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CemeteryMap from "./CemeteryMap";

interface Prediction {
  place_id: string;
  description: string;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface Props {
  data: BookingFormData;
  update: (d: Partial<BookingFormData>) => void;
}

const ScheduleStep = ({ data, update }: Props) => {
  const [query, setQuery] = useState(data.cemeteryAddress);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
          headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
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
    update({ cemeteryAddress: prediction.description });
    setIsOpen(false);
    setPredictions([]);

    // Get lat/lng
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `https://${projectId}.supabase.co/functions/v1/google-maps?action=place_details&place_id=${encodeURIComponent(prediction.place_id)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
      });
      const json = await res.json();
      if (json.lat !== undefined && json.lng !== undefined) {
        update({ cemeteryLat: json.lat, cemeteryLng: json.lng });
      }
    } catch (err) {
      console.error("Place details error:", err);
    }
  }, [update]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    update({ cemeteryLat: lat, cemeteryLng: lng });
  }, [update]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-[#C9976B]">Step 3</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Schedule</h2>
        <p className="text-muted-foreground">Pick your preferred date and location</p>
      </div>

      <div className="max-w-lg mx-auto space-y-5">
        {/* Date Picker */}
        <div>
          <label className="block text-sm font-semibold mb-2">Preferred Service Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !data.preferredDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.preferredDate ? format(data.preferredDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.preferredDate ?? undefined}
                onSelect={(d) => update({ preferredDate: d ?? null })}
                disabled={(d) => d < new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Cemetery Search with Autocomplete */}
        <div className="space-y-2" ref={wrapperRef}>
          <label className="block text-sm font-semibold">Cemetery Name & Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                update({ cemeteryAddress: e.target.value });
              }}
              placeholder="Start typing a cemetery name..."
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-secondary/50 text-foreground pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-[#C9976B] placeholder:text-muted-foreground"
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
                    <MapPin className="w-4 h-4 text-[#C9976B] mt-0.5 flex-shrink-0" />
                    <span>{p.description}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Search or drop a pin on the map below</p>
        </div>

        {/* Interactive Map */}
        <div className="rounded-lg overflow-hidden border border-border">
          <CemeteryMap
            lat={data.cemeteryLat}
            lng={data.cemeteryLng}
            onMapClick={handleMapClick}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            Any notes for Joshua? <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            value={data.notes}
            onChange={(e) => update({ notes: e.target.value })}
            rows={4}
            placeholder="Special requests, access instructions, etc."
            className="w-full rounded-lg border border-border bg-secondary/50 text-foreground px-4 py-3 text-sm focus:outline-none focus:border-[#C9976B] placeholder:text-muted-foreground resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default ScheduleStep;
