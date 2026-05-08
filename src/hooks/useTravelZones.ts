import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TravelZone {
  id: string;
  zone_number: number;
  label: string;
  max_miles: number;
  fee: number;
  fee_label: string;
  sort_order: number;
}

export interface PricingSettings {
  annual_plan_free_travel_enabled: boolean;
  annual_plan_free_travel_min_miles: number;
  annual_plan_free_travel_max_miles: number;
}

const DEFAULT_ZONES: TravelZone[] = [
  { id: "z1", zone_number: 1, label: "Zone 1 (0–25 mi)", max_miles: 25, fee: 0, fee_label: "Included", sort_order: 1 },
  { id: "z2", zone_number: 2, label: "Zone 2 (25–75 mi)", max_miles: 75, fee: 65, fee_label: "$65", sort_order: 2 },
  { id: "z3", zone_number: 3, label: "Zone 3 (75–150 mi)", max_miles: 150, fee: 150, fee_label: "$150", sort_order: 3 },
];

const DEFAULT_SETTINGS: PricingSettings = {
  annual_plan_free_travel_enabled: true,
  annual_plan_free_travel_min_miles: 25,
  annual_plan_free_travel_max_miles: 75,
};

export function useTravelZones() {
  return useQuery({
    queryKey: ["travel-zones-config"],
    queryFn: async () => {
      const [zonesRes, settingsRes] = await Promise.all([
        supabase.from("travel_zones").select("*").order("sort_order", { ascending: true }),
        supabase.from("pricing_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      const zones = (zonesRes.data as TravelZone[] | null) ?? DEFAULT_ZONES;
      const settings = (settingsRes.data as PricingSettings | null) ?? DEFAULT_SETTINGS;
      return { zones, settings };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function resolveTravelFee(
  miles: number,
  zones: TravelZone[],
  settings: PricingSettings,
  hasAnnualPlan: boolean
): TravelZone {
  const sorted = [...zones].sort((a, b) => a.max_miles - b.max_miles);
  const zone = sorted.find((z) => miles <= z.max_miles) ?? sorted[sorted.length - 1];

  if (
    hasAnnualPlan &&
    settings.annual_plan_free_travel_enabled &&
    miles > settings.annual_plan_free_travel_min_miles &&
    miles <= settings.annual_plan_free_travel_max_miles
  ) {
    return { ...zone, fee: 0, fee_label: "Included with annual plan" };
  }
  return zone;
}

export function isAnnualPlanFreeTravel(
  miles: number,
  settings: PricingSettings,
  hasAnnualPlan: boolean
): boolean {
  return (
    hasAnnualPlan &&
    settings.annual_plan_free_travel_enabled &&
    miles > settings.annual_plan_free_travel_min_miles &&
    miles <= settings.annual_plan_free_travel_max_miles
  );
}
