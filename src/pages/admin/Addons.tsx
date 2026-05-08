import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Addon {
  id: string;
  code: string;
  label: string;
  description: string | null;
  base_price: number;
  is_tiered: boolean;
  config: any;
  active: boolean;
  sort_order: number;
}

interface Tier {
  id: string;
  addon_id: string;
  tier_code: string;
  tier_label: string;
  min_value: number | null;
  max_value: number | null;
  unit: string;
  price: number;
  sort_order: number;
}

const AdminAddons = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: addons, isLoading } = useQuery({
    queryKey: ["admin-addons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addons")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Addon[];
    },
  });

  const { data: tiers } = useQuery({
    queryKey: ["admin-addon-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addon_tiers")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Tier[];
    },
  });

  const tiersByAddon = useMemo(() => {
    const map = new Map<string, Tier[]>();
    tiers?.forEach((t) => {
      if (!map.has(t.addon_id)) map.set(t.addon_id, []);
      map.get(t.addon_id)!.push(t);
    });
    return map;
  }, [tiers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Add-Ons</h1>
        <p className="text-sm text-muted-foreground">
          Per-visit add-ons offered to annual plan subscribers at booking time.
        </p>
      </div>

      <div className="grid gap-4">
        {addons?.map((a) => (
          <AddonCard
            key={a.id}
            addon={a}
            tiers={tiersByAddon.get(a.id) ?? []}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["admin-addons"] });
              qc.invalidateQueries({ queryKey: ["admin-addon-tiers"] });
              toast({ title: "Saved" });
            }}
          />
        ))}
      </div>
    </div>
  );
};

function AddonCard({
  addon,
  tiers,
  onSaved,
}: {
  addon: Addon;
  tiers: Tier[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [label, setLabel] = useState(addon.label);
  const [description, setDescription] = useState(addon.description ?? "");
  const [basePrice, setBasePrice] = useState(String(addon.base_price));
  const [active, setActive] = useState(addon.active);

  // HolidayLock-specific config
  const isHolidayLock = addon.code === "GD-ADD-HOLIDAYLOCK";
  const [leadDays, setLeadDays] = useState<number>(addon.config?.lead_window_days ?? 30);
  const [bufferDays, setBufferDays] = useState<number>(addon.config?.completion_buffer_days ?? 5);
  const [holidaysCsv, setHolidaysCsv] = useState<string>(
    Array.isArray(addon.config?.holidays) ? addon.config.holidays.join(", ") : ""
  );

  // Local tier edits
  const [tierEdits, setTierEdits] = useState<Tier[]>(tiers);

  const save = useMutation({
    mutationFn: async () => {
      const config: any = { ...(addon.config ?? {}) };
      if (isHolidayLock) {
        config.lead_window_days = Number(leadDays) || 0;
        config.completion_buffer_days = Number(bufferDays) || 0;
        config.holidays = holidaysCsv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      const { error } = await supabase
        .from("addons")
        .update({
          label,
          description,
          base_price: addon.is_tiered ? 0 : Number(basePrice) || 0,
          active,
          config,
        })
        .eq("id", addon.id);
      if (error) throw error;

      if (addon.is_tiered) {
        for (const t of tierEdits) {
          const { error: terr } = await supabase
            .from("addon_tiers")
            .update({
              tier_label: t.tier_label,
              min_value: t.min_value,
              max_value: t.max_value,
              unit: t.unit,
              price: Number(t.price) || 0,
            })
            .eq("id", t.id);
          if (terr) throw terr;
        }
      }
    },
    onSuccess: onSaved,
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addTier = useMutation({
    mutationFn: async () => {
      const nextOrder = (tierEdits[tierEdits.length - 1]?.sort_order ?? 0) + 10;
      const { data, error } = await supabase
        .from("addon_tiers")
        .insert({
          addon_id: addon.id,
          tier_code: `tier_${Date.now()}`,
          tier_label: "New Tier",
          unit: "letters",
          price: 0,
          sort_order: nextOrder,
        })
        .select()
        .single();
      if (error) throw error;
      setTierEdits((prev) => [...prev, data as Tier]);
    },
    onSuccess: onSaved,
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addon_tiers").delete().eq("id", id);
      if (error) throw error;
      setTierEdits((prev) => prev.filter((t) => t.id !== id));
    },
    onSuccess: onSaved,
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-mono text-muted-foreground">{addon.code}</p>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="text-base font-semibold"
          />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Label htmlFor={`active-${addon.id}`} className="text-xs text-muted-foreground">
            Active
          </Label>
          <Switch
            id={`active-${addon.id}`}
            checked={active}
            onCheckedChange={setActive}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1"
        />
      </div>

      {!addon.is_tiered && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Base Price ($)</Label>
            <Input
              type="number"
              step="1"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {isHolidayLock && (
        <div className="rounded-lg border border-border/60 bg-secondary/50 p-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Holiday Date Lock Config</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Lead Window (days)</Label>
              <Input
                type="number"
                value={leadDays}
                onChange={(e) => setLeadDays(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Completion Buffer (days)</Label>
              <Input
                type="number"
                value={bufferDays}
                onChange={(e) => setBufferDays(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Eligible Holidays (comma-separated)</Label>
            <Input
              value={holidaysCsv}
              onChange={(e) => setHolidaysCsv(e.target.value)}
              placeholder="Memorial Day, Mother's Day, ..."
              className="mt-1"
            />
          </div>
        </div>
      )}

      {addon.is_tiered && (
        <div className="rounded-lg border border-border/60 bg-secondary/50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">Tiered Pricing</p>
            <Button size="sm" variant="outline" onClick={() => addTier.mutate()} disabled={addTier.isPending}>
              <Plus className="w-3 h-3 mr-1" /> Tier
            </Button>
          </div>
          <div className="space-y-2">
            {tierEdits.map((t, idx) => (
              <div key={t.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Label className="text-[10px]">Label</Label>
                  <Input
                    value={t.tier_label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTierEdits((prev) => prev.map((x, i) => (i === idx ? { ...x, tier_label: v } : x)));
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Min</Label>
                  <Input
                    type="number"
                    value={t.min_value ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      setTierEdits((prev) => prev.map((x, i) => (i === idx ? { ...x, min_value: v } : x)));
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Max</Label>
                  <Input
                    type="number"
                    value={t.max_value ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      setTierEdits((prev) => prev.map((x, i) => (i === idx ? { ...x, max_value: v } : x)));
                    }}
                  />
                </div>
                <div className="col-span-1">
                  <Label className="text-[10px]">Unit</Label>
                  <Input
                    value={t.unit}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTierEdits((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: v } : x)));
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Price ($)</Label>
                  <Input
                    type="number"
                    value={t.price}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setTierEdits((prev) => prev.map((x, i) => (i === idx ? { ...x, price: v } : x)));
                    }}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteTier.mutate(t.id)}
                    disabled={deleteTier.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {tierEdits.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No tiers yet.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending} size="sm">
          {save.isPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-2" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}

export default AdminAddons;
