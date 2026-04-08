import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntakeFormData } from "@/lib/pricing";
import { Flower2, ImageIcon, Check } from "lucide-react";
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

  const selectArrangement = (id: string) => {
    update({
      selectedArrangementId: data.selectedArrangementId === id ? "" : id,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <Flower2 className="w-8 h-8 text-primary mx-auto mb-3" />
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Flower Selection
        </span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">
          Choose Your Arrangement
        </h2>
        <p className="text-muted-foreground text-sm">
          Select a flower arrangement for your placement. Tap a card to select.
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

      {/* Card grid */}
      {isLoading ? (
        <p className="text-center text-muted-foreground text-sm py-8">
          Loading arrangements…
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">
          No arrangements found for this occasion.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {filtered.map((a: any) => {
            const selected = data.selectedArrangementId === a.id;
            return (
              <button
                key={a.id}
                onClick={() => selectArrangement(a.id)}
                className={`text-left rounded-xl border overflow-hidden transition-all ${
                  selected
                    ? "border-primary ring-2 ring-primary/30 shadow-lg"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {a.image_url ? (
                    <img
                      src={a.image_url}
                      alt={a.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-muted-foreground/20" />
                    </div>
                  )}
                  {selected && (
                    <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
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
                    <Badge
                      variant="secondary"
                      className="text-[10px] capitalize"
                    >
                      {TYPE_LABELS[a.arrangement_type] || a.arrangement_type}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {data.selectedArrangementId && (
        <p className="text-xs text-primary text-center font-medium pt-1">
          ✓ Arrangement selected
        </p>
      )}
    </div>
  );
};

export default FlowerArrangementStep;
