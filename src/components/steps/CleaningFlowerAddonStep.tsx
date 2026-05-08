import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntakeFormData, MAINTENANCE_PLANS } from "@/lib/pricing";
import { Flower2, Check, Plus, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const ADDON_PRICE = 50;

const TYPE_LABELS: Record<string, string> = {
  bouquet: "Bouquet",
  saddle: "Saddle",
  wreath: "Wreath",
  potted: "Potted",
  easel: "Easel",
};

const OCCASION_FILTERS = [
  { value: "all", label: "All" },
  { value: "easter", label: "Easter" },
  { value: "mothers_day", label: "Mother's Day" },
  { value: "fathers_day", label: "Father's Day" },
  { value: "christmas", label: "Christmas" },
  { value: "memorial_day", label: "Memorial Day" },
];

const CleaningFlowerAddonStep = ({ data, update }: Props) => {
  const isAnnual = !!data.selectedMaintenancePlan;
  const planVisits = isAnnual
    ? MAINTENANCE_PLANS[data.selectedMaintenancePlan as keyof typeof MAINTENANCE_PLANS]?.visits ?? 0
    : 1;

  const addons = data.cleaningFlowerAddons;
  const count = addons.length;

  // editingVisit: which visitNumber slot is currently in arrangement-picker mode (null = none)
  const [editingVisit, setEditingVisit] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");

  const { data: arrangements = [], isLoading } = useQuery({
    queryKey: ["flower_arrangements_active"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("flower_arrangements_public" as any)
        .select(
          "id, name, description, retail_price, image_url, arrangement_type, occasion_tags",
        )
        .order("retail_price", { ascending: true });
      if (error) throw error;
      return rows;
    },
  });

  const filtered = useMemo(() => {
    return filter === "all"
      ? arrangements
      : (arrangements as any[]).filter((a) =>
          (a.occasion_tags || []).includes(filter),
        );
  }, [arrangements, filter]);

  const setAddons = (next: typeof addons) =>
    update({ cleaningFlowerAddons: next });

  const upsertArrangement = (visitNumber: number, arrangementId: string) => {
    const others = addons.filter((a) => a.visitNumber !== visitNumber);
    setAddons([...others, { visitNumber, arrangementId }].sort(
      (a, b) => a.visitNumber - b.visitNumber,
    ));
    setEditingVisit(null);
  };

  const removeAddon = (visitNumber: number) => {
    setAddons(addons.filter((a) => a.visitNumber !== visitNumber));
    if (editingVisit === visitNumber) setEditingVisit(null);
  };

  // Pick the next available visit slot to edit when adding a placement
  const nextAvailableVisit = (): number | null => {
    const taken = new Set(addons.map((a) => a.visitNumber));
    for (let i = 1; i <= planVisits; i++) {
      if (!taken.has(i)) return i;
    }
    return null;
  };

  // ---------- ONE-TIME CLEANING ----------
  if (!isAnnual) {
    const current = addons[0] ?? null;
    const arrangementName = current
      ? (arrangements as any[]).find((a) => a.id === current.arrangementId)?.name
      : null;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <Flower2 className="w-8 h-8 text-primary mx-auto mb-3" />
          <h2 className="text-3xl font-display font-bold mb-2">
            Add a flower placement?
          </h2>
          <p className="text-muted-foreground font-serif">
            Optional — add a fresh arrangement to be placed during your cleaning visit.
          </p>
          <p className="text-sm text-primary mt-2 font-semibold">
            +${ADDON_PRICE} per placement
          </p>
        </div>

        {!current && editingVisit === null && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
            <Button
              variant="outline"
              className="h-20"
              onClick={() => setEditingVisit(1)}
            >
              <Flower2 className="w-4 h-4 mr-2" /> Yes, add a flower
            </Button>
            <Button
              variant="ghost"
              className="h-20 border border-border"
              onClick={() => setAddons([])}
            >
              No thanks
            </Button>
          </div>
        )}

        {current && editingVisit === null && (
          <div className="max-w-md mx-auto rounded-xl border-2 border-primary bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Flower placement
                  </p>
                  <p className="font-semibold truncate">
                    {arrangementName || "Selected arrangement"}
                  </p>
                  <p className="text-xs text-primary font-semibold">+${ADDON_PRICE}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeAddon(1)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-3"
              onClick={() => setEditingVisit(1)}
            >
              Change arrangement
            </Button>
          </div>
        )}

        {editingVisit === 1 && (
          <ArrangementPicker
            arrangements={filtered}
            isLoading={isLoading}
            filter={filter}
            setFilter={setFilter}
            onPick={(id) => upsertArrangement(1, id)}
            onCancel={() => {
              setEditingVisit(null);
              if (!current) setAddons([]);
            }}
            selectedId={current?.arrangementId ?? null}
          />
        )}
      </div>
    );
  }

  // ---------- ANNUAL PLAN ----------
  const planLabel =
    MAINTENANCE_PLANS[data.selectedMaintenancePlan as keyof typeof MAINTENANCE_PLANS]
      ?.label ?? "";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <Flower2 className="w-8 h-8 text-primary mx-auto mb-3" />
        <h2 className="text-3xl font-display font-bold mb-2">
          Want flower placements with your visits?
        </h2>
        <p className="text-muted-foreground font-serif">
          Optional — add up to {planVisits} flower placement{planVisits === 1 ? "" : "s"} across your {planLabel}.
        </p>
        <p className="text-sm text-primary mt-2 font-semibold">
          +${ADDON_PRICE} per placement
        </p>
      </div>

      <div className="max-w-md mx-auto flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={count === 0 || editingVisit !== null}
          onClick={() => removeAddon(addons[addons.length - 1].visitNumber)}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <div className="text-center min-w-[120px]">
          <p className="text-3xl font-display font-bold text-primary">{count}</p>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            of {planVisits} placement{planVisits === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={count >= planVisits || editingVisit !== null}
          onClick={() => {
            const next = nextAvailableVisit();
            if (next !== null) setEditingVisit(next);
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Existing placements list */}
      {addons.length > 0 && editingVisit === null && (
        <div className="max-w-md mx-auto space-y-2">
          {addons.map((a) => {
            const arr = (arrangements as any[]).find((x) => x.id === a.arrangementId);
            return (
              <div
                key={a.visitNumber}
                className="rounded-lg border border-primary/40 bg-primary/5 p-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {a.visitNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Visit {a.visitNumber}
                  </p>
                  <p className="font-semibold truncate text-sm">
                    {arr?.name ?? "Selected arrangement"}
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary whitespace-nowrap">
                  +${ADDON_PRICE}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingVisit(a.visitNumber)}
                >
                  Change
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAddon(a.visitNumber)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Visit selector when needed (multiple slots open + adding new) */}
      {editingVisit !== null && (
        <>
          <div className="max-w-md mx-auto">
            <p className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-2">
              Attach to which visit?
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: planVisits }, (_, i) => i + 1).map((vn) => {
                const taken = addons.some(
                  (a) => a.visitNumber === vn && vn !== editingVisit,
                );
                const active = vn === editingVisit;
                return (
                  <button
                    key={vn}
                    type="button"
                    disabled={taken}
                    onClick={() => setEditingVisit(vn)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : taken
                          ? "bg-muted/30 text-muted-foreground/40 border-border cursor-not-allowed"
                          : "bg-secondary/30 text-muted-foreground border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    Visit {vn}
                    {taken && " · taken"}
                  </button>
                );
              })}
            </div>
          </div>

          <ArrangementPicker
            arrangements={filtered}
            isLoading={isLoading}
            filter={filter}
            setFilter={setFilter}
            onPick={(id) => upsertArrangement(editingVisit, id)}
            onCancel={() => setEditingVisit(null)}
            selectedId={
              addons.find((a) => a.visitNumber === editingVisit)?.arrangementId ?? null
            }
          />
        </>
      )}

      <p className="text-xs text-center text-muted-foreground">
        You can skip this entirely and proceed without flowers.
      </p>
    </div>
  );
};

// ---------- Inline arrangement picker ----------
interface PickerProps {
  arrangements: any[];
  isLoading: boolean;
  filter: string;
  setFilter: (f: string) => void;
  onPick: (id: string) => void;
  onCancel: () => void;
  selectedId: string | null;
}

const ArrangementPicker = ({
  arrangements,
  isLoading,
  filter,
  setFilter,
  onPick,
  onCancel,
  selectedId,
}: PickerProps) => (
  <div className="space-y-4">
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
      <p className="text-center text-sm text-muted-foreground py-8">
        Loading arrangements…
      </p>
    ) : arrangements.length === 0 ? (
      <p className="text-center text-sm text-muted-foreground py-8">
        No arrangements found for this filter.
      </p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {arrangements.map((a) => {
          const selected = selectedId === a.id;
          return (
            <div
              key={a.id}
              className={`rounded-xl border overflow-hidden flex flex-col ${
                selected ? "border-primary ring-2 ring-primary/30" : "border-border"
              }`}
            >
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight">{a.name}</h3>
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
                  onClick={() => onPick(a.id)}
                  variant={selected ? "secondary" : "default"}
                  size="sm"
                  className="w-full mt-auto"
                >
                  {selected ? (
                    <>
                      <Check className="w-4 h-4 mr-1" /> Selected
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

    <div className="text-center">
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  </div>
);

export default CleaningFlowerAddonStep;
