import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Navigation } from "lucide-react";

export function CemeteryRouteView() {
  const { data: orders } = useQuery({
    queryKey: ["admin-route-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`id, status, scheduled_date, total_price, offer, monuments (cemetery_name, monument_type, material, estimated_miles, section, lot_number)`)
        .in("status", ["scheduled", "confirmed", "in_progress"])
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof orders>();
    orders?.forEach((o) => {
      const cemetery = (o.monuments as any)?.cemetery_name ?? "Unknown";
      if (!map.has(cemetery)) map.set(cemetery, []);
      map.get(cemetery)!.push(o);
    });
    // Sort by number of jobs desc
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [orders]);

  if (!orders?.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No upcoming jobs to route.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Navigation className="w-4 h-4 text-primary" />
        <span>{grouped.length} cemeteries · {orders.length} total jobs</span>
      </div>

      {grouped.map(([cemetery, jobs]) => {
        const totalMiles = jobs.reduce((sum, j) => sum + Number((j.monuments as any)?.estimated_miles ?? 0), 0);
        const totalRevenue = jobs.reduce((sum, j) => sum + Number(j.total_price), 0);

        return (
          <div key={cemetery} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">{cemetery}</h3>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                  {jobs.length} job{jobs.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{totalMiles.toFixed(0)} mi</span>
                <span className="font-semibold text-foreground">${totalRevenue.toFixed(0)}</span>
              </div>
            </div>
            <div className="divide-y divide-border/30">
              {jobs.map((o) => {
                const m = o.monuments as any;
                return (
                  <div key={o.id} className="px-4 py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-sm">{m?.monument_type?.replace(/_/g, " ")} · {m?.material}</p>
                      <p className="text-muted-foreground">
                        {m?.section ? `Sec ${m.section}` : ""}
                        {m?.lot_number ? `, Lot ${m.lot_number}` : ""}
                        {o.scheduled_date ? ` · ${new Date(o.scheduled_date).toLocaleDateString()}` : " · Unscheduled"}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
