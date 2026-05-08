import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const BENTON_MO: [number, number] = [37.0978, -89.5625];
const ZONE_COLORS = ["#4ade80", "#C9976B", "#facc15", "#fb923c", "#f87171", "#a78bfa"];
const milesToMeters = (m: number) => m * 1609.34;

interface ZoneRow {
  id: string;
  zone_number: number;
  label: string;
  max_miles: number;
  fee: number;
  fee_label: string;
  sort_order: number;
}
interface Settings {
  id: number;
  annual_plan_free_travel_enabled: boolean;
  annual_plan_free_travel_min_miles: number;
  annual_plan_free_travel_max_miles: number;
}

const TravelZones = () => {
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["admin-travel-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_zones")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ZoneRow[];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["admin-pricing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as Settings;
    },
  });

  const [draftZones, setDraftZones] = useState<ZoneRow[]>([]);
  const [draftSettings, setDraftSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (zones.length) setDraftZones(zones); }, [zones]);
  useEffect(() => { if (settings) setDraftSettings(settings); }, [settings]);

  // Render map
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(containerRef.current, { center: BENTON_MO, zoom: 7, scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    [...draftZones].sort((a, b) => b.max_miles - a.max_miles).forEach((zone, i) => {
      const color = ZONE_COLORS[draftZones.length - 1 - i] ?? "#888";
      L.circle(BENTON_MO, {
        radius: milesToMeters(Number(zone.max_miles) || 0),
        color, fillColor: color, fillOpacity: 0.12, weight: 2,
      }).addTo(map).bindTooltip(`${zone.label}<br/>${zone.fee_label}`, { sticky: true });
    });

    L.circleMarker(BENTON_MO, { radius: 7, color: "#C9976B", fillColor: "#C9976B", fillOpacity: 1, weight: 2 })
      .addTo(map).bindTooltip("Benton, MO", { permanent: true, direction: "top", offset: [0, -10] });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [draftZones]);

  const updateZone = (idx: number, patch: Partial<ZoneRow>) => {
    setDraftZones((prev) => prev.map((z, i) => (i === idx ? { ...z, ...patch } : z)));
  };

  const addZone = () => {
    const next = draftZones.length
      ? Math.max(...draftZones.map((z) => z.zone_number)) + 1
      : 1;
    setDraftZones((prev) => [...prev, {
      id: `new-${crypto.randomUUID()}`,
      zone_number: next,
      label: `Zone ${next}`,
      max_miles: 0,
      fee: 0,
      fee_label: "$0",
      sort_order: prev.length + 1,
    }]);
  };

  const removeZone = (idx: number) => {
    setDraftZones((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!draftSettings) return;
    setSaving(true);
    try {
      // Delete zones removed from draft
      const draftIds = draftZones.filter((z) => !z.id.startsWith("new-")).map((z) => z.id);
      const removed = zones.filter((z) => !draftIds.includes(z.id));
      if (removed.length > 0) {
        const { error } = await supabase.from("travel_zones").delete().in("id", removed.map((z) => z.id));
        if (error) throw error;
      }

      // Upsert remaining
      for (let i = 0; i < draftZones.length; i++) {
        const z = draftZones[i];
        const payload = {
          zone_number: Number(z.zone_number),
          label: z.label,
          max_miles: Number(z.max_miles),
          fee: Number(z.fee),
          fee_label: z.fee_label,
          sort_order: i + 1,
        };
        if (z.id.startsWith("new-")) {
          const { error } = await supabase.from("travel_zones").insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("travel_zones").update(payload).eq("id", z.id);
          if (error) throw error;
        }
      }

      // Save settings
      const { error: sErr } = await supabase.from("pricing_settings").update({
        annual_plan_free_travel_enabled: draftSettings.annual_plan_free_travel_enabled,
        annual_plan_free_travel_min_miles: Number(draftSettings.annual_plan_free_travel_min_miles),
        annual_plan_free_travel_max_miles: Number(draftSettings.annual_plan_free_travel_max_miles),
      }).eq("id", 1);
      if (sErr) throw sErr;

      toast.success("Travel pricing saved");
      qc.invalidateQueries({ queryKey: ["admin-travel-zones"] });
      qc.invalidateQueries({ queryKey: ["admin-pricing-settings"] });
      qc.invalidateQueries({ queryKey: ["travel-zones-config"] });
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (zonesLoading || !draftSettings) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Travel Zones & Pricing</h1>
          <p className="text-sm text-muted-foreground">Edit distance zones, flat fees, and the annual-plan free-travel rule. Changes apply immediately.</p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save changes
        </Button>
      </div>

      {/* Map preview */}
      <Card>
        <CardHeader><CardTitle className="text-base">Live Preview (from Benton, MO)</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md overflow-hidden border border-border" style={{ height: "50vh" }}>
            <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
          </div>
        </CardContent>
      </Card>

      {/* Zone editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Zones</CardTitle>
          <Button size="sm" variant="outline" onClick={addZone} className="gap-1"><Plus className="w-4 h-4" /> Add zone</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {draftZones.map((z, i) => (
            <div key={z.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border border-border bg-card/50">
              <div className="col-span-2">
                <Label className="text-xs">Zone #</Label>
                <Input type="number" value={z.zone_number} onChange={(e) => updateZone(i, { zone_number: Number(e.target.value) })} className="h-9" />
              </div>
              <div className="col-span-4">
                <Label className="text-xs">Label</Label>
                <Input value={z.label} onChange={(e) => updateZone(i, { label: e.target.value })} className="h-9" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Max miles</Label>
                <Input type="number" value={z.max_miles} onChange={(e) => updateZone(i, { max_miles: Number(e.target.value) })} className="h-9" />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Fee $</Label>
                <Input type="number" value={z.fee} onChange={(e) => updateZone(i, { fee: Number(e.target.value), fee_label: Number(e.target.value) === 0 ? "Included" : `$${e.target.value}` })} className="h-9" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Fee label</Label>
                <Input value={z.fee_label} onChange={(e) => updateZone(i, { fee_label: e.target.value })} className="h-9" />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => removeZone(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {draftZones.length === 0 && <p className="text-sm text-muted-foreground">No zones. Add one above.</p>}
        </CardContent>
      </Card>

      {/* Free-travel rule */}
      <Card>
        <CardHeader><CardTitle className="text-base">Annual Plan Free-Travel Rule</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Enable free travel for annual plan customers</Label>
              <p className="text-xs text-muted-foreground">Waives the travel fee when the customer has selected any annual maintenance plan.</p>
            </div>
            <Switch
              checked={draftSettings.annual_plan_free_travel_enabled}
              onCheckedChange={(v) => setDraftSettings({ ...draftSettings, annual_plan_free_travel_enabled: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Min miles (exclusive)</Label>
              <Input
                type="number"
                value={draftSettings.annual_plan_free_travel_min_miles}
                onChange={(e) => setDraftSettings({ ...draftSettings, annual_plan_free_travel_min_miles: Number(e.target.value) })}
                className="h-9"
                disabled={!draftSettings.annual_plan_free_travel_enabled}
              />
            </div>
            <div>
              <Label className="text-xs">Max miles (inclusive)</Label>
              <Input
                type="number"
                value={draftSettings.annual_plan_free_travel_max_miles}
                onChange={(e) => setDraftSettings({ ...draftSettings, annual_plan_free_travel_max_miles: Number(e.target.value) })}
                className="h-9"
                disabled={!draftSettings.annual_plan_free_travel_enabled}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Currently: free travel applies between {draftSettings.annual_plan_free_travel_min_miles} and {draftSettings.annual_plan_free_travel_max_miles} miles when an annual plan is selected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TravelZones;
