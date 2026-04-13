import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntakeFormData } from "@/lib/pricing";
import { Flower2, ImageIcon, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const OCCASION_FILTERS = [
  { value: "all", label: "All" },
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

  const { data: arrangements = [], isLoading } = useQuery({
    queryKey: ["flower_arrangements_active"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("flower_arrangements")
        .select("*")
        .eq("is_active", true)
        .order("retail_price", { ascending: true });
      if (error) throw error;
      return rows;
    },
  });

  const filtered =
    filter === "all"
      ? arrangements
      : arrangements.filter((a: any) =>
          (a.occasion_tags || []).includes(filter)
        );

  const holidays = data.selectedHolidays;
  const assigned = data.selectedArrangements;
  const assignedCount = holidays.filter((h) => !!assigned[h]).length;

  const selectArrangement = (holiday: string, arrangementId: string) => {
    const current = { ...data.selectedArrangements };
    if (current[holiday] === arrangementId) {
      delete current[holiday];
    } else {
      current[holiday] = arrangementId;
    }
    update({ selectedArrangements: current });
  };

  const getHolidayLabel = (holiday: string) => {
    if (needsCustomDate(holiday) && data.holidayCustomDates[holiday]) {
      return `${holiday} — ${data.holidayCustomDates[holiday]}`;
    }
    return holiday;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <Flower2 className="w-8 h-8 text-primary mx-auto mb-3" />
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Flower Selection
        </span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">
          Choose Your Arrangements
        </h2>
        <p className="text-muted-foreground text-sm">
          Select a flower arrangement for each placement date. You can choose a different arrangement for each.
        </p>
        <p className="text-sm font-semibold text-primary mt-2">
          {assignedCount} of {holidays.length} arrangement{holidays.length !== 1 ? "s" : ""} selected
        </p>
      </div>

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
      ) : (
        <div className="space-y-8">
          {holidays.map((holiday) => {
            const selectedId = assigned[holiday] || "";
            return (
              <div key={holiday} className="space-y-3">
                <div className="flex items-center gap-2">
                  {selectedId ? (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  <h3 className="font-display font-semibold text-base">
                    {getHolidayLabel(holiday)}
                  </h3>
                </div>

                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">
                    No arrangements found for this filter.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {filtered.map((a: any) => {
                      const selected = selectedId === a.id;
                      return (
                        <button
                          key={a.id}
                          onClick={() => selectArrangement(holiday, a.id)}
                          className={`text-left rounded-xl border overflow-hidden transition-all ${
                            selected
                              ? "border-primary ring-2 ring-primary/30 shadow-lg"
                              : "border-border hover:border-muted-foreground/40"
                          }`}
                        >
                          <ImageCarousel images={[a.image_url, a.image_url_2].filter(Boolean)} name={a.name} selected={selected} />
                          <div className="p-3 space-y-1.5">
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
                              <Badge variant="secondary" className="text-[10px] capitalize">
                                {TYPE_LABELS[a.arrangement_type] || a.arrangement_type}
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FlowerArrangementStep;
