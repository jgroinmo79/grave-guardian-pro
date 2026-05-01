import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntakeFormData } from "@/lib/pricing";
import { Flower2, ImageIcon, Check, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const OCCASION_FILTERS = [
  { value: "all", label: "All" },
  { value: "easter", label: "Easter" },
  { value: "mothers_day", label: "Mother's Day" },
  { value: "fathers_day", label: "Father's Day" },
  { value: "christmas", label: "Christmas" },
  { value: "memorial_day", label: "Memorial Day" },
];

const TYPE_LABELS: Record<string, string> = {
  bouquet: "Bouquet",
  saddle: "Saddle",
  wreath: "Wreath",
  potted: "Potted",
  easel: "Easel",
};

const needsCustomDate = (holiday: string) =>
  holiday === "Deceased's Birthday" || holiday === "Deceased's Anniversary";

const ImageCarousel = ({ images, name, selected }: { images: string[]; name: string; selected: boolean }) => {
  const [idx, setIdx] = useState(0);
  const hasMultiple = images.length > 1;

  return (
    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
      {images.length > 0 ? (
        <img src={images[idx]} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-10 h-10 text-muted-foreground/20" />
        </div>
      )}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i === 0 ? images.length - 1 : i - 1)); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-background/70 rounded-full p-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-background/70 rounded-full p-1"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-primary" : "bg-background/60"}`} />
            ))}
          </div>
        </>
      )}
      {selected && (
        <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
};

const FlowerArrangementStep = ({ data, update }: Props) => {
  const [filter, setFilter] = useState("all");
  const [activeIdx, setActiveIdx] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  const { data: arrangements = [], isLoading } = useQuery({
    queryKey: ["flower_arrangements_active"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("flower_arrangements_public" as any)
        .select("id, name, description, retail_price, image_url, image_url_2, image_url_3, image_url_4, image_url_5, arrangement_type, occasion_tags, is_active, created_at, updated_at")
        .order("retail_price", { ascending: true });
      if (error) throw error;
      return rows;
    },
  });

  const holidays = data.selectedHolidays;
  const assigned = data.selectedArrangements;
  const assignedCount = holidays.filter((h) => !!assigned[h]).length;

  // Clamp active index in case holidays change
  useEffect(() => {
    if (activeIdx >= holidays.length && holidays.length > 0) {
      setActiveIdx(holidays.length - 1);
    }
  }, [holidays.length, activeIdx]);

  const activeHoliday = holidays[activeIdx];

  const filtered = useMemo(() => {
    return filter === "all"
      ? arrangements
      : arrangements.filter((a: any) => (a.occasion_tags || []).includes(filter));
  }, [arrangements, filter]);

  const selectArrangement = (holiday: string, arrangementId: string) => {
    const current = { ...data.selectedArrangements };
    current[holiday] = arrangementId;
    update({ selectedArrangements: current });

    // Find next unassigned holiday after this one
    const nextUnassigned = holidays.findIndex(
      (h, i) => i > activeIdx && !current[h]
    );
    const fallback = holidays.findIndex((h) => !current[h]);
    const target = nextUnassigned !== -1 ? nextUnassigned : fallback;

    if (target !== -1 && target !== activeIdx) {
      setActiveIdx(target);
    }
    // Scroll to top of the section
    setTimeout(() => {
      headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const getHolidayLabel = (holiday: string) => {
    if (needsCustomDate(holiday) && data.holidayCustomDates[holiday]) {
      return `${holiday} — ${data.holidayCustomDates[holiday]}`;
    }
    return holiday;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div ref={headerRef} className="text-center mb-2 scroll-mt-4">
        <Flower2 className="w-8 h-8 text-primary mx-auto mb-3" />
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Flower Selection
        </span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">
          Choose Your Arrangements
        </h2>
        <p className="text-muted-foreground text-sm">
          Pick one arrangement for each placement date.
        </p>
        <p className="text-sm font-semibold text-primary mt-2">
          {assignedCount} of {holidays.length} arrangement{holidays.length !== 1 ? "s" : ""} selected
        </p>
      </div>

      {/* Active holiday banner */}
      {activeHoliday && (
        <div className="sticky top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="rounded-xl border-2 border-primary bg-card shadow-lg p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Choosing flowers for
                </p>
                <h3 className="font-display font-bold text-lg sm:text-xl text-primary truncate">
                  {getHolidayLabel(activeHoliday)}
                </h3>
              </div>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {activeIdx + 1} / {holidays.length}
              </span>
            </div>

            {/* Holiday quick nav */}
            {holidays.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {holidays.map((h, i) => {
                  const isActive = i === activeIdx;
                  const isAssigned = !!assigned[h];
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setActiveIdx(i);
                        setTimeout(() => headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                      }}
                      className={`text-[11px] px-2 py-1 rounded-full border transition-all flex items-center gap-1 ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : isAssigned
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-secondary/30 text-muted-foreground border-border"
                      }`}
                    >
                      {isAssigned && <Check className="w-3 h-3" />}
                      <span className="truncate max-w-[140px]">{getHolidayLabel(h)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {OCCASION_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/30 text-muted-foreground border-border hover:border-muted-foreground/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground text-sm py-8">
          Loading arrangements…
        </p>
      ) : !activeHoliday ? (
        <p className="text-center text-muted-foreground text-sm py-8">
          No placement dates selected.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No arrangements found for this filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {filtered.map((a: any) => {
            const selected = assigned[activeHoliday] === a.id;
            return (
              <div
                key={a.id}
                className={`rounded-xl border overflow-hidden transition-all flex flex-col ${
                  selected
                    ? "border-primary ring-2 ring-primary/30 shadow-lg"
                    : "border-border"
                }`}
              >
                <div className="p-3 space-y-2 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight">
                      {a.name}
                    </h3>
                    <span className="text-sm font-bold text-primary whitespace-nowrap">
                      ${Number(a.retail_price).toFixed(2)}
                    </span>
                  </div>
                  {a.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {a.description}
                    </p>
                  )}
                  {a.arrangement_type && (
                    <Badge variant="secondary" className="text-[10px] capitalize w-fit">
                      {TYPE_LABELS[a.arrangement_type] || a.arrangement_type}
                    </Badge>
                  )}
                  <Button
                    type="button"
                    onClick={() => selectArrangement(activeHoliday, a.id)}
                    variant={selected ? "secondary" : "default"}
                    size="sm"
                    className="w-full mt-auto"
                  >
                    {selected ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Selected
                      </>
                    ) : (
                      "I want this one"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FlowerArrangementStep;
