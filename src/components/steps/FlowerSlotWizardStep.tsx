import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  IntakeFormData,
  STANDARD_HOLIDAYS,
  CUSTOM_DATE_OCCASIONS,
} from "@/lib/pricing";
import {
  Flower2,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
  totalSlots: number;
  onComplete?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  bouquet: "Bouquet",
  saddle: "Saddle",
  wreath: "Wreath",
  potted: "Potted",
  easel: "Easel",
};


const FlowerSlotWizardStep = ({ data, update, totalSlots }: Props) => {
  // The slot keys list lives in form data so navigation in/out preserves state.
  // Each "slot key" is the human-readable label of the chosen date/occasion.
  const slotKeys = data.flowerSlotKeys.slice(0, totalSlots);

  // Local cursor — which slot is being filled right now
  const [cursor, setCursor] = useState<number>(() => {
    // Resume on the first incomplete slot
    for (let i = 0; i < totalSlots; i++) {
      const key = data.flowerSlotKeys[i];
      if (!key || !data.selectedArrangements[key]) return i;
    }
    return totalSlots - 1;
  });

  // For the slot being edited, what the user has chosen so far this session
  const slotKey = slotKeys[cursor] || '';
  const slotHasArrangement = !!(slotKey && data.selectedArrangements[slotKey]);

  const { data: arrangements = [], isLoading } = useQuery({
    queryKey: ["flower_arrangements_active_v2"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("flower_arrangements")
        .select("id, name, description, retail_price, image_url, image_url_2, image_url_3, image_url_4, image_url_5, arrangement_type, occasion_tags, is_active")
        .eq("is_active", true)
        .order("retail_price", { ascending: true });
      if (error) throw error;
      return rows || [];
    },
  });

  // Custom-date occasion local state (only used when not yet committed)
  const [customMode, setCustomMode] = useState<string | null>(null); // which custom occasion is being configured
  const [customLabel, setCustomLabel] = useState(''); // for "Other"
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);

  // Reset custom controls when cursor changes
  useEffect(() => { setCustomMode(null); setCustomLabel(''); setCustomDate(undefined); }, [cursor]);

  // --- Sync helpers ---
  const usedKeys = useMemo(() => new Set(slotKeys.filter((_, i) => i !== cursor)), [slotKeys, cursor]);

  const commitSlotKey = (newKey: string, customDateStr?: string) => {
    // Remove old key state if this slot is being changed
    const prevKey = slotKeys[cursor];
    const newSlotKeys = [...data.flowerSlotKeys];
    newSlotKeys[cursor] = newKey;

    const newArrangements = { ...data.selectedArrangements };
    const newCustomDates = { ...data.holidayCustomDates };
    if (prevKey && prevKey !== newKey) {
      delete newArrangements[prevKey];
      delete newCustomDates[prevKey];
    }
    if (customDateStr) newCustomDates[newKey] = customDateStr;

    // Rebuild selectedHolidays from slotKeys (used by checkout summary)
    const newHolidays = newSlotKeys.filter(Boolean);

    update({
      flowerSlotKeys: newSlotKeys,
      selectedArrangements: newArrangements,
      holidayCustomDates: newCustomDates,
      selectedHolidays: newHolidays,
    });
  };

  const pickStandardHoliday = (h: string) => {
    if (usedKeys.has(h)) return;
    commitSlotKey(h);
  };

  const confirmCustomDate = () => {
    if (!customMode) return;
    let key = customMode;
    if (customMode === 'Other') {
      const trimmed = customLabel.trim();
      if (!trimmed) return;
      key = trimmed;
    }
    if (usedKeys.has(key)) return;
    const dateStr = customDate ? format(customDate, 'yyyy-MM-dd') : '';
    commitSlotKey(key, dateStr);
    setCustomMode(null);
  };

  const pickArrangement = (arrangementId: string) => {
    if (!slotKey) return;
    update({
      selectedArrangements: { ...data.selectedArrangements, [slotKey]: arrangementId },
    });
  };

  const goNext = () => {
    if (cursor < totalSlots - 1) setCursor(cursor + 1);
  };
  const goPrev = () => { if (cursor > 0) setCursor(cursor - 1); };

  const allSlotsComplete =
    slotKeys.length === totalSlots &&
    slotKeys.every((k) => k && data.selectedArrangements[k]);

  // ============= RENDER =============
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <Flower2 className="w-8 h-8 text-primary mx-auto mb-3" />
        <h2 className="text-3xl font-display font-bold mb-2">
          Flower Placement {cursor + 1} of {totalSlots}
        </h2>
        <p className="text-muted-foreground font-serif">
          Pick the date or occasion, then choose the arrangement.
        </p>
      </div>

      {/* Slot navigation pills */}
      {totalSlots > 1 && (
        <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
          {Array.from({ length: totalSlots }).map((_, i) => {
            const key = slotKeys[i];
            const hasArrangement = !!(key && data.selectedArrangements[key]);
            const isActive = i === cursor;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setCursor(i)}
                className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : hasArrangement
                      ? 'bg-primary/10 text-primary border-primary/40'
                      : 'bg-secondary/40 text-muted-foreground border-border'
                }`}
              >
                {hasArrangement && <Check className="w-3 h-3" />}
                {key || `Slot ${i + 1}`}
              </button>
            );
          })}
        </div>
      )}

      {/* === STAGE 4A: pick date/occasion === */}
      {!slotKey && (
        <div className="max-w-2xl mx-auto space-y-6">
          <section>
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3 text-center">
              Standard Holidays
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {STANDARD_HOLIDAYS.map((h) => {
                const used = usedKeys.has(h);
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={used}
                    onClick={() => pickStandardHoliday(h)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${
                      used
                        ? 'border-border bg-secondary/20 text-muted-foreground/40 line-through cursor-not-allowed'
                        : 'border-border bg-secondary/40 hover:border-primary/60 hover:bg-primary/5'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate text-left">{h}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3 text-center">
              Custom Date
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {CUSTOM_DATE_OCCASIONS.map((occ) => {
                const baseUsed = occ !== 'Other' && usedKeys.has(occ);
                const isOpen = customMode === occ;
                return (
                  <button
                    key={occ}
                    type="button"
                    disabled={baseUsed}
                    onClick={() => setCustomMode(isOpen ? null : occ)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${
                      baseUsed
                        ? 'border-border bg-secondary/20 text-muted-foreground/40 line-through cursor-not-allowed'
                        : isOpen
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary/40 hover:border-primary/60 hover:bg-primary/5'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4 shrink-0" />
                    <span className="truncate text-left">{occ}</span>
                  </button>
                );
              })}
            </div>

            {customMode && (
              <div className="mt-4 p-4 rounded-xl border border-primary/40 bg-primary/5 space-y-3">
                {customMode === 'Other' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Label this occasion</Label>
                    <Input
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="e.g. Wedding anniversary"
                      maxLength={60}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !customDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {customDate ? format(customDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDate}
                        onSelect={setCustomDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={!customDate || (customMode === 'Other' && !customLabel.trim())}
                  onClick={confirmCustomDate}
                >
                  Confirm date <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* === STAGE 4B: pick arrangement === */}
      {slotKey && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="rounded-xl border-2 border-primary/40 bg-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Choosing flowers for
              </p>
              <h3 className="font-display font-bold text-lg text-primary truncate">
                {slotKey}
                {data.holidayCustomDates[slotKey] && (
                  <span className="text-sm text-muted-foreground font-serif ml-2">
                    — {data.holidayCustomDates[slotKey]}
                  </span>
                )}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => commitSlotKey('')}
              className="text-xs"
            >
              Change date
            </Button>
          </div>

          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Loading arrangements…</p>
          ) : arrangements.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No arrangements available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {arrangements.map((a: any) => {
                const selected = data.selectedArrangements[slotKey] === a.id;
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl border overflow-hidden transition-all flex flex-col ${
                      selected ? 'border-primary ring-2 ring-primary/30 shadow-patina' : 'border-border'
                    }`}
                  >
                    <div className="p-3 space-y-2 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm leading-tight">{a.name}</h4>
                        <span className="text-sm font-bold text-primary whitespace-nowrap">
                          ${Number(a.retail_price).toFixed(2)}
                        </span>
                      </div>
                      {a.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 font-serif">{a.description}</p>
                      )}
                      {a.arrangement_type && (
                        <Badge variant="secondary" className="text-[10px] capitalize w-fit">
                          {TYPE_LABELS[a.arrangement_type] || a.arrangement_type}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? "secondary" : "default"}
                        onClick={() => pickArrangement(a.id)}
                        className="w-full mt-auto"
                      >
                        {selected ? (<><Check className="w-4 h-4 mr-1" /> Selected</>) : 'Choose this'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Slot navigation footer */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={goPrev} disabled={cursor === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous slot
            </Button>
            {cursor < totalSlots - 1 ? (
              <Button size="sm" onClick={goNext} disabled={!slotHasArrangement}>
                Next slot <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <span className={`text-xs font-semibold uppercase tracking-widest ${allSlotsComplete ? 'text-primary' : 'text-muted-foreground'}`}>
                {allSlotsComplete ? 'All slots ready' : 'Pick an arrangement'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowerSlotWizardStep;
