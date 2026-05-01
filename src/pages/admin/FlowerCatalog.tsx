import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Plus, Search, Flower2 } from "lucide-react";
import { toast } from "sonner";

type Arrangement = {
  id: string;
  name: string;
  description: string | null;
  arrangement_type: string | null;
  occasion_tags: string[] | null;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  image_url_4: string | null;
  image_url_5: string | null;
  retail_price: number;
  wholesale_price: number | null;
  gd_code: string | null;
  ffc_code: string | null;
  is_active: boolean;
};

const TYPE_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Medium Bouquets", value: "Medium Bouquet" },
  { label: "Large Bouquets", value: "Large Bouquet" },
  { label: "Saddles", value: "Saddle" },
  { label: "Saddles + Medium", value: "Saddle with Medium" },
  { label: "Saddles + Large", value: "Saddle with Large" },
  { label: "Saddles + Two Bouquets", value: "Saddle with Two Bouquets" },
  { label: "Other", value: "Other" },
];

const KNOWN_TYPES = TYPE_FILTERS.filter((t) => t.value !== "all" && t.value !== "Other").map(
  (t) => t.value,
);

const emptyArrangement: Arrangement = {
  id: "",
  name: "",
  description: "",
  arrangement_type: "",
  occasion_tags: [],
  image_url: "",
  image_url_2: "",
  image_url_3: "",
  image_url_4: "",
  image_url_5: "",
  retail_price: 0,
  wholesale_price: 0,
  gd_code: "",
  ffc_code: "",
  is_active: true,
};

export default function FlowerCatalog() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState<Arrangement | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { data: arrangements = [], isLoading } = useQuery({
    queryKey: ["flower_arrangements_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flower_arrangements")
        .select("*")
        .order("name", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data as Arrangement[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return arrangements.filter((a) => {
      if (typeFilter !== "all") {
        if (typeFilter === "Other") {
          if (a.arrangement_type && KNOWN_TYPES.includes(a.arrangement_type)) return false;
        } else if (a.arrangement_type !== typeFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        a.name?.toLowerCase().includes(q) ||
        a.gd_code?.toLowerCase().includes(q) ||
        a.ffc_code?.toLowerCase().includes(q)
      );
    });
  }, [arrangements, search, typeFilter]);

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("flower_arrangements")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flower_arrangements_admin"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update"),
  });

  const saveMutation = useMutation({
    mutationFn: async (a: Arrangement) => {
      const payload = {
        name: a.name,
        description: a.description || null,
        arrangement_type: a.arrangement_type || null,
        occasion_tags: a.occasion_tags || [],
        image_url: a.image_url || null,
        image_url_2: a.image_url_2 || null,
        image_url_3: a.image_url_3 || null,
        image_url_4: a.image_url_4 || null,
        image_url_5: a.image_url_5 || null,
        retail_price: Number(a.retail_price) || 0,
        wholesale_price: a.wholesale_price ? Number(a.wholesale_price) : null,
        gd_code: a.gd_code || null,
        ffc_code: a.ffc_code || null,
        is_active: a.is_active,
      };
      if (isNew) {
        const { error } = await supabase.from("flower_arrangements").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("flower_arrangements")
          .update(payload)
          .eq("id", a.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flower_arrangements_admin"] });
      toast.success(isNew ? "Arrangement added" : "Arrangement updated");
      setEditing(null);
      setIsNew(false);
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });

  const margin = (retail?: number | null, cost?: number | null) => {
    const r = Number(retail) || 0;
    const c = Number(cost) || 0;
    if (r <= 0) return null;
    return Math.round(((r - c) / r) * 100);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-brand-gold">
            Flower Catalog
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {arrangements.length} arrangement{arrangements.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          variant="hero"
          onClick={() => {
            setEditing({ ...emptyArrangement });
            setIsNew(true);
          }}
        >
          <Plus className="w-4 h-4" /> Add Arrangement
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, GD code, or FFC code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
            {TYPE_FILTERS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-2">
          <Flower2 className="w-8 h-8 opacity-50" />
          No arrangements match.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const m = margin(a.retail_price, a.wholesale_price);
            return (
              <Card key={a.id} className="p-3 flex items-center gap-3">

                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{a.name}</div>
                  <div className="text-xs flex flex-wrap gap-x-3 gap-y-0.5">
                    {a.gd_code && (
                      <span style={{ color: "#C9976B" }}>GD: {a.gd_code}</span>
                    )}
                    {a.ffc_code && (
                      <span className="text-muted-foreground">FFC: {a.ffc_code}</span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5 flex flex-wrap gap-x-3">
                    <span className="text-muted-foreground">
                      Cost: ${Number(a.wholesale_price || 0).toFixed(2)}
                    </span>
                    <span>Price: ${Number(a.retail_price || 0).toFixed(2)}</span>
                    {m !== null && (
                      <span className="text-muted-foreground">({m}% margin)</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={a.is_active}
                    onCheckedChange={(v) =>
                      toggleActive.mutate({ id: a.id, is_active: v })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(a);
                      setIsNew(false);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setIsNew(false);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-brand-gold">
              {isNew ? "Add Arrangement" : "Edit Arrangement"}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>GD Code</Label>
                  <Input
                    value={editing.gd_code || ""}
                    onChange={(e) => setEditing({ ...editing, gd_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>FFC Code</Label>
                  <Input
                    value={editing.ffc_code || ""}
                    onChange={(e) => setEditing({ ...editing, ffc_code: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Wholesale Cost ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.wholesale_price ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        wholesale_price: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Retail Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.retail_price}
                    onChange={(e) =>
                      setEditing({ ...editing, retail_price: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Type</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.arrangement_type || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, arrangement_type: e.target.value })
                  }
                >
                  <option value="">— Select type —</option>
                  {KNOWN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <Label>Occasion Tags (comma separated)</Label>
                <Input
                  value={(editing.occasion_tags || []).join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      occasion_tags: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editing.description || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </div>


              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setIsNew(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              disabled={saveMutation.isPending || !editing?.name}
              onClick={() => editing && saveMutation.mutate(editing)}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
