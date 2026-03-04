import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CalendarDays } from "lucide-react";

const AdminSchedule = () => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-scheduled-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, status, scheduled_date, total_price, offer, travel_fee,
          monuments (cemetery_name, monument_type, material, estimated_miles, section, lot_number)
        `)
        .in("status", ["confirmed", "scheduled", "in_progress"])
        .order("scheduled_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: unscheduled } = useQuery({
    queryKey: ["admin-unscheduled-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, status, total_price, offer, travel_fee, created_at,
          monuments (cemetery_name, monument_type, estimated_miles)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Schedule</h1>
        <p className="text-sm text-muted-foreground">Upcoming and pending jobs</p>
      </div>

      {/* Scheduled jobs */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-semibold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Upcoming Jobs
        </h2>

        {!orders?.length ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No scheduled jobs.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((o) => {
              const m = o.monuments as any;
              return (
                <div key={o.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{m?.cemetery_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m?.monument_type?.replace(/_/g, " ")} · {m?.estimated_miles ?? 0} mi
                      {m?.section ? ` · Sec ${m.section}` : ""}
                      {m?.lot_number ? `, Lot ${m.lot_number}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      {o.status.replace(/_/g, " ")}
                    </span>
                    {o.scheduled_date && (
                      <span className="text-sm font-medium">
                        {new Date(o.scheduled_date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    <span className="text-sm font-semibold">${Number(o.total_price).toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending / Unscheduled */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-semibold">Pending (Unscheduled)</h2>
        {!unscheduled?.length ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No pending orders.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {unscheduled.map((o) => {
              const m = o.monuments as any;
              return (
                <div key={o.id} className="rounded-xl border border-border/50 bg-card/50 p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{m?.cemetery_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m?.monument_type?.replace(/_/g, " ")} · {m?.estimated_miles ?? 0} mi
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">pending</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-semibold">${Number(o.total_price).toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSchedule;
